import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:background_location_tracker/background_location_tracker.dart';
import 'providers/theme_provider.dart';
import 'screens/splash/splash_screen.dart';
import 'bloc/auth/auth_bloc.dart';
import 'bloc/task/task_bloc.dart';
import 'bloc/attendance/attendance_bloc.dart';

@pragma('vm:entry-point')
void backgroundCallback() {
  // This function must be a top-level function. It will be called on a separate isolate
  // when a location update is received in the background.
  // For now, we don't need to do anything specific here, as LocationService
  // will handle the background updates directly.
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  await BackgroundLocationTrackerManager.initialize(
    backgroundCallback,
    config: const BackgroundLocationTrackerConfig(
      loggingEnabled: true,
      androidConfig: AndroidConfig(
        notificationIcon:
            'explore', // Consider updating this to a proper icon if needed
        trackingInterval: Duration(seconds: 4),
        distanceFilterMeters: null,
      ),
      iOSConfig: IOSConfig(
        activityType: ActivityType.FITNESS,
        distanceFilterMeters: null,
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

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, child) {
        return MaterialApp(
          title: 'HRMS',
          debugShowCheckedModeBanner: false,
          theme: themeProvider.getThemeData().copyWith(
            textTheme: themeProvider.getThemeData().textTheme.apply(
              fontFamily: 'Inter',
            ),
          ),
          home: const SplashScreen(),
        );
      },
    );
  }
}
