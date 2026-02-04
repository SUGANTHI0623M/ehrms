// Decode Google's encoded polyline (e.g. from Directions API overview_polyline.points).
// See: https://developers.google.com/maps/documentation/utilities/polylinealgorithm

import 'package:google_maps_flutter/google_maps_flutter.dart';

class PolylineUtils {
  /// Decodes an encoded polyline string into a list of [LatLng].
  /// Returns empty list if input is null or invalid.
  static List<LatLng> decode(String? encoded) {
    if (encoded == null || encoded.isEmpty) return [];

    final points = <LatLng>[];
    int index = 0;
    int len = encoded.length;
    int lat = 0;
    int lng = 0;

    while (index < len) {
      int b;
      int shift = 0;
      int result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.add(LatLng(lat / 1e5, lng / 1e5));
    }
    return points;
  }
}
