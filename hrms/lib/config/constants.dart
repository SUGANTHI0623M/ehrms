// hrms/lib/config/constants.dart
class AppConstants {
  // static const String baseUrl = 'https://ehrms.askeva.io/api';
  static const String baseUrl = 'http://192.168.16.103:9001/api';

  /// Google Maps API key for Directions and Places (REST calls from app).
  /// Ensure: Directions API + Places API enabled, billing enabled.
  /// If Places/Directions return no data or straight-line only, check key restrictions
  /// (unrestricted or allow this app's package/bundle ID).
  static const String? googleMapsApiKey =
      'AIzaSyALUZkBfmbUvpOYOJoMSuFNBb9lTd4O4cc';

  /// Privacy policy URL (required for Play Store).
  static const String privacyPolicyUrl =
      'https://doc-hosting.flycricket.io/aehrms-privacy-policy/3c65b556-5dcd-4a0d-900e-d2a4801acea0/privacy';
}
