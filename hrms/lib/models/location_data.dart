import 'package:background_location_tracker/background_location_tracker.dart';

class Location {
  final double? latitude;
  final double? longitude;
  final double? speed;
  final double? altitude;
  final double? accuracy;
  final double? bearing;
  final double? time;

  Location({
    this.latitude,
    this.longitude,
    this.speed,
    this.altitude,
    this.accuracy,
    this.bearing,
    this.time,
  });

  // Factory method to create a Location object from BackgroundLocationUpdateData
  factory Location.fromBackgroundData(BackgroundLocationUpdateData data) {
    return Location(
      latitude: data.lat,
      longitude: data.lon,
      speed: data.speed,
      altitude: data.alt,
      accuracy: data
          .horizontalAccuracy, // Assuming horizontalAccuracy is the primary accuracy
      bearing: data.course, // Assuming course is the bearing
      time: DateTime.now().millisecondsSinceEpoch.toDouble(),
    );
  }
}
