import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_colors.dart';

class ThemeProvider with ChangeNotifier {
  static const String _themeKey = 'theme_color';

  // Default color
  Color _primaryColor = const Color(0xFF1E88E5);

  Color get primaryColor => _primaryColor;

  final List<Color> themeColors = [
    const Color(0xFF1E88E5), // Blue 600
    const Color(0xFF43A047), // Green 600
    const Color(0xFFE53935), // Red 600
    const Color(0xFF8E24AA), // Purple 600
    const Color(0xFFFB8C00), // Orange 600
    const Color(0xFFE91E63), // Rose (Pink 500)
    const Color(0xFF000000), // Black
  ];

  ThemeProvider() {
    _loadTheme();
  }

  Future<void> _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final colorValue = prefs.getInt(_themeKey);
    if (colorValue != null) {
      _primaryColor = Color(colorValue);
      AppColors.updateTheme(_primaryColor);
      notifyListeners();
    }
  }

  Future<void> setThemeColor(Color color) async {
    _primaryColor = color;
    AppColors.updateTheme(color);
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_themeKey, color.value);
  }

  ThemeData getThemeData() {
    return ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: _primaryColor,
        primary: _primaryColor,
        secondary: _primaryColor.withOpacity(0.8),
        surface: Colors.white,
        background: const Color(0xFFF5F7FA),
      ),
      useMaterial3: true,
      scaffoldBackgroundColor: const Color(0xFFF5F7FA),
      appBarTheme: AppBarTheme(
        backgroundColor: _primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.white),
        titleTextStyle: const TextStyle(
          color: Colors.white,
          fontSize: 20,
          fontWeight: FontWeight.w600,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: _primaryColor,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}
