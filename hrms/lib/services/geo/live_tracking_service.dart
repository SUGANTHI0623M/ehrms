import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import '../../config/constants.dart';

/// Persists active live tracking state and sends tracking in background.
/// Used so tracking continues when app is closed or in background.
class LiveTrackingService {
  static const _keyActive = 'live_tracking_active';
  static const _keyTaskMongoId = 'live_tracking_task_mongo_id';
  static const _keyTaskId = 'live_tracking_task_id';
  static const _keyPickupLat = 'live_tracking_pickup_lat';
  static const _keyPickupLng = 'live_tracking_pickup_lng';
  static const _keyDropoffLat = 'live_tracking_dropoff_lat';
  static const _keyDropoffLng = 'live_tracking_dropoff_lng';
  static const _keyTaskJson = 'live_tracking_task_json';
  static const _keyBaseUrl = 'live_tracking_base_url';
  static const _keyToken = 'live_tracking_token';

  static final LiveTrackingService _instance = LiveTrackingService._internal();
  factory LiveTrackingService() => _instance;
  LiveTrackingService._internal();

  /// Start live tracking - persist state for background sending.
  Future<void> startTracking({
    required String taskMongoId,
    required String taskId,
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    String? taskJson,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyActive, true);
    await prefs.setString(_keyTaskMongoId, taskMongoId);
    await prefs.setString(_keyTaskId, taskId);
    await prefs.setDouble(_keyPickupLat, pickupLat);
    await prefs.setDouble(_keyPickupLng, pickupLng);
    await prefs.setDouble(_keyDropoffLat, dropoffLat);
    await prefs.setDouble(_keyDropoffLng, dropoffLng);
    if (taskJson != null) await prefs.setString(_keyTaskJson, taskJson);
    await prefs.setString(_keyBaseUrl, AppConstants.baseUrl);
    final token = prefs.getString('token');
    if (token != null) {
      await prefs.setString(_keyToken, token);
    } else {
      debugPrint(
        '[LiveTrackingService] WARNING: no token in prefs - background tracking may fail',
      );
    }
    debugPrint(
      '[LiveTrackingService] Started: taskMongoId=$taskMongoId tokenPresent=${token != null}',
    );
  }

  /// Stop live tracking - clear persisted state.
  Future<void> stopTracking() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyActive);
    await prefs.remove(_keyTaskMongoId);
    await prefs.remove(_keyTaskId);
    await prefs.remove(_keyPickupLat);
    await prefs.remove(_keyPickupLng);
    await prefs.remove(_keyDropoffLat);
    await prefs.remove(_keyDropoffLng);
    await prefs.remove(_keyTaskJson);
    await prefs.remove(_keyBaseUrl);
    await prefs.remove(_keyToken);
    debugPrint('[LiveTrackingService] Stopped');
  }

  /// Check if live tracking is active.
  Future<bool> isActive() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyActive) == true;
  }

  /// Get active task info for restoring LiveTrackingScreen.
  Future<Map<String, dynamic>?> getActiveTaskInfo() async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(_keyActive) != true) return null;
    final taskMongoId = prefs.getString(_keyTaskMongoId);
    if (taskMongoId == null || taskMongoId.isEmpty) return null;
    return {
      'taskMongoId': taskMongoId,
      'taskId': prefs.getString(_keyTaskId) ?? '',
      'pickupLat': prefs.getDouble(_keyPickupLat) ?? 0.0,
      'pickupLng': prefs.getDouble(_keyPickupLng) ?? 0.0,
      'dropoffLat': prefs.getDouble(_keyDropoffLat) ?? 0.0,
      'dropoffLng': prefs.getDouble(_keyDropoffLng) ?? 0.0,
      'taskJson': prefs.getString(_keyTaskJson),
    };
  }

  /// Send tracking from background isolate. Uses http for isolate compatibility.
  /// Called from main.dart backgroundCallback and LocationService when app in background.
  static Future<void> sendTrackingFromBackground(
    double lat,
    double lng, {
    int? batteryPercent,
    String? movementType,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final active = prefs.getBool(_keyActive);
      if (active != true) {
        debugPrint(
          '[LiveTracking:BG] Skipped: live tracking not active (active=$active)',
        );
        return;
      }
      final taskMongoId = prefs.getString(_keyTaskMongoId);
      final baseUrl = prefs.getString(_keyBaseUrl);
      final token = prefs.getString(_keyToken);
      if (taskMongoId == null || taskMongoId.isEmpty) {
        debugPrint('[LiveTracking:BG] Skipped: no taskMongoId');
        return;
      }
      if (baseUrl == null || baseUrl.isEmpty) {
        debugPrint('[LiveTracking:BG] Skipped: no baseUrl');
        return;
      }
      if (token == null || token.isEmpty) {
        debugPrint('[LiveTracking:BG] Skipped: no token');
        return;
      }

      final destinationLat = prefs.getDouble(_keyDropoffLat);
      final destinationLng = prefs.getDouble(_keyDropoffLng);

      final url = baseUrl.replaceAll(RegExp(r'/$'), '');
      final uri = Uri.parse('$url/tracking/store');
      final body = <String, dynamic>{
        'taskId': taskMongoId,
        'lat': lat,
        'lng': lng,
        'timestamp': DateTime.now().toUtc().toIso8601String(),
      };
      if (batteryPercent != null) body['batteryPercent'] = batteryPercent;
      if (movementType != null) body['movementType'] = movementType;
      if (destinationLat != null) body['destinationLat'] = destinationLat;
      if (destinationLng != null) body['destinationLng'] = destinationLng;

      debugPrint(
        '[LiveTracking:BG] POST $uri taskId=$taskMongoId lat=$lat lng=$lng',
      );
      final response = await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(body),
      );
      if (response.statusCode >= 200 && response.statusCode < 300) {
        debugPrint('[LiveTracking:BG] Sent OK: status=${response.statusCode}');
      } else {
        debugPrint(
          '[LiveTracking:BG] Send failed: status=${response.statusCode} body=${response.body}',
        );
      }
    } catch (e, st) {
      debugPrint('[LiveTracking:BG] Exception: $e');
      debugPrint('[LiveTracking:BG] Stack: $st');
    }
  }
}
