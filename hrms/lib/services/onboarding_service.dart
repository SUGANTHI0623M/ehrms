import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/constants.dart';

class OnboardingService {
  final String baseUrl = AppConstants.baseUrl;

  Future<Map<String, dynamic>> getMyOnboarding() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');

      if (token == null) {
        return {'success': false, 'message': 'Not authenticated'};
      }

      final response = await http
          .get(
            Uri.parse('$baseUrl/onboarding/my-onboarding'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        return {'success': true, 'data': body['data']};
      } else {
        print(
          'DEBUG: Onboarding API Error. Status: ${response.statusCode}, Body: ${response.body}',
        );
        final body = jsonDecode(response.body);
        String message = 'Failed to fetch onboarding data';
        if (body['error'] != null && body['error']['message'] != null) {
          message = body['error']['message'];
        } else if (body['message'] != null) {
          message = body['message'];
        }
        return {'success': false, 'message': message};
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }
}
