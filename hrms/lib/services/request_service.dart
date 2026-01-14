import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/constants.dart';
import 'package:flutter/foundation.dart';

class RequestService {
  final String baseUrl = AppConstants.baseUrl;

  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(
      'token',
    ); // Ensure token is saved during login
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  // --- LEAVE ---

  Future<Map<String, dynamic>> applyLeave(Map<String, dynamic> data) async {
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$baseUrl/requests/leave'),
        headers: headers,
        body: jsonEncode(data),
      );

      final responseData = jsonDecode(response.body);

      if (response.statusCode == 201) {
        return {'success': true, 'data': responseData};
      } else {
        return {
          'success': false,
          'message': responseData['message'] ?? 'Failed to apply leave',
        };
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> getLeaveRequests({String? status}) async {
    try {
      final headers = await _getHeaders();
      String url = '$baseUrl/requests/leave';
      if (status != null && status != 'All Status') {
        url += '?status=$status';
      }

      final response = await http.get(Uri.parse(url), headers: headers);
      final responseData = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {'success': true, 'data': responseData};
      } else {
        return {
          'success': false,
          'message':
              responseData['message'] ?? 'Failed to fetch leave requests',
        };
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  // --- LOAN ---

  Future<Map<String, dynamic>> applyLoan(Map<String, dynamic> data) async {
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$baseUrl/requests/loan'),
        headers: headers,
        body: jsonEncode(data),
      );

      final responseData = jsonDecode(response.body);

      if (response.statusCode == 201) {
        return {'success': true, 'data': responseData};
      } else {
        return {
          'success': false,
          'message': responseData['message'] ?? 'Failed to apply loan',
        };
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> getLoanRequests({String? status}) async {
    try {
      final headers = await _getHeaders();
      String url = '$baseUrl/requests/loan';
      if (status != null && status != 'All Status') {
        url += '?status=$status';
      }

      final response = await http.get(Uri.parse(url), headers: headers);
      final responseData = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {'success': true, 'data': responseData};
      } else {
        return {
          'success': false,
          'message': responseData['message'] ?? 'Failed to fetch loan requests',
        };
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  // --- EXPENSE ---

  Future<Map<String, dynamic>> applyExpense(Map<String, dynamic> data) async {
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$baseUrl/requests/expense'),
        headers: headers,
        body: jsonEncode(data),
      );

      final responseData = jsonDecode(response.body);

      if (response.statusCode == 201) {
        return {'success': true, 'data': responseData};
      } else {
        return {
          'success': false,
          'message': responseData['message'] ?? 'Failed to apply expense',
        };
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> getExpenseRequests({String? status}) async {
    try {
      final headers = await _getHeaders();
      String url = '$baseUrl/requests/expense';
      if (status != null && status != 'All Status') {
        url += '?status=$status';
      }

      final response = await http.get(Uri.parse(url), headers: headers);
      final responseData = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {'success': true, 'data': responseData};
      } else {
        return {
          'success': false,
          'message':
              responseData['message'] ?? 'Failed to fetch expense requests',
        };
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  // --- PAYSLIP ---

  Future<Map<String, dynamic>> requestPayslip(Map<String, dynamic> data) async {
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$baseUrl/requests/payslip'),
        headers: headers,
        body: jsonEncode(data),
      );

      final responseData = jsonDecode(response.body);

      if (response.statusCode == 201) {
        return {'success': true, 'data': responseData};
      } else {
        return {
          'success': false,
          'message': responseData['message'] ?? 'Failed to request payslip',
        };
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> getPayslipRequests({String? status}) async {
    try {
      final headers = await _getHeaders();
      String url = '$baseUrl/requests/payslip';
      if (status != null && status != 'All Status') {
        url += '?status=$status';
      }

      final response = await http.get(Uri.parse(url), headers: headers);
      final responseData = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {'success': true, 'data': responseData};
      } else {
        return {
          'success': false,
          'message':
              responseData['message'] ?? 'Failed to fetch payslip requests',
        };
      }
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }
}
