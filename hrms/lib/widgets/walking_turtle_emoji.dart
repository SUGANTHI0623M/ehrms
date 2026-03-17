import 'package:flutter/material.dart';

/// Turtle emoji (🐢) walking once across the alert card (right to left),
/// with a slight step bounce. Use above Late Login / Early Exit dialogs.
class WalkingTurtleEmoji extends StatefulWidget {
  final double fontSize;

  const WalkingTurtleEmoji({super.key, this.fontSize = 72});

  @override
  State<WalkingTurtleEmoji> createState() => _WalkingTurtleEmojiState();
}

class _WalkingTurtleEmojiState extends State<WalkingTurtleEmoji>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _moveX;
  late Animation<double> _bounce;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 4000),
      vsync: this,
    )..forward(); // play once: right → left, then stop

    // Move from right to left across the full alert card (340px wide)
    _moveX = Tween<double>(begin: 170, end: -170).animate(
      CurvedAnimation(parent: _controller, curve: Curves.linear),
    );
    // Small step bounces while walking (4 steps per journey)
    _bounce = TweenSequence<double>([
      TweenSequenceItem(tween: Tween<double>(begin: 0, end: 4), weight: 0.25),
      TweenSequenceItem(tween: Tween<double>(begin: 4, end: 0), weight: 0.25),
      TweenSequenceItem(tween: Tween<double>(begin: 0, end: 4), weight: 0.25),
      TweenSequenceItem(tween: Tween<double>(begin: 4, end: 0), weight: 0.25),
    ]).animate(
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
      animation: _controller,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(_moveX.value, -_bounce.value),
          child: Text(
            '🐢',
            style: TextStyle(fontSize: widget.fontSize),
            textAlign: TextAlign.center,
          ),
        );
      },
    );
  }
}
