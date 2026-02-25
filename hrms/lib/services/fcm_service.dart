import 'dart:convert';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';
import '../screens/requests/my_requests_screen.dart';
import '../screens/attendance/attendance_screen.dart';
import '../screens/performance/performance_module_screen.dart';

/// Handles FCM: permission, token, foreground/background/terminated messages.
/// Receives notifications sent from web backend (leave/expense/payslip/loan/attendance approve/reject).
/// Call [init] from main() after Firebase.initializeApp().
/// Set [navigatorKey] so notification taps can open screens (e.g. by module).
class FcmService {
  FcmService._();

  static const String _logTag = '[FCM]';
  static const String _kFcmForegroundNotificationsKey =
      'fcm_foreground_notifications';
  static const Duration _kFcmNotificationRetention = Duration(hours: 24);

  static GlobalKey<NavigatorState>? navigatorKey;

  static FirebaseMessaging get _messaging => FirebaseMessaging.instance;

  static void _log(String message) {
    if (kDebugMode) {
      debugPrint('$_logTag $message');
    }
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
    if (authToken != null &&
        (authToken.startsWith('"') || authToken.endsWith('"'))) {
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
      final preview = fcmToken.length > 16
          ? '${fcmToken.substring(0, 8)}...${fcmToken.substring(fcmToken.length - 6)}'
          : 'short';
      _log(
        'sendTokenToBackend: success status=${response.statusCode} tokenLength=${fcmToken.length} tokenPreview=$preview',
      );
    } catch (_) {
      // sendTokenToBackend failed; silently ignore
    }
  }

  static void _onForegroundMessage(RemoteMessage message) {
    _log(
      'foreground message: title=${message.notification?.title} body=${message.notification?.body} data=${message.data}',
    );
    final title = message.notification?.title ?? 'Notification';
    final body = message.notification?.body ?? '';
    final data = Map<String, dynamic>.from(message.data);

    // Store for 24h so user can see in Notifications screen
    _storeForegroundNotification(title: title, body: body, data: data);

    final context = navigatorKey?.currentContext;
    if (context != null && context.mounted) {
      // Play notification sound
      SystemSound.play(SystemSoundType.alert);
      // Show just below AppBar; closed only when user taps close
      final media = MediaQuery.of(context);
      final topOffset =
          media.padding.top + kToolbarHeight + 250; // somewhat below app bar
      final snackBarHeight = 56.0;
      final bottomMargin = media.size.height - topOffset - snackBarHeight;
      final messenger = ScaffoldMessenger.of(context);
      messenger.showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Image.asset(
                'assets/images/notification_icon.png',
                width: 24,
                height: 24,
                fit: BoxFit.contain,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  body.isNotEmpty ? body : title,
                  style: TextStyle(color: Colors.grey.shade800, fontSize: 14),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 20, color: Colors.red),
                onPressed: () => messenger.hideCurrentSnackBar(),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                style: IconButton.styleFrom(
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ],
          ),
          backgroundColor: Colors.white,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          margin: EdgeInsets.only(
            bottom: bottomMargin.clamp(16.0, media.size.height - 80),
            left: 12,
            right: 12,
          ),
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  /// Saves one foreground notification and prunes entries older than 24h.
  static Future<void> _storeForegroundNotification({
    required String title,
    required String body,
    required Map<String, dynamic> data,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final now = DateTime.now();
      final cutoff = now.subtract(_kFcmNotificationRetention);
      final list = _loadRawList(prefs);
      final pruned = list.where((e) {
        final receivedAt = e['receivedAt']?.toString();
        if (receivedAt == null) return false;
        final dt = DateTime.tryParse(receivedAt);
        return dt != null && dt.isAfter(cutoff);
      }).toList();
      pruned.insert(0, {
        'title': title,
        'body': body,
        'data': data,
        'receivedAt': now.toUtc().toIso8601String(),
      });
      await prefs.setString(
        _kFcmForegroundNotificationsKey,
        jsonEncode(pruned),
      );
    } catch (e) {
      if (kDebugMode)
        debugPrint('$_logTag _storeForegroundNotification error: $e');
    }
  }

  static List<dynamic> _loadRawList(SharedPreferences prefs) {
    try {
      final raw = prefs.getString(_kFcmForegroundNotificationsKey);
      if (raw == null || raw.isEmpty) return [];
      final decoded = jsonDecode(raw);
      if (decoded is List) return List<dynamic>.from(decoded);
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Returns notifications received in foreground, kept for 24h from receipt. Prunes old entries.
  static Future<List<Map<String, dynamic>>> getStoredNotifications() async {
    final prefs = await SharedPreferences.getInstance();
    final cutoff = DateTime.now().subtract(_kFcmNotificationRetention);
    final list = _loadRawList(prefs);
    final pruned = <Map<String, dynamic>>[];
    for (final e in list) {
      if (e is! Map) continue;
      final map = Map<String, dynamic>.from(e);
      final receivedAt = map['receivedAt']?.toString();
      if (receivedAt == null) continue;
      final dt = DateTime.tryParse(receivedAt);
      if (dt == null || dt.isBefore(cutoff)) continue;
      pruned.add(map);
    }
    if (pruned.length != list.length) {
      await prefs.setString(
        _kFcmForegroundNotificationsKey,
        jsonEncode(pruned),
      );
    }
    return pruned;
  }

  static void _onNotificationOpened(RemoteMessage message) {
    _log('notification opened (background/terminated): data=${message.data}');
    _handleNotificationData(message.data);
  }

  static Future<void> _handleNotificationData(Map<String, dynamic> data) async {
    _log(
      'handleNotificationData: module=${data['module']} type=${data['type']} data=$data',
    );
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
            currentStaffId =
                user['staffId']?.toString() ??
                user['_id']?.toString() ??
                user['id']?.toString();
          }
        } catch (_) {}
      }
      currentStaffId ??= prefs.getString('staffId');
      if (currentStaffId != null && currentStaffId != payloadStaffId) {
        _log(
          'handleNotificationData: ignoring – notification is for staffId=$payloadStaffId, current staffId=$currentStaffId',
        );
        return;
      }
    }

