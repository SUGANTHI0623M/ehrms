import 'package:dio/dio.dart';
import 'package:hrms/models/task.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';

class TaskService {
  final ApiClient _api = ApiClient();

  Future<void> _setToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token != null) _api.setAuthToken(token);
  }

  Future<List<Task>> getAllTasks() async {
    try {
      await _setToken();
      final response = await _api.dio.get<dynamic>('/tasks');
      final body = response.data;
      if (body is List) {
        return (body as List).map((j) => Task.fromJson(j as Map<String, dynamic>)).toList();
      }
      final list = (body is Map && body['data'] != null) ? body['data'] as List? : null;
      if (list != null) {
        return list.map((j) => Task.fromJson(j as Map<String, dynamic>)).toList();
      }
      throw Exception('Failed to load tasks: invalid response');
    } on DioException catch (e) {
      throw Exception('Failed to load tasks: ${e.response?.statusCode ?? e.message}');
    }
  }

  Future<List<Task>> getAssignedTasks(String staffId) async {
    try {
      await _setToken();
      final response = await _api.dio.get<dynamic>('/tasks/staff/$staffId');
      final body = response.data;
      if (body is List) {
        return (body as List).map((j) => Task.fromJson(j as Map<String, dynamic>)).toList();
      }
      final list = (body is Map && body['data'] != null) ? body['data'] as List? : null;
      if (list != null) {
        return list.map((j) => Task.fromJson(j as Map<String, dynamic>)).toList();
      }
      throw Exception('Failed to load assigned tasks: invalid response');
    } on DioException catch (e) {
      throw Exception('Failed to load assigned tasks: ${e.response?.statusCode ?? e.message}');
    }
  }

  Future<Task> getTaskById(String id) async {
    try {
      await _setToken();
      final response = await _api.dio.get<Map<String, dynamic>>('/tasks/$id');
      final data = response.data;
      if (data == null) throw Exception('Failed to load task');
      return Task.fromJson(data);
    } on DioException catch (e) {
      throw Exception('Failed to load task: ${e.response?.statusCode ?? e.message}');
    }
  }

  Future<Task> updateTask(
    String id, {
    String? status,
    DateTime? startTime,
    double? startLat,
    double? startLng,
  }) async {
    try {
      await _setToken();
      final body = <String, dynamic>{};
      if (status != null) body['status'] = status;
      if (startTime != null) body['startTime'] = startTime.toIso8601String();
      if (startLat != null && startLng != null) {
        body['startLocation'] = {'lat': startLat, 'lng': startLng};
      }
      final response = await _api.dio.patch<Map<String, dynamic>>('/tasks/$id', data: body);
      final data = response.data;
      if (data == null) throw Exception('Failed to update task');
      return Task.fromJson(data);
    } on DioException catch (e) {
      throw Exception('Failed to update task: ${e.response?.statusCode ?? e.message}');
    }
  }

  /// Send live location update (throttle to every 10–15 sec on client to save battery).
  Future<void> updateLocation(String taskMongoId, double lat, double lng) async {
    await _setToken();
    await _api.dio.post<dynamic>(
      '/tasks/$taskMongoId/location',
      data: {'lat': lat, 'lng': lng, 'timestamp': DateTime.now().toIso8601String()},
    );
  }

  /// Update task progress steps (reachedLocation, photoProof, formFilled, otpVerified).
  Future<Task> updateSteps(
    String taskMongoId, {
    bool? reachedLocation,
    bool? photoProof,
    bool? formFilled,
    bool? otpVerified,
  }) async {
    await _setToken();
    final body = <String, dynamic>{};
    if (reachedLocation != null) body['reachedLocation'] = reachedLocation;
    if (photoProof != null) body['photoProof'] = photoProof;
    if (formFilled != null) body['formFilled'] = formFilled;
    if (otpVerified != null) body['otpVerified'] = otpVerified;
    final response = await _api.dio.patch<Map<String, dynamic>>('/tasks/$taskMongoId/steps', data: body);
    final data = response.data;
    if (data == null) throw Exception('Failed to update steps');
    return Task.fromJson(data);
  }

  /// Mark task as completed (sets status and completedDate).
  Future<Task> endTask(String taskMongoId) async {
    await _setToken();
    final response = await _api.dio.post<Map<String, dynamic>>('/tasks/$taskMongoId/end');
    final data = response.data;
    if (data == null) throw Exception('Failed to end task');
    return Task.fromJson(data);
  }
}
