import 'dart:async';
import 'package:battery_plus/battery_plus.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart' as gl;
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:hrms/config/app_colors.dart';
import 'package:hrms/models/location_data.dart';
import 'package:hrms/models/tracking_event.dart';
import 'package:hrms/services/geo/directions_service.dart';
import 'package:hrms/services/geo/location_service.dart';
import 'package:hrms/services/task_service.dart';
import 'package:hrms/models/task.dart';
import 'package:hrms/screens/geo/arrived_screen.dart';
import 'package:hrms/screens/geo/task_detail_screen.dart';
import 'package:hrms/widgets/app_drawer.dart';
import 'package:hrms/widgets/bottom_navigation_bar.dart';
import 'package:hrms/widgets/menu_icon_button.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';

class LiveTrackingScreen extends StatefulWidget {
  final String taskId;

  /// MongoDB task id for API calls (location, steps, end). Optional for backward compatibility.
  final String? taskMongoId;
  final LatLng pickupLocation;
  final LatLng dropoffLocation;

  /// Optional task (with customer) for Arrived → OTP → Task Completed flow.
  final Task? task;

  const LiveTrackingScreen({
    super.key,
    required this.taskId,
    this.taskMongoId,
    required this.pickupLocation,
    required this.dropoffLocation,
    this.task,
  });

  @override
  State<LiveTrackingScreen> createState() => _LiveTrackingScreenState();
}

class _LiveTrackingScreenState extends State<LiveTrackingScreen> {
  GoogleMapController? mapController;

  Marker? _staffMarker;

  Marker? _pickupMarker;

  Marker? _dropoffMarker;

  /// Path built ONLY from actual GPS coordinates (List<LatLng> from location stream).
  Polyline? _routePolyline;

  /// Road route from current/last position to destination (fetched from Directions API).
  Polyline? _shortestRoutePolyline;
  double _remainingDistanceKm = 0.0;
  DateTime? _lastRouteFetchTime;
  static const _routeRefreshInterval = Duration(seconds: 60);
  String? _etaText;
  int _etaMinutes = 0;
  Timer? _etaUpdateTimer;

  StreamSubscription? _locationSubscription;

  StreamSubscription? _geofenceSubscription;

  final List<TrackingEvent> _trackingEvents = [];

  Location? _lastLocation;

  String _currentActivity = "Standing";

  double _totalDistanceCovered = 0.0;

  Duration _totalTimeElapsed = Duration.zero;

  Timer? _timer;

  bool _isInsideGeofence = false;

  final DateTime _taskStartTime = DateTime.now();

  // Step-based progress (Next Steps card).
  bool _reachedLocation = false;
  final bool _photoProof = false;
  final bool _formFilled = false;
  final bool _otpVerified = false;
  bool _updatingSteps = false;
  Timer? _locationUploadTimer;

  @override
  void initState() {
    super.initState();

    _initializeMarkers();

    LocationService().initLocationService(
      customerLocation: widget.dropoffLocation,
    );

    _addTrackingEvent(
      TrackingEventType.punchIn,

      DateTime.now(),

      locationDescription: "Task Started at Pickup Location",
    );

    _listenToLocationUpdates();

    _listenToGeofenceUpdates();

    _startTimer();

    _updateRemainingEta();

    // Initial straight line; fetch road route from pickup to dropoff (replaces when ready)
    _shortestRoutePolyline = Polyline(
      polylineId: const PolylineId('roadRoute'),
      points: [widget.pickupLocation, widget.dropoffLocation],
      color: Colors.green.withOpacity(0.8),
      width: 4,
      patterns: [PatternItem.dash(20), PatternItem.gap(12)],
      geodesic: true,
    );
    _fetchRoadRoute(
      widget.pickupLocation.latitude,
      widget.pickupLocation.longitude,
    );

    // Send GPS point every 15 sec: updateLocation (task path) + storeTracking (Tracking collection).
    if (widget.taskMongoId != null && widget.taskMongoId!.isNotEmpty) {
      debugPrint(
        '[LiveTracking] Timer started: taskMongoId=${widget.taskMongoId}',
      );
      // Send first point after 2 sec, then every 15 sec.
      Future.delayed(const Duration(seconds: 2), () => _sendLocationToDb());
      _locationUploadTimer = Timer.periodic(const Duration(seconds: 15), (_) {
        if (!mounted) return;
        _sendLocationToDb();
      });
    } else {
      debugPrint(
        '[LiveTracking] Timer NOT started: taskMongoId is null or empty',
      );
    }
  }

