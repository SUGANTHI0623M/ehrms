// hrms/lib/widgets/bottom_navigation_bar.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_colors.dart';
import '../screens/dashboard/dashboard_screen.dart';

class AppBottomNavigationBar extends StatefulWidget {
  final int currentIndex;
  final Function(int)? onTap;

  const AppBottomNavigationBar({
    super.key,
    this.currentIndex = 0,
    this.onTap,
  });

  // Helper method to determine current index based on route
  static int getCurrentIndex(BuildContext context) {
    final route = ModalRoute.of(context)?.settings.name;
    if (route == null) return 0;

    // Check if we're on DashboardScreen
    if (route.contains('DashboardScreen')) {
      // Try to get the current index from the route arguments
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is int) return args;
      return 0;
    }

    // For other screens, return 0 (Dashboard)
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
            _isCandidate = (userData['role'] ?? '').toString().toLowerCase() == 'candidate';
          });
        }
      }
    } catch (e) {
      debugPrint('Error checking role: $e');
    }
  }

  void _handleNavigation(BuildContext context, int index) {
    if (widget.onTap != null) {
      widget.onTap!(index);
    } else {
      // Navigate to DashboardScreen with the selected index
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (_) => DashboardScreen(initialIndex: index),
        ),
        (route) => route.isFirst,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = [
      const BottomNavigationBarItem(
        icon: Icon(Icons.dashboard_outlined),
        activeIcon: Icon(Icons.dashboard),
        label: 'Dashboard',
      ),
      const BottomNavigationBarItem(
        icon: Icon(Icons.description_outlined),
        activeIcon: Icon(Icons.description),
        label: 'Requests',
      ),
      const BottomNavigationBarItem(
        icon: Icon(Icons.account_balance_wallet_outlined),
        activeIcon: Icon(Icons.account_balance_wallet),
        label: 'Salary',
      ),
      const BottomNavigationBarItem(
        icon: Icon(Icons.calendar_today_outlined),
        activeIcon: Icon(Icons.calendar_today),
        label: 'Holidays',
      ),
    ];

    if (!_isCandidate) {
      items.add(
        const BottomNavigationBarItem(
          icon: Icon(Icons.access_time_outlined),
          activeIcon: Icon(Icons.access_time_filled),
          label: 'Attendance',
        ),
      );
    }

    return BottomNavigationBar(
      currentIndex: widget.currentIndex,
      onTap: (index) => _handleNavigation(context, index),
      type: BottomNavigationBarType.fixed,
      selectedItemColor: AppColors.primary,
      unselectedItemColor: Colors.black,
      selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold),
      items: items,
    );
  }
}
