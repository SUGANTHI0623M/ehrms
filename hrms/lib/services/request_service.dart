import 'dart:io';
import 'dart:async';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';

class RequestService {
  final ApiClient _api = ApiClient();

  Future<void> _setToken() async {
    final prefs = await SharedPreferences.getInstance();
    String? token = prefs.getString('token');
    if (token != null && (token.startsWith('"') || token.endsWith('"'))) {
      token = token.replaceAll('"', '');
    }
    if (token != null && token.isNotEmpty) _api.setAuthToken(token);
  }

  // --- DASHBOARD ---

  Future<Map<String, dynamic>> getDashboardData() async {
    try {
      await _setToken();
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/dashboard/employee',
      );
      final body = response.data;
      if (body != null && body['success'] == true) {
        return {'success': true, 'data': body['data']};
      }
      return {
        'success': false,
        'message': body?['message'] ?? 'Error fetching data',
      };
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return {
          'success': true,
          'data': {
            'attendance': {
              'present': 0,
              'absent': 0,
              'late': 0,
              'totalWorkingDays': 0,
            },
            'leaves': {'pending': 0, 'approved': 0, 'rejected': 0},
            'loans': {'active': 0, 'pending': 0, 'total': 0},
            'reimbursements': {'pending': 0, 'approved': 0},
            'payslips': [],
          },
        };
      }
      return {'success': false, 'message': _dioMessage(e)};
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  String _dioMessage(DioException e) {
    final d = e.response?.data;
    if (d is Map) {
      return (d['error']?['message'] ?? d['message']) as String? ??
          'Request failed';
    }
    if (e.response?.statusCode == 429)
      return 'Too many requests. Please wait a moment.';
    return 'Request failed';
  }

  // --- LEAVE ---

