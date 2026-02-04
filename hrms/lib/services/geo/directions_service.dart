// Google Directions API: road route, distance, duration, and polyline.
// Uses API for all values; fallback to straight-line only if API fails.
// Requires: Directions API enabled, billing enabled, API key allows this API.

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:hrms/config/constants.dart';
import 'package:hrms/services/api_client.dart';
import 'package:hrms/utils/polyline_utils.dart';

class DirectionsResult {
  final double distanceKm;
  final String? durationText;
  final List<LatLng> polylinePoints;

  const DirectionsResult({
    required this.distanceKm,
    this.durationText,
    this.polylinePoints = const [],
  });
}

class DirectionsService {
  /// Fetches driving route from Google Directions API.
  /// Returns distance (km), duration text, and decoded polyline points.
  /// On API failure, returns straight-line distance only (no duration, two-point line).
  static Future<DirectionsResult> getDistanceAndDuration({
    required double originLat,
    required double originLng,
    required double destLat,
    required double destLng,
  }) async {
    final apiKey = AppConstants.googleMapsApiKey;
    if (apiKey != null && apiKey.isNotEmpty) {
      try {
        final url =
            'https://maps.googleapis.com/maps/api/directions/json'
            '?origin=$originLat,$originLng'
            '&destination=$destLat,$destLng'
            '&mode=driving'
            '&key=$apiKey';
        final response = await ApiClient().dio.get<Map<String, dynamic>>(
          url,
          options: Options(receiveTimeout: const Duration(seconds: 10)),
        );
        final data = response.data;
        if (data != null) {
          final status = data['status'] as String?;
          final errorMessage = data['error_message'] as String?;
          if (status == 'OK') {
            final routes = data['routes'] as List<dynamic>?;
            if (routes != null && routes.isNotEmpty) {
              final route = routes.first as Map<String, dynamic>;
              final legs = route['legs'] as List<dynamic>?;
              List<LatLng> polylinePoints = [];
              final overview =
                  route['overview_polyline'] as Map<String, dynamic>?;
              if (overview != null) {
                final encoded = overview['points'] as String?;
                if (encoded != null && encoded.isNotEmpty) {
                  polylinePoints = PolylineUtils.decode(encoded);
                }
              }
              if (polylinePoints.isEmpty) {
                if (kDebugMode) {
                  debugPrint(
                    '[DirectionsService] No overview_polyline in response, '
                    'using A-B line',
                  );
                }
                polylinePoints = [
                  LatLng(originLat, originLng),
                  LatLng(destLat, destLng),
                ];
              }
              double km = 0;
              String? durationText;
              if (legs != null && legs.isNotEmpty) {
                final leg = legs.first as Map<String, dynamic>;
                final distance = leg['distance'] as Map<String, dynamic>?;
                final duration = leg['duration'] as Map<String, dynamic>?;
                if (distance != null && distance['value'] != null) {
                  km = (distance['value'] as num).toDouble() / 1000;
                }
                if (duration != null && duration['text'] != null) {
                  durationText = '~${duration['text'] as String}';
                }
              }
              return DirectionsResult(
                distanceKm: km,
                durationText: durationText,
                polylinePoints: polylinePoints,
              );
            }
          }
          if (kDebugMode && status != null && status != 'OK') {
            debugPrint(
              '[DirectionsService] status=$status error_message=$errorMessage',
            );
          }
        }
      } on DioException catch (e) {
        if (kDebugMode) {
          debugPrint(
            '[DirectionsService] DioException: ${e.type} '
            '${e.response?.statusCode} ${e.response?.data}',
          );
        }
      } catch (e) {
        if (kDebugMode) debugPrint('[DirectionsService] error: $e');
      }
    }
    // Fallback: straight-line distance only (no ETA)
    final meters = Geolocator.distanceBetween(
      originLat,
      originLng,
      destLat,
      destLng,
    );
    final km = meters / 1000;
    return DirectionsResult(
      distanceKm: km,
      durationText: null,
      polylinePoints: [LatLng(originLat, originLng), LatLng(destLat, destLng)],
    );
  }
}
