// hrms/lib/widgets/app_drawer.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_colors.dart';
import '../services/auth_service.dart';
import '../screens/auth/login_screen.dart';
import '../screens/dashboard/dashboard_screen.dart';
import '../screens/settings/settings_screen.dart';
import '../screens/assets/assets_listing_screen.dart';
import '../screens/geo/my_tasks_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/performance/performance_module_screen.dart';

class AppDrawer extends StatefulWidget {
  /// Current tab index when used from Dashboard (0=Dashboard, 1=Requests, 2=Salary, 3=Holidays, 4=Attendance).
  final int? currentIndex;

  /// Called when user selects a main tab; closes drawer and switches tab.
  final void Function(int index)? onNavigateToIndex;

  const AppDrawer({super.key, this.currentIndex, this.onNavigateToIndex});

  @override
  State<AppDrawer> createState() => _AppDrawerState();
}

class _AppDrawerState extends State<AppDrawer> {
  Map<String, dynamic>? _userData;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    final prefs = await SharedPreferences.getInstance();
    final userString = prefs.getString('user');
    if (userString != null && mounted) {
      final data = jsonDecode(userString) as Map<String, dynamic>;
      setState(() => _userData = data);

      // Fallback: if locationAccess is missing (user logged in before backend added it),
      // fetch profile to get locationAccess from staffData and update stored user
      if (!data.containsKey('locationAccess')) {
        try {
          final result = await AuthService().getProfile();
          if (result['success'] == true && mounted) {
            final profileData = result['data'];
            final staffData = profileData?['staffData'];
            final locationAccess = staffData?['locationAccess'] == true;
            data['locationAccess'] = locationAccess;
            await prefs.setString('user', jsonEncode(data));
            if (mounted) setState(() => _userData = data);
          }
        } catch (_) {}
      }
    }
  }

  void _navigateToTab(int index) {
    final callback = widget.onNavigateToIndex;
    Navigator.pop(context);
    Future.microtask(() {
      if (callback != null) {
        callback(index);
      } else if (mounted && context.mounted) {
        _navigateAndClearStack(DashboardScreen(initialIndex: index));
      }
    });
  }

  /// Navigate to a screen and clear the stack so back does not return to ride/task screens.
  void _navigateAndClearStack(Widget screen) {
    if (!mounted || !context.mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => screen),
      (route) => route.isFirst,
    );
  }

  Future<void> _logout(BuildContext context) async {
    // Clear token, prefs, and sign out from Google/Firebase (must complete before navigating).
    await AuthService().logout();
    if (!context.mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: AppColors.surface,
      child: Column(
        children: [
          _buildHeader(),
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                //  if (_userData?['locationAccess'] == true)
                if (1 == 1)
                  _buildDrawerItem(
                    icon: Icons.assignment_rounded,
                    title: 'Tasks',
                    onTap: () {
                      Navigator.pop(context);
                      Future.microtask(
                        () => _navigateAndClearStack(
                          const MyTasksScreen(dashboardTabIndex: 1),
                        ),
                      );
                    },
                  ),
                _buildDrawerItem(
                  icon: Icons.access_time_rounded,
                  title: 'Attendance',
                  onTap: () => _navigateToTab(4),
                ),
                _buildDrawerItem(
                  icon: Icons.person_rounded,
                  title: 'Profile',
                  onTap: () {
                    Navigator.pop(context);
                    Future.microtask(
                      () => _navigateAndClearStack(
                        const ProfileScreen(dashboardTabIndex: 3),
                      ),
                    );
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.settings_rounded,
                  title: 'Settings',
                  onTap: () {
                    Navigator.pop(context);
                    Future.microtask(
                      () => _navigateAndClearStack(const SettingsScreen()),
                    );
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.inventory_2_rounded,
                  title: 'My Assets',
                  onTap: () {
                    Navigator.pop(context);
                    Future.microtask(
                      () => _navigateAndClearStack(const AssetsListingScreen()),
                    );
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.trending_up_rounded,
                  title: 'Performance',
                  onTap: () {
                    Navigator.pop(context);
                    Future.microtask(
                      () => _navigateAndClearStack(
                        const PerformanceModuleScreen(),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          _buildDrawerItem(
            icon: Icons.logout_rounded,
            title: 'Logout',
            textColor: AppColors.error,
            iconColor: AppColors.error,
            onTap: () => _logout(context),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    final name = _userData?['name'] ?? 'Employee';
    final email = _userData?['email'] ?? '';
    final role = _userData?['role'] ?? 'N/A';
    final branch = _userData?['branchName'] ?? 'Main Office';
    final company = _userData?['companyName'] ?? 'HRMS Corp';

    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'U';
    final avatarUrl = _userData?['avatar'] ?? _userData?['photoUrl'];
    final showAvatar =
        avatarUrl != null &&
        avatarUrl.toString().trim().isNotEmpty &&
        avatarUrl.toString().startsWith('http');

    return Container(
      padding: const EdgeInsets.only(top: 60, left: 24, right: 24, bottom: 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.primary, AppColors.primary.withOpacity(0.8)],
        ),
        borderRadius: const BorderRadius.only(bottomRight: Radius.circular(32)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white24, width: 2),
                ),
                child: CircleAvatar(
                  backgroundColor: AppColors.surface,
                  radius: 35,
                  backgroundImage: showAvatar
                      ? NetworkImage(avatarUrl.toString().trim())
                      : null,
                  child: showAvatar
                      ? null
                      : Text(
                          initial,
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 20,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      company,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.9),
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildDetailRow(Icons.email_outlined, email),
          const SizedBox(height: 8),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildModernChip(Icons.work_outline_rounded, role),
              const SizedBox(width: 12),
              _buildModernChip(Icons.location_on_outlined, branch),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, color: Colors.white60, size: 16),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              color: Colors.white.withOpacity(0.8),
              fontSize: 12,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildModernChip(IconData icon, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: Colors.white70, size: 14),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    Color? textColor,
    Color? iconColor,
  }) {
    return ListTile(
      leading: Icon(icon, color: iconColor ?? Colors.black),
      title: Text(
        title,
        style: TextStyle(
          color: textColor ?? Colors.black,
          fontWeight: FontWeight.w500,
        ),
      ),
      onTap: onTap,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
    );
  }
}
