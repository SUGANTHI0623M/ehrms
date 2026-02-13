import 'dart:convert';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';
import '../screens/requests/my_requests_screen.dart';

/// Handles FCM: permission, token, foreground/background/terminated messages.
/// Call [init] from main() after Firebase.initializeApp().
/// Set [navigatorKey] so notification taps can open screens (e.g. by module).
class FcmService {
  FcmService._();

  static const String _logTag = '[FCM]';

  static GlobalKey<NavigatorState>? navigatorKey;

  static FirebaseMessaging get _messaging => FirebaseMessaging.instance;

  static void _log(String message) {
    if (kDebugMode) debugPrint('$_logTag $message');
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
      _log('sendTokenToBackend: success status=${response.statusCode}');
    } catch (e, st) {
      _log('sendTokenToBackend: failed – $e');
      if (kDebugMode) debugPrint('$_logTag stack: $st');
    }
  }

  static void _onForegroundMessage(RemoteMessage message) {
    _log('foreground message: title=${message.notification?.title} body=${message.notification?.body} data=${message.data}');
  }

  static void _onNotificationOpened(RemoteMessage message) {
    _log('notification opened (background): data=${message.data}');
    _handleNotificationData(message.data);
  }

  static Future<void> _handleNotificationData(Map<String, dynamic> data) async {
    _log('handleNotificationData: $data');
    if (navigatorKey?.currentContext == null) {
      _log('handleNotificationData: no navigator context, skip navigation');
      return;
    }

    final module = data['module']?.toString() ?? data['type']?.toString() ?? '';

    // Leave approved or rejected → open My Requests, Leave tab only if notification is for this user
    if (module == 'leave' ||
        module == 'leave_approved' ||
        module == 'leave_rejected' ||
        module == 'requests') {
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
        _log('handleNotificationData: notification is for this user (staffId=$payloadStaffId), opening Leave');
      }
      if (!navigatorKey!.currentContext!.mounted) return;
      navigatorKey?.currentState?.push(
        MaterialPageRoute<void>(
          builder: (_) => MyRequestsScreen(initialTabIndex: 0),
        ),
      );
      return;
    }
    // Add more modules as needed: attendance, loan, etc.
  }

  /// Call this to get the current FCM token (e.g. after login, to send to backend).
  static Future<String?> getToken() => _messaging.getToken();

  /// Subscribe to a topic (e.g. 'attendance', 'leave') for server to send by topic.
  static Future<void> subscribeToTopic(String topic) =>
      _messaging.subscribeToTopic(topic);

  static Future<void> unsubscribeFromTopic(String topic) =>
      _messaging.unsubscribeFromTopic(topic);
}
