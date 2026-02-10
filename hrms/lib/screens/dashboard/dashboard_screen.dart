import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../widgets/bottom_navigation_bar.dart';
import '../../services/presence_tracking_service.dart';
import '../../bloc/attendance/attendance_bloc.dart';
import 'home_dashboard_screen.dart';
import '../attendance/attendance_screen.dart';
import '../holidays/holidays_screen.dart';
import '../requests/my_requests_screen.dart';
import '../salary/salary_overview_screen.dart';

class DashboardScreen extends StatefulWidget {
  /// 0=Dashboard, 1=Requests, 2=Salary, 3=Holidays, 4=Attendance (4 only for non-candidate).
  final int? initialIndex;
  const DashboardScreen({super.key, this.initialIndex});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late int _currentIndex;
  int _requestsSubTabIndex = 0;
  int _attendanceSubTabIndex = 0;

  @override
  void initState() {
    super.initState();
    _currentIndex = (widget.initialIndex ?? 0).clamp(0, 4);
    // Start staff presence tracking when dashboard loads (attendance-validated).
    PresenceTrackingService().startTracking();
  }

  void _onDrawerNavigateToIndex(int index) {
    if (index >= 0 && index <= 4) {
      setState(() => _currentIndex = index);
    }
  }

  void _onDashboardNavigate(int index, {int subTabIndex = 0}) {
    if (index < 0 || index > 4) return;
    if (!mounted) return;
    setState(() {
      _currentIndex = index;
      if (index == 1) _requestsSubTabIndex = subTabIndex;
      if (index == 4) _attendanceSubTabIndex = subTabIndex;
    });
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = [
      HomeDashboardScreen(
        onNavigate: _onDashboardNavigate,
        embeddedInDashboard: true,
        onNavigateToIndex: _onDrawerNavigateToIndex,
        dashboardTabIndex: _currentIndex,
        isActiveTab: _currentIndex == 0,
      ),
      MyRequestsScreen(
        key: ValueKey('Requests_$_requestsSubTabIndex'),
        initialTabIndex: _requestsSubTabIndex,
        dashboardTabIndex: _currentIndex,
        onNavigateToIndex: _onDrawerNavigateToIndex,
      ),
      SalaryOverviewScreen(
        dashboardTabIndex: _currentIndex,
        onNavigateToIndex: _onDrawerNavigateToIndex,
        isActiveTab: _currentIndex == 2,
      ),
      HolidaysScreen(
        dashboardTabIndex: _currentIndex,
        onNavigateToIndex: _onDrawerNavigateToIndex,
      ),
      AttendanceScreen(
        key: ValueKey('Attendance_$_attendanceSubTabIndex'),
        initialTabIndex: _attendanceSubTabIndex,
        dashboardTabIndex: _currentIndex,
        onNavigateToIndex: _onDrawerNavigateToIndex,
        isActiveTab: _currentIndex == 4,
      ),
    ];

    return BlocListener<AttendanceBloc, AttendanceState>(
      listener: (context, state) async {
        if (state is AttendanceCheckInSuccess) {
          await PresenceTrackingService().setTrackingAllowed();
          PresenceTrackingService().startTracking();
        } else if (state is AttendanceCheckOutSuccess) {
          await PresenceTrackingService().stopTracking();
        }
      },
      child: PopScope(
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
          bottomNavigationBar: AppBottomNavigationBar(
            currentIndex: _currentIndex.clamp(0, 4),
            onTap: (index) => setState(() => _currentIndex = index),
          ),
        ),
      ),
    );
  }
}
