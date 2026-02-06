import 'dart:async';
import 'package:geolocator/geolocator.dart' as gl;
import 'package:hrms/models/location_data.dart';
import 'package:background_location_tracker/background_location_tracker.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

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
  final double _geofenceRadius = 150; // 100-200 meters, defaulting to 150

  StreamSubscription<gl.Position>? _geolocatorSubscription;

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
    await BackgroundLocationTrackerManager.startTracking();
    BackgroundLocationTrackerManager.handleBackgroundUpdated((data) async {
      final Location currentLocation = Location.fromBackgroundData(data);
      if (currentLocation.latitude != null &&
          currentLocation.longitude != null) {
        _locationController.add(currentLocation);
        _classifyMovement(currentLocation.speed ?? 0);
        _checkGeofence(currentLocation);
      }
    });
  }

  void _checkGeofence(Location currentLocation) {
    if (_geofenceCenter == null) return;

    double distanceInMeters = gl.Geolocator.distanceBetween(
      _geofenceCenter!.latitude,
      _geofenceCenter!.longitude,
      currentLocation.latitude ?? 0.0,
      currentLocation.longitude ?? 0.0,
    );

    if (distanceInMeters <= _geofenceRadius) {
      _geofenceController.add("ENTER");
    } else {
      _geofenceController.add("EXIT");
    }
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
