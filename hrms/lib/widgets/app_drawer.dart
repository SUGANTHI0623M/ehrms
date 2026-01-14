// hrms/lib/widgets/app_drawer.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_colors.dart';
import '../screens/auth/login_screen.dart';

class AppDrawer extends StatefulWidget {
  const AppDrawer({super.key});

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
      setState(() {
        _userData = jsonDecode(userString);
      });
    }
  }

  Future<void> _logout(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    if (!context.mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => LoginScreen()),
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
                _buildDrawerItem(
                  icon: Icons.dashboard_rounded,
                  title: 'Dashboard',
                  onTap: () {
                    Navigator.pop(context); // Close drawer
                    // Navigate if needed, or just close if already on dashboard
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.access_time_filled_rounded,
                  title: 'Attendance',
                  onTap: () {
                    Navigator.pop(context);
                    // TODO: Navigate to Attendance
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.event_note_rounded,
                  title: 'Leaves',
                  onTap: () {
                    Navigator.pop(context);
                    // TODO: Navigate to Leaves
                  },
                ),
                _buildDrawerItem(
                  icon: Icons.person_rounded,
                  title: 'Profile',
                  onTap: () {
                    Navigator.pop(context);
                    // TODO: Navigate to Profile
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
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'U';

    return UserAccountsDrawerHeader(
      decoration: const BoxDecoration(
        color: AppColors.primary,
        image: DecorationImage(
          image: AssetImage(
            'assets/images/drawer_bg.png',
          ), // Optional: Add an asset later
          fit: BoxFit.cover,
          opacity: 0.2, // Subtle texture
        ),
      ),
      accountName: Text(
        name,
        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
      ),
      accountEmail: Text(email),
      currentAccountPicture: CircleAvatar(
        backgroundColor: AppColors.surface,
        radius: 30,
        child: Text(
          initial,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: AppColors.primary,
          ),
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
      leading: Icon(icon, color: iconColor ?? AppColors.textSecondary),
      title: Text(
        title,
        style: TextStyle(
          color: textColor ?? AppColors.textPrimary,
          fontWeight: FontWeight.w500,
        ),
      ),
      onTap: onTap,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
    );
  }
}
