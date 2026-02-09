import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart' as gl;
import 'package:hrms/models/location_data.dart';
import 'package:hrms/services/geo/live_tracking_service.dart';
import 'package:background_location_tracker/background_location_tracker.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Geofence stream events: ENTER=inside, EXIT=outside (accuracy OK), LOW_ACCURACY=can't validate
class GeofenceEvent {
  static const String enter = 'ENTER';
  static const String exit = 'EXIT';
  static const String lowAccuracy = 'LOW_ACCURACY';
}

class LocationService {
  static final LocationService _instance = LocationService._internal();

  factory LocationService() {
    return _instance;
  }

  LocationService._internal();

  final StreamController<Location> _locationController =
      StreamController<Location>.broadcast();
  Stream<Location> get locationStream => _locationController.stream;

  final StreamController<String> _geofenceController =
      StreamController<String>.broadcast();
  Stream<String> get geofenceStream => _geofenceController.stream;

  LatLng? _geofenceCenter;

  /// Base geofence radius in meters (>= 100m per requirements).
  static const double baseRadius = 300;

  /// Accuracy threshold: above this, do NOT show "outside geofence" warning.
  static const double accuracyThresholdMeters = 40;

  StreamSubscription<gl.Position>? _geolocatorSubscription;

  /// Update geofence center when destination changes (single source of truth).
  void updateGeofenceCenter(LatLng center) {
    _geofenceCenter = center;
    debugPrint(
      '[Geofence] Center updated: ${center.latitude}, ${center.longitude}',
    );
  }

  Future<void> initLocationService({required LatLng customerLocation}) async {
    _geofenceCenter = customerLocation;
    await _checkAndRequestPermissions();

    // Get initial position immediately so map and tracking start right away.
    try {
      final pos = await gl.Geolocator.getCurrentPosition(
        desiredAccuracy: gl.LocationAccuracy.high,
      );
      final loc = Location.fromPosition(pos);
      if (loc.latitude != null && loc.longitude != null) {
        _locationController.add(loc);
      }
    } catch (_) {}

    // Start Geolocator for frequent foreground updates (every 2m when moving).
    // This ensures lat/long update as you move and route refreshes like Google Maps.
    _geolocatorSubscription =
        gl.Geolocator.getPositionStream(
          locationSettings: gl.LocationSettings(
            accuracy: gl.LocationAccuracy.high,
            distanceFilter: 2, // Update every 2 meters for responsive tracking
          ),
        ).listen((gl.Position position) {
          final loc = Location.fromPosition(position);
          if (loc.latitude != null && loc.longitude != null) {
            _locationController.add(loc);
            _classifyMovement(loc.speed ?? 0);
            _checkGeofence(loc);
          }
        });

    // Keep background tracker for when app goes to background.
    // Uses foreground service with persistent notification; app can go background or be swiped away.
    debugPrint(
      '[LiveTracking] LocationService: starting BackgroundLocationTrackerManager',
    );
    const liveTrackingConfig = AndroidConfig(
      notificationIcon: 'explore',
      notificationBody: 'Live tracking in progress. Tap to open.',
      channelName: 'Live Tracking',
      cancelTrackingActionText: 'Stop tracking',
      enableCancelTrackingAction: true,
      trackingInterval: Duration(seconds: 5),
      // null = time-based updates every 5s even when stationary. Critical for background.
      distanceFilterMeters: null,
    );
    await BackgroundLocationTrackerManager.startTracking(
      config: liveTrackingConfig,
    );
    BackgroundLocationTrackerManager.handleBackgroundUpdated((data) async {
      final Location currentLocation = Location.fromBackgroundData(data);
      if (currentLocation.latitude != null &&
          currentLocation.longitude != null) {
        _locationController.add(currentLocation);
        _classifyMovement(currentLocation.speed ?? 0);
        _checkGeofence(currentLocation);
        // Send to backend when app is in background (main isolate still alive)
        final speed = currentLocation.speed ?? 0.0;
        String movementType = 'stop';
        if (speed >= 10 / 3.6)
          movementType = 'drive';
        else if (speed >= 0.5)
          movementType = 'walk';
        await LiveTrackingService.sendTrackingFromBackground(
          currentLocation.latitude!,
          currentLocation.longitude!,
          movementType: movementType,
        );
      }
    });
  }

  void _checkGeofence(Location currentLocation) {
    if (_geofenceCenter == null) return;

    final currentLat = currentLocation.latitude ?? 0.0;
    final currentLng = currentLocation.longitude ?? 0.0;
    final destLat = _geofenceCenter!.latitude;
    final destLng = _geofenceCenter!.longitude;

    final distanceInMeters = gl.Geolocator.distanceBetween(
      currentLat,
      currentLng,
      destLat,
      destLng,
    );

    // Treat null/negative accuracy as poor (avoid false "outside" warnings).
    final accuracy =
        (currentLocation.accuracy != null && currentLocation.accuracy! >= 0)
        ? currentLocation.accuracy!
        : 999.0;

    // Adaptive radius: base + accuracy to absorb GPS drift.
    final effectiveRadius = baseRadius + accuracy;

    // Accuracy-aware validation: do NOT show "outside geofence" when accuracy > 40m.
    if (accuracy > accuracyThresholdMeters) {
      _geofenceController.add(GeofenceEvent.lowAccuracy);
      debugPrint(
        '[Geofence] LOW_ACCURACY: lat=$currentLat lng=$currentLng '
        'dest=$destLat,$destLng accuracy=${accuracy.toStringAsFixed(1)}m '
        'distance=${distanceInMeters.toStringAsFixed(1)}m effectiveRadius=${effectiveRadius.toStringAsFixed(1)}m',
      );
      return;
    }

    final isInside = distanceInMeters <= effectiveRadius;
    final status = isInside ? GeofenceEvent.enter : GeofenceEvent.exit;
    _geofenceController.add(status);

    debugPrint(
      '[Geofence] $status: lat=$currentLat lng=$currentLng '
      'dest=$destLat,$destLng accuracy=${accuracy.toStringAsFixed(1)}m '
      'distance=${distanceInMeters.toStringAsFixed(1)}m effectiveRadius=${effectiveRadius.toStringAsFixed(1)}m',
    );
  }

  Future<void> _checkAndRequestPermissions() async {
    gl.LocationPermission permission = await gl.Geolocator.checkPermission();
    if (permission == gl.LocationPermission.denied) {
      permission = await gl.Geolocator.requestPermission();
      if (permission == gl.LocationPermission.denied) {
        return Future.error('Location permissions are denied');
      }
    }
    if (permission == gl.LocationPermission.deniedForever) {
      return Future.error(
        'Location permissions are permanently denied, we cannot request permissions.',
      );
    }
  }

  String _classifyMovement(double speed) {
    if (speed > 10 / 3.6) {
      // Convert km/h to m/s
      print("Driving");
      return "Driving";
    } else if (speed > 1 / 3.6) {
      print("Walking");
      return "Walking";
    } else {
      print("Standing");
      return "Standing";
    }
  }

  void dispose() {
    debugPrint(
      '[LiveTracking] LocationService: stopping BackgroundLocationTrackerManager',
    );
    _geolocatorSubscription?.cancel();
    _geolocatorSubscription = null;
    _locationController.close();
    _geofenceController.close();
    BackgroundLocationTrackerManager.stopTracking();
  }

  static double calculateDistance(LatLng start, LatLng end) {
    return gl.Geolocator.distanceBetween(
          start.latitude,
          start.longitude,
          end.latitude,
          end.longitude,
        ) /
        1000; // Convert to kilometers
  }
}
