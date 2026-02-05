// Start Ride to Customer – Uber-like: source = staff GPS (auto), destination = customer (editable via search or drag).
// Map-first layout, bottom sheet for source/destination and Start Ride.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:hrms/config/app_colors.dart';
import 'package:hrms/models/customer.dart';
import 'package:hrms/models/task.dart';
import 'package:hrms/services/customer_service.dart';
import 'package:hrms/services/geo/directions_service.dart';
import 'package:hrms/services/geo/places_service.dart';
import 'package:hrms/services/task_service.dart';
import 'package:hrms/screens/geo/live_tracking_screen.dart';
import 'package:hrms/screens/geo/task_detail_screen.dart';
import 'package:hrms/widgets/app_drawer.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:hrms/widgets/bottom_navigation_bar.dart';
import 'package:hrms/widgets/menu_icon_button.dart';

/// Optional initial destination from Select Source & Destination screen.
/// When set, use this and do NOT fall back to client address.
class StartRideScreen extends StatefulWidget {
  final Task task;

  /// If staff changed destination on Select screen, pass it here so we use it.
  final String? initialDestinationAddress;
  final LatLng? initialDestinationLatLng;

  const StartRideScreen({
    super.key,
    required this.task,
    this.initialDestinationAddress,
    this.initialDestinationLatLng,
  });

  @override
  State<StartRideScreen> createState() => _StartRideScreenState();
}

class _StartRideScreenState extends State<StartRideScreen> {
  Task get _task => widget.task;

  Customer? _customer;
  bool _loadingCustomer = true;

  Position? _currentPosition;
  String _sourceAddress = 'Getting your location...';

  LatLng? _destinationLatLng;
  String _destinationAddress = '';
  bool _loadingDestination = true;

