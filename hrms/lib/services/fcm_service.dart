import 'dart:convert';
import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';
import '../config/app_colors.dart';
import '../screens/requests/my_requests_screen.dart';
import '../screens/attendance/attendance_screen.dart';
import '../screens/performance/performance_module_screen.dart';

/// Top-level handler for FCM messages received in background. Must be registered before runApp.
/// Stores notification in SharedPreferences so it appears in Notifications screen.
@pragma('vm:entry-point')
Future<void> firebaseBackgroundMessageHandler(RemoteMessage message) async {
  final data = Map<String, dynamic>.from(message.data);
  String title =
      message.notification?.title ??
      data['title']?.toString() ??
      'Notification';
  String body =
      message.notification?.body ??
      data['body']?.toString() ??
      data['message']?.toString() ??
      '';
  debugPrint(
    '[FCM] backgroundHandler: received title=$title body=${body.length > 40 ? "${body.substring(0, 40)}..." : body}',
  );
  await FcmService.storeNotification(title: title, body: body, data: data);
  debugPrint('[FCM] backgroundHandler: stored ok');
}

/// Handles FCM: permission, token, foreground/background/terminated messages.
/// Receives notifications sent from web backend (leave/expense/payslip/loan/attendance approve/reject).
/// Call [init] from main() after Firebase.initializeApp().
/// Set [navigatorKey] so notification taps can open screens (e.g. by module).
class FcmService {
  FcmService._();

  static const String _logTag = '[FCM]';
  static const String _kFcmNotificationsKey = 'fcm_notifications';
  static const Duration _kFcmNotificationRetention = Duration(hours: 24);
  static const String _kLocalNotificationChannelId = 'hrms_fcm_channel';

  static GlobalKey<NavigatorState>? navigatorKey;
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  static FirebaseMessaging get _messaging => FirebaseMessaging.instance;

  /// Log for notification debugging – always prints in debug; use for tracing delivery issues.
  static void _log(String message) {
    if (kDebugMode) {
      debugPrint('$_logTag $message');
    }
  }

  /// Log that shows in release too – for critical notification flow checks.
  static void _logAlways(String message) {
    debugPrint('$_logTag $message');
  }

