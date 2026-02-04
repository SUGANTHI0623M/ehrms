import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart' as gl;
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:hrms/config/app_colors.dart';
import 'package:hrms/models/location_data.dart';
import 'package:hrms/models/tracking_event.dart';
import 'package:hrms/services/geo/location_service.dart';
import 'package:hrms/services/task_service.dart';
import 'package:hrms/screens/geo/end_task_screen.dart';
import 'package:intl/intl.dart';

class LiveTrackingScreen extends StatefulWidget {
  final String taskId;

  /// MongoDB task id for API calls (location, steps, end). Optional for backward compatibility.
  final String? taskMongoId;
  final LatLng pickupLocation;
  final LatLng dropoffLocation;

  const LiveTrackingScreen({
    super.key,
    required this.taskId,
    this.taskMongoId,
    required this.pickupLocation,
    required this.dropoffLocation,
  });

  @override
  State<LiveTrackingScreen> createState() => _LiveTrackingScreenState();
}

class _LiveTrackingScreenState extends State<LiveTrackingScreen> {
  GoogleMapController? mapController;

  Marker? _staffMarker;

  Marker? _pickupMarker;

  Marker? _dropoffMarker;

  Polyline? _routePolyline;

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
  bool _photoProof = false;
  bool _formFilled = false;
  bool _otpVerified = false;
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