  Future<Map<String, dynamic>> getLeaveTypes({
    int? month,
    int? year,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      await _setToken();
      final q = <String, dynamic>{};
      if (startDate != null && endDate != null) {
        q['startDate'] = startDate.toIso8601String();
        q['endDate'] = endDate.toIso8601String();
      } else if (month != null && year != null) {
        q['month'] = month;
        q['year'] = year;
      }
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/requests/leave-types',
        queryParameters: q,
      );
      final body = response.data;
      return {'success': true, 'data': body?['data'] ?? body};
    } on DioException catch (e) {
      return {'success': false, 'message': _dioMessage(e)};
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  /// Fetches leave types for Apply Leave dropdown: from staff's leave template + Unpaid Leave.
  /// Returns list of { type, days } where days is the limit (null for Unpaid Leave).
  Future<Map<String, dynamic>> getLeaveTypesForApply() async {
    try {
      await _setToken();
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/requests/leave-types/for-apply',
      );
      final body = response.data;
      return {'success': true, 'data': body?['data'] ?? body};
    } on DioException catch (e) {
      return {'success': false, 'message': _dioMessage(e)};
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<Map<String, dynamic>> applyLeave(Map<String, dynamic> data) async {
    try {
      await _setToken();
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/requests/leave',
        data: data,
      );
      final body = response.data;
      if (body == null)
        return {'success': false, 'message': 'Invalid response'};
      var responseData = body;
      if (body.containsKey('data') && body['data'] is Map) {
        final d = body['data'] as Map;
        if (d.containsKey('leave')) {
          responseData = d['leave'] as Map<String, dynamic>;
        } else {
          responseData = Map<String, dynamic>.from(d);
        }
      }
      return {'success': true, 'data': responseData};
    } on DioException catch (e) {
      return {'success': false, 'message': _dioMessage(e)};
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
      await _setToken();
      final q = <String, dynamic>{
        'page': page,
        'limit': limit,
        if (status != null && status != 'All Status') 'status': status,
        if (search != null && search.isNotEmpty) 'search': search,
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
      };
      final response = await _api.dio.get<dynamic>(
        '/requests/leave',
        queryParameters: q,
      );
      final body = response.data;
      if (body is List) return {'success': true, 'data': body};
      if (body is Map && body['success'] == true)
        return {'success': true, 'data': body['data'] ?? body};
      return {'success': true, 'data': body};
    } on DioException catch (e) {
      return {'success': false, 'message': _dioMessage(e)};
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  // --- LOAN ---

  Future<Map<String, dynamic>> applyLoan(Map<String, dynamic> data) async {
    try {
      await _setToken();
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/requests/loan',
        data: data,
      );
      final body = response.data;
      final responseData = body != null && body.containsKey('data')
          ? body['data']!
          : body;
      return {'success': true, 'data': responseData};
    } on DioException catch (e) {
      return {'success': false, 'message': _dioMessage(e)};
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
      await _setToken();
      final q = <String, dynamic>{
        'page': page,
        'limit': limit,
        if (status != null && status != 'All Status') 'status': status,
        if (search != null && search.isNotEmpty) 'search': search,
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
      };
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/requests/loan',
        queryParameters: q,
      );
      final body = response.data;
      if (body != null && body['success'] == true)
        return {'success': true, 'data': body['data'] ?? body};
      return {'success': true, 'data': body};
    } on DioException catch (e) {
      return {'success': false, 'message': _dioMessage(e)};
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  // --- EXPENSE ---

  Future<Map<String, dynamic>> applyExpense(Map<String, dynamic> data) async {
    try {
      await _setToken();
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/requests/expense',
        data: data,
      );
      final body = response.data;
      if (body == null)
        return {'success': false, 'message': 'Invalid response'};
      var responseData = body;
      if (body.containsKey('data') && body['data'] is Map) {
        final d = body['data'] as Map;
        responseData = d['reimbursement'] ?? d;
      }
      return {'success': true, 'data': responseData};
    } on DioException catch (e) {
      return {'success': false, 'message': _dioMessage(e)};
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
      await _setToken();
      final q = <String, dynamic>{
        'page': page,
        'limit': limit,
        if (status != null && status != 'All Status') 'status': status,
        if (search != null && search.isNotEmpty) 'search': search,
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
      };
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/requests/expense',
        queryParameters: q,
      );
      final body = response.data;
      if (body != null && body['success'] == true)
        return {'success': true, 'data': body['data'] ?? body};
      return {'success': true, 'data': body};
    } on DioException catch (e) {
      return {'success': false, 'message': _dioMessage(e)};
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  // --- PAYSLIP ---

  Future<Map<String, dynamic>> requestPayslip(Map<String, dynamic> data) async {
    try {
      await _setToken();
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/requests/payslip',
        data: data,
      );
      final body = response.data;
      if (body != null &&
          (body['success'] == true || response.statusCode == 201)) {
        return {
          'success': true,
          'data': body['data'],
          'message': body['message'],
        };
      }
      return {'success': true, 'data': body};
    } on DioException catch (e) {
      return {'success': false, 'message': _dioMessage(e)};
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
      await _setToken();
      final q = <String, dynamic>{
        'page': page,
        'limit': limit,
        if (status != null && status != 'All Status') 'status': status,
        if (search != null && search.isNotEmpty) 'search': search,
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
      };
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/requests/payslip',
        queryParameters: q,
      );
      final body = response.data;
      if (body != null && body['success'] == true)
        return {'success': true, 'data': body['data'] ?? body};
      return {'success': true, 'data': body};
    } on DioException catch (e) {
      return {'success': false, 'message': _dioMessage(e)};
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<Map<String, dynamic>> viewPayslipRequest(String requestId) async {
    try {
      await _setToken();
      final response = await _api.dio.get<List<int>>(
        '/requests/payslip/$requestId/view',
        options: Options(responseType: ResponseType.bytes),
      );
      final bytes = response.data;
      if (bytes != null) return {'success': true, 'data': bytes};
      return {'success': false, 'message': 'Failed to view payslip'};
    } on DioException catch (e) {
      return {'success': false, 'message': _dioMessage(e)};
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<Map<String, dynamic>> downloadPayslipRequest(String requestId) async {
    try {
      await _setToken();
      final response = await _api.dio.get<List<int>>(
        '/requests/payslip/$requestId/download',
        options: Options(responseType: ResponseType.bytes),
      );
      final bytes = response.data;
      if (bytes != null) return {'success': true, 'data': bytes};
      return {'success': false, 'message': 'Failed to download payslip'};
    } on DioException catch (e) {
      return {'success': false, 'message': _dioMessage(e)};
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  String _handleException(dynamic error) {
    if (error is SocketException) {
      // SocketException can occur even with internet if server is unreachable
      String errorMsg = error.message.toLowerCase();
      if (errorMsg.contains('failed host lookup') ||
          errorMsg.contains('name resolution') ||
          errorMsg.contains('nodename nor servname provided')) {
        return 'Unable to reach server. Please check your internet connection or contact support if the problem persists.';
      } else if (errorMsg.contains('connection refused') ||
          errorMsg.contains('connection reset')) {
        return 'Server is not responding. Please try again in a moment or contact support.';
      } else {
        return 'Connection error. Please check your internet connection and try again.';
      }
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
