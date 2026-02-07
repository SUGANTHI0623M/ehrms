// presence_tracking_service.dart
// Staff location tracking based on attendance presence status.
// Uses SharedPref when checked in; cleared on checkout. No periodic revalidation.
// Does NOT affect task tracking.

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart' as gl;
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';

/// SharedPref key: stores today's date when checked in (YYYY-MM-DD). Cleared on checkout.
const String _kPresenceTrackingDate = 'presence_tracking_date';

/// Presence status per spec: in_office | task | out_of_office
/// (task is handled by tasks module; this service uses in_office | out_of_office only)
class PresenceTrackingService {
  static final PresenceTrackingService _instance =
      PresenceTrackingService._internal();
  factory PresenceTrackingService() => _instance;

  PresenceTrackingService._internal();

  final ApiClient _api = ApiClient();

  Timer? _trackingTimer;
  bool _isTracking = false;
  bool _taskInProgress = false;

  /// Send every 5 minutes (in_office and out_of_office).
  static const Duration trackingInterval = Duration(minutes: 5);

  /// Default radius when branch has no geofence.radius (200m per requirement).
  static const double defaultOfficeRadiusMeters = 200;

  Future<void> _setToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token != null) _api.setAuthToken(token);
  }

  /// Store checked-in date in SharedPref. Call on check-in success.
  Future<void> setTrackingAllowed() async {
    final prefs = await SharedPreferences.getInstance();
    final today = DateTime.now().toIso8601String().split('T')[0];
    await prefs.setString(_kPresenceTrackingDate, today);
  }

  /// Clear checked-in date. Call on checkout or logout.
  Future<void> clearTrackingAllowed() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kPresenceTrackingDate);
  }

  /// True if SharedPref has today's date (checked in today, not checked out).
  Future<bool> isTrackingAllowed() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_kPresenceTrackingDate);
    if (stored == null || stored.isEmpty) return false;
    final today = DateTime.now().toIso8601String().split('T')[0];
    return stored == today;
  }

  /// Check if staff can start presence tracking.
  /// Returns { canTrack, reason?, branchGeofence? }.
  Future<Map<String, dynamic>> getPresenceStatus() async {
    await _setToken();
    try {
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/tracking/presence/status',
      );
      final data = response.data;
      if (data == null) return {'canTrack': false, 'reason': 'unknown'};
      final d = data['data'];
      if (d is! Map) return {'canTrack': false, 'reason': 'invalid_response'};
      return {
        'canTrack': d['canTrack'] == true,
        'reason': d['reason'] as String?,
        'branchGeofence': d['branchGeofence'] as Map<String, dynamic>?,
      };
    } catch (e) {
      if (kDebugMode) debugPrint('[PresenceTracking] getStatus error: $e');
      return {'canTrack': false, 'reason': 'error'};
    }
  }

  /// Send presence tracking point to backend.
  Future<bool> _sendPresence({
    required double lat,
    required double lng,
    required String presenceStatus,
    double? accuracy,
    int? batteryPercent,
  }) async {
    await _setToken();
    try {
      final body = <String, dynamic>{
        'lat': lat,
        'lng': lng,
        'presenceStatus': presenceStatus,
        'timestamp': DateTime.now().toUtc().toIso8601String(),
      };
      if (accuracy != null) body['accuracy'] = accuracy;
      if (batteryPercent != null) body['batteryPercent'] = batteryPercent;

      await _api.dio.post<dynamic>('/tracking/presence/store', data: body);
      return true;
    } catch (e) {
      if (kDebugMode) debugPrint('[PresenceTracking] send error: $e');
      return false;
    }
  }

  /// Check if (lat, lng) is inside branch geofence (branches.geofence).
  /// Uses latitude, longitude, radius from branches collection. 200m default.
  bool _isInsideOffice(
    double lat,
    double lng,
    Map<String, dynamic>? branchGeofence,
  ) {
    if (branchGeofence == null) return false;
    final officeLat = (branchGeofence['latitude'] as num?)?.toDouble();
    final officeLng = (branchGeofence['longitude'] as num?)?.toDouble();
    final radius =
        (branchGeofence['radius'] as num?)?.toDouble() ??
        defaultOfficeRadiusMeters;

    if (officeLat == null || officeLng == null) return false;

    final distM = gl.Geolocator.distanceBetween(lat, lng, officeLat, officeLng);
    return distM <= radius;
  }

  /// Single tick: get location, compute in_office/out_of_office, send.
  /// Call every 5 minutes via timer. Skips when task is in progress.
  Future<void> _tick(Map<String, dynamic>? branchGeofence) async {
    if (!_isTracking) return;
    if (_taskInProgress) return;

    if (!await isTrackingAllowed()) {
      if (kDebugMode) debugPrint('[PresenceTracking] Stopping: pref cleared');
      stopTracking();
      return;
    }

    final gf = branchGeofence;

    gl.Position? position;
    try {
      position = await gl.Geolocator.getCurrentPosition(
        desiredAccuracy: gl.LocationAccuracy.medium,
      );
    } catch (e) {
      if (kDebugMode) debugPrint('[PresenceTracking] getPosition error: $e');
      return;
    }

    final lat = position.latitude;
    final lng = position.longitude;
    final accuracy = position.accuracy;

    final presenceStatus = _isInsideOffice(lat, lng, gf)
        ? 'in_office'
        : 'out_of_office';

    if (kDebugMode && gf == null) {
      debugPrint(
        '[PresenceTracking] branchGeofence null – always out_of_office. Enable geofence on branch.',
      );
    }

    final sent = await _sendPresence(
      lat: lat,
      lng: lng,
      presenceStatus: presenceStatus,
      accuracy: accuracy,
    );
    if (sent && kDebugMode) {
      if (presenceStatus == 'in_office') {
        debugPrint(
          '[PresenceTracking] in_office stored: lat=$lat lng=$lng accuracy=${accuracy.toStringAsFixed(1)}m',
        );
      } else {
        debugPrint(
          '[PresenceTracking] Sent: $presenceStatus lat=$lat lng=$lng',
        );
      }
    }
  }

  /// Start presence tracking. Call when checked in (SharedPref set).
  /// Uses SharedPref, no periodic revalidation.
  Future<void> startTracking() async {
    if (_isTracking) return;

    if (!await isTrackingAllowed()) {
      if (kDebugMode)
        debugPrint('[PresenceTracking] Cannot start: pref not set');
      return;
    }

    final status = await getPresenceStatus();
    final branchGeofence = status['branchGeofence'] as Map<String, dynamic>?;

    _isTracking = true;

    await _tick(branchGeofence);

    _trackingTimer?.cancel();
    _trackingTimer = Timer.periodic(trackingInterval, (_) async {
      await _tick(branchGeofence);
    });

    if (kDebugMode) debugPrint('[PresenceTracking] Started');
  }

  /// Stop presence tracking immediately (e.g. on checkout). Clears SharedPref.
  Future<void> stopTracking() async {
    _isTracking = false;
    _taskInProgress = false;
    _trackingTimer?.cancel();
    _trackingTimer = null;
    await clearTrackingAllowed();
    if (kDebugMode) debugPrint('[PresenceTracking] Stopped');
  }

  /// Pause presence tracking while task is in progress (Start Ride). No 5-min sends.
  void pausePresenceTracking() {
    _taskInProgress = true;
    _trackingTimer?.cancel();
    _trackingTimer = null;
    if (kDebugMode) debugPrint('[PresenceTracking] Paused (task in progress)');
  }

  /// Resume presence tracking after task exit. Restarts 5-min sends.
  Future<void> resumePresenceTracking() async {
    _taskInProgress = false;
    if (!_isTracking) return;
    if (!await isTrackingAllowed()) return;

    final status = await getPresenceStatus();
    final branchGeofence = status['branchGeofence'] as Map<String, dynamic>?;

    await _tick(branchGeofence);

    _trackingTimer?.cancel();
    _trackingTimer = Timer.periodic(trackingInterval, (_) async {
      await _tick(branchGeofence);
    });
    if (kDebugMode) debugPrint('[PresenceTracking] Resumed (task exited)');
  }

  bool get isTracking => _isTracking;
}
