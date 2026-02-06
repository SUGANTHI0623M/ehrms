// hrms/lib/config/constants.dart
class AppConstants {
  /// Production API – use for release builds.
  static const String baseUrl = 'https://ehrms.askeva.net/api';

  /// Local dev – backend on port 9001. Use your machine's IP for physical device.
 //static const String baseUrl = 'http://192.168.16.104:9001/api';
  // Android emulator: use 10.0.2.2 to reach host
  // stati
  //c const String baseUrl = 'http://10.0.2.2:9001/api';

  /// Google Maps API key for Places and Directions API (road routes).
  /// If Places/Directions return no data or straight-line only, check key restrictions
  /// (unrestricted or allow this app's package/bundle ID).
  static const String googleMapsApiKey =
      'AIzaSyBDN9W0gmkubT8jrEtoJ96g7IgxXsSmgsM';

  /// Privacy policy URL (required for Play Store).
  static const String privacyPolicyUrl =
      'https://doc-hosting.flycricket.io/aehrms-privacy-policy/3c65b556-5dcd-4a0d-900e-d2a4801acea0/privacy';
}
