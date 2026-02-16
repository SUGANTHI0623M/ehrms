// Task Details / Start Task – UI matches reference (blue app bar, map card, customer card, fixed Start button)
import 'package:flutter/material.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:hrms/config/app_colors.dart';
import 'package:hrms/models/customer.dart';
import 'package:hrms/models/task.dart';
import 'package:hrms/screens/geo/arrived_screen.dart';
import 'package:hrms/screens/geo/live_tracking_screen.dart';
import 'package:hrms/screens/geo/task_history_screen.dart';
import 'package:hrms/services/customer_service.dart';
import 'package:hrms/services/geo/directions_service.dart';
import 'package:hrms/utils/date_display_util.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:hrms/services/task_service.dart';
import 'package:hrms/services/presence_tracking_service.dart';

class TaskDetailScreen extends StatefulWidget {
  final Task task;

  /// When true, opened from ride screen; back/continue just pops to ride (no push to StartRideScreen).
  final bool fromRideScreen;

  const TaskDetailScreen({
    super.key,
    required this.task,
    this.fromRideScreen = false,
  });

  @override
  State<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends State<TaskDetailScreen> {
  late Task task;

  Customer? _customer;
  bool _loadingCustomer = true;
  String? _customerError;

  Position? _currentPosition;
  LatLng? _destinationLatLng;
  double? _distanceKm;
  String? _durationText;
  bool _loadingMap = true;
  String? _mapError;

  Set<Marker> _markers = {};
  final Set<Polyline> _polylines = {};

  @override
  void initState() {
    super.initState();
    task = widget.task;
    _loadTaskCustomerAndMap();
  }

  Future<void> _loadTaskCustomerAndMap() async {
    if (task.id != null && task.id!.isNotEmpty) {
      try {
        final refreshed = await TaskService().getTaskById(task.id!);
        if (mounted) {
          setState(() => task = refreshed);
          if (refreshed.status == TaskStatus.arrived) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (!mounted) return;
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (context) => ArrivedScreen(
                    taskMongoId: refreshed.id,
                    taskId: refreshed.taskId,
                    task: refreshed,
                    totalDuration: Duration(
                      seconds: refreshed.tripDurationSeconds ?? 0,
                    ),
                    totalDistanceKm: refreshed.tripDistanceKm ?? 0.0,
                    isWithinGeofence: false,
                    arrivalTime: refreshed.arrivalTime ?? DateTime.now(),
                    sourceLat: refreshed.sourceLocation?.lat,
                    sourceLng: refreshed.sourceLocation?.lng,
                    sourceAddress: refreshed.sourceLocation?.address,
                    destLat: refreshed.destinationLocation?.lat,
                    destLng: refreshed.destinationLocation?.lng,
                    destAddress: refreshed.destinationLocation?.address,
                  ),
                ),
              );
            });
            return;
          }
        }
      } catch (_) {}
    }
    if (task.customer != null) {
      setState(() {
        _customer = task.customer;
        _loadingCustomer = false;
      });
      await _initMapAndDirections();
      return;
    }
    if (task.customerId == null || task.customerId!.isEmpty) {
      setState(() {
        _loadingCustomer = false;
        _customerError = 'No customer linked';
      });
      return;
    }
    try {
      final c = await CustomerService().getCustomerById(task.customerId!);
      if (mounted) {
        setState(() {
          _customer = c;
          _loadingCustomer = false;
        });
        await _initMapAndDirections();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _customerError = 'Failed to load customer';
          _loadingCustomer = false;
        });
      }
    }
  }

  Future<void> _initMapAndDirections() async {
    setState(() {
      _loadingMap = true;
      _mapError = null;
    });

    Geolocator.getServiceStatusStream();
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      if (mounted) {
        setState(() {
          _loadingMap = false;
          _mapError = 'Location permission denied';
        });
      }
      return;
    }

    Position? position;
    try {
      position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
    } catch (_) {
      if (mounted) {
        setState(() {
          _loadingMap = false;
          _mapError = 'Could not get current location';
        });
      }
      return;
    }

    if (!mounted) return;
    setState(() {
      _currentPosition = position;
    });

    // Prefer stored task destination, then customer address
    LatLng? destLatLng;
    if (task.destinationLocation != null &&
        (task.destinationLocation!.lat != 0 ||
            task.destinationLocation!.lng != 0)) {
      destLatLng = LatLng(
        task.destinationLocation!.lat,
        task.destinationLocation!.lng,
      );
    }
    if (destLatLng == null && _customer != null) {
      final address =
          '${_customer!.address}, ${_customer!.city}, ${_customer!.pincode}';
      List<Location> locations = [];
      try {
        locations = await locationFromAddress(address);
      } catch (_) {}
      if (locations.isNotEmpty) {
        final dest = locations.first;
        destLatLng = LatLng(dest.latitude, dest.longitude);
      }
    }
    if (destLatLng == null) {
      if (mounted) {
        setState(() {
          _loadingMap = false;
          _mapError = _customer == null
              ? null
              : 'Could not find destination address';
          _distanceKm = null;
          _durationText = null;
        });
      }
      if (_customer == null) return;
      return;
    }

    // Use stored source for "current" marker when available, else use GPS
    if (task.sourceLocation != null &&
        (task.sourceLocation!.lat != 0 || task.sourceLocation!.lng != 0)) {
      position = Position(
        latitude: task.sourceLocation!.lat,
        longitude: task.sourceLocation!.lng,
        timestamp: DateTime.now(),
        accuracy: 0,
        altitude: 0,
        altitudeAccuracy: 0,
        heading: 0,
        headingAccuracy: 0,
        speed: 0,
        speedAccuracy: 0,
      );
      if (mounted) setState(() => _currentPosition = position);
    }

    setState(() {
      _destinationLatLng = destLatLng;
    });

    final currentPos = position!;
    final dest = destLatLng!;

    try {
      final result = await DirectionsService.getRouteBetweenCoordinates(
        originLat: currentPos.latitude,
        originLng: currentPos.longitude,
        destLat: dest.latitude,
        destLng: dest.longitude,
      );
      if (!mounted) return;
      setState(() {
        _distanceKm = result.distanceKm;
        _durationText = result.durationText;
        _loadingMap = false;
        _markers = {
          Marker(
            markerId: const MarkerId('current'),
            position: LatLng(currentPos.latitude, currentPos.longitude),
            icon: BitmapDescriptor.defaultMarkerWithHue(
              BitmapDescriptor.hueAzure,
            ),
            infoWindow: const InfoWindow(title: 'My Location'),
          ),
          Marker(
            markerId: const MarkerId('destination'),
            position: dest,
            icon: BitmapDescriptor.defaultMarkerWithHue(
              BitmapDescriptor.hueRed,
            ),
            infoWindow: const InfoWindow(title: 'Destination'),
          ),
        };
        _polylines.clear();
        if (result.points.isNotEmpty) {
          _polylines.add(
            Polyline(
              polylineId: const PolylineId('route'),
              points: result.points,
              color: AppColors.primary,
              width: 4,
            ),
          );
        }
      });
    } catch (_) {
      final meters = Geolocator.distanceBetween(
        currentPos.latitude,
        currentPos.longitude,
        dest.latitude,
        dest.longitude,
      );
      final km = meters / 1000;
      final min = (km / 30 * 60).round().clamp(0, 999);
      final eta = min > 60 ? '~${min ~/ 60} h' : '~$min min';
      if (!mounted) return;
      setState(() {
        _distanceKm = km;
        _durationText = eta;
        _loadingMap = false;
        _markers = {
          Marker(
            markerId: const MarkerId('current'),
            position: LatLng(currentPos.latitude, currentPos.longitude),
            icon: BitmapDescriptor.defaultMarkerWithHue(
              BitmapDescriptor.hueAzure,
            ),
            infoWindow: const InfoWindow(title: 'My Location'),
          ),
          Marker(
            markerId: const MarkerId('destination'),
            position: dest,
            icon: BitmapDescriptor.defaultMarkerWithHue(
              BitmapDescriptor.hueRed,
            ),
            infoWindow: const InfoWindow(title: 'Destination'),
          ),
        };
        _polylines.clear();
        _polylines.add(
          Polyline(
            polylineId: const PolylineId('route'),
            points: [LatLng(currentPos.latitude, currentPos.longitude), dest],
            color: AppColors.primary,
            width: 4,
          ),
        );
      });
    }
  }

  String _statusLabel(TaskStatus s) {
    switch (s) {
      case TaskStatus.assigned:
        return 'Assigned';
      case TaskStatus.approved:
        return 'Approved';
      case TaskStatus.staffapproved:
        return 'Staff Approved';
      case TaskStatus.pending:
        return 'Pending';
      case TaskStatus.scheduled:
        return 'Scheduled';
      case TaskStatus.inProgress:
        return 'In Progress';
      case TaskStatus.arrived:
        return 'Arrived';
      case TaskStatus.completed:
        return 'Completed';
      case TaskStatus.exited:
        return 'Exited';
      case TaskStatus.exitedOnArrival:
        return 'Exited on Arrival';
      case TaskStatus.holdOnArrival:
        return 'Hold on Arrival';
      case TaskStatus.reopenedOnArrival:
        return 'Reopened on Arrival';
      case TaskStatus.waitingForApproval:
        return 'Waiting for Approval';
      case TaskStatus.rejected:
        return 'Rejected';
      case TaskStatus.reopened:
        return 'Reopened';
      case TaskStatus.hold:
        return 'Hold';
      case TaskStatus.cancelled:
        return 'Cancelled';
      default:
        return 'Ready';
    }
  }

  Future<void> _onCallCustomer() async {
    final number = _customer?.customerNumber?.trim();
    if (number == null || number.isEmpty) return;
    final uri = Uri(scheme: 'tel', path: number);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Task Details',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.history_rounded),
            tooltip: 'Ride history',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => TaskHistoryScreen(task: task),
                ),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildMapCard(),
                  const SizedBox(height: 16),
                  _buildTaskSummaryCard(),
                  const SizedBox(height: 16),
                  _buildAssignedAndCompletionDates(),
                  const SizedBox(height: 16),
                  _buildCustomerCard(),
                  const SizedBox(height: 16),
                  _buildDestinationCard(),
                  const SizedBox(height: 16),
                  _buildTaskRequirements(),
                  _buildOtpVerificationStatus(),
                  const SizedBox(height: 16),
                  _buildExitRestartHistoryCard(),
                  const SizedBox(height: 16),
                  _buildReadyToStartCard(),
                ],
              ),
            ),
          ),
          _buildBottomButtons(),
        ],
      ),
    );
  }

  Widget _buildMapCard() {
    final initialPosition = _currentPosition != null
        ? LatLng(_currentPosition!.latitude, _currentPosition!.longitude)
        : (_destinationLatLng ?? const LatLng(11.0168, 76.9558));

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
        color: Colors.grey.shade100,
      ),
      clipBehavior: Clip.antiAlias,
      child: SizedBox(
        height: 220,
        child: Stack(
          children: [
            if (_loadingMap && _markers.isEmpty)
              const Center(child: CircularProgressIndicator())
            else if (_mapError != null && _markers.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    _mapError!,
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey.shade700),
                  ),
                ),
              )
            else
              GoogleMap(
                initialCameraPosition: CameraPosition(
                  target: initialPosition,
                  zoom: 14,
                ),
                markers: _markers,
                polylines: _polylines,
                myLocationEnabled: true,
                myLocationButtonEnabled: true,
                zoomControlsEnabled: false,
                mapToolbarEnabled: false,
                onMapCreated: (controller) {
                  if (_currentPosition != null && _destinationLatLng != null) {
                    _fitBounds(controller);
                  }
                },
              ),
            Positioned(
              top: 12,
              left: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.location_on_rounded,
                      size: 16,
                      color: Colors.pink.shade400,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _distanceKm != null
                          ? '${_distanceKm!.toStringAsFixed(1)} km away'
                          : '—',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Positioned(
              top: 12,
              right: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.timer_outlined,
                      size: 16,
                      color: Colors.grey.shade700,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _durationText ?? '—',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _fitBounds(GoogleMapController controller) {
    if (_currentPosition == null || _destinationLatLng == null) return;
    final bounds = LatLngBounds(
      southwest: LatLng(
        _currentPosition!.latitude < _destinationLatLng!.latitude
            ? _currentPosition!.latitude
            : _destinationLatLng!.latitude,
        _currentPosition!.longitude < _destinationLatLng!.longitude
            ? _currentPosition!.longitude
            : _destinationLatLng!.longitude,
      ),
      northeast: LatLng(
        _currentPosition!.latitude > _destinationLatLng!.latitude
            ? _currentPosition!.latitude
            : _destinationLatLng!.latitude,
        _currentPosition!.longitude > _destinationLatLng!.longitude
            ? _currentPosition!.longitude
            : _destinationLatLng!.longitude,
      ),
    );
    controller.animateCamera(CameraUpdate.newLatLngBounds(bounds, 48));
  }

  Widget _buildTaskSummaryCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  task.taskTitle,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.secondary.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: AppColors.secondary.withOpacity(0.5),
                  ),
                ),
                child: Text(
                  _statusLabel(task.status),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.secondary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Task #${task.taskId}',
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
          if (task.description.isNotEmpty) ...[
            const SizedBox(height: 10),
            Builder(
              builder: (context) {
                final parsed = _parseSourceDestination(task.description);
                final descText =
                    (parsed.source != null || parsed.destination != null) &&
                        parsed.body.isNotEmpty
                    ? parsed.body
                    : task.description;
                return Text(
                  descText,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade700,
                    height: 1.4,
                  ),
                );
              },
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCustomerCard() {
    if (_loadingCustomer) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: CircularProgressIndicator(),
        ),
      );
    }
    if (_customerError != null) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Text(
          _customerError!,
          style: TextStyle(color: Colors.grey.shade700),
        ),
      );
    }
    if (_customer == null) {
      return const SizedBox.shrink();
    }

    final initial = _customer!.customerName.isNotEmpty
        ? _customer!.customerName[0].toUpperCase()
        : '?';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Customer Information',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: AppColors.secondary,
                child: Text(
                  initial,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _customer!.customerName,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      _customer!.address.isNotEmpty
                          ? '${_customer!.address}, ${_customer!.city} ${_customer!.pincode}'
                                .trim()
                          : '${_customer!.city} ${_customer!.pincode}'.trim(),
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (_customer!.customerNumber != null &&
              _customer!.customerNumber!.isNotEmpty) ...[
            const SizedBox(height: 12),
            InkWell(
              onTap: _onCallCustomer,
              child: Row(
                children: [
                  Icon(
                    Icons.phone_rounded,
                    size: 20,
                    color: Colors.red.shade400,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _customer!.customerNumber!,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (_customer!.effectiveEmail != null &&
              _customer!.effectiveEmail!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  Icons.email_rounded,
                  size: 20,
                  color: Colors.grey.shade600,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _customer!.effectiveEmail!,
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  /// Parse "Source: X\nDestination: Y\n\n{body}" from description.
  ({String? source, String? destination, String body}) _parseSourceDestination(
    String? desc,
  ) {
    if (desc == null || desc.trim().isEmpty)
      return (source: null, destination: null, body: desc ?? '');
    String? source;
    String? destination;
    final lines = desc.split('\n');
    final bodyLines = <String>[];
    for (final line in lines) {
      if (line.startsWith('Source:')) {
        source = line.substring(7).trim();
      } else if (line.startsWith('Destination:')) {
        destination = line.substring(12).trim();
      } else if (line.trim().isNotEmpty || bodyLines.isNotEmpty) {
        bodyLines.add(line);
      }
    }
    return (
      source: source,
      destination: destination,
      body: bodyLines.join('\n').trim(),
    );
  }

  Widget _buildDestinationCard() {
    final parsed = _parseSourceDestination(task.description);
    final address = _customer != null
        ? '${_customer!.address}, ${_customer!.city}, ${_customer!.pincode}'
              .trim()
        : parsed.destination ?? '';

    if (_customer == null &&
        parsed.source == null &&
        parsed.destination == null) {
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (parsed.source != null && parsed.source!.isNotEmpty) ...[
            Row(
              children: [
                Icon(
                  Icons.gps_fixed_rounded,
                  size: 20,
                  color: Colors.green.shade600,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Source:',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              parsed.source!,
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey.shade800,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 12),
          ],
          Row(
            children: [
              Icon(
                Icons.location_on_rounded,
                size: 20,
                color: Colors.pink.shade400,
              ),
              const SizedBox(width: 8),
              const Text(
                'Destination:',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            parsed.destination?.isNotEmpty == true
                ? parsed.destination!
                : address,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade800,
              height: 1.4,
            ),
          ),
          if (_distanceKm != null) ...[
            const SizedBox(height: 8),
            Text(
              '${_distanceKm!.toStringAsFixed(1)} km away',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTaskRequirements() {
    final hasAny =
        task.isOtpRequired ||
        task.isGeoFenceRequired ||
        task.isPhotoRequired ||
        task.isFormRequired;
    if (!hasAny) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Task Requirements',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            if (task.isOtpRequired) _chip('✓ OTP Required', Colors.green),
            if (task.isGeoFenceRequired)
              _chip('📍 Geo-Fence (500m)', Colors.purple),
            if (task.isPhotoRequired) _chip('📷 Photo Required', Colors.orange),
            if (task.isFormRequired) _chip('📝 Fill Form', Colors.teal),
          ],
        ),
      ],
    );
  }

  Widget _chip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: color,
        ),
      ),
    );
  }

  Widget _buildAssignedAndCompletionDates() {
    final isCompleted = task.status == TaskStatus.completed;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Dates',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 10),
          if (task.assignedDate != null) ...[
            Row(
              children: [
                Icon(
                  Icons.assignment_rounded,
                  size: 20,
                  color: Colors.grey.shade600,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Assigned date',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                      Text(
                        DateDisplayUtil.formatFull(task.assignedDate!),
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade800,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
          ],
          if (!isCompleted) ...[
            Row(
              children: [
                Icon(
                  Icons.event_rounded,
                  size: 20,
                  color: Colors.grey.shade600,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Expected completion',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                      Text(
                        DateDisplayUtil.formatFull(task.expectedCompletionDate),
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade800,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
          if (isCompleted && task.completedDate != null) ...[
            Row(
              children: [
                Icon(
                  Icons.check_circle_rounded,
                  size: 20,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Completed on',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                      Text(
                        DateDisplayUtil.formatFull(task.completedDate!),
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade800,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildOtpVerificationStatus() {
    if (!task.isOtpRequired) return const SizedBox.shrink();
    final verified = task.isOtpVerified == true;
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            verified ? Icons.verified_rounded : Icons.pending_rounded,
            size: 20,
            color: verified ? AppColors.primary : Colors.orange.shade700,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: DefaultTextStyle.of(context).style,
                children: [
                  TextSpan(
                    text: 'OTP Verified: ${verified ? "Yes" : "No"}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: verified
                          ? AppColors.primary
                          : Colors.orange.shade700,
                    ),
                  ),
                  if (!verified)
                    TextSpan(
                      text: ' (OTP required at arrival to complete task)',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExitRestartHistoryCard() {
    final exits = task.tasksExit;
    final restarts = task.tasksRestarted;
    if (exits.isEmpty && restarts.isEmpty) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.history_rounded,
                  size: 20,
                  color: Colors.orange.shade700,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Exit & Restart History',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.black,
                      ),
                    ),
                    Text(
                      'Past exits and restarts for this task',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
              TextButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => TaskHistoryScreen(task: task),
                    ),
                  );
                },
                icon: const Icon(Icons.arrow_forward_rounded, size: 16),
                label: const Text('View all'),
              ),
            ],
          ),
          if (exits.isNotEmpty) ...[
            const SizedBox(height: 16),
            ...exits.asMap().entries.map(
              (e) => _historyTile(
                'Exit #${e.key + 1}',
                e.value.exitReason,
                e.value.exitedAt,
                e.value.address,
                e.value.pincode,
                Icons.exit_to_app_rounded,
                Colors.orange,
              ),
            ),
          ],
          if (restarts.isNotEmpty) ...[
            const SizedBox(height: 6),
            ...restarts.asMap().entries.map(
              (e) => _historyTile(
                'Resumed #${e.key + 1}',
                null,
                e.value.resumedAt,
                e.value.address,
                e.value.pincode,
                Icons.replay_rounded,
                Colors.green,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _historyDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 68,
            child: Text(
              '$label:',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade700,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 11, color: Colors.black),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _historyTile(
    String type,
    String? reason,
    DateTime? date,
    String? address,
    String? pincode,
    IconData icon,
    Color color,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: color.withOpacity(0.06),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 18, color: color),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    type,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                    ),
                  ),
                  if (date != null)
                    _historyDetailRow(
                      'Date & Time',
                      DateDisplayUtil.formatDateTime(date),
                    ),
                  if (reason != null && reason.isNotEmpty)
                    _historyDetailRow('Reason', reason),
                  if (address != null && address.isNotEmpty)
                    _historyDetailRow('Location', address),
                  if (pincode != null && pincode.isNotEmpty)
                    _historyDetailRow('Pincode', pincode),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTaskSettingsCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Task settings',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 10),
          _settingsRow('OTP verification required', task.isOtpRequired),
          const SizedBox(height: 6),
          _settingsRow(
            'Require approval on complete',
            task.requireApprovalOnComplete,
          ),
          const SizedBox(height: 6),
          _settingsRow('Auto approve', task.autoApprove),
        ],
      ),
    );
  }

  Widget _settingsRow(String label, bool value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
        ),
        Text(
          value ? 'Yes' : 'No',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: value ? AppColors.primary : Colors.grey.shade600,
          ),
        ),
      ],
    );
  }

  Widget _buildReadyToStartCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.secondary.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.secondary.withOpacity(0.2)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.info_outline_rounded,
            color: AppColors.secondary,
            size: 22,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Ready to Start?',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: AppColors.secondary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Your location will be tracked during this task. Ensure GPS is enabled.',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.secondary.withOpacity(0.9),
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  bool _actionLoading = false;

  /// Show "Start Ride": autoApprove true → assigned/pending (direct start); autoApprove false → only when approved
  /// autoApprove false = manual approval required; autoApprove true = can start directly
  bool get _showStartRideButton =>
      task.id != null &&
      task.id!.isNotEmpty &&
      ((task.status == TaskStatus.assigned ||
                  task.status == TaskStatus.pending) &&
              task.autoApprove ||
          (!task.autoApprove &&
              (task.status == TaskStatus.approved ||
                  task.status == TaskStatus.staffapproved)));

  /// Show "Resume Ride" when task is on hold, holdOnArrival, reopenedOnArrival, exited with hold, or admin reopened.
  bool get _showResumeAfterExitButton =>
      task.id != null &&
      task.id!.isNotEmpty &&
      (task.status == TaskStatus.hold ||
          task.status == TaskStatus.holdOnArrival ||
          task.status == TaskStatus.reopenedOnArrival ||
          task.status == TaskStatus.exited &&
              (task.taskExitStatus == 'hold' || task.taskExitStatus == null) ||
          task.status == TaskStatus.reopened);

  /// Show "Resume Ride" when task is in progress.
  bool get _showResumeRideButton =>
      task.id != null &&
      task.id!.isNotEmpty &&
      task.status == TaskStatus.inProgress;

  /// Show only Back when completed, waiting_for_approval, or rejected.
  bool get _showBackOnly =>
      task.status == TaskStatus.completed ||
      task.status == TaskStatus.waitingForApproval ||
      task.status == TaskStatus.rejected;

  /// Show Approve/Reject when autoApprove is false (manual approval required) and task is assigned/pending.
  bool get _showApprovalButtons =>
      !task.autoApprove &&
      (task.status == TaskStatus.assigned ||
          task.status == TaskStatus.pending) &&
      task.id != null &&
      task.id!.isNotEmpty &&
      !_showResumeRideButton &&
      !_showResumeAfterExitButton &&
      !_showBackOnly;

  /// Staff can always approve; OTP verification applies only at arrival (arrived screen).
  bool get _canApprove => true;

  /// Resolve pickup (source) LatLng: task.sourceLocation > current GPS.
  LatLng? get _pickupLatLng {
    if (task.sourceLocation != null &&
        (task.sourceLocation!.lat != 0 || task.sourceLocation!.lng != 0)) {
      return LatLng(task.sourceLocation!.lat, task.sourceLocation!.lng);
    }
    if (_currentPosition != null) {
      return LatLng(_currentPosition!.latitude, _currentPosition!.longitude);
    }
    return null;
  }

  /// Resolve dropoff (destination) LatLng: task.destinationLocation > geocoded customer.
  LatLng? get _dropoffLatLng {
    if (task.destinationLocation != null &&
        (task.destinationLocation!.lat != 0 ||
            task.destinationLocation!.lng != 0)) {
      return LatLng(
        task.destinationLocation!.lat,
        task.destinationLocation!.lng,
      );
    }
    return _destinationLatLng;
  }

  Future<void> _onApprove() async {
    if (task.id == null || _actionLoading) return;
    setState(() => _actionLoading = true);
    try {
      final updated = await TaskService().updateTask(
        task.id!,
        status: 'approved',
      );
      if (mounted) {
        setState(() {
          task = updated;
          _actionLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _actionLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to approve: $e')));
      }
    }
  }

  Future<void> _onReject() async {
    if (task.id == null || _actionLoading) return;
    setState(() => _actionLoading = true);
    try {
      await TaskService().updateTask(task.id!, status: 'rejected');
      if (mounted) {
        setState(() => _actionLoading = false);
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _actionLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to reject: $e')));
      }
    }
  }

  Future<void> _onStartRide() async {
    if (task.id == null || _actionLoading) return;
    final pickup = _pickupLatLng;
    final dropoff = _dropoffLatLng;
    if (pickup == null || dropoff == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Source and destination are required. Enable GPS and ensure destination is set.',
          ),
        ),
      );
      return;
    }
    setState(() => _actionLoading = true);
    try {
      final startLat = _currentPosition?.latitude ?? pickup.latitude;
      final startLng = _currentPosition?.longitude ?? pickup.longitude;
      late final Task updated;
      if (task.status == TaskStatus.exited ||
          task.status == TaskStatus.hold ||
          task.status == TaskStatus.holdOnArrival ||
          task.status == TaskStatus.reopenedOnArrival ||
          task.status == TaskStatus.reopened) {
        // Resume after exit/hold/reopened: use restart API
        await TaskService().restartTask(task.id!, lat: startLat, lng: startLng);
        updated = await TaskService().getTaskById(task.id!);
      } else {
        updated = await TaskService().updateTask(
          task.id!,
          status: 'in_progress',
          startTime: DateTime.now(),
          startLat: startLat,
          startLng: startLng,
        );
      }
      // Store initial point in Tracking collection (separate route).
      TaskService()
          .storeTracking(task.id!, startLat, startLng, movementType: 'stop')
          .catchError((_) {});
      PresenceTrackingService().pausePresenceTracking();
      if (mounted) {
        setState(() => _actionLoading = false);
        if (updated.status == TaskStatus.arrived) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => ArrivedScreen(
                taskMongoId: updated.id,
                taskId: updated.taskId,
                task: updated,
                totalDuration: Duration(
                  seconds: updated.tripDurationSeconds ?? 0,
                ),
                totalDistanceKm: updated.tripDistanceKm ?? 0.0,
                isWithinGeofence: false,
                arrivalTime: updated.arrivalTime ?? DateTime.now(),
                sourceLat: updated.sourceLocation?.lat,
                sourceLng: updated.sourceLocation?.lng,
                sourceAddress: updated.sourceLocation?.address,
                destLat: updated.destinationLocation?.lat,
                destLng: updated.destinationLocation?.lng,
                destAddress: updated.destinationLocation?.address,
              ),
            ),
          );
        } else {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => LiveTrackingScreen(
                taskId: updated.taskId,
                taskMongoId: updated.id,
                pickupLocation: pickup,
                dropoffLocation: dropoff,
                task: updated,
              ),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _actionLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to start ride: $e')));
      }
    }
  }

  Future<void> _onResumeRide() async {
    if (task.id == null || _actionLoading) return;
    final pickup = _pickupLatLng;
    final dropoff = _dropoffLatLng;
    if (pickup == null || dropoff == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Source and destination are required. Enable GPS and ensure destination is set.',
          ),
        ),
      );
      return;
    }
    setState(() => _actionLoading = true);
    try {
      // Refresh task to get latest state; do NOT update status or startTime.
      final refreshed = await TaskService().getTaskById(task.id!);
      PresenceTrackingService().pausePresenceTracking();
      if (mounted) {
        setState(() => _actionLoading = false);
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => LiveTrackingScreen(
              taskId: refreshed.taskId,
              taskMongoId: refreshed.id,
              pickupLocation: pickup,
              dropoffLocation: dropoff,
              task: refreshed,
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _actionLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to resume ride: $e')));
      }
    }
  }

  Widget _buildBottomButtons() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: widget.fromRideScreen
            ? SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(
                    Icons.arrow_back_rounded,
                    color: Colors.white,
                    size: 20,
                  ),
                  label: const Text(
                    'Back to Ride',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.success,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 2,
                  ),
                ),
              )
            : Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_showApprovalButtons) ...[
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _actionLoading
                                ? null
                                : () => _onReject(),
                            icon: const Icon(Icons.close_rounded, size: 20),
                            label: const Text('Reject'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.red.shade700,
                              side: BorderSide(color: Colors.red.shade300),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: (_actionLoading || !_canApprove)
                                ? null
                                : () => _onApprove(),
                            icon: _actionLoading
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(
                                    Icons.check_circle_rounded,
                                    color: Colors.white,
                                    size: 20,
                                  ),
                            label: Text(
                              _actionLoading ? 'Approving...' : 'Approve',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.success,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              elevation: 2,
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (_showStartRideButton ||
                        _showResumeRideButton ||
                        _showResumeAfterExitButton)
                      const SizedBox(height: 12),
                  ],
                  if (_showStartRideButton || _showResumeAfterExitButton)
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: _actionLoading ? null : _onStartRide,
                        icon: _actionLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : Icon(
                                _showResumeAfterExitButton
                                    ? Icons.play_arrow_rounded
                                    : Icons.directions_car_rounded,
                                color: Colors.white,
                                size: 24,
                              ),
                        label: Text(
                          _actionLoading
                              ? 'Starting...'
                              : (_showResumeAfterExitButton
                                    ? 'Resume Ride'
                                    : 'Start Ride'),
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.success,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 2,
                        ),
                      ),
                    ),
                  if (_showResumeRideButton)
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: _actionLoading ? null : _onResumeRide,
                        icon: _actionLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(
                                Icons.play_arrow_rounded,
                                color: Colors.white,
                                size: 24,
                              ),
                        label: Text(
                          _actionLoading ? 'Resuming...' : 'Resume Ride',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.success,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 2,
                        ),
                      ),
                    ),
                  if ((task.status == TaskStatus.exited &&
                          task.taskExitStatus == 'exited') ||
                      task.status == TaskStatus.exitedOnArrival) ...[
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(
                        'Task was fully exited. Only admin can reopen this task; then you can resume the ride.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade700,
                          height: 1.3,
                        ),
                      ),
                    ),
                  ],
                  if (!_showApprovalButtons &&
                      !_showStartRideButton &&
                      !_showResumeRideButton &&
                      !_showResumeAfterExitButton)
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _actionLoading
                                ? null
                                : () => Navigator.of(context).pop(),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              side: BorderSide(color: Colors.grey.shade400),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: const Text('Back'),
                          ),
                        ),
                      ],
                    ),
                ],
              ),
      ),
    );
  }
}
