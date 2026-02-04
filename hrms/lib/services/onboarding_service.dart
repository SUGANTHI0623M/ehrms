import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/constants.dart';
import 'api_client.dart';

class OnboardingService {
  final ApiClient _api = ApiClient();

  Future<void> _setToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token != null) _api.setAuthToken(token);
  }

  Future<Map<String, dynamic>> getMyOnboarding() async {
    try {
      await _setToken();
      final response = await _api.dio.get<Map<String, dynamic>>('/onboarding/my-onboarding');
      final body = response.data;
      if (body != null && body['data'] != null) {
        return {'success': true, 'data': body['data']};
      }
      return {'success': true, 'data': body?['data']};
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return {'success': true, 'data': null};
      }
      final d = e.response?.data;
      String message = 'Failed to fetch onboarding data';
      if (d is Map) {
        message = (d['error']?['message'] ?? d['message']) as String? ?? message;
      }
      return {'success': false, 'message': message};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> uploadDocument(
    String onboardingId,
    String documentId,
    File file,
  ) async {
    try {
      await _setToken();
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          file.path,
          filename: file.path.split(RegExp(r'[/\\]')).last,
        ),
      });
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/onboarding/$onboardingId/documents/$documentId/upload',
        data: formData,
      );
      final body = response.data;
      if (body != null && body['data'] != null) {
        return {'success': true, 'data': body['data']};
      }
      String message = 'Failed to upload document';
      if (body != null) {
        message = (body['error']?['message'] ?? body['message']) as String? ?? message;
      }
      return {'success': false, 'message': message};
    } on DioException catch (e) {
      final d = e.response?.data;
      String message = 'Failed to upload document';
      if (d is Map) {
        message = (d['error']?['message'] ?? d['message']) as String? ?? message;
      }
      return {'success': false, 'message': message};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }
}
