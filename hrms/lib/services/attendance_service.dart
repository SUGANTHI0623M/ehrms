import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/constants.dart';

import 'package:flutter/foundation.dart';

class AttendanceService {
  final String baseUrl = AppConstants.baseUrl;

  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<Map<String, dynamic>> checkIn(
    double lat,
    double lng,
    String address, {
    String? area,
    String? city,
    String? pincode,
    String? selfie,
  }) async {
    try {
      final headers = await _getHeaders();
      final body = {
        'latitude': lat,
        'longitude': lng,
        'address': address,
        'area': area,
        'city': city,
        'pincode': pincode,
        'selfie': selfie,
      };

      debugPrint('--- CHECK IN REQUEST ---');
      debugPrint('URL: $baseUrl/attendance/checkin');
      debugPrint('Headers: $headers');
      debugPrint('Body: $body');

      final response = await http.post(
        Uri.parse('$baseUrl/attendance/checkin'),
        headers: headers,
        body: jsonEncode(body),
      );

      debugPrint('--- CHECK IN RESPONSE ---');
      debugPrint('Status: ${response.statusCode}');
      debugPrint('Body: ${response.body}');

      final data = jsonDecode(response.body);

      if (response.statusCode == 201) {
        return {'success': true, 'data': data};
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Check-in failed',
        };
      }
    } catch (e) {
      debugPrint('CHECK IN EXCEPTION: $e');
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> checkOut(
    double lat,
    double lng,
    String address, {
    String? area,
    String? city,
    String? pincode,
    String? selfie,
  }) async {
    try {
      final headers = await _getHeaders();
      final body = {
        'latitude': lat,
        'longitude': lng,
        'address': address,
        'area': area,
        'city': city,
        'pincode': pincode,
        'selfie': selfie,
      };

      debugPrint('--- CHECK OUT REQUEST ---');
      debugPrint('URL: $baseUrl/attendance/checkout');
      debugPrint('Headers: $headers');
      debugPrint('Body: $body');

      final response = await http.put(
        Uri.parse('$baseUrl/attendance/checkout'),
        headers: headers,
        body: jsonEncode(body),
      );

      debugPrint('--- CHECK OUT RESPONSE ---');
      debugPrint('Status: ${response.statusCode}');
      debugPrint('Body: ${response.body}');

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {'success': true, 'data': data};
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Check-out failed',
        };
      }
    } catch (e) {
      debugPrint('CHECK OUT EXCEPTION: $e');
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> getTodayAttendance() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$baseUrl/attendance/today'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        // API returns null if no record, or the object
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data};
      } else {
        return {'success': false, 'message': 'Failed to fetch status'};
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> getAttendanceByDate(String date) async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        // Assuming backend supports filtering by date query param
        Uri.parse('$baseUrl/attendance/today?date=$date'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data};
      } else {
        return {'success': false, 'message': 'Failed to fetch attendance'};
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> getAttendanceHistory({
    int page = 1,
    int limit = 10,
    String? date,
  }) async {
    try {
      final headers = await _getHeaders();
      String url = '$baseUrl/attendance/history?page=$page&limit=$limit';
      if (date != null) {
        url += '&date=$date';
      }

      final response = await http.get(Uri.parse(url), headers: headers);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data};
      } else {
        return {'success': false, 'message': 'Failed to fetch history'};
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }
}
