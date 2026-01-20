import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/constants.dart';
import '../services/auth_service.dart';

class SalaryService {
  final AuthService _authService = AuthService();

  Future<Map<String, dynamic>> getSalaryStats({int? month, int? year}) async {
    final token = await _authService.getToken();
    if (token == null) {
      throw Exception('No token found');
    }

    final queryParams = <String, String>{};
    if (month != null) queryParams['month'] = month.toString();
    if (year != null) queryParams['year'] = year.toString();

    final uri = Uri.parse(
      '${AppConstants.baseUrl}/payrolls/stats',
    ).replace(queryParameters: queryParams);

    try {
      final response = await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          return data['data'];
        } else {
          throw Exception(
            data['error']?['message'] ?? 'Failed to load salary stats',
          );
        }
      } else {
        throw Exception('Failed to load stats: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching salary stats: $e');
    }
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
      } else {
        throw Exception('Failed to load payrolls');
      }
    } catch (e) {
      throw Exception('Error fetching payrolls: $e');
    }
  }
}