  void _initializeMarkers() {
    _pickupMarker = Marker(
      markerId: const MarkerId('pickupLocation'),

      position: widget.pickupLocation,

      infoWindow: const InfoWindow(title: 'Pickup Location'),

      icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
    );

    _dropoffMarker = Marker(
      markerId: const MarkerId('dropoffLocation'),

      position: widget.dropoffLocation,

      infoWindow: const InfoWindow(title: 'Drop-off Location'),

      icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
    );

    _staffMarker = Marker(
      markerId: const MarkerId('staffLocation'),

      position: widget.pickupLocation, // Initial position, will be updated

      infoWindow: const InfoWindow(title: 'My Location'),

      icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
    );
  }

  void _listenToLocationUpdates() {
    _locationSubscription = LocationService().locationStream.listen((
      Location location,
    ) {
      if (mounted) {
        setState(() {
          final newLatLng = LatLng(location.latitude!, location.longitude!);

          _staffMarker = _staffMarker?.copyWith(positionParam: newLatLng);

          mapController?.animateCamera(CameraUpdate.newLatLng(newLatLng));

          _updateRoutePolyline(newLatLng);

          if (_lastLocation != null) {
            double distance = gl.Geolocator.distanceBetween(
              _lastLocation!.latitude!,

              _lastLocation!.longitude!,

              location.latitude!,

              location.longitude!,
            );

            _totalDistanceCovered += distance;
          }

          TrackingEventType newActivityType = _getTrackingEventType(
            location.speed ?? 0,
          );

          if (_currentActivity != newActivityType.name) {
            _addTrackingEvent(newActivityType, DateTime.now());

            _currentActivity = newActivityType.name;
          }

          _lastLocation = location;
          _updateRemainingEta();
        });
      }
    });
  }

  Future<void> _sendLocationToDb() async {
    if (widget.taskMongoId == null || widget.taskMongoId!.isEmpty) return;
    // Use live GPS if available, else fallback to pickup (start location).
    final loc = _lastLocation;
    double lat;
    double lng;
    if (loc != null && loc.latitude != null && loc.longitude != null) {
      lat = loc.latitude!;
      lng = loc.longitude!;
    } else {
      lat = widget.pickupLocation.latitude;
      lng = widget.pickupLocation.longitude;
      debugPrint('[LiveTracking] No GPS yet, using pickup: lat=$lat lng=$lng');
    }
    int? battery;
    try {
      battery = await Battery().batteryLevel;
    } catch (_) {}
    final movementType = _currentActivity;
    debugPrint(
      '[LiveTracking] Sending to DB: lat=$lat lng=$lng movement=$movementType',
    );
    final taskSvc = TaskService();
    taskSvc
        .updateLocation(
          widget.taskMongoId!,
          lat,
          lng,
          batteryPercent: battery,
          movementType: movementType,
        )
        .catchError(
          (e) => debugPrint('[LiveTracking] updateLocation failed: $e'),
        );
    taskSvc
        .storeTracking(
          widget.taskMongoId!,
          lat,
          lng,
          batteryPercent: battery,
          movementType: movementType,
        )
        .catchError(
          (e) => debugPrint('[LiveTracking] storeTracking failed: $e'),
        );
  }

  TrackingEventType _getTrackingEventType(double speed) {
    if (speed > 10 / 3.6) return TrackingEventType.drive;
    if (speed > 1 / 3.6) return TrackingEventType.walk;
    return TrackingEventType.stop;
  }

  String _getMovementDisplay() {
    switch (_currentActivity.toLowerCase()) {
      case 'drive':
        return 'Driving';
      case 'walk':
        return 'Walking';
      case 'stop':
      case 'standing':
      default:
        return 'Stopped';
    }
  }

