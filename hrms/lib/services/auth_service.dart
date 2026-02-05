// hrms/lib/services/auth_service.dart
import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import '../config/constants.dart';
import 'api_client.dart';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

class AuthService {
  // Use the constant from config
  final String baseUrl = AppConstants.baseUrl;
  final FirebaseAuth _firebaseAuth = FirebaseAuth.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();
  final ApiClient _api = ApiClient();

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/auth/login',
        data: {'email': email, 'password': password},
      );
      final body = response.data ?? {};
      final data = body['data'];

      final prefs = await SharedPreferences.getInstance();
      String? accessToken;
      if (data != null && data['accessToken'] != null) {
        accessToken = data['accessToken'];
      } else if (body['token'] != null) {
        accessToken = body['token'];
      } else if (body['accessToken'] != null) {
        accessToken = body['accessToken'];
      }
      if (accessToken != null) {
        await prefs.setString('token', accessToken);
      }
      dynamic userData;
      if (data != null && data['user'] != null) {
        userData = data['user'];
      } else if (body['_id'] != null) {
        userData = body;
      }
      if (userData != null) {
        await prefs.setString('user', jsonEncode(userData));
      }
      _api.setAuthToken(accessToken);
      return {'success': true, 'data': data};
    } on DioException catch (e) {
      return _handleDioError(e, 'Login failed', (code, body) {
        if (code != null && code >= 500) {
          return 'Server error ($code). The backend server is not responding. Please try again later.';
        }
        return _messageFromBody(body) ?? 'Login failed';
      });
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  /// Shared Dio error handling: 429 message, JSON body parsing, HTML fallback.
  Map<String, dynamic> _handleDioError(
    DioException e,
    String defaultMessage,
    String Function(int? code, dynamic body)? messageFn,
  ) {
    final code = e.response?.statusCode;
    final data = e.response?.data;
    String? bodyStr;
    Map<String, dynamic>? bodyMap;
    if (data is String) {
      bodyStr = data;
      if (bodyStr.trim().startsWith('<')) {
        return {
          'success': false,
          'message': code != null
              ? 'Server error ($code). The backend server is not responding. Please try again later.'
              : defaultMessage,
        };
      }
      try {
        bodyMap = jsonDecode(bodyStr) as Map<String, dynamic>?;
      } catch (_) {}
    } else if (data is Map) {
      bodyMap = Map<String, dynamic>.from(data);
    }
    if (code == 429) {
      return {
        'success': false,
        'message': bodyMap != null
            ? (bodyMap['error']?['message'] ??
                  bodyMap['message'] ??
                  'Too many requests. Please try again later.')
            : 'Too many requests. Please try again later.',
      };
    }
    final message = messageFn != null
        ? messageFn(code, bodyMap ?? bodyStr)
        : _messageFromBody(bodyMap);
    return {'success': false, 'message': message ?? defaultMessage};
  }

  static String? _messageFromBody(dynamic body) {
    if (body is Map) {
      if (body['error'] != null && body['error']['message'] != null) {
        return body['error']['message'] as String?;
      }
      return body['message'] as String?;
    }
    return null;
  }

  Future<UserCredential?> signInWithGoogle() async {
    try {
      // Trigger the authentication flow
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        // The user canceled the sign-in
        return null;
      }

      // Obtain the auth details from the request
      final GoogleSignInAuthentication googleAuth =
          await googleUser.authentication;

      // Create a new credential
      final OAuthCredential credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      // Sign in to Firebase with the user credentials
      return await _firebaseAuth.signInWithCredential(credential);
    } catch (e) {
      return null;
    }
  }

  // Verify email with backend after Google Sign-In
  Future<Map<String, dynamic>> googleLoginBackend(String email) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/auth/google-login',
        data: {'email': email},
      );
      final body = response.data ?? {};
      final data = body['data'];
      final prefs = await SharedPreferences.getInstance();
      if (data != null && data['accessToken'] != null) {
        await prefs.setString('token', data['accessToken']);
      }
      if (data != null && data['user'] != null) {
        await prefs.setString('user', jsonEncode(data['user']));
      }
      _api.setAuthToken(data?['accessToken']);
      return {'success': true, 'data': data};
    } on DioException catch (e) {
      return _handleDioError(e, 'Login failed', (code, body) {
        if (code != null && code >= 500) {
          return 'Server error ($code). The backend server is not responding. Please try again later.';
        }
        return _messageFromBody(body) ?? 'Login failed';
      });
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
      return 'Connection timed out. The server is taking too long to respond. Please try again.';
    } else if (error is FormatException) {
      // This usually happens when the backend returns HTML (like a 502 Bad Gateway) instead of JSON
      return 'Server error: The backend server is not responding. Please try again later.';
    }

    // Convert generic error to string and clean it up
    String msg = error.toString();
    if (msg.startsWith('Exception: ')) {
      msg = msg.substring(11);
    }
    return msg;
  }

  Future<Map<String, dynamic>> getProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      String? token = prefs.getString('token');

      // Sanitize token
      if (token != null && (token.startsWith('"') || token.endsWith('"'))) {
        token = token.replaceAll('"', '');
      }

      if (token == null) {
        return {'success': false, 'message': 'Not authenticated'};
      }
      _api.setAuthToken(token);
      try {
        final response = await _api.dio.get<Map<String, dynamic>>(
          '/auth/profile',
        );
        final body = response.data ?? {};
        return {'success': true, 'data': body['data']};
      } on DioException catch (e) {
        if (e.response?.statusCode == 404) {
          final userStr = prefs.getString('user');
          if (userStr != null) {
            try {
              final userObj = jsonDecode(userStr);
              return {
                'success': true,
                'data': {
                  'profile': userObj,
                  'staffData': prefs.getString('staff') != null
                      ? jsonDecode(prefs.getString('staff')!)
                      : {},
                },
              };
            } catch (_) {}
          }
          return {'success': false, 'message': 'Profile not found (404).'};
        }
        return _handleDioError(e, 'Failed to fetch profile', null);
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      if (token == null) {
        return {'success': false, 'message': 'Not authenticated'};
      }
      _api.setAuthToken(token);
      await _api.dio.put<Map<String, dynamic>>('/auth/profile', data: data);
      return {'success': true};
    } on DioException catch (e) {
      return _handleDioError(e, 'Failed to update profile', null);
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  /// Update education details. [education] is a list of maps with keys:
  /// qualification, courseName, institution, university, yearOfPassing, percentage, cgpa
  Future<Map<String, dynamic>> updateEducation(
    List<Map<String, dynamic>> education,
  ) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      if (token == null) {
        return {'success': false, 'message': 'Not authenticated'};
      }

      _api.setAuthToken(token);
      final response = await _api.dio.patch<Map<String, dynamic>>(
        '/auth/profile/education',
        data: {'education': education},
      );
      final body = response.data;
      if (body != null && body['data'] != null) {
        return {'success': true, 'data': body['data']};
      }
      return {
        'success': false,
        'message': 'Invalid response format from server',
      };
    } on DioException catch (e) {
      return _handleDioError(e, 'Failed to update education', null);
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  /// Update experience details. [experience] is a list of maps with keys:
  /// company, role, designation, durationFrom, durationTo, keyResponsibilities, reasonForLeaving
  Future<Map<String, dynamic>> updateExperience(
    List<Map<String, dynamic>> experience,
  ) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      String? token = prefs.getString('token');
      if (token == null) {
        return {'success': false, 'message': 'Not authenticated'};
      }

      // Sanitize token
      if (token.startsWith('"') || token.endsWith('"')) {
        token = token.replaceAll('"', '');
      }

      _api.setAuthToken(token);
      final response = await _api.dio.patch<Map<String, dynamic>>(
        '/auth/profile/experience',
        data: {'experience': experience},
      );
      final body = response.data;
      if (body != null) {
        return {
          'success': true,
          'data': body['data'],
          'message': body['message'] ?? 'Experience updated successfully',
        };
      }
      return {
        'success': false,
        'message': 'Invalid response format from server',
      };
    } on DioException catch (e) {
      return _handleDioError(e, 'Failed to update experience', null);
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<void> logout() async {
    _api.clearAuthToken();
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    await _googleSignIn.signOut();
    await _firebaseAuth.signOut();
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  // -------------------------
  // Forgot password with OTP
  // -------------------------

  Future<Map<String, dynamic>> forgotPassword(
    String email, {
    int retryCount = 0,
  }) async {
    final url = '$baseUrl/auth/forgot-password';
    if (kDebugMode) {
      debugPrint(
        '[AuthService] ForgotPassword: Requesting OTP for email: $email (attempt ${retryCount + 1})',
      );
      debugPrint('[AuthService] ForgotPassword: URL: $url');
    }
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/auth/forgot-password',
        data: {'email': email},
      );
      final body = response.data;
      if (kDebugMode) {
        debugPrint(
          '[AuthService] ForgotPassword: ✅ OTP sent successfully to $email',
        );
        debugPrint(
          '[AuthService] ForgotPassword: Server message: ${body?['message']}',
        );
      }
      return {
        'success': true,
        'message': body?['message'] as String? ?? 'OTP sent successfully',
      };
    } on DioException catch (e) {
      if (e.response?.statusCode == 404 && retryCount < 1) {
        if (kDebugMode) {
          debugPrint('[AuthService] ForgotPassword: Got 404, retrying once...');
        }
        await Future.delayed(const Duration(milliseconds: 500));
        return forgotPassword(email, retryCount: retryCount + 1);
      }
      return _handleDioError(e, 'Failed to send OTP', (code, _) {
        if (code == 404) {
          return 'Forgot password endpoint not found (404). Please try again or contact support.';
        }
        if (code != null && code >= 500) {
          return 'Server error ($code). The backend server is not responding. Please try again later.';
        }
        return 'Failed to send OTP';
      });
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[AuthService] ForgotPassword: Exception - ${e.toString()}');
      }
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<Map<String, dynamic>> verifyOtp({
    required String email,
    required String otp,
  }) async {
    if (kDebugMode) {
      debugPrint('[AuthService] VerifyOTP: Verifying OTP for email: $email');
    }
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/auth/verify-otp',
        data: {'email': email, 'otp': otp},
      );
      final body = response.data;
      if (kDebugMode) {
        debugPrint(
          '[AuthService] VerifyOTP: ✅ OTP verified successfully for $email',
        );
        debugPrint(
          '[AuthService] VerifyOTP: Server message: ${body?['message']}',
        );
      }
      return {
        'success': true,
        'message': body?['message'] as String? ?? 'OTP verified successfully',
      };
    } on DioException catch (e) {
      return _handleDioError(e, 'Invalid or expired OTP', null);
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[AuthService] VerifyOTP: Exception - ${e.toString()}');
      }
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<Map<String, dynamic>> resetPassword({
    required String email,
    required String otp,
    required String newPassword,
  }) async {
    try {
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/auth/reset-password',
        data: {'email': email, 'otp': otp, 'newPassword': newPassword},
      );
      final body = response.data;
      return {
        'success': true,
        'message': body?['message'] as String? ?? 'Password reset successfully',
      };
    } on DioException catch (e) {
      return _handleDioError(e, 'Failed to reset password', null);
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  // -------------------------
  // Change password (old + new)
  // -------------------------

  Future<Map<String, dynamic>> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      String? token = prefs.getString('token');

      if (token == null) {
        return {'success': false, 'message': 'Not authenticated'};
      }

      // Sanitize token
      if (token.startsWith('"') || token.endsWith('"')) {
        token = token.replaceAll('"', '');
      }

      _api.setAuthToken(token);
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/auth/change-password',
        data: {'oldPassword': oldPassword, 'newPassword': newPassword},
      );
      final body = response.data;
      return {
        'success': true,
        'message':
            body?['message'] as String? ?? 'Password updated successfully',
      };
    } on DioException catch (e) {
      return _handleDioError(e, 'Failed to update password', null);
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  // -------------------------
  // Update profile photo (Cloudinary via backend)
  // -------------------------

  Future<Map<String, dynamic>> updateProfilePhoto(File imageFile) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      String? token = prefs.getString('token');

      if (token == null) {
        return {'success': false, 'message': 'Not authenticated'};
      }

      // Sanitize token
      if (token.startsWith('"') || token.endsWith('"')) {
        token = token.replaceAll('"', '');
      }

      _api.setAuthToken(token);
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          imageFile.path,
          filename: imageFile.path.split(RegExp(r'[/\\]')).last,
        ),
      });
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/auth/profile-photo',
        data: formData,
        options: Options(
          sendTimeout: const Duration(seconds: 30),
          receiveTimeout: const Duration(seconds: 30),
        ),
      );
      final body = response.data;
      if (body != null &&
          body['data'] != null &&
          body['data']['photoUrl'] != null) {
        final userStr = prefs.getString('user');
        if (userStr != null) {
          try {
            final user = jsonDecode(userStr) as Map<String, dynamic>;
            final url = body['data']['photoUrl'] as String?;
            if (url != null) {
              user['photoUrl'] = url;
              user['avatar'] = url;
              await prefs.setString('user', jsonEncode(user));
            }
          } catch (_) {}
        }
      }
      return {
        'success': true,
        'message': body?['message'] ?? 'Profile photo updated successfully',
        'data': body?['data'],
      };
    } on DioException catch (e) {
      return _handleDioError(e, 'Failed to update profile photo', null);
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  /// Verify selfie against profile photo. Returns { success, match, message }.
  /// [message] is always user-friendly (no raw errors or exceptions).
  Future<Map<String, dynamic>> verifyFace(String selfieDataUrl) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      String? token = prefs.getString('token');
      if (token != null && (token.startsWith('"') || token.endsWith('"'))) {
        token = token.replaceAll('"', '');
      }
      if (token == null) {
        return {
          'success': false,
          'match': false,
          'message': 'Please sign in and try again.',
        };
      }

      _api.setAuthToken(token);
      final response = await _api.dio.post<Map<String, dynamic>>(
        '/auth/verify-face',
        data: {'selfie': selfieDataUrl},
        options: Options(receiveTimeout: const Duration(seconds: 90)),
      );
      final body = response.data;
      final match = body?['match'] == true;
      final rawMessage =
          body?['message']?.toString() ??
          body?['error']?['message']?.toString();
      final message = _userFriendlyVerifyMessage(rawMessage, match);
      return {'success': true, 'match': match, 'message': message};
    } on DioException catch (e) {
      final body = e.response?.data;
      final rawMessage = body is Map
          ? (body['message'] ?? body['error']?['message'])?.toString()
          : null;
      return {
        'success': false,
        'match': false,
        'message': _userFriendlyVerifyMessage(rawMessage, false),
      };
    } catch (e) {
      return {
        'success': false,
        'match': false,
        'message': _userFriendlyVerifyMessage(_handleException(e), false),
      };
    }
  }

  /// Maps backend/exception text to clear, short text for the user.
  String _userFriendlyVerifyMessage(String? raw, bool matched) {
    if (matched) return 'Photo matched';
    if (raw == null || raw.isEmpty) {
      return 'Face not matching. Please try again.';
    }
    final s = raw.toLowerCase();
    if (s.contains('timeout') || s.contains('timed out')) {
      return 'Verification took too long. Please try again.';
    }
    if (s.contains('network') ||
        s.contains('internet') ||
        s.contains('connection')) {
      return 'Check your internet connection and try again.';
    }
    if (s.contains('server') || s.contains('respond')) {
      return 'Server is busy. Please try again.';
    }
    if (s.contains('no face') || s.contains('face could not be detected')) {
      return 'No face detected. Ensure your face is clearly visible.';
    }
    if (s.contains('profile photo') || s.contains('upload a profile')) {
      return 'Please upload a profile photo first.';
    }
    if (s.contains('not authenticated') || s.contains('sign in')) {
      return 'Please sign in and try again.';
    }
    if (s.contains('exception') || s.contains('error') || s.length > 60) {
      return 'Face verification failed. Please try again.';
    }
    if (s.contains('not matching') || s.contains('no match')) {
      return 'Face not matching. Please try again.';
    }
    return 'Face not matching. Please try again.';
  }
}
