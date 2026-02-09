// hrms/lib/screens/splash/splash_screen.dart
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:background_location_tracker/background_location_tracker.dart';
import '../../config/app_colors.dart';
import '../../services/geo/live_tracking_service.dart';
import '../auth/login_screen.dart';
import '../dashboard/dashboard_screen.dart';
import '../geo/live_tracking_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  Color _primaryColor = AppColors.primary;
  bool _isLoadingTheme = true;

  @override
  void initState() {
    super.initState();
    _loadThemeColor();
    _checkAuth();
  }

  Future<void> _loadThemeColor() async {
    final prefs = await SharedPreferences.getInstance();
    final colorValue = prefs.getInt('theme_color');

    if (mounted) {
      setState(() {
        if (colorValue != null) {
          _primaryColor = Color(colorValue);
          AppColors.updateTheme(_primaryColor);
        } else {
          _primaryColor = AppColors.primary;
        }
        _isLoadingTheme = false;
      });
    }
  }

  Future<void> _checkAuth() async {
    // Wait for theme to load
    while (_isLoadingTheme) {
      await Future.delayed(const Duration(milliseconds: 100));
    }

    // Simulate a short loading time for branding or initialization
    await Future.delayed(const Duration(seconds: 2));

    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');

    if (!mounted) return;

    if (token != null && token.isNotEmpty) {
      final activeInfo = await LiveTrackingService().getActiveTaskInfo();
      if (activeInfo != null && mounted) {
        // If user tapped "Stop tracking" in notification, native tracking stopped but we had stale state.
        // Sync: clear LiveTrackingService and go to dashboard.
        final isTracking = await BackgroundLocationTrackerManager.isTracking();
        if (!isTracking) {
          await LiveTrackingService().stopTracking();
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => DashboardScreen()),
          );
          return;
        }
        // Live tracking in progress – go directly to LiveTrackingScreen (no resume prompt)
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => LiveTrackingScreen(
              taskId: activeInfo['taskId'] as String,
              taskMongoId: activeInfo['taskMongoId'] as String,
              pickupLocation: LatLng(
                activeInfo['pickupLat'] as double,
                activeInfo['pickupLng'] as double,
              ),
              dropoffLocation: LatLng(
                activeInfo['dropoffLat'] as double,
                activeInfo['dropoffLng'] as double,
              ),
              task: null,
            ),
          ),
        );
        return;
      }
      // User is logged in, navigate to Dashboard
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (_) => DashboardScreen()));
    } else {
      // User is not logged in, navigate to Login
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (_) => const LoginScreen()));
    }
  }

  // Helper function to determine if color is dark (for contrast)
  bool _isDarkColor(Color color) {
    final luminance = color.computeLuminance();
    return luminance < 0.5;
  }

  @override
  Widget build(BuildContext context) {
    // Use white for light colors, darker shade for dark colors
    final iconColor = _isDarkColor(_primaryColor)
        ? Colors.white
        : Colors.white.withOpacity(0.95);
    final textColor = iconColor;
    final loadingColor = iconColor;

    return Scaffold(
      backgroundColor: _primaryColor,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Icon or Logo here - using primary color with white background circle for contrast
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.people_alt_rounded, color: iconColor, size: 80),
            ),
            const SizedBox(height: 24),
            Text(
              'HRMS',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: textColor,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 48),
            CircularProgressIndicator(color: loadingColor, strokeWidth: 3),
          ],
        ),
      ),
    );
  }
}