    if (!navigatorKey!.currentContext!.mounted) return;

    // Leave: My Requests, tab 0
    if (module == 'leave' ||
        type == 'leave_approved' ||
        type == 'leave_rejected' ||
        module == 'requests' &&
            (type == 'leave_approved' || type == 'leave_rejected')) {
      _log(
        'handleNotificationData: navigating to MyRequestsScreen tab 0 (leave)',
      );
      navigatorKey?.currentState?.push(
        MaterialPageRoute<void>(
          builder: (_) => MyRequestsScreen(initialTabIndex: 0),
        ),
      );
      return;
    }
    // Loan: My Requests, tab 1
    if (module == 'loan' ||
        type == 'loan_approved' ||
        type == 'loan_rejected') {
      _log(
        'handleNotificationData: navigating to MyRequestsScreen tab 1 (loan)',
      );
      navigatorKey?.currentState?.push(
        MaterialPageRoute<void>(
          builder: (_) => MyRequestsScreen(initialTabIndex: 1),
        ),
      );
      return;
    }
    // Expense: My Requests, tab 2
    if (module == 'expense' ||
        type == 'expense_approved' ||
        type == 'expense_rejected') {
      _log(
        'handleNotificationData: navigating to MyRequestsScreen tab 2 (expense)',
      );
      navigatorKey?.currentState?.push(
        MaterialPageRoute<void>(
          builder: (_) => MyRequestsScreen(initialTabIndex: 2),
        ),
      );
      return;
    }
    // Payslip: My Requests, tab 3
    if (module == 'payslip' ||
        type == 'payslip_approved' ||
        type == 'payslip_rejected') {
      _log(
        'handleNotificationData: navigating to MyRequestsScreen tab 3 (payslip)',
      );
      navigatorKey?.currentState?.push(
        MaterialPageRoute<void>(
          builder: (_) => MyRequestsScreen(initialTabIndex: 3),
        ),
      );
      return;
    }
    // Attendance: Attendance screen
    if (module == 'attendance' ||
        type == 'attendance_approved' ||
        type == 'attendance_rejected') {
      _log('handleNotificationData: navigating to AttendanceScreen');
      navigatorKey?.currentState?.push(
        MaterialPageRoute<void>(builder: (_) => AttendanceScreen()),
      );
      return;
    }
    // Performance: Performance module
    if (module == 'performance' ||
        type.startsWith('self_review') ||
        type.startsWith('manager_review') ||
        type.startsWith('hr_review')) {
      _log('handleNotificationData: navigating to PerformanceModuleScreen');
      navigatorKey?.currentState?.push(
        MaterialPageRoute<void>(builder: (_) => PerformanceModuleScreen()),
      );
      return;
    }
    _log('handleNotificationData: no route matched module=$module type=$type');
  }

  /// Call when user taps a stored notification (e.g. from NotificationsScreen). Navigates by module/type.
  static Future<void> handleNotificationTap(Map<String, dynamic> data) async {
    await _handleNotificationData(data);
  }

  /// Call this to get the current FCM token (e.g. after login, to send to backend).
  static Future<String?> getToken() => _messaging.getToken();

  /// Subscribe to a topic (e.g. 'attendance', 'leave') for server to send by topic.
  static Future<void> subscribeToTopic(String topic) =>
      _messaging.subscribeToTopic(topic);

  static Future<void> unsubscribeFromTopic(String topic) =>
      _messaging.unsubscribeFromTopic(topic);
}
