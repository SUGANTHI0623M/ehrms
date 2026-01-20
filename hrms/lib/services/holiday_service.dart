import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/constants.dart';
import '../models/holiday_model.dart';
import 'dart:io';
import 'dart:async';

class HolidayService {
  final String baseUrl = AppConstants.baseUrl;

  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? '';
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<Map<String, dynamic>> getHolidays({int? year, String? search}) async {
    try {
      final headers = await _getHeaders();
      String url = '$baseUrl/holidays/employee?limit=100'; // Default limit

      if (year != null) {
        url += '&year=$year';
      }
      if (search != null && search.isNotEmpty) {
        url += '&search=$search';
      }

      final response = await http
          .get(Uri.parse(url), headers: headers)
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          final data = body['data'];
          List<Holiday> holidays = [];
          if (data['holidays'] != null) {
            holidays = (data['holidays'] as List)
                .map((json) => Holiday.fromJson(json))
                .toList();
          }
          return {'success': true, 'data': holidays};
        } else {
          return {
            'success': false,
            'message': body['error']?['message'] ?? 'Failed to load holidays',
          };
        }
      } else {
        return _handleErrorResponse(response, 'Failed to fetch holidays');
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Map<String, dynamic> _handleErrorResponse(
    http.Response response,
    String defaultMessage,
  ) {
    String message = defaultMessage;
    try {
      final errorData = jsonDecode(response.body);
      if (errorData['error'] != null && errorData['error']['message'] != null) {
        message = errorData['error']['message'];
      } else if (errorData['message'] != null) {
        message = errorData['message'];
      }
    } catch (_) {
      message = 'Server error: ${response.statusCode}';
    }
    return {'success': false, 'message': message};
  }

  String _handleException(dynamic error) {
    if (error is SocketException) {
      return 'Network error: Please check your internet connection.';
    } else if (error is TimeoutException) {
      return 'Connection timed out. Please try again.';
    } else if (error is FormatException) {
      return 'Invalid response format from server.';
    }
    return error.toString();
  }
}
