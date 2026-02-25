import 'package:flutter/material.dart';
import '../config/app_colors.dart';

class MenuIconButton extends StatelessWidget {
  const MenuIconButton({super.key});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: Icon(Icons.menu, color: AppColors.primary),
      onPressed: () => Scaffold.of(context).openDrawer(),
    );
  }
}
