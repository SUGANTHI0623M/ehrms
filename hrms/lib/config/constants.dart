// hrms/lib/config/constants.dart
class AppConstants {
  /// Production API – use for release builds.
  static const String baseUrl = 'https://ehrms.askeva.net/api';

  /// Local dev – backend on port 9001. Use your machine's IP for physical device.
  /// For LMS (and all) data to match the web for the same user, point [baseUrl]
  /// to the same backend the web frontend uses (e.g. production or same dev server).
 // static const String baseUrl = 'http://192.168.16.107:9001/api';

  // Android emulator: use 10.0.2.2 to reach host
  // stati
  // const String baseUrl = 'http://10.0.2.2:9001/api';

  /// Google Maps API key for Places and Directions API (road routes).
  /// If Places/Directions return no data or straight-line only, check key restrictions
  /// (unrestricted or allow this app's package/bundle ID).
  static const String googleMapsApiKey =
      'AIzaSyBDN9W0gmkubT8jrEtoJ96g7IgxXsSmgsM';

  /// Privacy policy URL (required for Play Store).
  static const String privacyPolicyUrl =
      'https://doc-hosting.flycricket.io/aehrms-privacy-policy/3c65b556-5dcd-4a0d-900e-d2a4801acea0/privacy';

  /// Base URL without /api for file/asset paths (e.g. thumbnails, uploads).
  static String get fileBaseUrl {
    final u = baseUrl;
    if (u.endsWith('/api')) return u.substring(0, u.length - 4);
    return u.replaceAll(RegExp(r'/+$'), '');
  }

  /// When true, attendance selfie is verified against profile photo (face matching).
  /// When false, only on-device face detection runs; no server-side face matching.
  static const bool enableAttendanceFaceMatching = false;

  /// When true, show the lead/form fill step on arrived screen after getting a call (task).
  /// When false, form step is hidden and task can be completed without filling the form (code remains, just not shown).
  static const bool showLeadFormAfterCall = false;

  /// Resolve LMS file path to full URL (handles relative paths and full URLs).
  static String getLmsFileUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http://') ||
        path.startsWith('https://') ||
        path.startsWith('data:'))
      return path;
    final p = path.startsWith('/') ? path : '/$path';
    return '$fileBaseUrl$p';
  }
}