  /// Gets FCM token with retries. Often getToken fails on first try (network/Play Services cold start).
  static Future<String?> _getTokenWithRetry({
    int maxAttempts = 3,
    Duration delayBetween = const Duration(seconds: 2),
  }) async {
    for (var attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        final token = await _messaging.getToken();
        if (token != null && token.isNotEmpty) return token;
      } catch (e) {
        _logAlways('getToken attempt $attempt/$maxAttempts failed: $e');
        if (attempt < maxAttempts) {
          _logAlways('getToken retrying in ${delayBetween.inSeconds}s...');
          await Future<void>.delayed(delayBetween);
        }
      }
    }
    return null;
  }

  /// Initialize FCM: permission, token, handlers. Call once after Firebase.initializeApp().
  static Future<void> init() async {
    _logAlways('init started');
    // Required for showing notifications in tray when app is in foreground
    try {
      await _initLocalNotifications();
      _log('local notifications initialized');
    } catch (e) {
      _logAlways('_initLocalNotifications failed (continuing): $e');
    }
    try {
      await _requestPermission();
    } catch (e) {
      _logAlways('_requestPermission failed (continuing): $e');
    }

    final token = await _getTokenWithRetry();
    _logAlways(
      'getToken: token=${token != null ? "ok(len=${token.length})" : "NULL after retries"}',
    );
    if (token != null) {
      _log('token obtained (length=${token.length}), sending to backend...');
      await sendTokenToBackend();
    } else {
      _logAlways(
        'token is NULL – check Firebase config / google-services.json or network',
      );
    }

    _messaging.onTokenRefresh.listen((newToken) {
      _logAlways(
        'onTokenRefresh: token changed (len=${newToken.length}) – sending to backend',
      );
      sendTokenToBackend();
    });

    FirebaseMessaging.onMessage.listen(_onForegroundMessage);
    _log('foreground listener attached');

    FirebaseMessaging.onMessageOpenedApp.listen(_onNotificationOpened);
    _log('messageOpenedApp listener attached');

    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _log('getInitialMessage: app opened from terminated via notification');
      final data = Map<String, dynamic>.from(initialMessage.data);
      final title =
          initialMessage.notification?.title ??
          data['title']?.toString() ??
          'Notification';
      final body =
          initialMessage.notification?.body ??
          data['body']?.toString() ??
          data['message']?.toString() ??
          '';
      await storeNotification(title: title, body: body, data: data);
      _handleNotificationData(initialMessage.data);
    } else {
      _log('getInitialMessage: none (normal launch)');
    }
    _logAlways(
      'init completed – foreground/background/terminated handlers attached',
    );
  }

  static Future<void> _initLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings(
      '@drawable/ic_notification',
    );
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
    );
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );
    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (response) {
        if (response.payload != null && response.payload!.isNotEmpty) {
          try {
            final data = jsonDecode(response.payload!) as Map<String, dynamic>?;
            if (data != null) _handleNotificationData(data);
          } catch (_) {}
        }
      },
    );
    if (Platform.isAndroid) {
      await _localNotifications
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.createNotificationChannel(
            AndroidNotificationChannel(
              _kLocalNotificationChannelId,
              'HRMS Notifications',
              importance: Importance.high,
              playSound: true,
            ),
          );
    }
  }

  static Future<void> _requestPermission() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    _logAlways(
      'permission: ${settings.authorizationStatus} (0=notDetermined,1=denied,2=authorized,3=provisional)',
    );
  }

  /// Sends the current FCM token to the backend so it can target this device for push.
  /// Backend should implement POST /notifications/fcm-token with body { "fcmToken": "..." }.
  /// Uses retry for getToken to handle transient IOException/ExecutionException. Never throws.
  /// Returns true if the token was sent successfully, false if skipped (no token / not logged in) or failed.
  static Future<bool> sendTokenToBackend() async {
    try {
      final fcmToken = await _getTokenWithRetry();
      if (fcmToken == null || fcmToken.isEmpty) {
        _logAlways('sendTokenToBackend: no FCM token, skip');
        return false;
      }
      final prefs = await SharedPreferences.getInstance();
      String? authToken = prefs.getString('token');
      if (authToken != null &&
          (authToken.startsWith('"') || authToken.endsWith('"'))) {
        authToken = authToken.replaceAll('"', '');
      }
      if (authToken == null || authToken.isEmpty) {
        _logAlways(
          'sendTokenToBackend: user not logged in (no auth token), skip – will retry after login',
        );
        return false;
      }
      _logAlways(
        'sendTokenToBackend: posting fcm-token (len=${fcmToken.length})',
      );
      final api = ApiClient();
      api.setAuthToken(authToken);
      final response = await api.dio.post<dynamic>(
        '/notifications/fcm-token',
        data: {'fcmToken': fcmToken},
      );
      final preview = fcmToken.length > 16
          ? '${fcmToken.substring(0, 8)}...${fcmToken.substring(fcmToken.length - 6)}'
          : 'short';
      _logAlways(
        'sendTokenToBackend: success status=${response.statusCode} tokenPreview=$preview',
      );
      return response.statusCode == 200;
    } catch (e, st) {
      _logAlways('sendTokenToBackend: FAILED (getToken or POST) – $e');
      if (kDebugMode) debugPrint('$_logTag sendTokenToBackend stack: $st');
      return false;
    }
  }

  /// Call after login to register FCM token. Sends immediately and retries once after
  /// a short delay so token is reliably registered even if FCM was not ready on first try.
  static Future<void> sendTokenToBackendAfterLogin() async {
    final sent = await sendTokenToBackend();
    if (sent) return;
    // Token may not be ready yet (e.g. first launch). Retry once after delay.
    _logAlways('sendTokenToBackendAfterLogin: first attempt skipped/failed, retrying in 2s');
    await Future<void>.delayed(const Duration(seconds: 2));
    await sendTokenToBackend();
  }

  static Future<void> _onForegroundMessage(RemoteMessage message) async {
    final data = Map<String, dynamic>.from(message.data);
    final title =
        message.notification?.title ??
        data['title']?.toString() ??
        'Notification';
    final body =
        message.notification?.body ??
        data['body']?.toString() ??
        data['message']?.toString() ??
        '';

    _logAlways(
      'foreground message: title=$title body=${body.length > 60 ? "${body.substring(0, 60)}..." : body}',
    );

    // Store in SharedPreferences immediately so it appears in Notifications screen
    await storeNotification(title: title, body: body, data: data);

    // Show system notification (outside app – in notification tray) when app is in foreground
    await _showForegroundSystemNotification(
      title: title,
      body: body,
      data: data,
    );

    // Show in-app snackbar with primary color background
    final context = navigatorKey?.currentContext;
    if (context != null && context.mounted) {
      SystemSound.play(SystemSoundType.alert);
      final media = MediaQuery.of(context);
      final topOffset = media.padding.top + kToolbarHeight + 250;
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
                color: Colors.white,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  body.isNotEmpty ? body : title,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 20, color: Colors.white),
                onPressed: () => messenger.hideCurrentSnackBar(),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                style: IconButton.styleFrom(
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ],
          ),
          backgroundColor: AppColors.primary,
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

  static Future<void> _showForegroundSystemNotification({
    required String title,
    required String body,
    required Map<String, dynamic> data,
  }) async {
    try {
      final androidDetails = AndroidNotificationDetails(
        _kLocalNotificationChannelId,
        'HRMS Notifications',
        channelDescription:
            'Notifications for leave, attendance, requests, etc.',
        importance: Importance.high,
        priority: Priority.high,
        icon: '@drawable/ic_notification',
      );
      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );
      final details = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );
      final id = DateTime.now().millisecondsSinceEpoch % 100000;
      await _localNotifications.show(
        id,
        title,
        body,
        details,
        payload: jsonEncode(data),
      );
    } catch (e) {
      if (kDebugMode)
        debugPrint('$_logTag _showForegroundSystemNotification: $e');
    }
  }

  /// Saves one notification (foreground or background) and prunes entries older than 24h.
  /// Call from foreground handler, background handler, or when user opens app via notification tap.
  static Future<void> storeNotification({
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
      await prefs.setString(_kFcmNotificationsKey, jsonEncode(pruned));
      if (kDebugMode)
        debugPrint('$_logTag storeNotification: stored title=$title');
    } catch (e) {
      debugPrint('$_logTag storeNotification ERROR: $e');
    }
  }

  static List<dynamic> _loadRawList(SharedPreferences prefs) {
    try {
      final raw = prefs.getString(_kFcmNotificationsKey);
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
      await prefs.setString(_kFcmNotificationsKey, jsonEncode(pruned));
    }
    return pruned;
  }

  static void _onNotificationOpened(RemoteMessage message) {
    _log('notification opened (background/terminated): data=${message.data}');
    final data = Map<String, dynamic>.from(message.data);
    final title =
        message.notification?.title ??
        data['title']?.toString() ??
        'Notification';
    final body =
        message.notification?.body ??
        data['body']?.toString() ??
        data['message']?.toString() ??
        '';
    storeNotification(title: title, body: body, data: data);
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
