import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/constants.dart';

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

  // --- DASHBOARD ---

  Future<Map<String, dynamic>> getDashboardData() async {
    try {
      final headers = await _getHeaders();
      final response = await http
          .get(Uri.parse('$baseUrl/dashboard/employee'), headers: headers)
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          return {'success': true, 'data': body['data']};
        }
        return {
          'success': false,
          'message': body['message'] ?? 'Error fetching data',
        };
      } else {
        return _handleErrorResponse(response, 'Failed to fetch dashboard data');
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  // --- LEAVE ---

  Future<Map<String, dynamic>> getLeaveTypes() async {
    try {
      final headers = await _getHeaders();
      final response = await http
          .get(Uri.parse('$baseUrl/requests/leave-types'), headers: headers)
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        return {'success': true, 'data': body['data']};
      } else {
        return _handleErrorResponse(response, 'Failed to fetch leave types');
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<Map<String, dynamic>> applyLeave(Map<String, dynamic> data) async {
    try {
      final headers = await _getHeaders();
      final response = await http
          .post(
            Uri.parse('$baseUrl/requests/leave'),
            headers: headers,
            body: jsonEncode(data),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 201) {
        final body = jsonDecode(response.body);
        // Normalize response
        var responseData = body;
        if (body is Map &&
            body.containsKey('data') &&
            body['data'] is Map &&
            body['data'].containsKey('leave')) {
          responseData = body['data']['leave'];
        } else if (body is Map && body.containsKey('data')) {
          responseData = body['data'];
        }
        return {'success': true, 'data': responseData};
      } else {
        return _handleErrorResponse(response, 'Failed to apply leave');
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<Map<String, dynamic>> getLeaveRequests({
    String? status,
    String? search,
    DateTime? startDate,
    DateTime? endDate,
    int page = 1,
    int limit = 10,
  }) async {
    try {
      final headers = await _getHeaders();
      String url = '$baseUrl/requests/leave';
      List<String> queryParams = ['page=$page', 'limit=$limit'];

      if (status != null && status != 'All Status') {
        queryParams.add('status=$status');
      }
      if (search != null && search.isNotEmpty) {
        queryParams.add('search=$search');
      }
      if (startDate != null) {
        queryParams.add('startDate=${startDate.toIso8601String()}');
      }
      if (endDate != null) {
        queryParams.add('endDate=${endDate.toIso8601String()}');
      }

      url += '?${queryParams.join('&')}';

      final response = await http
          .get(Uri.parse(url), headers: headers)
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body is Map && body['success'] == true) {
          return {'success': true, 'data': body['data']};
        }
        return {'success': true, 'data': body};
      } else {
        return _handleErrorResponse(response, 'Failed to fetch leave requests');
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  // --- LOAN ---

  Future<Map<String, dynamic>> applyLoan(Map<String, dynamic> data) async {
    try {
      final headers = await _getHeaders();
      final response = await http
          .post(
            Uri.parse('$baseUrl/requests/loan'),
            headers: headers,
            body: jsonEncode(data),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 201) {
        final body = jsonDecode(response.body);
        var responseData = body;
        if (body is Map && body.containsKey('data')) {
          responseData = body['data'];
        }
        return {'success': true, 'data': responseData};
      } else {
        return _handleErrorResponse(response, 'Failed to apply loan');
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<Map<String, dynamic>> getLoanRequests({
    String? status,
    String? search,
    DateTime? startDate,
    DateTime? endDate,
    int page = 1,
    int limit = 10,
  }) async {
    try {
      final headers = await _getHeaders();
      String url = '$baseUrl/requests/loan';
      List<String> queryParams = ['page=$page', 'limit=$limit'];

      if (status != null && status != 'All Status') {
        queryParams.add('status=$status');
      }
      if (search != null && search.isNotEmpty) {
        queryParams.add('search=$search');
      }
      if (startDate != null) {
        queryParams.add('startDate=${startDate.toIso8601String()}');
      }
      if (endDate != null) {
        queryParams.add('endDate=${endDate.toIso8601String()}');
      }

      url += '?${queryParams.join('&')}';

      final response = await http
          .get(Uri.parse(url), headers: headers)
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body is Map && body['success'] == true) {
          return {'success': true, 'data': body['data']};
        }
        return {'success': true, 'data': body};
      } else {
        return _handleErrorResponse(response, 'Failed to fetch loan requests');
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  // --- EXPENSE ---

  Future<Map<String, dynamic>> applyExpense(Map<String, dynamic> data) async {
    try {
      final headers = await _getHeaders();
      // Adjust endpoint if needed, sticking to old 'expense' for now but backend supports both
      final response = await http
          .post(
            Uri.parse('$baseUrl/requests/expense'),
            headers: headers,
            body: jsonEncode(data),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 201) {
        final body = jsonDecode(response.body);
        var responseData = body;
        if (body is Map &&
            body.containsKey('data') &&
            body['data'] is Map &&
            body['data'].containsKey('reimbursement')) {
          responseData = body['data']['reimbursement'];
        } else if (body is Map && body.containsKey('data')) {
          responseData = body['data'];
        }
        return {'success': true, 'data': responseData};
      } else {
        return _handleErrorResponse(response, 'Failed to apply expense');
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<Map<String, dynamic>> getExpenseRequests({
    String? status,
    String? search,
    DateTime? startDate,
    DateTime? endDate,
    int page = 1,
    int limit = 10,
  }) async {
    try {
      final headers = await _getHeaders();
      String url = '$baseUrl/requests/expense';
      List<String> queryParams = ['page=$page', 'limit=$limit'];

      if (status != null && status != 'All Status') {
        queryParams.add('status=$status');
      }
      if (search != null && search.isNotEmpty) {
        queryParams.add('search=$search');
      }
      if (startDate != null) {
        queryParams.add('startDate=${startDate.toIso8601String()}');
      }
      if (endDate != null) {
        queryParams.add('endDate=${endDate.toIso8601String()}');
      }

      url += '?${queryParams.join('&')}';

      final response = await http
          .get(Uri.parse(url), headers: headers)
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body is Map && body['success'] == true) {
          return {'success': true, 'data': body['data']};
        }
        return {'success': true, 'data': body};
      } else {
        return _handleErrorResponse(
          response,
          'Failed to fetch expense requests',
        );
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  // --- PAYSLIP ---

  Future<Map<String, dynamic>> requestPayslip(Map<String, dynamic> data) async {
    try {
      final headers = await _getHeaders();
      final response = await http
          .post(
            Uri.parse('$baseUrl/requests/payslip'),
            headers: headers,
            body: jsonEncode(data),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 201) {
        final body = jsonDecode(response.body);
        return {'success': true, 'data': body};
      } else {
        return _handleErrorResponse(response, 'Failed to request payslip');
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<Map<String, dynamic>> getPayslipRequests({
    String? status,
    String? search,
    DateTime? startDate,
    DateTime? endDate,
    int page = 1,
    int limit = 10,
  }) async {
    try {
      final headers = await _getHeaders();
      String url = '$baseUrl/requests/payslip';
      List<String> queryParams = ['page=$page', 'limit=$limit'];

      if (status != null && status != 'All Status') {
        queryParams.add('status=$status');
      }
      if (search != null && search.isNotEmpty) {
        queryParams.add('search=$search');
      }
      if (startDate != null) {
        queryParams.add('startDate=${startDate.toIso8601String()}');
      }
      if (endDate != null) {
        queryParams.add('endDate=${endDate.toIso8601String()}');
      }

      url += '?${queryParams.join('&')}';

      final response = await http
          .get(Uri.parse(url), headers: headers)
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body is Map && body['success'] == true) {
          return {'success': true, 'data': body['data']};
        }
        return {'success': true, 'data': body};
      } else {
        return _handleErrorResponse(
          response,
          'Failed to fetch payslip requests',
        );
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
      } else {
        message = errorData['message'] ?? message;
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

    String msg = error.toString();
    if (msg.startsWith('Exception: ')) {
      msg = msg.substring(11);
    }
    return msg;
  }
}
