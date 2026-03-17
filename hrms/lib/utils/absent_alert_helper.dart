import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_colors.dart';
import '../config/constants.dart';

const String _keyPrefix = 'absent_alert_shown_';

/// In-memory guard so we never show more than one dialog (e.g. if two screens call at once).
bool _absentAlertShowing = false;

/// Blinking icon for the absent alert (repeating opacity pulse).
class _BlinkingAlertIcon extends StatefulWidget {
  const _BlinkingAlertIcon();

  @override
  State<_BlinkingAlertIcon> createState() => _BlinkingAlertIconState();
}

class _BlinkingAlertIconState extends State<_BlinkingAlertIcon>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Opacity(
          opacity: _animation.value,
          child: child,
        );
      },
      child: const Text('🚨', style: TextStyle(fontSize: 56), textAlign: TextAlign.center),
    );
  }
}

/// Shows the "Absent Notification" popup once per day when:
/// - Current time is at or after [AppConstants.absentAlertAfterHour]:[absentAlertAfterMinute] (e.g. 10:11),
/// - User has not punched in today ([hasPunchInToday] is false),
/// - Alert has not already been shown today.
Future<void> showAbsentAlertIfNeeded(
  BuildContext context, {
  required bool hasPunchInToday,
}) async {
  if (hasPunchInToday) return;
  if (_absentAlertShowing) return;

  final now = DateTime.now();
  final afterHour = AppConstants.absentAlertAfterHour;
  final afterMinute = AppConstants.absentAlertAfterMinute;
  if (now.hour < afterHour || (now.hour == afterHour && now.minute < afterMinute)) {
    return;
  }

  final prefs = await SharedPreferences.getInstance();
  final todayKey = '$_keyPrefix${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}';
  if (prefs.getBool(todayKey) == true) return;

  if (!context.mounted) return;

  // Mark as shown before displaying so a second call (e.g. from another screen) does not stack another dialog
  _absentAlertShowing = true;
  await prefs.setBool(todayKey, true);

  try {
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext ctx) {
      final colorScheme = Theme.of(ctx).colorScheme;
      return Dialog(
        backgroundColor: Colors.transparent,
        child: Material(
          color: Colors.transparent,
          child: Container(
            constraints: const BoxConstraints(maxWidth: 340),
            decoration: BoxDecoration(
              color: const Color(0xFF2A2A2A).withOpacity(0.85),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF0D0D0D), width: 2),
              boxShadow: [
                BoxShadow(
                  color: colorScheme.shadow.withOpacity(0.2),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const _BlinkingAlertIcon(),
                const SizedBox(height: 20),
                Text(
                  'Absent Notification',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white.withOpacity(0.9),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'You have not logged in today. Please update your attendance.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.4,
                    color: Colors.white.withOpacity(0.8),
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: Material(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(12),
                    child: InkWell(
                      onTap: () {
                        Navigator.of(ctx, rootNavigator: true).pop();
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: const Padding(
                        padding: EdgeInsets.symmetric(vertical: 14),
                        child: Text(
                          'OK',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    },
    );
  } finally {
    _absentAlertShowing = false;
  }
}