  void _addTrackingEvent(
    TrackingEventType type,

    DateTime timestamp, {

    double? distance,

    Duration? duration,

    String? locationDescription,
  }) {
    _trackingEvents.add(
      TrackingEvent(
        type: type,

        timestamp: timestamp,

        distance: distance,

        duration: duration,

        locationDescription: locationDescription,
      ),
    );
  }

  /// Total trip distance (pickup to dropoff) in km, for progress bar denominator.
  double get _totalTripDistanceKm {
    final m = gl.Geolocator.distanceBetween(
      widget.pickupLocation.latitude,
      widget.pickupLocation.longitude,
      widget.dropoffLocation.latitude,
      widget.dropoffLocation.longitude,
    );
    return m / 1000;
  }

  Future<void> _fetchRoadRoute(double fromLat, double fromLng) async {
    final now = DateTime.now();
    if (_lastRouteFetchTime != null &&
        now.difference(_lastRouteFetchTime!) < _routeRefreshInterval) {
      return;
    }
    _lastRouteFetchTime = now;
    try {
      final result = await DirectionsService.getRouteBetweenCoordinates(
        originLat: fromLat,
        originLng: fromLng,
        destLat: widget.dropoffLocation.latitude,
        destLng: widget.dropoffLocation.longitude,
      );
      if (mounted && result.points.isNotEmpty) {
        setState(() {
          _shortestRoutePolyline = Polyline(
            polylineId: const PolylineId('roadRoute'),
            points: result.points,
            color: Colors.green.withOpacity(0.8),
            width: 4,
            patterns: [PatternItem.dash(20), PatternItem.gap(12)],
          );
          _remainingDistanceKm = result.distanceKm;
          if (result.durationText != null) {
            final match = RegExp(
              r'~?(\d+)\s*min',
            ).firstMatch(result.durationText!);
            if (match != null) {
              _etaMinutes = int.tryParse(match.group(1) ?? '0') ?? 0;
              _etaText = result.durationText;
            }
          }
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _shortestRoutePolyline = Polyline(
            polylineId: const PolylineId('roadRoute'),
            points: [LatLng(fromLat, fromLng), widget.dropoffLocation],
            color: Colors.green.withOpacity(0.8),
            width: 4,
            patterns: [PatternItem.dash(20), PatternItem.gap(12)],
            geodesic: true,
          );
        });
      }
    }
  }

  void _updateRoutePolyline(LatLng newLatLng) {
    if (_routePolyline == null) {
      _routePolyline = Polyline(
        polylineId: const PolylineId('traveled'),
        points: [widget.pickupLocation, newLatLng],
        color: Colors.blueAccent.withOpacity(0.6),
        width: 4,
      );
    } else {
      final currentPoints = List<LatLng>.from(_routePolyline!.points);
      final last = currentPoints.isNotEmpty ? currentPoints.last : null;
      if (last == null ||
          (last.latitude != newLatLng.latitude ||
              last.longitude != newLatLng.longitude)) {
        currentPoints.add(newLatLng);
        _routePolyline = _routePolyline?.copyWith(pointsParam: currentPoints);
      }
    }
    _updateRemainingEta();
    // Refresh road route periodically from current position
    _fetchRoadRoute(newLatLng.latitude, newLatLng.longitude);
  }

