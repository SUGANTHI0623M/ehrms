// hrms/lib/widgets/bottom_navigation_bar.dart
// Reusable custom bottom navbar with dark theme and yellow accent (reference-style).
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_colors.dart';
import '../screens/dashboard/dashboard_screen.dart';

/// Config for a single nav item.
class NavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;

  const NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
  });
}

/// Reusable bottom navigation bar with dark bar, rounded top corners,
/// and selected icon with yellow circular background.
class AppBottomNavigationBar extends StatefulWidget {
  final int currentIndex;
  final Function(int)? onTap;
  final List<NavItem>? items;

  const AppBottomNavigationBar({
    super.key,
    this.currentIndex = 0,
    this.onTap,
    this.items,
  });

  static int getCurrentIndex(BuildContext context) {
    final route = ModalRoute.of(context)?.settings.name;
    if (route == null) return 0;
    if (route.contains('DashboardScreen')) {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is int) return args;
      return 0;
    }
    return 0;
  }

  @override
  State<AppBottomNavigationBar> createState() => _AppBottomNavigationBarState();
}

class _AppBottomNavigationBarState extends State<AppBottomNavigationBar> {
  bool _isCandidate = false;

  @override
  void initState() {
    super.initState();
    _checkRole();
  }

  Future<void> _checkRole() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userString = prefs.getString('user');
      if (userString != null) {
        final userData = jsonDecode(userString);
        if (mounted) {
          setState(() {
            _isCandidate =
                (userData['role'] ?? '').toString().toLowerCase() ==
                'candidate';
          });
        }
      }
    } catch (_) {}
  }

  void _handleNavigation(BuildContext context, int index) {
    HapticFeedback.lightImpact();
    if (widget.onTap != null) {
      widget.onTap!(index);
    } else {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => DashboardScreen(initialIndex: index)),
        (route) => route.isFirst,
      );
    }
  }

  List<NavItem> _buildItems() {
    final base = [
      const NavItem(
        icon: Icons.dashboard_outlined,
        activeIcon: Icons.dashboard_rounded,
        label: 'Dashboard',
      ),
      const NavItem(
        icon: Icons.description_outlined,
        activeIcon: Icons.description_rounded,
        label: 'Requests',
      ),
      const NavItem(
        icon: Icons.account_balance_wallet_outlined,
        activeIcon: Icons.account_balance_wallet_rounded,
        label: 'Salary',
      ),
      const NavItem(
        icon: Icons.calendar_today_outlined,
        activeIcon: Icons.calendar_today_rounded,
        label: 'Holidays',
      ),
    ];
    if (!_isCandidate) {
      base.add(
        const NavItem(
          icon: Icons.access_time_outlined,
          activeIcon: Icons.access_time_rounded,
          label: 'Attendance',
        ),
      );
      base.add(
        const NavItem(
          icon: Icons.fingerprint_outlined,
          activeIcon: Icons.fingerprint_rounded,
          label: 'Punch',
        ),
      );
    }
    return base;
  }

  @override
  Widget build(BuildContext context) {
    final items = widget.items ?? _buildItems();

    // Nav bar background: black
    final barBg = Colors.black;
    final unselectedColor = const Color(0xFF94A3B8);
    final selectedColor = AppColors.primary;

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 12, 12, 24),
      decoration: BoxDecoration(
        color: barBg,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: const Color(0xFF222222), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(items.length, (i) {
              final item = items[i];
              final selected = widget.currentIndex == i;
              final isPunch = item.label == 'Punch';
              final iconColor = selected
                  ? Colors.white
                  : (isPunch ? selectedColor : unselectedColor);
              return Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => _handleNavigation(context, i),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: selected ? selectedColor : Colors.transparent,
                      shape: BoxShape.circle,
                      boxShadow: selected
                          ? [
                              BoxShadow(
                                color: selectedColor.withOpacity(0.4),
                                blurRadius: 10,
                                offset: const Offset(0, 2),
                              ),
                            ]
                          : null,
                    ),
                    child: Icon(
                      selected ? item.activeIcon : item.icon,
                      size: 24,
                      color: iconColor,
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
