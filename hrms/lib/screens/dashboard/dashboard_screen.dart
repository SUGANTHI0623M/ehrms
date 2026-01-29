import 'package:flutter/material.dart';
import '../../widgets/bottom_navigation_bar.dart';
import 'home_dashboard_screen.dart';
import '../attendance/attendance_screen.dart';
import '../requests/my_requests_screen.dart';
import '../salary/salary_overview_screen.dart';
import '../holidays/holidays_screen.dart';

class DashboardScreen extends StatefulWidget {
  final int? initialIndex;
  const DashboardScreen({super.key, this.initialIndex});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late int _currentIndex;
  int _requestTabIndex = 0; // State to hold the sub-tab index for Requests
  int _attendanceTabIndex = 0; // State to hold the sub-tab index for Attendance

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex ?? 0;
  }

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
        bottomNavigationBar: AppBottomNavigationBar(
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
        ),
      ),
    );
  }
}
