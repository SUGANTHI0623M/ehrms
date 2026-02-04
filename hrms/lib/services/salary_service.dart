import 'dart:convert';
import 'package:dio/dio.dart';
import '../config/constants.dart';
import '../services/auth_service.dart';
import 'api_client.dart';

class SalaryService {
  final AuthService _authService = AuthService();
  final ApiClient _api = ApiClient();

  Future<Map<String, dynamic>> getSalaryStats({int? month, int? year}) async {
    final token = await _authService.getToken();
    if (token == null) return _getEmptySalaryData();
    try {
      _api.setAuthToken(token);
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/payrolls/stats',
        queryParameters: {
          if (month != null) 'month': month,
          if (year != null) 'year': year,
        },
      );
      final data = response.data;
      if (data != null && data['success'] == true) {
        final result = data['data'];
        return result is Map ? Map<String, dynamic>.from(result) : _getEmptySalaryData();
      }
      return _getEmptySalaryData();
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return _getEmptySalaryData();
      return _getEmptySalaryData();
    }
  }

  Map<String, dynamic> _getEmptySalaryData() {
    return {
      'netPay': 0,
      'grossSalary': 0,
      'deductions': 0,
      'workingDays': 0,
      'presentDays': 0,
      'lopDays': 0,
      'earnings': [],
      'deductionsList': [],
    };
  }

  Future<Map<String, dynamic>> getPayrolls({int? page, int? limit}) async {
    final token = await _authService.getToken();
    if (token == null) throw Exception('No token found');
    try {
      _api.setAuthToken(token);
      final response = await _api.dio.get<Map<String, dynamic>>(
        '/payrolls',
        queryParameters: {'page': page ?? 1, 'limit': limit ?? 10},
      );
      final data = response.data;
      if (data != null) return data;
      return {'success': true, 'data': []};
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return {'success': true, 'data': []};
      throw Exception('Error fetching payrolls: ${e.message}');
    }
  }

  Future<Map<String, dynamic>?> getStaffSalaryDetails() async {
    try {
      final profileResult = await _authService.getProfile();
      if (profileResult['success'] == true) {
        final staffData = profileResult['data']?['staffData'];
        if (staffData != null && staffData['salary'] != null) {
          return staffData['salary'] as Map<String, dynamic>;
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
