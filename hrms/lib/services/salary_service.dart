import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/constants.dart';
import '../services/auth_service.dart';

class SalaryService {
  final AuthService _authService = AuthService();

  Future<Map<String, dynamic>> getSalaryStats({int? month, int? year}) async {
    final token = await _authService.getToken();
    if (token == null) {
      // throw Exception('No token found');
      return {};
    }

    final queryParams = <String, String>{};
    if (month != null) queryParams['month'] = month.toString();
    if (year != null) queryParams['year'] = year.toString();

    final uri = Uri.parse(
      '${AppConstants.baseUrl}/payrolls/stats',
    ).replace(queryParameters: queryParams);

    print('DEBUG: Requesting Salary Stats: $uri');

    try {
      final response = await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      print('DEBUG: Salary Stats Status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          return data['data'];
        } else {
          // Graceful fallback
          print('DEBUG: Salary success false: ${data['error']}');
          return _getEmptySalaryData();
        }
      } else if (response.statusCode == 404) {
        // Graceful fallback for Missing Endpoint
        print('DEBUG: Salary Endpoint 404. Returning empty data.');
        return _getEmptySalaryData();
      } else {
        // Graceful fallback for other errors
        print('DEBUG: Salary Error ${response.statusCode}');
        return _getEmptySalaryData();
      }
    } catch (e) {
      print('DEBUG: Salary Exception: $e');
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
    if (token == null) {
      throw Exception('No token found');
    }

    try {
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/payrolls?page=$page&limit=$limit'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data; // Returns entire response including pagination
      } else if (response.statusCode == 404) {
        return {'success': true, 'data': []};
      } else {
        // Return empty list on error
        return {'success': true, 'data': []};
      }
    } catch (e) {
      throw Exception('Error fetching payrolls: $e');
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
      print('Error fetching staff salary details: $e');
      return null;
    }
  }
}
