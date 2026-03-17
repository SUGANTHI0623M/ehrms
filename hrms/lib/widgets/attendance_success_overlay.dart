import 'dart:async';
import 'package:flutter/material.dart';
import '../config/app_colors.dart';

/// Full-screen overlay shown after check-in or check-out with animated emoji
/// and personalized message (e.g. "Hey [Name], you have checked in. Have a productive day!").
class AttendanceSuccessOverlay extends StatefulWidget {
  final bool isCheckIn;
  final String userName;
  final VoidCallback? onDismiss;

  const AttendanceSuccessOverlay({
    super.key,
    required this.isCheckIn,
    required this.userName,
    this.onDismiss,
  });

  /// Shows the overlay on the root navigator and auto-dismisses after [duration].
  static Future<void> show(
    BuildContext context, {
    required bool isCheckIn,
    required String userName,
    Duration duration = const Duration(seconds: 3),
  }) async {
    final overlay = Navigator.of(context, rootNavigator: true).overlay;
    if (overlay == null) return;

    OverlayEntry? entry;
    void remove() {
      entry?.remove();
      entry = null;
    }

    entry = OverlayEntry(
      builder: (ctx) => AttendanceSuccessOverlay(
        isCheckIn: isCheckIn,
        userName: userName,
        onDismiss: () {
          remove();
        },
      ),
    );
    overlay.insert(entry!);

    await Future.delayed(duration);
    remove();
  }

  @override
  State<AttendanceSuccessOverlay> createState() => _AttendanceSuccessOverlayState();
}

class _AttendanceSuccessOverlayState extends State<AttendanceSuccessOverlay>
    with TickerProviderStateMixin {
  late AnimationController _scaleController;
  late AnimationController _emojiController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _emojiBounce;

  @override
  void initState() {
    super.initState();
    _scaleController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    // Looping "laughing" animation: gentle bounce that repeats
    _emojiController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _scaleController, curve: Curves.easeOutBack),
    );
    // Laugh-style: scale up and down repeatedly (1.0 -> 1.2 -> 1.0)
    _emojiBounce = Tween<double>(begin: 1.0, end: 1.2).animate(
      CurvedAnimation(parent: _emojiController, curve: Curves.easeInOut),
    );

    _scaleController.forward();
    _emojiController.repeat(reverse: true);
  }

  @override
  void dispose() {
    _scaleController.dispose();
    _emojiController.dispose();
    super.dispose();
  }

  String get _emoji => widget.isCheckIn ? '😊' : '👋';
  String get _message {
    final name = widget.userName.isNotEmpty ? widget.userName : 'there';
    if (widget.isCheckIn) {
      return 'Hey $name, you have checked in. Have a productive day!';
    }
    return 'Hey $name, you have checked out. Have a great evening!';
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black54,
      child: GestureDetector(
        onTap: () {
          widget.onDismiss?.call();
        },
        child: SafeArea(
          child: Center(
            child: ScaleTransition(
              scale: _scaleAnimation,
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 28),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.25),
                      blurRadius: 24,
                      offset: const Offset(0, 12),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    AnimatedBuilder(
                      animation: _emojiBounce,
                      builder: (context, child) {
                        return Transform.scale(
                          scale: _emojiBounce.value,
                          child: Text(
                            _emoji,
                            style: const TextStyle(fontSize: 64),
                            textAlign: TextAlign.center,
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 20),
                    Text(
                      _message,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Theme.of(context).colorScheme.onSurface,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Tap anywhere to close',
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
