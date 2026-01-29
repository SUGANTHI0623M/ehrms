import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/constants.dart';
import '../models/asset_model.dart';

class AssetService {
  final String baseUrl = AppConstants.baseUrl;
  
  // Cache keys
  static const String _cacheAssetTypesKey = 'cached_asset_types';
  static const String _cacheBranchesKey = 'cached_branches';
  static const String _cacheTimestampKey = 'cache_timestamp';
  static const Duration _cacheValidDuration = Duration(minutes: 30); // Cache for 30 minutes

  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    String? token = prefs.getString('token');

    // Sanitize token: Remove potential extra quotes which cause "jwt malformed"
    if (token != null && (token.startsWith('"') || token.endsWith('"'))) {
      token = token.replaceAll('"', '');
    }

    // If token is strictly null (not logged in), don't send "Bearer null"
    if (token == null || token.isEmpty) {
      return {'Content-Type': 'application/json'};
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<Map<String, dynamic>> getAssets({
    String? status,
    String? search,
    String? type,
    String? branchId,
    int page = 1,
    int limit = 10,
  }) async {
    try {
      final headers = await _getHeaders();
      String url = '$baseUrl/assets';
      List<String> queryParams = ['page=$page', 'limit=$limit'];

      if (status != null && status.isNotEmpty && status != 'All Assets') {
        queryParams.add('status=${Uri.encodeComponent(status)}');
      }
      if (search != null && search.isNotEmpty) {
        queryParams.add('search=${Uri.encodeComponent(search)}');
      }
      if (type != null && type.isNotEmpty) {
        queryParams.add('type=${Uri.encodeComponent(type)}');
      }
      if (branchId != null && branchId.isNotEmpty) {
        queryParams.add('branchId=${Uri.encodeComponent(branchId)}');
      }

      url += '?${queryParams.join('&')}';

      final response = await http
          .get(Uri.parse(url), headers: headers)
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body is Map && body['success'] == true) {
          final data = body['data'];
          List<Asset> assets = [];
          if (data['assets'] != null) {
            assets = (data['assets'] as List)
                .map((json) => Asset.fromJson(json))
                .toList();
          }
          return {
            'success': true,
            'data': assets,
            'pagination': data['pagination'] ?? {},
          };
        }
        return {'success': true, 'data': [], 'pagination': {}};
      } else {
        return _handleErrorResponse(response, 'Failed to fetch assets');
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<Map<String, dynamic>> getAssetById(String assetId) async {
    try {
      final headers = await _getHeaders();
      final response = await http
          .get(Uri.parse('$baseUrl/assets/$assetId'), headers: headers)
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body is Map && body['success'] == true) {
          final asset = Asset.fromJson(body['data']['asset']);
          return {'success': true, 'data': asset};
        }
        return {'success': false, 'message': 'Invalid response format'};
      } else {
        return _handleErrorResponse(response, 'Failed to fetch asset details');
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

  Future<Map<String, dynamic>> getAssetTypes({bool forceRefresh = false}) async {
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        final cachedData = await _getCachedAssetTypes();
        if (cachedData != null) {
          return {'success': true, 'data': cachedData};
        }
      }

      // Fetch from API with retry logic
      final headers = await _getHeaders();
      final result = await _fetchWithRetry(
        () => http.get(
          Uri.parse('$baseUrl/assets/types'),
          headers: headers,
        ),
        'Failed to fetch asset types',
      );

      if (result['success'] == true && result['data'] != null) {
        // Cache the result
        await _cacheAssetTypes(result['data']);
        return result;
      }

      // If API call failed, try to return cached data as fallback
      final cachedData = await _getCachedAssetTypes();
      if (cachedData != null) {
        return {'success': true, 'data': cachedData, 'fromCache': true};
      }

      return result;
    } catch (e) {
      // On error, try to return cached data
      final cachedData = await _getCachedAssetTypes();
      if (cachedData != null) {
        return {'success': true, 'data': cachedData, 'fromCache': true};
      }
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<Map<String, dynamic>> getBranches({bool forceRefresh = false}) async {
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        final cachedData = await _getCachedBranches();
        if (cachedData != null) {
          return {'success': true, 'data': cachedData};
        }
      }

      // Fetch from API with retry logic
      final headers = await _getHeaders();
      final result = await _fetchWithRetry(
        () => http.get(
          Uri.parse('$baseUrl/assets/branches/list'),
          headers: headers,
        ),
        'Failed to fetch branches',
      );

      if (result['success'] == true && result['data'] != null) {
        // Cache the result
        await _cacheBranches(result['data']);
        return result;
      }

      // If API call failed, try to return cached data as fallback
      final cachedData = await _getCachedBranches();
      if (cachedData != null) {
        return {'success': true, 'data': cachedData, 'fromCache': true};
      }

      return result;
    } catch (e) {
      // On error, try to return cached data
      final cachedData = await _getCachedBranches();
      if (cachedData != null) {
        return {'success': true, 'data': cachedData, 'fromCache': true};
      }
      return {'success': false, 'message': _handleException(e)};
    }
  }

  // Retry logic with exponential backoff for rate limiting
  Future<Map<String, dynamic>> _fetchWithRetry(
    Future<http.Response> Function() fetchFunction,
    String errorMessage, {
    int maxRetries = 3,
  }) async {
    int retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        final response = await fetchFunction()
            .timeout(const Duration(seconds: 15));

        if (response.statusCode == 200) {
          final body = jsonDecode(response.body);
          if (body is Map && body['success'] == true) {
            final data = body['data'];
            List<Map<String, dynamic>> items = [];
            
            // Handle both asset types and branches response formats
            if (data['assetTypes'] != null) {
              items = (data['assetTypes'] as List)
                  .map((json) => json as Map<String, dynamic>)
                  .toList();
            } else if (data['branches'] != null) {
              items = (data['branches'] as List)
                  .map((json) => json as Map<String, dynamic>)
                  .toList();
            }
            
            return {
              'success': true,
              'data': items,
            };
          }
          return {'success': true, 'data': []};
        } else if (response.statusCode == 429 && retryCount < maxRetries) {
          // Rate limited - wait with exponential backoff
          final waitTime = Duration(seconds: (1 << retryCount) * 2); // 2s, 4s, 8s
          await Future.delayed(waitTime);
          retryCount++;
          continue;
        } else {
          return _handleErrorResponse(response, errorMessage);
        }
      } catch (e) {
        if (retryCount < maxRetries && (e is TimeoutException || e is SocketException)) {
          // Retry on network errors
          final waitTime = Duration(seconds: (1 << retryCount) * 2);
          await Future.delayed(waitTime);
          retryCount++;
          continue;
        }
        return {'success': false, 'message': _handleException(e)};
      }
    }
    