  double? _distanceKm;
  String? _durationText;
  Set<Polyline> _polylines = {};
  GoogleMapController? _mapController;
  bool _startingRide = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    // If staff selected a destination on Select screen, use it and do NOT fall back to client.
    if (widget.initialDestinationLatLng != null &&
        widget.initialDestinationAddress != null &&
        widget.initialDestinationAddress!.isNotEmpty) {
      setState(() {
        _customer = _task.customer;
        _loadingCustomer = false;
        _destinationLatLng = widget.initialDestinationLatLng;
        _destinationAddress = widget.initialDestinationAddress!;
        _loadingDestination = false;
      });
      await _lockStartOnly();
      if (mounted && _currentPosition != null && _destinationLatLng != null) {
        _fetchRouteAndFitBounds();
      }
      return;
    }
    if (_task.customer != null) {
      setState(() {
        _customer = _task.customer;
        _loadingCustomer = false;
      });
      _lockStartAndDestination();
      return;
    }
    if (_task.customerId == null || _task.customerId!.isEmpty) {
      setState(() {
        _loadingCustomer = false;
        _destinationAddress = 'No customer address';
      });
      _lockStartOnly();
      return;
    }
    try {
      final c = await CustomerService().getCustomerById(_task.customerId!);
      if (mounted) {
        setState(() {
          _customer = c;
          _loadingCustomer = false;
        });
        _lockStartAndDestination();
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _loadingCustomer = false;
          _destinationAddress = 'Could not load address';
        });
        _lockStartOnly();
      }
    }
  }

  /// Lock start location from GPS and optionally set destination from customer address.
  Future<void> _lockStartOnly() async {
    await _fetchCurrentLocation();
    if (mounted) _reverseGeocodeSource();
  }

  Future<void> _lockStartAndDestination() async {
    await _fetchCurrentLocation();
    if (mounted) _reverseGeocodeSource();
    if (_customer != null) {
      final address =
          '${_customer!.address}, ${_customer!.city}, ${_customer!.pincode}';
      setState(() {
        _destinationAddress = address;
        _loadingDestination = true;
      });
      _geocodeAndSetDestination(address);
    } else {
      setState(() => _loadingDestination = false);
    }
  }

  Future<void> _fetchCurrentLocation() async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      if (mounted) {
        setState(() => _sourceAddress = 'Location permission denied');
      }
      return;
    }
    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      if (mounted) setState(() => _currentPosition = position);
    } catch (_) {
      if (mounted) setState(() => _sourceAddress = 'Could not get location');
    }
  }

  Future<void> _reverseGeocodeSource() async {
    if (_currentPosition == null) return;
    try {
      final placemarks = await placemarkFromCoordinates(
        _currentPosition!.latitude,
        _currentPosition!.longitude,
      );
      if (mounted && placemarks.isNotEmpty) {
        final p = placemarks.first;
        setState(() {
          _sourceAddress = [
            p.street,
            p.locality,
            p.administrativeArea,
            p.country,
          ].where((e) => e != null && e.isNotEmpty).join(', ');
          if (_sourceAddress.isEmpty) _sourceAddress = 'Your current location';
        });
      }
    } catch (_) {
      if (mounted) setState(() => _sourceAddress = 'Your current location');
    }
  }

  Future<void> _geocodeAndSetDestination(String address) async {
    try {
      final locations = await locationFromAddress(address);
      if (locations.isEmpty) {
        if (mounted) setState(() => _loadingDestination = false);
        return;
      }
      final loc = locations.first;
      final latLng = LatLng(loc.latitude, loc.longitude);
      if (mounted) {
        setState(() {
          _destinationLatLng = latLng;
          _loadingDestination = false;
          _destinationAddress = address;
        });
        _fetchRouteAndFitBounds();
      }
    } catch (_) {
      if (mounted) setState(() => _loadingDestination = false);
    }
  }

  /// Fetch road route from Google Directions API. Actual path built from GPS during tracking.
  Future<void> _fetchRouteAndFitBounds() async {
    if (_currentPosition == null || _destinationLatLng == null) return;
    final origin = LatLng(
      _currentPosition!.latitude,
      _currentPosition!.longitude,
    );
    final dest = _destinationLatLng!;
    try {
      final result = await DirectionsService.getRouteBetweenCoordinates(
        originLat: origin.latitude,
        originLng: origin.longitude,
        destLat: dest.latitude,
        destLng: dest.longitude,
      );
      if (!mounted) return;
      setState(() {
        _distanceKm = result.distanceKm;
        _durationText = result.durationText;
        _polylines = {
          Polyline(
            polylineId: const PolylineId('route'),
            points: result.points,
            color: AppColors.primary,
            width: 5,
          ),
        };
      });
    } catch (_) {
      final meters = Geolocator.distanceBetween(
        origin.latitude,
        origin.longitude,
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
        _polylines = {
          Polyline(
            polylineId: const PolylineId('route'),
            points: [origin, dest],
            color: AppColors.primary,
            width: 5,
          ),
        };
      });
    }
    if (!mounted) return;
    _mapController?.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(
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
        ),
        60,
      ),
    );
  }

  void _onDestinationDragEnd(LatLng newPosition) {
    setState(() {
      _destinationLatLng = newPosition;
      _destinationAddress = 'Dropped pin';
      _loadingDestination = true;
    });
    _reverseGeocodeDestination(newPosition.latitude, newPosition.longitude);
    _fetchRouteAndFitBounds();
  }

  Future<void> _reverseGeocodeDestination(double lat, double lng) async {
    try {
      final placemarks = await placemarkFromCoordinates(lat, lng);
      if (mounted && placemarks.isNotEmpty) {
        final p = placemarks.first;
        setState(() {
          _destinationAddress = [
            p.street,
            p.subAdministrativeArea,
            p.locality,
            p.administrativeArea,
            p.postalCode,
            p.country,
          ].where((e) => e != null && e.isNotEmpty).join(', ');
          _loadingDestination = false;
        });
        _fetchRouteAndFitBounds();
      } else {
        if (mounted) {
          setState(() {
            _destinationAddress =
                '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}';
            _loadingDestination = false;
          });
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _destinationAddress =
              '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}';
          _loadingDestination = false;
        });
      }
    }
  }

  void _onChangeDestinationTap() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _DestinationSearchSheet(
        currentLat: _currentPosition?.latitude,
        currentLng: _currentPosition?.longitude,
        onSelect: (PlaceDetails details) {
          Navigator.pop(context);
          final newLatLng = LatLng(details.lat, details.lng);
          final newAddress =
              details.formattedAddress ??
              '${details.lat.toStringAsFixed(5)}, ${details.lng.toStringAsFixed(5)}';
          setState(() {
            _destinationLatLng = newLatLng;
            _destinationAddress = newAddress;
          });
          // Recalculate route and fit bounds after marker update
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) _fetchRouteAndFitBounds();
          });
        },
      ),
    );
  }

  bool get _canStartRide {
    return _currentPosition != null &&
        _destinationLatLng != null &&
        _task.id != null &&
        _task.id!.isNotEmpty &&
        !_startingRide;
  }

  Future<void> _onStartRide() async {
    if (!_canStartRide) return;
    setState(() => _startingRide = true);
    try {
      await TaskService().updateTask(
        _task.id!,
        status: 'in_progress',
        startTime: DateTime.now(),
        startLat: _currentPosition!.latitude,
        startLng: _currentPosition!.longitude,
      );
      // Store initial point in Tracking collection (separate route).
      debugPrint(
        '[StartRide] Sending to DB: lat=${_currentPosition!.latitude} lng=${_currentPosition!.longitude}',
      );
      TaskService()
          .storeTracking(
            _task.id!,
            _currentPosition!.latitude,
            _currentPosition!.longitude,
            movementType: 'stop',
          )
          .catchError(
            (e) => debugPrint('[StartRide] storeTracking failed: $e'),
          );
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (context) => LiveTrackingScreen(
            taskId: _task.taskId,
            taskMongoId: _task.id,
            pickupLocation: LatLng(
              _currentPosition!.latitude,
              _currentPosition!.longitude,
            ),
            dropoffLocation: _destinationLatLng!,
            task: _task,
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to start ride: $e')));
        setState(() => _startingRide = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final initialTarget = _currentPosition != null
        ? LatLng(_currentPosition!.latitude, _currentPosition!.longitude)
        : (_destinationLatLng ?? const LatLng(11.0, 77.0));

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        Navigator.of(context).pop();
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          leading: const MenuIconButton(),
          title: const Text(
            'Start Ride',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          centerTitle: true,
          elevation: 0,
          actions: [
            IconButton(
              icon: Icon(Icons.assignment_rounded, color: AppColors.primary),
              tooltip: 'Task details',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) =>
                        TaskDetailScreen(task: _task, fromRideScreen: true),
                  ),
                );
              },
            ),
            IconButton(
              icon: Icon(Icons.call_rounded, color: AppColors.primary),
              tooltip: 'Call customer',
              onPressed: () async {
                final number = _customer?.customerNumber?.trim();
                if (number == null || number.isEmpty) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Customer number not available'),
                      ),
                    );
                  }
                  return;
                }
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
        body: Column(
          children: [
            Expanded(
              child: Stack(
                children: [
                  GoogleMap(
                    initialCameraPosition: CameraPosition(
                      target: initialTarget,
                      zoom: 14,
                    ),
                    onMapCreated: (controller) {
                      _mapController = controller;
                      if (_currentPosition != null &&
                          _destinationLatLng != null) {
                        _fetchRouteAndFitBounds();
                      }
                    },
                    myLocationEnabled: true,
                    myLocationButtonEnabled: true,
                    zoomControlsEnabled: false,
                    markers: _buildMarkers(),
                    polylines: _polylines,
                  ),
                  if (_loadingCustomer ||
                      (_loadingDestination && _destinationLatLng == null))
                    const Center(child: CircularProgressIndicator()),
                ],
              ),
            ),
            _buildBottomSheet(),
          ],
        ),
        bottomNavigationBar: const AppBottomNavigationBar(currentIndex: 0),
      ),
    );
  }

  Set<Marker> _buildMarkers() {
    final Set<Marker> markers = {};
    if (_currentPosition != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('source'),
          position: LatLng(
            _currentPosition!.latitude,
            _currentPosition!.longitude,
          ),
          icon: BitmapDescriptor.defaultMarkerWithHue(
            BitmapDescriptor.hueGreen,
          ),
          infoWindow: const InfoWindow(title: 'Your location'),
        ),
      );
    }
    if (_destinationLatLng != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('destination'),
          position: _destinationLatLng!,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
          infoWindow: InfoWindow(
            title: _destinationAddress.isNotEmpty
                ? _destinationAddress
                : 'Destination',
          ),
          draggable: true,
          onDragEnd: _onDestinationDragEnd,
        ),
      );
    }
    return markers;
  }

  Widget _buildBottomSheet() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
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
              // Source (staff location – auto, read-only).
              _buildLocationRow(
                icon: Icons.gps_fixed_rounded,
                iconColor: AppColors.primary,
                label: 'Source',
                value: _sourceAddress,
                subtitle: 'Your current location',
              ),
              const SizedBox(height: 12),
              // Destination (editable).
              _buildLocationRow(
                icon: Icons.location_on_rounded,
                iconColor: AppColors.error,
                label: 'Destination',
                value: _destinationAddress.isEmpty
                    ? 'Set destination'
                    : _destinationAddress,
                subtitle: _customer?.customerName ?? 'Customer',
                trailing: TextButton.icon(
                  onPressed: _loadingDestination
                      ? null
                      : _onChangeDestinationTap,
                  icon: const Icon(Icons.search_rounded, size: 20),
                  label: const Text('Change'),
                ),
              ),
              const SizedBox(height: 16),
              // Distance & ETA.
              if (_distanceKm != null) ...[
                Row(
                  children: [
                    Icon(
                      Icons.straighten_rounded,
                      size: 18,
                      color: Colors.grey.shade600,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${_distanceKm!.toStringAsFixed(1)} km',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(width: 16),
                    if (_durationText != null) ...[
                      Icon(
                        Icons.schedule_rounded,
                        size: 18,
                        color: Colors.grey.shade600,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _durationText!,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade700,
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 20),
              ],
              // Start Ride button – enabled when destination is set.
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _canStartRide ? _onStartRide : null,
                  icon: _startingRide
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(
                          Icons.directions_car_rounded,
                          color: Colors.white,
                          size: 22,
                        ),
                  label: Text(
                    _startingRide ? 'Starting...' : 'Start Ride',
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
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
      ),
    );
  }

  Widget _buildLocationRow({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
    String? subtitle,
    Widget? trailing,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: iconColor, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                if (subtitle != null && subtitle.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                  ),
                ],
              ],
            ),
          ),
          if (trailing != null) trailing,
        ],
      ),
    );
  }
}