    // Send location to backend every 15 sec (battery-friendly).
    if (widget.taskMongoId != null && widget.taskMongoId!.isNotEmpty) {
      _locationUploadTimer = Timer.periodic(const Duration(seconds: 15), (_) {
        if (!mounted) return;
        final loc = _lastLocation;
        if (loc != null && loc.latitude != null && loc.longitude != null) {
          TaskService()
              .updateLocation(
                widget.taskMongoId!,
                loc.latitude!,
                loc.longitude!,
              )
              .catchError((_) {});
        }
      });
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
        });
      }
    });
  }

  TrackingEventType _getTrackingEventType(double speed) {
    if (speed > 10 / 3.6) {
      return TrackingEventType.drive;
    } else if (speed > 1 / 3.6) {
      return TrackingEventType.walk;
    }

    return TrackingEventType.stop;
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

  void _updateRoutePolyline(LatLng newLatLng) {
    if (_routePolyline == null) {
      _routePolyline = Polyline(
        polylineId: const PolylineId('route'),

        points: [
          widget.pickupLocation,

          newLatLng,
        ], // Start from pickup, go to staff

        color: Colors.blueAccent,

        width: 5,
      );
    } else {
      final currentPoints = List<LatLng>.from(_routePolyline!.points);

      if (currentPoints.length < 2 || currentPoints.last != newLatLng) {
        currentPoints.add(newLatLng);

        _routePolyline = _routePolyline?.copyWith(pointsParam: currentPoints);
      }
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
    _locationUploadTimer?.cancel();
    LocationService().dispose();
    super.dispose();
  }

  Future<void> _markReachedLocation() async {
    if (_reachedLocation || _updatingSteps || widget.taskMongoId == null)
      return;
    setState(() => _updatingSteps = true);
    try {
      await TaskService().updateSteps(
        widget.taskMongoId!,
        reachedLocation: true,
      );
      if (mounted)
        setState(() {
          _reachedLocation = true;
          _updatingSteps = false;
        });
    } catch (_) {
      if (mounted) setState(() => _updatingSteps = false);
    }
  }

  Future<void> _endTask() async {
    if (widget.taskMongoId == null) {
      _navigateToEndTask();
      return;
    }
    try {
      await TaskService().endTask(widget.taskMongoId!);
    } catch (_) {}
    if (mounted) _navigateToEndTask();
  }

  void _navigateToEndTask() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (context) => const EndTaskScreen()),
    );
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, "0");

    String twoDigitMinutes = twoDigits(duration.inMinutes.remainder(60));

    String twoDigitSeconds = twoDigits(duration.inSeconds.remainder(60));

    return "${twoDigits(duration.inHours)}h ${twoDigitMinutes}m ${twoDigitSeconds}s";
  }

  @override
  Widget build(BuildContext context) {
    final totalDistanceKm = _totalDistanceCovered / 1000;
    final etaTime = _taskStartTime.add(const Duration(minutes: 12));

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        Navigator.of(context).pop();
      },
      child: Scaffold(
        appBar: AppBar(
          flexibleSpace: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.primary,
                  AppColors.primary.withOpacity(0.85),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: Row(
            children: [
              Icon(
                _currentActivity == "Driving"
                    ? Icons.drive_eta_rounded
                    : Icons.directions_walk_rounded,
                color: Colors.white,
                size: 22,
              ),
              const SizedBox(width: 8),
              Text(
                _currentActivity == "Driving" ? 'Driving' : 'Walking',
                style: const TextStyle(color: Colors.white, fontSize: 16),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.25),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text(
                  'Live',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          elevation: 0,
        ),
        body: Column(
          children: [
            // Full map (Uber-like).
            Expanded(
              child: GoogleMap(
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
                polylines: _routePolyline != null ? {_routePolyline!} : {},
                myLocationEnabled: true,
                myLocationButtonEnabled: true,
              ),
            ),
            // Bottom sheet: travel info + Next Steps + actions.
            Container(
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
              child: SafeArea(
                top: false,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Trip progress.
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Trip progress',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Colors.grey.shade800,
                            ),
                          ),
                          Text(
                            '${(_totalDistanceCovered / 1000).toStringAsFixed(1)} km',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: totalDistanceKm > 0
                              ? (totalDistanceKm / 5.0).clamp(0.0, 1.0)
                              : 0.0,
                          backgroundColor: Colors.grey.shade200,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            AppColors.primary,
                          ),
                          minHeight: 6,
                        ),
                      ),
                      const SizedBox(height: 16),
                      // Travel info: Total distance, Driving time, Arrival.
                      _buildTravelRow(
                        Icons.straighten_rounded,
                        'Total Distance',
                        '${totalDistanceKm.toStringAsFixed(1)} KM',
                      ),
                      const SizedBox(height: 6),
                      _buildTravelRow(
                        Icons.directions_car_rounded,
                        'Driving Time',
                        '${_formatDuration(_totalTimeElapsed)} (${totalDistanceKm.toStringAsFixed(1)} km)',
                      ),
                      const SizedBox(height: 6),
                      _buildTravelRow(
                        Icons.schedule_rounded,
                        'Arrival Time',
                        DateFormat('h:mm a').format(etaTime),
                      ),
                      const SizedBox(height: 20),
                      // Next Steps card (green left border).
                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.06),
                          borderRadius: BorderRadius.circular(12),
                          border: Border(
                            left: BorderSide(
                              color: AppColors.primary,
                              width: 4,
                            ),
                          ),
                        ),
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Next Steps',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Complete these requirements to finish the task:',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey.shade700,
                              ),
                            ),
                            const SizedBox(height: 12),
                            _buildStepRow(
                              done: _reachedLocation,
                              label: 'Reached location',
                              icon: Icons.location_on_rounded,
                              onTap: _reachedLocation
                                  ? null
                                  : _markReachedLocation,
                              loading: _updatingSteps,
                            ),
                            _buildStepRow(
                              done: _photoProof,
                              label: 'Take photo proof',
                              icon: Icons.camera_alt_rounded,
                            ),
                            _buildStepRow(
                              done: _formFilled,
                              label: 'Fill required form',
                              icon: Icons.description_rounded,
                            ),
                            _buildStepRow(
                              done: _otpVerified,
                              label: 'Get OTP from customer',
                              icon: Icons.pin_rounded,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      // Continue to Form (enabled when Reached location is done).
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _reachedLocation
                              ? () {
                                  // TODO: navigate to form screen or next step.
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Form step – coming soon'),
                                    ),
                                  );
                                }
                              : null,
                          icon: const Icon(
                            Icons.description_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                          label: const Text(
                            'Continue to Form',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.secondary,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: 2,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      // End Task.
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: _endTask,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.error,
                            side: const BorderSide(color: AppColors.error),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text(
                            'End Task',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTravelRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: Colors.grey.shade600),
        const SizedBox(width: 8),
        Text(
          label,
          style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
        ),
        const Spacer(),
        Text(
          value,
          style: const TextStyle(
            fontSize: 13,
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