    return {'success': false, 'message': '$errorMessage: Max retries exceeded'};
  }

  // Cache management methods
  Future<void> _cacheAssetTypes(List<Map<String, dynamic>> assetTypes) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cacheAssetTypesKey, jsonEncode(assetTypes));
      await prefs.setInt(_cacheTimestampKey, DateTime.now().millisecondsSinceEpoch);
    } catch (e) {
      // Silently fail caching
      print('Failed to cache asset types: $e');
    }
  }

  Future<List<Map<String, dynamic>>?> _getCachedAssetTypes() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedJson = prefs.getString(_cacheAssetTypesKey);
      final timestamp = prefs.getInt(_cacheTimestampKey);
      
      if (cachedJson != null && timestamp != null) {
        final cacheTime = DateTime.fromMillisecondsSinceEpoch(timestamp);
        final now = DateTime.now();
        
        // Check if cache is still valid
        if (now.difference(cacheTime) < _cacheValidDuration) {
          final List<dynamic> decoded = jsonDecode(cachedJson);
          return decoded.map((item) => item as Map<String, dynamic>).toList();
        }
      }
    } catch (e) {
      // Silently fail cache retrieval
      print('Failed to get cached asset types: $e');
    }
    return null;
  }

  Future<void> _cacheBranches(List<Map<String, dynamic>> branches) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cacheBranchesKey, jsonEncode(branches));
      await prefs.setInt('${_cacheTimestampKey}_branches', DateTime.now().millisecondsSinceEpoch);
    } catch (e) {
      // Silently fail caching
      print('Failed to cache branches: $e');
    }
  }

  Future<List<Map<String, dynamic>>?> _getCachedBranches() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedJson = prefs.getString(_cacheBranchesKey);
      final timestamp = prefs.getInt('${_cacheTimestampKey}_branches');
      
      if (cachedJson != null && timestamp != null) {
        final cacheTime = DateTime.fromMillisecondsSinceEpoch(timestamp);
        final now = DateTime.now();
        
        // Check if cache is still valid
        if (now.difference(cacheTime) < _cacheValidDuration) {
          final List<dynamic> decoded = jsonDecode(cachedJson);
          return decoded.map((item) => item as Map<String, dynamic>).toList();
        }
      }
    } catch (e) {
      // Silently fail cache retrieval
      print('Failed to get cached branches: $e');
    }
    return null;
  }
}
