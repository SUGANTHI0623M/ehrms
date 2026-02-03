import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/constants.dart';

class AttendanceService {
  final String baseUrl = AppConstants.baseUrl;
  Map<String, dynamic>? attendanceTemplate;
  Map<String, dynamic>? _cachedTodayAttendance;
  DateTime? _lastTodayAttendanceFetch;

  // Cache for month attendance: key = "year-month", value = cached data
  final Map<String, Map<String, dynamic>> _cachedMonthAttendance = {};
  final Map<String, DateTime> _lastMonthAttendanceFetch = {};

  // Simple per-endpoint throttle map (URL -> last call time)
  static final Map<String, DateTime> _lastCallTimestamps = {};
  static const Duration _throttleDuration = Duration(
    seconds: 2,
  ); // Reduced from 3 to allow faster retries
  static const Duration _cacheValidDuration = Duration(minutes: 5);

  bool _isThrottled(String url) {
    final now = DateTime.now();
    final lastCall = _lastCallTimestamps[url];
    if (lastCall != null && now.difference(lastCall) < _throttleDuration) {
      return true;
    }
    _lastCallTimestamps[url] = now;
    return false;
  }

  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token'); // This token is now the accessToken
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

      final response = await http
          .post(
            Uri.parse('$baseUrl/attendance/checkin'),
            headers: headers,
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15));

      // Backend returns 201 for new check-in, 200 for Half Day update
      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        // Invalidate today attendance cache after a successful check-in
        _cachedTodayAttendance = null;
        _lastTodayAttendanceFetch = null;
        return {'success': true, 'data': data};
      } else {
        return _handleErrorResponse(response, 'Check-in failed');
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
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

      final response = await http
          .put(
            Uri.parse('$baseUrl/attendance/checkout'),
            headers: headers,
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        // Invalidate today attendance cache after a successful check-out
        _cachedTodayAttendance = null;
        _lastTodayAttendanceFetch = null;
        return {'success': true, 'data': data};
      } else {
        return _handleErrorResponse(response, 'Check-out failed');
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<Map<String, dynamic>> getTodayAttendance({
    bool forceRefresh = false,
  }) async {
    try {
      const endpointPath = '/attendance/today';
      final url = '$baseUrl$endpointPath';

      // Invalidate cache if it's from a different day
      if (_cachedTodayAttendance != null) {
        final now = DateTime.now();
        final isSameDay =
            _lastTodayAttendanceFetch?.year == now.year &&
            _lastTodayAttendanceFetch?.month == now.month &&
            _lastTodayAttendanceFetch?.day == now.day;
        if (!isSameDay) {
          _cachedTodayAttendance = null;
        }
      }

      // Return cached value if available and not forced to refresh
      if (!forceRefresh && _cachedTodayAttendance != null) {
        return {'success': true, 'data': _cachedTodayAttendance};
      }

      // Throttle repeated calls within a short window
      if (_isThrottled(url)) {
        // If we have cache, return it, otherwise surface a friendly message
        if (_cachedTodayAttendance != null) {
          return {'success': true, 'data': _cachedTodayAttendance};
        }
        return {
          'success': false,
          'message': 'Too many requests. Please wait a moment.',
        };
      }

      final headers = await _getHeaders();
      final response = await http
          .get(Uri.parse(url), headers: headers)
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        // Store template if available
        if (data['template'] != null) {
          attendanceTemplate = data['template'];
        }

        // Cache today attendance and timestamp
        _cachedTodayAttendance = data;
        _lastTodayAttendanceFetch = DateTime.now();

        return {'success': true, 'data': data};
      } else if (response.statusCode == 429) {
        // Explicitly handle rate limit errors with a friendly message
        return {
          'success': false,
          'message': 'Too many requests. Please wait a moment.',
        };
      } else {
        return {
          'success': false,
          'message': 'Failed to fetch status: ${response.statusCode}',
        };
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<Map<String, dynamic>> getAttendanceByDate(String date) async {
    try {
      final headers = await _getHeaders();
      final url = '$baseUrl/attendance/today?date=$date';

      if (_isThrottled(url)) {
        return {
          'success': false,
          'message': 'Too many requests. Please wait a moment.',
        };
      }

      final response = await http
          .get(Uri.parse(url), headers: headers)
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data};
      } else if (response.statusCode == 429) {
        return {
          'success': false,
          'message': 'Too many requests. Please wait a moment.',
        };
      } else {
        return {
          'success': false,
          'message': 'Failed to fetch attendance: ${response.statusCode}',
        };
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
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

      if (_isThrottled(url)) {
        return {
          'success': false,
          'message': 'Too many requests. Please wait a moment.',
        };
      }

      final response = await http
          .get(Uri.parse(url), headers: headers)
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data};
      } else if (response.statusCode == 429) {
        return {
          'success': false,
          'message': 'Too many requests. Please wait a moment.',
        };
      } else {
        return {
          'success': false,
          'message': 'Failed to fetch history: ${response.statusCode}',
        };
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<Map<String, dynamic>> getMonthAttendance(
    int year,
    int month, {
    bool forceRefresh = false,
  }) async {
    return _getMonthAttendanceWithRetry(
      year,
      month,
      forceRefresh: forceRefresh,
      retryCount: 0,
    );
  }

  Future<Map<String, dynamic>> _getMonthAttendanceWithRetry(
    int year,
    int month, {
    bool forceRefresh = false,
    int retryCount = 0,
  }) async {
    try {
      final cacheKey = '$year-$month';
      final url = '$baseUrl/attendance/month?year=$year&month=$month';

      // Check cache first (unless forced refresh)
      if (!forceRefresh && _cachedMonthAttendance.containsKey(cacheKey)) {
        final lastFetch = _lastMonthAttendanceFetch[cacheKey];
        if (lastFetch != null &&
            DateTime.now().difference(lastFetch) < _cacheValidDuration) {
          return {'success': true, 'data': _cachedMonthAttendance[cacheKey]};
        }
      }

      // Throttle repeated calls within a short window
      if (_isThrottled(url)) {
        // If we have cache, return it even if expired (better than nothing)
        if (_cachedMonthAttendance.containsKey(cacheKey)) {
          return {'success': true, 'data': _cachedMonthAttendance[cacheKey]};
        }
        // If no cache and first retry, wait and retry once
        if (retryCount == 0) {
          await Future.delayed(const Duration(milliseconds: 1500));
          return _getMonthAttendanceWithRetry(
            year,
            month,
            forceRefresh: forceRefresh,
            retryCount: 1,
          );
        }
        return {
          'success': false,
          'message': 'Too many requests. Please wait a moment.',
        };
      }

      final headers = await _getHeaders();
      final response = await http
          .get(Uri.parse(url), headers: headers)
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final attendanceData = data['data'];

        // Cache the successful response
        _cachedMonthAttendance[cacheKey] = attendanceData;
        _lastMonthAttendanceFetch[cacheKey] = DateTime.now();

        return {'success': true, 'data': attendanceData};
      } else if (response.statusCode == 429) {
        // On rate limit, return cached data if available
        if (_cachedMonthAttendance.containsKey(cacheKey)) {
          return {'success': true, 'data': _cachedMonthAttendance[cacheKey]};
        }
        // If no cache and first retry, wait and retry once with exponential backoff
        if (retryCount == 0) {
          await Future.delayed(const Duration(milliseconds: 2000));
          return _getMonthAttendanceWithRetry(
            year,
            month,
            forceRefresh: forceRefresh,
            retryCount: 1,
          );
        }
        return {
          'success': false,
          'message': 'Too many requests. Please wait a moment.',
        };
      } else {
        // On other errors, return cached data if available
        if (_cachedMonthAttendance.containsKey(cacheKey)) {
          return {'success': true, 'data': _cachedMonthAttendance[cacheKey]};
        }
        return {
          'success': false,
          'message': 'Failed to fetch month attendance: ${response.statusCode}',
        };
      }
    } catch (e) {
      // On exception, return cached data if available
      final cacheKey = '$year-$month';
      if (_cachedMonthAttendance.containsKey(cacheKey)) {
        return {'success': true, 'data': _cachedMonthAttendance[cacheKey]};
      }
      // If no cache and first retry, wait and retry once
      if (retryCount == 0 && e is TimeoutException) {
        await Future.delayed(const Duration(milliseconds: 1000));
        return _getMonthAttendanceWithRetry(
          year,
          month,
          forceRefresh: forceRefresh,
          retryCount: 1,
        );
      }
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
      // SocketException can occur even with internet if server is unreachable
      // Check error message to provide more specific feedback
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
      return 'Connection timed out. The server is taking too long to respond. Please try again.';
    } else if (error is FormatException) {
      return 'Invalid response format from server. Please try again.';
    }

    String msg = error.toString();
    if (msg.startsWith('Exception: ')) {
      msg = msg.substring(11);
    }
    return msg;
  }
}
