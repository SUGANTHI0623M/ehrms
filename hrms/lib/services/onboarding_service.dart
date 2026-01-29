import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import '../config/constants.dart';

class OnboardingService {
  final String baseUrl = AppConstants.baseUrl;

  Future<Map<String, dynamic>> getMyOnboarding() async {
    try {
      print('[OnboardingService] getMyOnboarding() called');
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');

      if (token == null) {
        print('[OnboardingService] ❌ No token found');
        return {'success': false, 'message': 'Not authenticated'};
      }

      print('[OnboardingService] Fetching from: $baseUrl/onboarding/my-onboarding');
      final response = await http
          .get(
            Uri.parse('$baseUrl/onboarding/my-onboarding'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 15));

      print('[OnboardingService] Response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        print('[OnboardingService] ✅ Success response received');
        
        if (body['data'] != null && body['data']['onboarding'] != null) {
          final onboarding = body['data']['onboarding'];
          final documents = onboarding['documents'] as List? ?? [];
          print('[OnboardingService] Onboarding ID: ${onboarding['_id']}');
          print('[OnboardingService] Documents count: ${documents.length}');
          
          if (documents.isNotEmpty) {
            print('[OnboardingService] Document list:');
            for (var i = 0; i < documents.length; i++) {
              final doc = documents[i];
              print('  [$i] ${doc['name']} - Status: ${doc['status']} - Has URL: ${doc['url'] != null}');
            }
          } else {
            print('[OnboardingService] ⚠️ Documents array is empty!');
          }
        } else {
          print('[OnboardingService] ⚠️ Onboarding data structure unexpected');
          print('[OnboardingService] Response body: $body');
        }
        
        return {'success': true, 'data': body['data']};
      } else if (response.statusCode == 404) {
        print('[OnboardingService] ⚠️ 404 - Onboarding not found');
        // Graceful fallback: If endpoint missing, return null data so UI just shows empty/nothing
        return {'success': true, 'data': null};
      } else {
        print('[OnboardingService] ❌ API Error. Status: ${response.statusCode}');
        print('[OnboardingService] Response body: ${response.body}');
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
      print('[OnboardingService] ❌ Exception: $e');
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> uploadDocument(
    String onboardingId,
    String documentId,
    File file,
  ) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');

      if (token == null) {
        return {'success': false, 'message': 'Not authenticated'};
      }

      final dio = Dio();
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          file.path,
          filename: file.path.split('/').last,
        ),
      });

      final response = await dio.post(
        '$baseUrl/onboarding/$onboardingId/documents/$documentId/upload',
        data: formData,
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
          },
        ),
      );

      if (response.statusCode == 200) {
        return {'success': true, 'data': response.data['data']};
      } else {
        String message = 'Failed to upload document';
        if (response.data != null && response.data['error'] != null) {
          message = response.data['error']['message'] ?? message;
        } else if (response.data != null && response.data['message'] != null) {
          message = response.data['message'];
        }
        return {'success': false, 'message': message};
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }
}
