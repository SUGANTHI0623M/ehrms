import 'dart:convert';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';
import '../screens/requests/my_requests_screen.dart';
import '../screens/attendance/attendance_screen.dart';
import '../screens/performance/performance_module_screen.dart';

/// Handles FCM: permission, token, foreground/background/terminated messages.
/// Call [init] from main() after Firebase.initializeApp().
/// Set [navigatorKey] so notification taps can open screens (e.g. by module).
class FcmService {
  FcmService._();

  static const String _logTag = '[FCM]';

  static GlobalKey<NavigatorState>? navigatorKey;

  static FirebaseMessaging get _messaging => FirebaseMessaging.instance;

  static void _log(String message) {
    // Logging disabled for performance
  }

  /// Initialize FCM: permission, token, handlers. Call once after Firebase.initializeApp().
  static Future<void> init() async {
    _log('init started');
    await _requestPermission();

    final token = await _messaging.getToken();
    if (token != null) {
      _log('token obtained (length=${token.length})');
      await sendTokenToBackend();
    } else {
      _log('token is null – check Firebase config / google-services.json');
    }

    _messaging.onTokenRefresh.listen((newToken) {
      _log('token refreshed (length=${newToken.length})');
      sendTokenToBackend();
    });

    FirebaseMessaging.onMessage.listen(_onForegroundMessage);
    _log('foreground listener attached');

    FirebaseMessaging.onMessageOpenedApp.listen(_onNotificationOpened);
    _log('messageOpenedApp listener attached');

    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _log('getInitialMessage: app opened from terminated via notification');
      _handleNotificationData(initialMessage.data);
    } else {
      _log('getInitialMessage: none (normal launch)');
    }
    _log('init completed');
  }

  static Future<void> _requestPermission() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    _log('permission: ${settings.authorizationStatus}');
  }

  /// Sends the current FCM token to the backend so it can target this device for push.
  /// Backend should implement POST /notifications/fcm-token with body { "fcmToken": "..." }.
  static Future<void> sendTokenToBackend() async {
    final fcmToken = await _messaging.getToken();
    if (fcmToken == null || fcmToken.isEmpty) {
      _log('sendTokenToBackend: no FCM token, skip');
      return;
    }
    final prefs = await SharedPreferences.getInstance();
    String? authToken = prefs.getString('token');
    if (authToken != null && (authToken.startsWith('"') || authToken.endsWith('"'))) {
      authToken = authToken.replaceAll('"', '');
    }
    if (authToken == null || authToken.isEmpty) {
      _log('sendTokenToBackend: user not logged in, skip');
      return;
    }
    try {
      final api = ApiClient();
      api.setAuthToken(authToken);
      final response = await api.dio.post<dynamic>(
        '/notifications/fcm-token',
        data: {'fcmToken': fcmToken},
      );
      final preview = fcmToken.length > 16 ? '${fcmToken.substring(0, 8)}...${fcmToken.substring(fcmToken.length - 6)}' : 'short';
      _log('sendTokenToBackend: success status=${response.statusCode} tokenLength=${fcmToken.length} tokenPreview=$preview');
    } catch (_, __) {
      // sendTokenToBackend failed; silently ignore
    }
  }

  static void _onForegroundMessage(RemoteMessage message) {
    _log('foreground message: title=${message.notification?.title} body=${message.notification?.body} data=${message.data}');
    _log('foreground: when app is in foreground Android often does NOT show system tray notification – only this callback runs. Put app in background to see tray notification.');
  }

  static void _onNotificationOpened(RemoteMessage message) {
    _log('notification opened (background/terminated): data=${message.data}');
    _handleNotificationData(message.data);
  }

  static Future<void> _handleNotificationData(Map<String, dynamic> data) async {
    _log('handleNotificationData: $data');
    if (navigatorKey?.currentContext == null) {
      _log('handleNotificationData: no navigator context, skip navigation');
      return;
    }

    final module = data['module']?.toString() ?? data['type']?.toString() ?? '';
    final type = data['type']?.toString() ?? '';

    // Check staffId match for user-specific notifications
    final payloadStaffId = data['staffId']?.toString();
    if (payloadStaffId != null && payloadStaffId.isNotEmpty) {
      final prefs = await SharedPreferences.getInstance();
      String? currentStaffId;
      final userStr = prefs.getString('user');
      if (userStr != null) {
        try {
          final user = jsonDecode(userStr) as Map<String, dynamic>?;
          if (user != null) {
            currentStaffId = user['staffId']?.toString() ?? user['_id']?.toString() ?? user['id']?.toString();
          }
        } catch (_) {}
      }
      currentStaffId ??= prefs.getString('staffId');
      if (currentStaffId != null && currentStaffId != payloadStaffId) {
        _log('handleNotificationData: ignoring – notification is for staffId=$payloadStaffId, current staffId=$currentStaffId');
        return;
      }
    }

    if (!navigatorKey!.currentContext!.mounted) return;

    // Leave: My Requests, tab 0
    if (module == 'leave' || type == 'leave_approved' || type == 'leave_rejected' || module == 'requests' && (type == 'leave_approved' || type == 'leave_rejected')) {
      navigatorKey?.currentState?.push(
        MaterialPageRoute<void>(
          builder: (_) => MyRequestsScreen(initialTabIndex: 0),
        ),
      );
      return;
    }
    // Loan: My Requests, tab 1
    if (module == 'loan' || type == 'loan_approved' || type == 'loan_rejected') {
      navigatorKey?.currentState?.push(
        MaterialPageRoute<void>(
          builder: (_) => MyRequestsScreen(initialTabIndex: 1),
        ),
      );
      return;
    }
    // Expense: My Requests, tab 2
    if (module == 'expense' || type == 'expense_approved' || type == 'expense_rejected') {
      navigatorKey?.currentState?.push(
        MaterialPageRoute<void>(
          builder: (_) => MyRequestsScreen(initialTabIndex: 2),
        ),
      );
      return;
    }
    // Payslip: My Requests, tab 3
    if (module == 'payslip' || type == 'payslip_approved' || type == 'payslip_rejected') {
      navigatorKey?.currentState?.push(
        MaterialPageRoute<void>(
          builder: (_) => MyRequestsScreen(initialTabIndex: 3),
        ),
      );
      return;
    }
    // Attendance: Attendance screen
    if (module == 'attendance' || type == 'attendance_approved' || type == 'attendance_rejected') {
      navigatorKey?.currentState?.push(
        MaterialPageRoute<void>(
          builder: (_) => AttendanceScreen(),
        ),
      );
      return;
    }
    // Performance: Performance module
    if (module == 'performance' || type.startsWith('self_review') || type.startsWith('manager_review') || type.startsWith('hr_review')) {
      navigatorKey?.currentState?.push(
        MaterialPageRoute<void>(
          builder: (_) => PerformanceModuleScreen(),
        ),
      );
      return;
    }
  }

  /// Call this to get the current FCM token (e.g. after login, to send to backend).
  static Future<String?> getToken() => _messaging.getToken();

  /// Subscribe to a topic (e.g. 'attendance', 'leave') for server to send by topic.
  static Future<void> subscribeToTopic(String topic) =>
      _messaging.subscribeToTopic(topic);

  static Future<void> unsubscribeFromTopic(String topic) =>
      _messaging.unsubscribeFromTopic(topic);
}