  void _updateRemainingEta() {
    // Use last known location, or pickup if no location yet
    final fromLat = _lastLocation?.latitude ?? widget.pickupLocation.latitude;
    final fromLng = _lastLocation?.longitude ?? widget.pickupLocation.longitude;
    final toDrop = gl.Geolocator.distanceBetween(
      fromLat,
      fromLng,
      widget.dropoffLocation.latitude,
      widget.dropoffLocation.longitude,
    );
    final km = toDrop / 1000;
    if (mounted) {
      setState(() {
        _remainingDistanceKm = km;
        // Shortest distance from live location to destination; ETA based on speed
        final speedKmh = _currentActivity.toLowerCase() == 'walk' ? 5.0 : 30.0;
        final min = (km / speedKmh * 60).round().clamp(0, 999);
        _etaMinutes = min;
        _etaText = min > 60 ? '~${min ~/ 60} h' : '~$min min';
      });
    }
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _totalTimeElapsed = _totalTimeElapsed + const Duration(seconds: 1);
        });
      }
    });
  }

  void _listenToGeofenceUpdates() {
    _geofenceSubscription = LocationService().geofenceStream.listen((event) {
      if (mounted) {
        setState(() {
          _isInsideGeofence = event == "ENTER";

          if (!_isInsideGeofence) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Warning: You are outside the geofence!'),
              ),
            );
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _locationSubscription?.cancel();
    _geofenceSubscription?.cancel();
    _timer?.cancel();
    _etaUpdateTimer?.cancel();
    _locationUploadTimer?.cancel();
    LocationService().dispose();
    super.dispose();
  }

  /// Exit Ride: reset task status to assigned. Do NOT mark completed, do NOT
  /// delete source/destination or task data. Clear temp UI state and pop.
  Future<void> _onExitRide() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Exit Ride?'),
        content: const Text(
          'Tracking will stop. Task status will be reset to Assigned. '
          'You can start the ride again from Task Details.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Exit Ride'),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;
    if (widget.taskMongoId != null && widget.taskMongoId!.isNotEmpty) {
      try {
        await TaskService().updateTask(widget.taskMongoId!, status: 'assigned');
      } catch (_) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to update task status. Please try again.'),
            ),
          );
        }
        return;
      }
    }
    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  Future<void> _markReachedLocation() async {
    if (_reachedLocation || _updatingSteps || widget.taskMongoId == null) {
      return;
    }
    setState(() => _updatingSteps = true);
    try {
      await TaskService().updateSteps(
        widget.taskMongoId!,
        reachedLocation: true,
      );
      if (mounted) {
        setState(() {
          _reachedLocation = true;
          _updatingSteps = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _updatingSteps = false);
    }
  }

  Future<void> _onArrived() async {
    final totalKm = _totalDistanceCovered / 1000;
    final arrival = DateTime.now();
    final durationSeconds = _totalTimeElapsed.inSeconds;

    if (widget.taskMongoId != null && widget.taskMongoId!.isNotEmpty) {
      setState(() => _updatingSteps = true);
      try {
        await TaskService().updateSteps(
          widget.taskMongoId!,
          reachedLocation: true,
        );
        if (mounted) setState(() => _reachedLocation = true);
        // Store trip details in task: distance, source, destination, time taken
        await TaskService().updateTask(
          widget.taskMongoId!,
          tripDistanceKm: totalKm,
          tripDurationSeconds: durationSeconds,
          arrivalTime: arrival,
          sourceLocation: {
            'lat': widget.pickupLocation.latitude,
            'lng': widget.pickupLocation.longitude,
            'address': widget.task?.sourceLocation?.address,
          },
          destinationLocation: {
            'lat': widget.dropoffLocation.latitude,
            'lng': widget.dropoffLocation.longitude,
            'address':
                widget.task?.destinationLocation?.address ??
                widget.task?.customer?.address,
          },
        );
      } catch (_) {}
      if (mounted) setState(() => _updatingSteps = false);
    }
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (context) => ArrivedScreen(
          taskMongoId: widget.taskMongoId,
          taskId: widget.taskId,
          task: widget.task,
          totalDuration: _totalTimeElapsed,
          totalDistanceKm: totalKm,
          isWithinGeofence: _isInsideGeofence,
          arrivalTime: arrival,
          sourceLat: widget.pickupLocation.latitude,
          sourceLng: widget.pickupLocation.longitude,
          sourceAddress: widget.task?.sourceLocation?.address,
          destLat: widget.dropoffLocation.latitude,
          destLng: widget.dropoffLocation.longitude,
          destAddress:
              widget.task?.destinationLocation?.address ??
              (widget.task?.customer != null
                  ? '${widget.task!.customer!.address}, ${widget.task!.customer!.city} ${widget.task!.customer!.pincode}'
                  : null),
        ),
      ),
    );
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, "0");

    String twoDigitMinutes = twoDigits(duration.inMinutes.remainder(60));

    String twoDigitSeconds = twoDigits(duration.inSeconds.remainder(60));

    return "${twoDigits(duration.inHours)}h ${twoDigitMinutes}m ${twoDigitSeconds}s";
  }

  Widget _buildBottomPanelContent() {
    final totalDistanceKm = _totalDistanceCovered / 1000;
    final etaArrivalTime = DateTime.now().add(Duration(minutes: _etaMinutes));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Trip Progress',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Colors.grey.shade800,
          ),
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: _totalTripDistanceKm > 0
                ? (totalDistanceKm / _totalTripDistanceKm).clamp(0.0, 1.0)
                : 0.0,
            backgroundColor: Colors.grey.shade200,
            valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
            minHeight: 4,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Column(
            children: [
              _buildTravelRow(
                Icons.route_rounded,
                'Total distance',
                '${totalDistanceKm.toStringAsFixed(2)} km',
              ),
              const SizedBox(height: 4),
              _buildTravelRow(
                Icons.near_me_rounded,
                'Shortest remaining',
                '${_remainingDistanceKm.toStringAsFixed(2)} km',
              ),
              const SizedBox(height: 4),
              _buildTravelRow(
                Icons.straighten_rounded,
                'Trip distance',
                '${_totalTripDistanceKm.toStringAsFixed(2)} km',
              ),
              const SizedBox(height: 4),
              _buildTravelRow(
                Icons.timer_outlined,
                'Elapsed',
                _formatDuration(_totalTimeElapsed),
              ),
              const SizedBox(height: 4),
              _buildTravelRow(
                Icons.schedule_rounded,
                'ETA',
                DateFormat('h:mm a').format(etaArrivalTime),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Walking / Driving details (below arrival time, above Arrived button).
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.06),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.primary.withOpacity(0.2)),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _getMovementDisplay(),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Icon(
                Icons.schedule_rounded,
                size: 14,
                color: Colors.grey.shade700,
              ),
              const SizedBox(width: 4),
              Text(
                _etaText ?? '—',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey.shade800,
                ),
              ),
              const SizedBox(width: 12),
              Icon(
                Icons.straighten_rounded,
                size: 14,
                color: Colors.grey.shade700,
              ),
              const SizedBox(width: 4),
              Text(
                '${_remainingDistanceKm.toStringAsFixed(1)} km left',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey.shade800,
                ),
              ),
              if (_currentActivity.toLowerCase() == 'stop' ||
                  _currentActivity.toLowerCase() == 'standing') ...[
                const SizedBox(width: 12),
                if (widget.task?.customer?.customerNumber != null &&
                    widget.task!.customer!.customerNumber!.trim().isNotEmpty)
                  IconButton(
                    onPressed: () async {
                      final number = widget.task!.customer!.customerNumber!
                          .trim();
                      final uri = Uri.parse('tel:$number');
                      if (await canLaunchUrl(uri)) {
                        await launchUrl(uri);
                      } else if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Cannot make call')),
                        );
                      }
                    },
                    icon: Icon(
                      Icons.call_rounded,
                      size: 20,
                      color: AppColors.primary,
                    ),
                    tooltip: 'Call customer',
                    padding: const EdgeInsets.all(4),
                    constraints: const BoxConstraints(
                      minWidth: 36,
                      minHeight: 36,
                    ),
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.primary.withOpacity(0.12),
                    ),
                  ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _onExitRide,
                icon: const Icon(Icons.exit_to_app_rounded, size: 18),
                label: const Text(
                  'Exit Ride',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.grey.shade700,
                  side: BorderSide(color: Colors.grey.shade400),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: ElevatedButton.icon(
                onPressed: _onArrived,
                icon: const Icon(
                  Icons.location_on_rounded,
                  color: Colors.white,
                  size: 18,
                ),
                label: const Text(
                  'Arrived',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 2,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final allPolylines = <Polyline>{
      if (_routePolyline != null) _routePolyline!,
      if (_shortestRoutePolyline != null) _shortestRoutePolyline!,
    };

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        await _onExitRide();
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          leading: const MenuIconButton(),
          title: const Text(
            'Live Tracking',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          centerTitle: true,
          elevation: 0,
          actions: [
            if (widget.task != null)
              IconButton(
                icon: Icon(Icons.assignment_rounded, color: AppColors.primary),
                tooltip: 'Task details',
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => TaskDetailScreen(
                        task: widget.task!,
                        fromRideScreen: true,
                      ),
                    ),
                  );
                },
              ),
            if (widget.task?.customer?.customerNumber != null &&
                widget.task!.customer!.customerNumber!.trim().isNotEmpty)
              IconButton(
                icon: Icon(Icons.call_rounded, color: AppColors.primary),
                tooltip: 'Call customer',
                onPressed: () async {
                  final number = widget.task!.customer!.customerNumber!.trim();
                  final uri = Uri.parse('tel:$number');
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri);
                  } else if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Cannot make call')),
                    );
                  }
                },
              ),
          ],
        ),
        drawer: AppDrawer(currentIndex: 1),
        body: Stack(
          fit: StackFit.expand,
          children: [
            // Map fills the screen
            GoogleMap(
              onMapCreated: (controller) {
                mapController = controller;
                if (_staffMarker != null) {
                  mapController?.animateCamera(
                    CameraUpdate.newLatLng(_staffMarker!.position),
                  );
                }
              },
              initialCameraPosition: CameraPosition(
                target: widget.pickupLocation,
                zoom: 14.0,
              ),
              markers: {
                if (_staffMarker != null) _staffMarker!,
                if (_pickupMarker != null) _pickupMarker!,
                if (_dropoffMarker != null) _dropoffMarker!,
              },
              polylines: allPolylines,
              myLocationEnabled: true,
              myLocationButtonEnabled: true,
              zoomControlsEnabled: false,
              mapToolbarEnabled: false,
            ),
            // Map overlays: back button + live distance card
            SafeArea(
              child: Column(
                children: [
                  Align(
                    alignment: Alignment.topLeft,
                    child: Padding(
                      padding: const EdgeInsets.only(left: 4, top: 4),
                      child: IconButton(
                        icon: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.9),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.1),
                                blurRadius: 4,
                                offset: const Offset(0, 1),
                              ),
                            ],
                          ),
                          child: const Icon(Icons.arrow_back_rounded, size: 22),
                        ),
                        onPressed: () => Navigator.of(context).pop(),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(
                          minWidth: 44,
                          minHeight: 44,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.topCenter,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.95),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.near_me_rounded,
                            size: 18,
                            color: AppColors.primary,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Shortest to destination: ',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade700,
                            ),
                          ),
                          Text(
                            '${_remainingDistanceKm.toStringAsFixed(2)} km',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Draggable bottom sheet - scrollable for clear map view
            DraggableScrollableSheet(
              initialChildSize: 0.35,
              minChildSize: 0.15,
              maxChildSize: 0.75,
              snap: true,
              snapSizes: const [0.2, 0.35, 0.55, 0.75],
              builder: (context, scrollController) {
                return Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(20),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.08),
                        blurRadius: 12,
                        offset: const Offset(0, -4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // Drag handle
                      Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: Container(
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(
                            color: Colors.grey.shade300,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                      Expanded(
                        child: SingleChildScrollView(
                          controller: scrollController,
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                          child: _buildBottomPanelContent(),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTravelRow(
    IconData icon,
    String label,
    String value, {
    String? subtitle,
  }) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppColors.primary),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            label,
            style: TextStyle(fontSize: 11, color: Colors.grey.shade700),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildStepRow({
    required bool done,
    required String label,
    required IconData icon,
    VoidCallback? onTap,
    bool loading = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: done
            ? AppColors.primary.withOpacity(0.12)
            : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(10),
        child: InkWell(
          onTap: loading ? null : onTap,
          borderRadius: BorderRadius.circular(10),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                if (loading)
                  SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.primary,
                    ),
                  )
                else if (done)
                  Icon(
                    Icons.check_circle_rounded,
                    color: AppColors.primary,
                    size: 22,
                  )
                else
                  Icon(icon, color: Colors.grey.shade600, size: 22),
                const SizedBox(width: 12),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: done ? AppColors.textPrimary : Colors.grey.shade700,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
