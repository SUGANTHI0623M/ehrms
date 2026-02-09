// hrms/lib/screens/lms/lms_shell_screen.dart
// LMS module shell: app bar, drawer, bottom navbar for all LMS screens.
// Back button pops entire LMS when on root; does not return to previous LMS tab.

import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/bottom_navigation_bar.dart';
import '../../widgets/menu_icon_button.dart';
import '../dashboard/dashboard_screen.dart';
import 'lms_dashboard_screen.dart';
import 'lms_live_sessions_screen.dart';

class LmsShellScreen extends StatefulWidget {
  /// Initial tab: 0 = My Learning, 1 = Live Sessions
  final int initialIndex;

  const LmsShellScreen({super.key, this.initialIndex = 0});

  @override
  State<LmsShellScreen> createState() => _LmsShellScreenState();
}

class _LmsShellScreenState extends State<LmsShellScreen> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex.clamp(0, 1);
  }

  void _onBottomNavTap(int index) {
    setState(() => _currentIndex = index);
  }

  void _exitLms() {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const DashboardScreen()),
      (route) => route.isFirst,
    );
  }

  @override
  Widget build(BuildContext context) {
    final titles = ['My Learning', 'Live Sessions'];
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        _exitLms();
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          leading: const MenuIconButton(),
          title: Text(titles[_currentIndex], style: const TextStyle(fontWeight: FontWeight.bold)),
          backgroundColor: AppColors.surface,
          foregroundColor: AppColors.textPrimary,
          elevation: 0,
        ),
        drawer: AppDrawer(
          onNavigateToIndex: null,
        ),
        body: IndexedStack(
          index: _currentIndex,
          children: [
            LmsDashboardScreen(
              embeddedInShell: true,
              onLmsTabSwitch: (i) => setState(() => _currentIndex = i.clamp(0, 1)),
            ),
            const LmsLiveSessionsScreen(embeddedInShell: true),
          ],
        ),
        bottomNavigationBar: AppBottomNavigationBar(
          currentIndex: 0,
          onTap: (index) {
            Navigator.of(context).pushAndRemoveUntil(
              MaterialPageRoute(builder: (_) => DashboardScreen(initialIndex: index)),
              (route) => route.isFirst,
            );
          },
        ),
      ),
    );
  }
}

