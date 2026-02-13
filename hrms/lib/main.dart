import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:background_location_tracker/background_location_tracker.dart';
import 'config/app_route_observer.dart';
import 'services/geo/live_tracking_service.dart';
import 'services/fcm_service.dart';
import 'providers/theme_provider.dart';
import 'screens/splash/splash_screen.dart';
import 'widgets/deactivation_check_wrapper.dart';
import 'bloc/auth/auth_bloc.dart';
import 'bloc/task/task_bloc.dart';
import 'bloc/attendance/attendance_bloc.dart';

@pragma('vm:entry-point')
void backgroundCallback() {
  BackgroundLocationTrackerManager.handleBackgroundUpdated((data) async {
    final lat = data.lat;
    final lon = data.lon;
    if (lat == null || lon == null) {
      return;
    }
    final speedMps = data.speed;
    await LiveTrackingService.sendTrackingFromBackground(
      lat,
      lon,
      speedMps: speedMps,
      accuracyM: data.horizontalAccuracy,
    );
  });
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  await FcmService.init();
  // Path accuracy: distanceFilter 30-50m, high accuracy. NO straight-line interpolation.
  await BackgroundLocationTrackerManager.initialize(
    backgroundCallback,
    config: const BackgroundLocationTrackerConfig(
      loggingEnabled: true,
      androidConfig: AndroidConfig(
        notificationIcon: 'explore',
        notificationBody: 'Live tracking in progress. Tap to open.',
        channelName: 'Live Tracking',
        cancelTrackingActionText: 'Stop tracking',
        enableCancelTrackingAction: true,
        trackingInterval: Duration(seconds: 5),
        // null = time-based updates only (every 5s). 40m filter = no updates when stationary.
        distanceFilterMeters: null,
      ),
      iOSConfig: IOSConfig(
        activityType: ActivityType.FITNESS,
        distanceFilterMeters: 40,
        restartAfterKill: true,
      ),
    ),
  );
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        // Clean Architecture: BLoC layer for auth, task, attendance (single source of truth).
        BlocProvider(create: (_) => AuthBloc()),
        BlocProvider(create: (_) => TaskBloc()),
        BlocProvider(create: (_) => AttendanceBloc()),
      ],
      child: const MyApp(),
    ),
  );
}

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    FcmService.navigatorKey = navigatorKey;
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, child) {
        return MaterialApp(
          navigatorKey: navigatorKey,
          navigatorObservers: [appRouteObserver],
          title: 'HRMS',
          debugShowCheckedModeBanner: false,
          theme: themeProvider.getThemeData().copyWith(
            textTheme: themeProvider.getThemeData().textTheme.apply(
              fontFamily: 'Inter',
            ),
          ),
          builder: (context, child) => DeactivationCheckWrapper(
            navigatorKey: navigatorKey,
            child: child ?? const SizedBox.shrink(),
          ),
          home: const SplashScreen(),
        );
      },
    );
  }
}