// Bottom sheet for searching and selecting a new destination (Places autocomplete).
class _DestinationSearchSheet extends StatefulWidget {
  final double? currentLat;
  final double? currentLng;
  final void Function(PlaceDetails) onSelect;

  const _DestinationSearchSheet({
    this.currentLat,
    this.currentLng,
    required this.onSelect,
  });

  @override
  State<_DestinationSearchSheet> createState() =>
      _DestinationSearchSheetState();
}

class _DestinationSearchSheetState extends State<_DestinationSearchSheet> {
  final TextEditingController _searchController = TextEditingController();
  List<PlacePrediction> _predictions = [];
  bool _searching = false;
  bool _fetchingPlace = false;
  final _debounce = ValueNotifier<int>(0);

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_onSearchChanged);
  }

  void _onSearchChanged() {
    _debounce.value++;
    final current = _debounce.value;
    Future.delayed(const Duration(milliseconds: 400), () {
      if (!mounted || _debounce.value != current) return;
      _performSearch();
    });
  }

  Future<void> _performSearch() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) {
      setState(() => _predictions = []);
      return;
    }
    setState(() => _searching = true);
    final list = await PlacesService.autocomplete(
      query,
      lat: widget.currentLat,
      lng: widget.currentLng,
    );
    if (mounted) {
      setState(() {
        _predictions = list;
        _searching = false;
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounce.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final viewInsets = MediaQuery.of(context).viewInsets.bottom;
    final screenHeight = MediaQuery.of(context).size.height;
    return Padding(
      padding: EdgeInsets.only(bottom: viewInsets),
      child: Container(
        height: screenHeight * 0.85,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  Icon(
                    Icons.location_on_rounded,
                    color: AppColors.primary,
                    size: 28,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Select Destination',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Search location...',
                  prefixIcon: const Icon(Icons.search_rounded),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  filled: true,
                  fillColor: Colors.grey.shade50,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                ),
                autofocus: true,
              ),
            ),
            const SizedBox(height: 4),
            Expanded(
              child: _searching || _fetchingPlace
                  ? const Center(child: CircularProgressIndicator())
                  : _predictions.isEmpty
                  ? Center(
                      child: Text(
                        _searchController.text.trim().isEmpty
                            ? 'Type to search address'
                            : 'No results',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      itemCount: _predictions.length,
                      itemBuilder: (context, index) {
                        final p = _predictions[index];
                        return ListTile(
                          dense: true,
                          leading: Icon(
                            Icons.place_rounded,
                            size: 20,
                            color: Colors.grey.shade600,
                          ),
                          title: Text(
                            p.mainText,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          subtitle: p.secondaryText.isNotEmpty
                              ? Padding(
                                  padding: const EdgeInsets.only(top: 2),
                                  child: Text(
                                    p.secondaryText,
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: Colors.grey.shade600,
                                    ),
                                  ),
                                )
                              : null,
                          onTap: () async {
                            setState(() => _fetchingPlace = true);
                            PlaceDetails? details;
                            try {
                              details = await PlacesService.getPlaceDetails(
                                p.placeId,
                              );
                            } catch (_) {
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Could not get place coordinates',
                                    ),
                                  ),
                                );
                              }
                            }
                            if (mounted) setState(() => _fetchingPlace = false);
                            if (details != null && mounted) {
                              widget.onSelect(details);
                            }
                          },
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
