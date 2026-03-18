// presence_tracking_service.dart
// Staff location tracking based on attendance presence status.
// Stores a point every 5 minutes in trackings (POST /tracking/presence/store) while checked in.
// Timer runs regardless of which screen is visible (singleton). When app is in background,
// the OS may pause the isolate so the timer does not fire; on resume we send one record and restart the timer.
// Failed periodic sends (e.g. offline) are queued locally and POSTed when the app opens again.

import 'dart:async';
import 'dart:convert';
import 'package:battery_plus/battery_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart' as gl;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import 'package:hrms/config/constants.dart';
import 'package:hrms/services/geo/address_resolution_service.dart';
import 'package:hrms/services/geo/accurate_location_helper.dart';
import 'api_client.dart';

/// SharedPref key: stores today's date when checked in (YYYY-MM-DD). Cleared on checkout.
const String _kPresenceTrackingDate = 'presence_tracking_date';

const String _kPresencePendingQueue = 'presence_pending_queue';
const int _maxPendingPresence = 80;

class PresenceTrackingService {
  static final PresenceTrackingService _instance =
      PresenceTrackingService._internal();
  factory PresenceTrackingService() => _instance;

  PresenceTrackingService._internal();

  final ApiClient _api = ApiClient();

  Timer? _trackingTimer;
  bool _isTracking = false;
  bool _taskInProgress = false;
  bool _sendingAppClosed = false;
  bool _periodicTickInProgress = false;

  /// Interval for inserting presence tracking into DB (trackings collection).
  static const Duration trackingInterval = Duration(minutes: 5);

  static const double defaultOfficeRadiusMeters = 200;

  Future<gl.Position> _capturePresencePosition() {
    // Use the same stabilized GPS sampling as attendance check-in so
    // the reverse-geocoded address comes from the same style of fix.
    return getAccuratePositionForUi();
  }

