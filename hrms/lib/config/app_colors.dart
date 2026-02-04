import 'package:flutter/material.dart';

class AppColors {
  // These will be updated by ThemeProvider
  // Default to a green theme
  static Color primary = const Color(0xFF43A047); // Green 600
  static Color primaryDark = const Color(0xFF2E7D32); // Green 800
  static Color primaryLight = const Color(0xFFA5D6A7); // Green 200

  // Secondary/Accent Colors
  static const Color accent = Color(0xFFFFA000);
  static Color secondary = const Color(0xFF2196F3); // Blue 500
  static Color text = const Color(0xFF263238); // Blue Grey 900

  // Neutral Colors
  static const Color background = Color(0xFFF5F7FA);
  static const Color surface = Colors.white;
  static const Color textPrimary = Color(0xFF263238);
  static const Color textSecondary = Color(0xFF78909C);
  static const Color divider = Color(0xFFECEFF1);

  // Status Colors
  static const Color success = Color(0xFF43A047);
  static const Color warning = Color(0xFFFFB300);
  static const Color error = Color(0xFFE53935);
  static const Color info = Color(0xFF039BE5);

  static void updateTheme(Color color) {
    primary = color;
    primaryDark = _getDarkerColor(color);
    primaryLight = color.withOpacity(0.5);
  }

  static Color _getDarkerColor(Color color) {
    final hsl = HSLColor.fromColor(color);
    return hsl.withLightness((hsl.lightness - 0.1).clamp(0.0, 1.0)).toColor();
  }
}
