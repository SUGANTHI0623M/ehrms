import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../widgets/app_drawer.dart';

class HolidaysScreen extends StatelessWidget {
  const HolidaysScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Holidays'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      drawer: const AppDrawer(),
      body: Center(child: Text('Holidays Content')),
    );
  }
}