  Future<void> _setToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token != null) _api.setAuthToken(token);
  }

  Future<void> setTrackingAllowed() async {
    final prefs = await SharedPreferences.getInstance();
    final today = DateTime.now().toIso8601String().split('T')[0];
    await prefs.setString(_kPresenceTrackingDate, today);
  }

  Future<void> clearTrackingAllowed() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kPresenceTrackingDate);
    await prefs.remove(_kPresencePendingQueue);
  }

  Future<bool> isTrackingAllowed() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_kPresenceTrackingDate);
    if (stored == null || stored.isEmpty) return false;

    final now = DateTime.now();
    final parts = stored.split('-');
    if (parts.length != 3) return false;
    final year = int.tryParse(parts[0]);
    final month = int.tryParse(parts[1]);
    final day = int.tryParse(parts[2]);
    if (year == null || month == null || day == null) return false;

    final endOfCheckInDay = DateTime(year, month, day, 23, 59, 59, 999);

    if (now.isAfter(endOfCheckInDay)) {
      await prefs.remove(_kPresenceTrackingDate);
      return false;
    }
    return true;
  }

  /// Call when API / prefs show user is punched in today (e.g. after app restart or dashboard load).
  Future<void> ensureTrackingIfPunchedIn(bool isPunchedInToday) async {
    if (!isPunchedInToday) {
      await stopTracking();
      return;
    }
    await setTrackingAllowed();
    await _schedulePresenceSends();
  }

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
      return {'canTrack': false, 'reason': 'error'};
    }
  }

  Future<bool> _sendPresence({
    required double lat,
    required double lng,
    required String presenceStatus,
    String? status,
    double? accuracy,
    int? batteryPercent,
    String? address,
    String? fullAddress,
    String? city,
    String? area,
    String? pincode,
    DateTime? timestampUtc,
  }) async {
    await _setToken();
    try {
      final body = <String, dynamic>{
        'lat': lat,
        'lng': lng,
        'presenceStatus': presenceStatus,
        'timestamp':
            (timestampUtc ?? DateTime.now().toUtc()).toIso8601String(),
      };
      if (status == 'active' || status == 'inactive') body['status'] = status;
      if (accuracy != null) body['accuracy'] = accuracy;
      if (batteryPercent != null) body['batteryPercent'] = batteryPercent;
      if (address != null && address.isNotEmpty) body['address'] = address;
      if (fullAddress != null && fullAddress.isNotEmpty) {
        body['fullAddress'] = fullAddress;
      }
      if (city != null && city.isNotEmpty) body['city'] = city;
      if (area != null && area.isNotEmpty) body['area'] = area;
      if (pincode != null && pincode.isNotEmpty) body['pincode'] = pincode;

      await _api.dio.post<dynamic>('/tracking/presence/store', data: body);
      if (kDebugMode && AppConstants.logTrackingsToConsole) {
        debugPrint(
          '[Trackings] presence_store OK lat=${lat.toStringAsFixed(6)} '
          'lng=${lng.toStringAsFixed(6)} presence=$presenceStatus '
          'status=${status ?? "—"} acc=${accuracy?.toStringAsFixed(1) ?? "—"}m',
        );
      }
      return true;
    } on DioException catch (e) {
      if (kDebugMode && AppConstants.logTrackingsToConsole) {
        debugPrint(
          '[Trackings] presence_store FAIL ${e.response?.statusCode} '
          'presence=$presenceStatus lat=$lat lng=$lng → ${e.response?.data}',
        );
      }
      if (kDebugMode) {
        debugPrint(
          '[PresenceTracking] store ${e.response?.statusCode}: ${e.response?.data}',
        );
      }
      return false;
    } catch (e) {
      if (kDebugMode) debugPrint('[PresenceTracking] store error: $e');
      return false;
    }
  }

  Future<List<Map<String, dynamic>>> _loadPendingQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kPresencePendingQueue);
    if (raw == null || raw.isEmpty) return [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return [];
      final out = <Map<String, dynamic>>[];
      for (final e in decoded) {
        if (e is Map) {
          out.add(Map<String, dynamic>.from(
            e.map((k, v) => MapEntry(k.toString(), v)),
          ));
        }
      }
      return out;
    } catch (_) {
      return [];
    }
  }

  Future<void> _savePendingQueue(List<Map<String, dynamic>> list) async {
    final prefs = await SharedPreferences.getInstance();
    if (list.isEmpty) {
      await prefs.remove(_kPresencePendingQueue);
    } else {
      await prefs.setString(_kPresencePendingQueue, jsonEncode(list));
    }
  }

  Future<void> _enqueueFailedPeriodicPresence({
    required double lat,
    required double lng,
    required String presenceStatus,
    double? accuracy,
    int? batteryPercent,
    String? address,
    String? fullAddress,
    String? city,
    String? area,
    String? pincode,
    required DateTime capturedAtUtc,
  }) async {
    var list = await _loadPendingQueue();
    list.add({
      'lat': lat,
      'lng': lng,
      'presenceStatus': presenceStatus,
      if (accuracy != null) 'accuracy': accuracy,
      if (batteryPercent != null) 'batteryPercent': batteryPercent,
      if (address != null && address.isNotEmpty) 'address': address,
      if (fullAddress != null && fullAddress.isNotEmpty) 'fullAddress': fullAddress,
      if (city != null && city.isNotEmpty) 'city': city,
      if (area != null && area.isNotEmpty) 'area': area,
      if (pincode != null && pincode.isNotEmpty) 'pincode': pincode,
      'timestamp': capturedAtUtc.toIso8601String(),
    });
    while (list.length > _maxPendingPresence) {
      list = list.sublist(list.length - _maxPendingPresence);
    }
    await _savePendingQueue(list);
    if (kDebugMode) {
      debugPrint(
        '[PresenceTracking] queued failed send (queue size=${list.length})',
      );
    }
  }

  /// Replay locally stored periodic presence points (e.g. after offline). Call on app resume.
  Future<void> flushPendingPresenceQueue() async {
    if (_taskInProgress) return;
    if (!await isTrackingAllowed()) return;

    var list = await _loadPendingQueue();
    if (list.isEmpty) return;

    final remaining = <Map<String, dynamic>>[];
    for (final m in list) {
      final lat = (m['lat'] as num?)?.toDouble();
      final lng = (m['lng'] as num?)?.toDouble();
      final ps = m['presenceStatus'] as String?;
      final ts = m['timestamp'] as String?;
      if (lat == null || lng == null || ps == null || ts == null) {
        continue;
      }
      DateTime? t;
      try {
        t = DateTime.parse(ts).toUtc();
      } catch (_) {
        continue;
      }
      final ok = await _sendPresence(
        lat: lat,
        lng: lng,
        presenceStatus: ps,
        accuracy: (m['accuracy'] as num?)?.toDouble(),
        batteryPercent: (m['batteryPercent'] as num?)?.toInt(),
        address: m['address'] as String?,
        fullAddress: m['fullAddress'] as String?,
        city: m['city'] as String?,
        area: m['area'] as String?,
        pincode: m['pincode'] as String?,
        timestampUtc: t,
      );
      if (!ok) remaining.add(m);
    }
    await _savePendingQueue(remaining);
    if (kDebugMode && AppConstants.logTrackingsToConsole && list.isNotEmpty) {
      debugPrint(
        '[Trackings] flush_pending sent=${list.length - remaining.length}/${list.length} remaining=${remaining.length}',
      );
    }
  }

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

  Future<void> _tick(Map<String, dynamic>? branchGeofence) async {
    if (!_isTracking) return;
    if (_taskInProgress) return;

    if (!await isTrackingAllowed()) {
      stopTracking();
      return;
    }

    final gf = branchGeofence;

    gl.Position? position;
    try {
      position = await _capturePresencePosition();
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[PresenceTracking] accurate position failed: $e');
      }
      return;
    }

    final lat = position.latitude;
    final lng = position.longitude;
    final accuracy = position.accuracy;
    int? batteryPercent;
    try {
      batteryPercent = await Battery().batteryLevel;
    } catch (_) {}
    final resolvedAddress = await AddressResolutionService.reverseGeocode(
      lat,
      lng,
    );

    final presenceStatus = _isInsideOffice(lat, lng, gf)
        ? 'in_office'
        : 'out_of_office';

    final capturedAt = DateTime.now().toUtc();
    final ok = await _sendPresence(
      lat: lat,
      lng: lng,
      presenceStatus: presenceStatus,
      accuracy: accuracy,
      batteryPercent: batteryPercent,
      address: resolvedAddress?.formattedAddress,
      fullAddress: resolvedAddress?.formattedAddress,
      city: resolvedAddress?.city ?? resolvedAddress?.state,
      area: resolvedAddress?.area,
      pincode: resolvedAddress?.pincode,
      timestampUtc: capturedAt,
    );
    if (!ok) {
      await _enqueueFailedPeriodicPresence(
        lat: lat,
        lng: lng,
        presenceStatus: presenceStatus,
        accuracy: accuracy,
        batteryPercent: batteryPercent,
        address: resolvedAddress?.formattedAddress,
        fullAddress: resolvedAddress?.formattedAddress,
        city: resolvedAddress?.city ?? resolvedAddress?.state,
        area: resolvedAddress?.area,
        pincode: resolvedAddress?.pincode,
        capturedAtUtc: capturedAt,
      );
    }
    if (kDebugMode) {
      debugPrint(
        '[PresenceTracking] tick presence=$presenceStatus sent=${ok ? "ok" : "fail"}',
      );
    }
  }

  Future<void> _periodicTick() async {
    if (!_isTracking || _taskInProgress) return;
    if (_periodicTickInProgress) return;
    if (!await isTrackingAllowed()) {
      stopTracking();
      return;
    }
    _periodicTickInProgress = true;
    try {
      final status = await getPresenceStatus();
      final gf = status['branchGeofence'] as Map<String, dynamic>?;
      await _tick(gf);
    } finally {
      _periodicTickInProgress = false;
    }
  }

  /// First send + 5-minute periodic uploads. Ensures a tracking record is inserted every 5 minutes while checked in.
  Future<void> _schedulePresenceSends() async {
    if (_taskInProgress) return;
    if (!await isTrackingAllowed()) return;

    _isTracking = true;
    await flushPendingPresenceQueue();
    try {
      final status = await getPresenceStatus();
      final gf = status['branchGeofence'] as Map<String, dynamic>?;
      await _tick(gf);
    } catch (e) {
      if (kDebugMode) debugPrint('[PresenceTracking] initial tick failed: $e');
    }
    _trackingTimer?.cancel();
    _trackingTimer = Timer.periodic(trackingInterval, (_) {
      _periodicTick();
    });
    if (kDebugMode) {
      debugPrint('[PresenceTracking] 5-min timer started (interval: ${trackingInterval.inMinutes} min)');
    }
  }

  /// Insert one tracking record immediately when app is opened: status "active", presenceStatus "in_office", full address details.
  Future<void> recordAppOpened() async {
    if (_taskInProgress) return;
    if (!await isTrackingAllowed()) return;

    try {
      final position = await _capturePresencePosition();
      int? batteryPercent;
      try {
        batteryPercent = await Battery().batteryLevel;
      } catch (_) {}
      final resolvedAddress = await AddressResolutionService.reverseGeocode(
        position.latitude,
        position.longitude,
      );

      await _sendPresence(
        lat: position.latitude,
        lng: position.longitude,
        presenceStatus: 'in_office',
        status: 'active',
        accuracy: position.accuracy,
        batteryPercent: batteryPercent,
        address: resolvedAddress?.formattedAddress,
        fullAddress: resolvedAddress?.formattedAddress,
        city: resolvedAddress?.city ?? resolvedAddress?.state,
        area: resolvedAddress?.area,
        pincode: resolvedAddress?.pincode,
      );
      if (kDebugMode) {
        debugPrint('[PresenceTracking] recordAppOpened: active, in_office sent');
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[PresenceTracking] recordAppOpened failed: $e');
    }
  }

  Future<void> recordAppClosed() async {
    if (_sendingAppClosed) return;
    if (_taskInProgress) return;
    if (!await isTrackingAllowed()) return;

    _sendingAppClosed = true;
    try {
      final status = await getPresenceStatus();
      final branchGeofence = status['branchGeofence'] as Map<String, dynamic>?;
      final position = await _capturePresencePosition();
      int? batteryPercent;
      try {
        batteryPercent = await Battery().batteryLevel;
      } catch (_) {}
      final resolvedAddress = await AddressResolutionService.reverseGeocode(
        position.latitude,
        position.longitude,
      );

      await _sendPresence(
        lat: position.latitude,
        lng: position.longitude,
        presenceStatus: 'app_closed',
        status: 'inactive',
        accuracy: position.accuracy,
        batteryPercent: batteryPercent,
        address: resolvedAddress?.formattedAddress,
        fullAddress: resolvedAddress?.formattedAddress,
        city: resolvedAddress?.city ?? resolvedAddress?.state,
        area: resolvedAddress?.area,
        pincode: resolvedAddress?.pincode,
      );

      _isInsideOffice(position.latitude, position.longitude, branchGeofence);
    } catch (_) {
    } finally {
      _sendingAppClosed = false;
    }
  }

  /// Start or refresh 5-minute presence uploads (after check-in).
  Future<void> startTracking() async {
    await _schedulePresenceSends();
  }

  /// After app returns to foreground — timer often pauses in background; send now and restart interval.
  Future<void> onAppLifecycleResumed() async {
    if (_taskInProgress) return;
    if (!await isTrackingAllowed()) return;
    _isTracking = true;
    await flushPendingPresenceQueue();
    await _periodicTick();
    _trackingTimer?.cancel();
    _trackingTimer = Timer.periodic(trackingInterval, (_) {
      _periodicTick();
    });
  }

  Future<void> stopTracking() async {
    _isTracking = false;
    _taskInProgress = false;
    _trackingTimer?.cancel();
    _trackingTimer = null;
    await clearTrackingAllowed();
  }

  void pausePresenceTracking() {
    _taskInProgress = true;
    _trackingTimer?.cancel();
    _trackingTimer = null;
  }

  Future<void> resumePresenceTracking() async {
    _taskInProgress = false;
    if (!await isTrackingAllowed()) return;
    await _schedulePresenceSends();
  }

  bool get isTracking => _isTracking;
}
