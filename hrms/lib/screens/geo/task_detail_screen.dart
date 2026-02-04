// Task Details / Start Task – UI matches reference (blue app bar, map card, customer card, fixed Start button)
import 'package:flutter/material.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:hrms/config/app_colors.dart';
import 'package:hrms/models/customer.dart';
import 'package:hrms/models/task.dart';
import 'package:hrms/screens/geo/select_source_destination_screen.dart';
import 'package:hrms/services/customer_service.dart';
import 'package:hrms/services/geo/directions_service.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

class TaskDetailScreen extends StatefulWidget {
  final Task task;

  const TaskDetailScreen({super.key, required this.task});

  @override
  State<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends State<TaskDetailScreen> {
  Task get task => widget.task;

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
  Set<Polyline> _polylines = {};

  @override
  void initState() {
    super.initState();
    _loadCustomerAndMap();
  }

  Future<void> _loadCustomerAndMap() async {
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

    if (_customer == null) {
      setState(() {
        _loadingMap = false;
        _distanceKm = null;
        _durationText = null;
      });
      return;
    }

    final address =
        '${_customer!.address}, ${_customer!.city}, ${_customer!.pincode}';
    List<Location> locations = [];
    try {
      locations = await locationFromAddress(address);
    } catch (_) {}

    if (locations.isEmpty) {
      if (mounted) {
        setState(() {
          _loadingMap = false;
          _mapError = 'Could not find destination address';
        });
      }
      return;
    }

    final dest = locations.first;
    final destLatLng = LatLng(dest.latitude, dest.longitude);
    setState(() {
      _destinationLatLng = destLatLng;
    });

    DirectionsResult result;
    try {
      result = await DirectionsService.getDistanceAndDuration(
        originLat: position.latitude,
        originLng: position.longitude,
        destLat: dest.latitude,
        destLng: dest.longitude,
      );
    } catch (_) {
      result = DirectionsResult(
        distanceKm:
            Geolocator.distanceBetween(
              position.latitude,
              position.longitude,
              dest.latitude,
              dest.longitude,
            ) /
            1000,
        durationText: null,
      );
    }

    if (!mounted) return;
    setState(() {
      _distanceKm = result.distanceKm;
      _durationText = result.durationText;
      _loadingMap = false;
      _markers = {
        Marker(
          markerId: const MarkerId('current'),
          position: LatLng(position!.latitude, position.longitude),
          icon: BitmapDescriptor.defaultMarkerWithHue(
            BitmapDescriptor.hueAzure,
          ),
          infoWindow: const InfoWindow(title: 'My Location'),
        ),
        Marker(
          markerId: const MarkerId('destination'),
          position: destLatLng,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
          infoWindow: const InfoWindow(title: 'Destination'),
        ),
      };
    });
  }

  String _statusLabel(TaskStatus s) {
    switch (s) {
      case TaskStatus.assigned:
        return 'Assigned';
      case TaskStatus.pending:
        return 'Pending';
      case TaskStatus.scheduled:
        return 'Scheduled';
      case TaskStatus.inProgress:
        return 'In Progress';
      case TaskStatus.completed:
        return 'Completed';
      case TaskStatus.reopened:
        return 'Reopened';
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
      appBar: AppBar(
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppColors.secondary,
                AppColors.secondary.withOpacity(0.85),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        title: const Text(
          'Task Details',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.call_rounded, color: Colors.white),
            onPressed: _customer != null ? _onCallCustomer : null,
          ),
          IconButton(
            icon: const Icon(
              Icons.chat_bubble_outline_rounded,
              color: Colors.white,
            ),
            onPressed: () {
              // TODO: open chat
            },
          ),
        ],
        elevation: 0,
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
                  _buildCustomerCard(),
                  const SizedBox(height: 16),
                  _buildDestinationCard(),
                  const SizedBox(height: 16),
                  _buildTaskRequirements(),
                  const SizedBox(height: 16),
                  _buildScheduledTime(),
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
        gradient: LinearGradient(
          colors: [
            AppColors.secondary.withOpacity(0.3),
            AppColors.secondary.withOpacity(0.15),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
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
                    fontSize: 18,
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
            style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
          ),
          if (task.description.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              task.description,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.shade700,
                height: 1.4,
              ),
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
              fontSize: 16,
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
                    fontSize: 18,
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
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      '—',
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
                      fontSize: 15,
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDestinationCard() {
    if (_customer == null) return const SizedBox.shrink();
    final address =
        '${_customer!.address}, ${_customer!.city}, ${_customer!.pincode}'
            .trim();

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
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            address,
            style: TextStyle(
              fontSize: 14,
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
            fontSize: 16,
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

  Widget _buildScheduledTime() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Scheduled Time',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Icon(
              Icons.calendar_today_rounded,
              size: 20,
              color: Colors.grey.shade600,
            ),
            const SizedBox(width: 8),
            Text(
              DateFormat(
                'EEEE, dd MMM yyyy \'at\' h:mm a',
              ).format(task.expectedCompletionDate),
              style: TextStyle(fontSize: 14, color: Colors.grey.shade800),
            ),
          ],
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
                    fontSize: 15,
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

  Widget _buildBottomButtons() {
    // Navigate to Start Ride screen to confirm source/destination and start tracking.
    final canStart =
        task.id != null &&
        task.id!.isNotEmpty &&
        task.status != TaskStatus.completed;

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
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: BorderSide(color: Colors.grey.shade400),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Cancel'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: ElevatedButton.icon(
                onPressed: canStart
                    ? () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (context) =>
                                SelectSourceDestinationScreen(task: task),
                          ),
                        );
                      }
                    : null,
                icon: const Icon(
                  Icons.rocket_launch_rounded,
                  color: Colors.white,
                  size: 20,
                ),
                label: const Text(
                  'Start Task',
                  style: TextStyle(
                    fontSize: 16,
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
      ),
    );
  }
}
