import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import 'home_dashboard_screen.dart';
import '../attendance/attendance_screen.dart';
import '../geo/my_tasks_screen.dart';
import '../profile/profile_screen.dart';

class DashboardScreen extends StatefulWidget {
  final int? initialIndex;
  const DashboardScreen({super.key, this.initialIndex});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex ?? 0;
  }

  void _onDrawerNavigateToIndex(int index) {
    Navigator.pop(context);
    if (index >= 0 && index <= 3) {
      setState(() => _currentIndex = index);
    }
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = [
      HomeDashboardScreen(
        onNavigate: null,
        embeddedInDashboard: true,
        onNavigateToIndex: _onDrawerNavigateToIndex,
        dashboardTabIndex: _currentIndex,
      ),
      MyTasksScreen(
        dashboardTabIndex: _currentIndex,
        onNavigateToIndex: _onDrawerNavigateToIndex,
      ),
      AttendanceScreen(
        key: const ValueKey('Attendance'),
        initialTabIndex: 0,
        dashboardTabIndex: _currentIndex,
        onNavigateToIndex: _onDrawerNavigateToIndex,
      ),
      ProfileScreen(
        dashboardTabIndex: _currentIndex,
        onNavigateToIndex: _onDrawerNavigateToIndex,
      ),
    ];

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (_currentIndex != 0) {
          setState(() => _currentIndex = 0);
        } else {
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        body: IndexedStack(
          index: _currentIndex.clamp(0, screens.length - 1),
          children: screens,
        ),
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: _currentIndex.clamp(0, 3),
          onTap: (index) => setState(() => _currentIndex = index),
          type: BottomNavigationBarType.fixed,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: Colors.grey,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.assignment_outlined),
              activeIcon: Icon(Icons.assignment),
              label: 'Tasks',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.access_time_outlined),
              activeIcon: Icon(Icons.access_time),
              label: 'Attendance',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline_rounded),
              activeIcon: Icon(Icons.person_rounded),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}
