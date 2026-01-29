// hrms/lib/services/auth_service.dart
import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/constants.dart';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

class AuthService {
  // Use the constant from config
  final String baseUrl = AppConstants.baseUrl;
  final FirebaseAuth _firebaseAuth = FirebaseAuth.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/auth/login'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email, 'password': password}),
          )
          .timeout(const Duration(seconds: 15)); // Increased timeout

      print('Login Status Code: ${response.statusCode}');
      print('Login Response Body: ${response.body}');

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        final data = body['data']; // Extract 'data' object

        final prefs = await SharedPreferences.getInstance();

        // Handle both valid generic structures and flattened structures
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

        // Handle User Data
        dynamic userData;
        if (data != null && data['user'] != null) {
          userData = data['user'];
        } else if (body['_id'] != null) {
          // Fallback: If the body itself is the user object (flattened)
          userData = body;
        }

        if (userData != null) {
          await prefs.setString('user', jsonEncode(userData));
        }

        return {'success': true, 'data': data};
      } else {
        final body = jsonDecode(response.body);
        // Handle nested error object { error: { message: "..." } }
        String message = 'Login failed';
        if (body['error'] != null && body['error']['message'] != null) {
          message = body['error']['message'];
        } else if (body['message'] != null) {
          message = body['message'];
        }

        return {'success': false, 'message': message};
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
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
      print("Google Sign-In Error: $e");
      return null;
    }
  }

  // Verify email with backend after Google Sign-In
  Future<Map<String, dynamic>> googleLoginBackend(String email) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/auth/google-login'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email}),
          )
          .timeout(const Duration(seconds: 15));

      print('Server Response: ${response.body}');
      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        final data = body['data'];

        final prefs = await SharedPreferences.getInstance();
        if (data != null && data['accessToken'] != null) {
          await prefs.setString('token', data['accessToken']);
        }
        if (data != null && data['user'] != null) {
          await prefs.setString('user', jsonEncode(data['user']));
        }
        return {'success': true, 'data': data};
      } else {
        final body = jsonDecode(response.body);
        String message = 'Login failed';
        if (body['error'] != null && body['error']['message'] != null) {
          message = body['error']['message'];
        } else if (body['message'] != null) {
          message = body['message'];
        }

        return {'success': false, 'message': message};
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  String _handleException(dynamic error) {
    print('Auth Error: $error');
    if (error is SocketException) {
      return 'Network error: Please check your internet connection.';
    } else if (error is TimeoutException) {
      return 'Connection timed out. Please try again.';
    } else if (error is FormatException) {
      // This usually happens when the backend returns HTML (like a 404 page) instead of JSON
      return 'Invalid response format from server. (Possible 404/500)';
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

      final url = Uri.parse('$baseUrl/auth/profile');
      print('DEBUG: Requesting Profile form: $url');
      print('DEBUG: Using Token: ${token.substring(0, 10)}...');

      final response = await http
          .get(
            url,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 15));

      print('DEBUG: Profile Response Status: ${response.statusCode}');
      print('DEBUG: Profile Response Body: ${response.body}');

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        return {'success': true, 'data': body['data']};
      } else {
        // Fallback: If 404 or other error, try to load from local storage
        print(
          'DEBUG: API failed/missing. Loading profile from local storage fallback.',
        );
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

        if (response.statusCode == 404) {
          return {'success': false, 'message': 'Profile not found (404).'};
        }

        try {
          final body = jsonDecode(response.body);
          String message = 'Failed to fetch profile';
          if (body['error'] != null && body['error']['message'] != null) {
            message = body['error']['message'];
          } else if (body['message'] != null) {
            message = body['message'];
          }
          return {'success': false, 'message': message};
        } catch (e) {
          return {
            'success': false,
            'message': 'Server Error: ${response.statusCode}',
          };
        }
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

      final response = await http
          .put(
            Uri.parse('$baseUrl/auth/profile'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode(data),
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        return {'success': true};
      } else {
        final body = jsonDecode(response.body);
        String message = 'Failed to update profile';
        if (body['error'] != null && body['error']['message'] != null) {
          message = body['error']['message'];
        }
        return {'success': false, 'message': message};
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  /// Update education details. [education] is a list of maps with keys:
  /// qualification, courseName, institution, university, yearOfPassing, percentage, cgpa
  Future<Map<String, dynamic>> updateEducation(List<Map<String, dynamic>> education) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      if (token == null) {
        return {'success': false, 'message': 'Not authenticated'};
      }

      final response = await http
          .patch(
            Uri.parse('$baseUrl/auth/profile/education'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode({'education': education}),
          )
          .timeout(const Duration(seconds: 15));

      print('[AuthService] updateEducation Response Status: ${response.statusCode}');
      print('[AuthService] updateEducation Response Body: ${response.body}');

      if (response.statusCode == 200) {
        try {
          final body = jsonDecode(response.body);
          return {
            'success': true,
            'data': body['data'],
          };
        } catch (e) {
          return {'success': false, 'message': 'Invalid response format from server'};
        }
      } else {
        String message = 'Failed to update education';
        try {
          final body = jsonDecode(response.body);
          if (body['error'] != null && body['error']['message'] != null) {
            message = body['error']['message'];
          } else if (body['message'] != null) {
            message = body['message'];
          }
        } catch (e) {
          // Response is not JSON (likely HTML error page)
          message = 'Server error (${response.statusCode}). Please check if the endpoint exists.';
        }
        return {'success': false, 'message': message};
      }
    } catch (e) {
      print('[AuthService] updateEducation Exception: $e');
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<void> logout() async {
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

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/auth/forgot-password'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email}),
          )
          .timeout(const Duration(seconds: 15));

      final body = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': body['message'] ?? 'OTP sent successfully',
        };
      } else {
        String message = 'Failed to send OTP';
        if (body['error'] != null && body['error']['message'] != null) {
          message = body['error']['message'];
        } else if (body['message'] != null) {
          message = body['message'];
        }
        return {'success': false, 'message': message};
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<Map<String, dynamic>> verifyOtp({
    required String email,
    required String otp,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/auth/verify-otp'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email, 'otp': otp}),
          )
          .timeout(const Duration(seconds: 15));

      final body = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': body['message'] ?? 'OTP verified successfully',
        };
      } else {
        String message = 'Invalid or expired OTP';
        if (body['error'] != null && body['error']['message'] != null) {
          message = body['error']['message'];
        } else if (body['message'] != null) {
          message = body['message'];
        }
        return {'success': false, 'message': message};
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }

  Future<Map<String, dynamic>> resetPassword({
    required String email,
    required String otp,
    required String newPassword,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/auth/reset-password'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'email': email,
              'otp': otp,
              'newPassword': newPassword,
            }),
          )
          .timeout(const Duration(seconds: 15));

      final body = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': body['message'] ?? 'Password reset successfully',
        };
      } else {
        String message = 'Failed to reset password';
        if (body['error'] != null && body['error']['message'] != null) {
          message = body['error']['message'];
        } else if (body['message'] != null) {
          message = body['message'];
        }
        return {'success': false, 'message': message};
      }
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

      final response = await http
          .post(
            Uri.parse('$baseUrl/auth/change-password'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode({
              'oldPassword': oldPassword,
              'newPassword': newPassword,
            }),
          )
          .timeout(const Duration(seconds: 15));

      final body = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': body['message'] ?? 'Password updated successfully',
        };
      } else {
        String message = 'Failed to update password';
        if (body['error'] != null && body['error']['message'] != null) {
          message = body['error']['message'];
        } else if (body['message'] != null) {
          message = body['message'];
        }
        return {'success': false, 'message': message};
      }
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

      final uri = Uri.parse('$baseUrl/auth/profile-photo');
      final request = http.MultipartRequest('POST', uri);
      request.headers['Authorization'] = 'Bearer $token';
      request.files.add(
        await http.MultipartFile.fromPath('file', imageFile.path),
      );

      final streamedResponse =
          await request.send().timeout(const Duration(seconds: 30));
      final responseBody = await streamedResponse.stream.bytesToString();

      final body = jsonDecode(responseBody);

      if (streamedResponse.statusCode == 200) {
        // Optionally update cached user profile photo locally if backend returns it
        if (body['data'] != null && body['data']['photoUrl'] != null) {
          final userStr = prefs.getString('user');
          if (userStr != null) {
            try {
              final user = jsonDecode(userStr);
              user['photoUrl'] = body['data']['photoUrl'];
              await prefs.setString('user', jsonEncode(user));
            } catch (_) {}
          }
        }

        return {
          'success': true,
          'message': body['message'] ?? 'Profile photo updated successfully',
          'data': body['data'],
        };
      } else {
        String message = 'Failed to update profile photo';
        if (body['error'] != null && body['error']['message'] != null) {
          message = body['error']['message'];
        } else if (body['message'] != null) {
          message = body['message'];
        }
        return {'success': false, 'message': message};
      }
    } catch (e) {
      return {'success': false, 'message': _handleException(e)};
    }
  }
}
