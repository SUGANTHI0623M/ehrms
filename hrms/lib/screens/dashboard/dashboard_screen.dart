import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import 'home_dashboard_screen.dart';
import '../attendance/attendance_screen.dart';
import '../requests/my_requests_screen.dart';
import '../salary/salary_overview_screen.dart';
import '../holidays/holidays_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;
  int _requestTabIndex = 0; // State to hold the sub-tab index for Requests
  int _attendanceTabIndex = 0; // State to hold the sub-tab index for Attendance

  void _onNavigationRequest(int index, {int subTabIndex = 0}) {
    setState(() {
      _currentIndex = index;
      if (index == 1) {
        _requestTabIndex = subTabIndex;
      } else if (index == 4) {
        _attendanceTabIndex = subTabIndex;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    // We rebuild the screens list here to pass the callback and state
    final List<Widget> screens = [
      HomeDashboardScreen(onNavigate: _onNavigationRequest),
      MyRequestsScreen(
        key: ValueKey(
          'Requests_$_requestTabIndex',
        ), // Force rebuild if tab changes
        initialTabIndex: _requestTabIndex,
      ),
      const SalaryOverviewScreen(),
      const HolidaysScreen(),
      AttendanceScreen(
        key: ValueKey('Attendance_$_attendanceTabIndex'),
        initialTabIndex: _attendanceTabIndex,
      ),
    ];

    return WillPopScope(
      onWillPop: () async {
        if (_currentIndex != 0) {
          setState(() {
            _currentIndex = 0;
          });
          return false;
        }
        return true;
      },
      child: Scaffold(
        body: screens[_currentIndex],
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) {
            setState(() {
              _currentIndex = index;
              // Reset request tab index if navigating normally to Requests
              if (index == 1) {
                _requestTabIndex = 0;
              }
            });
          },
          type: BottomNavigationBarType.fixed,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: Colors.grey,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined),
              activeIcon: Icon(Icons.dashboard),
              label: 'Dashboard',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.description_outlined),
              activeIcon: Icon(Icons.description),
              label: 'Requests',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.monetization_on_outlined),
              activeIcon: Icon(Icons.monetization_on),
              label: 'Salary',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.calendar_today_outlined),
              activeIcon: Icon(Icons.calendar_today),
              label: 'Holidays',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.access_time_outlined),
              activeIcon: Icon(Icons.access_time_filled),
              label: 'Attendance',
            ),
          ],
        ),
      ),
    );
  }
}
