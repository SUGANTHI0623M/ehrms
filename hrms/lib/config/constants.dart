// hrms/lib/config/constants.dart
class AppConstants {
  // Production (required for Google Play – HTTPS only)
  //static const String baseUrl = 'https://ehrms.askeva.io/api';

  // For local development, temporarily switch to your machine's IP, e.g.:
   static const String baseUrl = 'http://192.168.16.102:9001/api';
  // Android Emulator: use http://10.0.2.2:8001/api

  /// Privacy Policy URL – set to your published policy page for Play Store compliance.
  //**static const String privacyPolicyUrl = 'https://ehrms.askeva.io/Privacypolicy';
 static const String privacyPolicyUrl = 'https://ehrms.askeva.net/Privacypolicy';

}
