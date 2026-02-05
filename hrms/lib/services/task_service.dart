import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
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

  /// Create task via existing backend API. assignedTo = staffId.
  Future<Task> createTask({
    required String taskId,
    required String taskTitle,
    required String description,
    required String assignedTo,
    required String customerId,
    required DateTime expectedCompletionDate,
    String status = 'assigned',
    Map<String, dynamic>? sourceLocation,
    Map<String, dynamic>? destinationLocation,
  }) async {
    await _setToken();
    final body = <String, dynamic>{
      'taskId': taskId,
      'taskTitle': taskTitle,
      'description': description,
      'assignedTo': assignedTo,
      'customerId': customerId,
      'expectedCompletionDate': expectedCompletionDate.toIso8601String(),
      'status': status,
    };
    if (sourceLocation != null) body['sourceLocation'] = sourceLocation;
    if (destinationLocation != null)
      body['destinationLocation'] = destinationLocation;
    final response = await _api.dio.post<Map<String, dynamic>>(
      '/tasks',
      data: body,
    );
    final data = response.data;
    if (data == null) throw Exception('Failed to create task');
    return Task.fromJson(data);
  }

  Future<List<Task>> getAllTasks() async {
    try {
      await _setToken();
      final response = await _api.dio.get<dynamic>('/tasks');
      final body = response.data;
      if (body is List) {
        return (body)
            .map((j) => Task.fromJson(j as Map<String, dynamic>))
            .toList();
      }
      final list = (body is Map && body['data'] != null)
          ? body['data'] as List?
          : null;
      if (list != null) {
        return list
            .map((j) => Task.fromJson(j as Map<String, dynamic>))
            .toList();
      }
      throw Exception('Failed to load tasks: invalid response');
    } on DioException catch (e) {
      throw Exception(
        'Failed to load tasks: ${e.response?.statusCode ?? e.message}',
      );
    }
  }

  Future<List<Task>> getAssignedTasks(String staffId) async {
    try {
      await _setToken();
      final response = await _api.dio.get<dynamic>('/tasks/staff/$staffId');
      final body = response.data;
      if (body is List) {
        return (body)
            .map((j) => Task.fromJson(j as Map<String, dynamic>))
            .toList();
      }
      final list = (body is Map && body['data'] != null)
          ? body['data'] as List?
          : null;
      if (list != null) {
        return list
            .map((j) => Task.fromJson(j as Map<String, dynamic>))
            .toList();
      }
      throw Exception('Failed to load assigned tasks: invalid response');
    } on DioException catch (e) {
      throw Exception(
        'Failed to load assigned tasks: ${e.response?.statusCode ?? e.message}',
      );
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
      throw Exception(
        'Failed to load task: ${e.response?.statusCode ?? e.message}',
      );
    }
  }

  Future<Task> updateTask(
    String id, {
    String? status,
    DateTime? startTime,
    double? startLat,
    double? startLng,
    Map<String, dynamic>? sourceLocation,
    Map<String, dynamic>? destinationLocation,
    double? tripDistanceKm,
    int? tripDurationSeconds,
    DateTime? arrivalTime,
  }) async {
    try {
      await _setToken();
      final body = <String, dynamic>{};
      if (status != null) body['status'] = status;
      if (startTime != null) body['startTime'] = startTime.toIso8601String();
      if (startLat != null && startLng != null) {
        body['startLocation'] = {'lat': startLat, 'lng': startLng};
      }
      if (sourceLocation != null) body['sourceLocation'] = sourceLocation;
      if (destinationLocation != null)
        body['destinationLocation'] = destinationLocation;
      if (tripDistanceKm != null) body['tripDistanceKm'] = tripDistanceKm;
      if (tripDurationSeconds != null)
        body['tripDurationSeconds'] = tripDurationSeconds;
      if (arrivalTime != null)
        body['arrivalTime'] = arrivalTime.toIso8601String();
      final response = await _api.dio.patch<Map<String, dynamic>>(
        '/tasks/$id',
        data: body,
      );
      final data = response.data;
      if (data == null) throw Exception('Failed to update task');
      return Task.fromJson(data);
    } on DioException catch (e) {
      throw Exception(
        'Failed to update task: ${e.response?.statusCode ?? e.message}',
      );
    }
  }

  /// Send GPS point: taskId, lat, lng, timestamp, batteryPercent, movementType.
  Future<void> updateLocation(
    String taskMongoId,
    double lat,
    double lng, {
    int? batteryPercent,
    String? movementType,
  }) async {
    await _setToken();
    final body = <String, dynamic>{
      'lat': lat,
      'lng': lng,
      'timestamp': DateTime.now().toIso8601String(),
    };
    if (batteryPercent != null) body['batteryPercent'] = batteryPercent;
    if (movementType != null) body['movementType'] = movementType;
    await _api.dio.post<dynamic>('/tasks/$taskMongoId/location', data: body);
  }

  /// Store tracking point in Tracking collection (separate route, not socket.io).
  /// Call on Start Ride and every 15 sec during Live Tracking.
  Future<void> storeTracking(
    String taskMongoId,
    double lat,
    double lng, {
    int? batteryPercent,
    String? movementType,
  }) async {
    await _setToken();
    final body = <String, dynamic>{
      'taskId': taskMongoId,
      'lat': lat,
      'lng': lng,
      'timestamp': DateTime.now().toIso8601String(),
    };
    if (batteryPercent != null) body['batteryPercent'] = batteryPercent;
    if (movementType != null) body['movementType'] = movementType;
    debugPrint(
      '[Tracking] Sending to DB: taskId=$taskMongoId lat=$lat lng=$lng battery=$batteryPercent movement=$movementType',
    );
    await _api.dio.post<dynamic>('/tracking/store', data: body);
    debugPrint('[Tracking] Saved to DB OK');
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
    final response = await _api.dio.patch<Map<String, dynamic>>(
      '/tasks/$taskMongoId/steps',
      data: body,
    );
    final data = response.data;
    if (data == null) throw Exception('Failed to update steps');
    return Task.fromJson(data);
  }

  /// Upload photo proof for task. Returns updated task.
  Future<Task> uploadPhotoProof(
    String taskMongoId,
    String filePath, {
    String? description,
  }) async {
    await _setToken();
    final formData = FormData.fromMap({
      'photo': await MultipartFile.fromFile(filePath, filename: 'photo.jpg'),
      if (description != null && description.isNotEmpty)
        'description': description,
    });
    final response = await _api.dio.post<Map<String, dynamic>>(
      '/tasks/$taskMongoId/photo',
      data: formData,
      options: Options(
        contentType: 'multipart/form-data',
        sendTimeout: const Duration(seconds: 30),
      ),
    );
    final data = response.data;
    if (data == null) throw Exception('Failed to upload photo');
    return Task.fromJson(data);
  }

  /// Send OTP to customer email via SendPulse.
  Future<void> sendOtp(String taskMongoId) async {
    await _setToken();
    await _api.dio.post<dynamic>('/tasks/$taskMongoId/send-otp');
  }

  /// Verify OTP. Returns updated task.
  Future<Task> verifyOtp(String taskMongoId, String otp) async {
    await _setToken();
    final response = await _api.dio.post<Map<String, dynamic>>(
      '/tasks/$taskMongoId/verify-otp',
      data: {'otp': otp},
    );
    final data = response.data;
    if (data == null) throw Exception('Verification failed');
    return Task.fromJson(data);
  }

  /// Mark task as completed (sets status and completedDate).
  Future<Task> endTask(String taskMongoId) async {
    await _setToken();
    final response = await _api.dio.post<Map<String, dynamic>>(
      '/tasks/$taskMongoId/end',
    );
    final data = response.data;
    if (data == null) throw Exception('Failed to end task');
    return Task.fromJson(data);
  }
}
