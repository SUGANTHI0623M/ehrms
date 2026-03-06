import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import '../../config/app_colors.dart';
import '../../config/constants.dart';
import '../../utils/error_message_utils.dart';
import '../../utils/snackbar_utils.dart';
import '../../widgets/bottom_navigation_bar.dart';
import '../../services/attendance_service.dart';
import '../../services/attendance_template_store.dart';
import '../../services/auth_service.dart';
import '../../services/presence_tracking_service.dart';
import '../../bloc/attendance/attendance_bloc.dart';
import '../../utils/face_detection_helper.dart';
import 'home_dashboard_screen.dart';
import '../attendance/attendance_screen.dart';
import '../attendance/selfie_camera_screen.dart';
import '../holidays/holidays_screen.dart';
import '../requests/my_requests_screen.dart';
import '../salary/salary_overview_screen.dart';

class DashboardScreen extends StatefulWidget {
  /// 0=Dashboard, 1=Requests, 2=Salary, 3=Holidays, 4=Attendance, 5 maps to 4 (Attendance).
  final int? initialIndex;
  const DashboardScreen({super.key, this.initialIndex});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late int _currentIndex;
  int _requestsSubTabIndex = 0;
  int _attendanceSubTabIndex = 0;
  bool _isSubmittingFromFingerprint = false;

  final AttendanceService _attendanceService = AttendanceService();
  final AuthService _authService = AuthService();

  @override
  void initState() {
    super.initState();
    _currentIndex = _normalizeTabIndex((widget.initialIndex ?? 0));
    PresenceTrackingService().startTracking();
  }

  int _normalizeTabIndex(int index) {
    if (index == 5) return 4;
    return index.clamp(0, 4);
  }

  void _onDrawerNavigateToIndex(int index) {
    final normalized = _normalizeTabIndex(index);
    if (index >= 0 && (index <= 4 || index == 5)) {
      setState(() => _currentIndex = normalized);
    }
  }

  void _onDashboardNavigate(int index, {int subTabIndex = 0}) {
    final normalized = _normalizeTabIndex(index);
    if (index < 0 || index > 5) return;
    if (!mounted) return;
    setState(() {
      _currentIndex = normalized;
      if (index == 1) _requestsSubTabIndex = subTabIndex;
      if (normalized == 4) _attendanceSubTabIndex = subTabIndex;
    });
  }

  /// Fetches current position and address. Returns null position on failure.
  Future<({Position? position, String address, String? area, String? city, String? pincode})>
      _getCurrentLocation() async {
    String address = '';
    String? area;
    String? city;
    String? pincode;
    Position? position;
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return (position: null, address: '', area: null, city: null, pincode: null);
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return (position: null, address: '', area: null, city: null, pincode: null);
      }
      position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      final placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );
      if (placemarks.isNotEmpty) {
        final p = placemarks[0];
        area = p.subLocality ?? p.locality ?? p.name;
        city = p.locality ?? p.administrativeArea;
        pincode = p.postalCode;
        final parts = <String>[];
        if (p.name != null && p.name!.isNotEmpty) parts.add(p.name!);
        if (p.street != null && p.street!.isNotEmpty && p.street != p.name) parts.add(p.street!);
        if (p.subLocality != null && p.subLocality!.isNotEmpty) parts.add(p.subLocality!);
        if (p.locality != null && p.locality!.isNotEmpty) parts.add(p.locality!);
        if (p.postalCode != null && p.postalCode!.isNotEmpty) parts.add(p.postalCode!);
        address = parts.join(', ');
      } else {
        address = 'Lat: ${position.latitude}, Lng: ${position.longitude}';
      }
    } catch (_) {
      address = 'Location found (Address unavailable)';
    }
    return (position: position, address: address, area: area, city: city, pincode: pincode);
  }

  /// Fetches profile + today attendance for fingerprint validation (same data as attendance screen).
  Future<Map<String, dynamic>?> _fetchAttendanceValidationData() async {
    try {
      final profileResult = await _authService.getProfile();
      if (!mounted) return null;
      final staffData =
          profileResult['data']?['staffData'] as Map<String, dynamic>?;
      final templateId = staffData?['attendanceTemplateId'];
      final staffHasTemplate =
          templateId != null &&
          (templateId is String
              ? templateId.toString().trim().isNotEmpty
              : true);

      final todayStr =
          '${DateTime.now().year}-${DateTime.now().month.toString().padLeft(2, '0')}-${DateTime.now().day.toString().padLeft(2, '0')}';
      final result = await _attendanceService.getAttendanceByDate(todayStr);
      if (!mounted) return null;
      if (result['success'] != true || result['data'] == null) return null;

      final body = result['data'] as Map<String, dynamic>;
      final template = body['template'] as Map<String, dynamic>?;
      final branch = body['branch'];
      final branchData = branch is Map<String, dynamic> ? branch : null;
      final shiftAssigned = body['shiftAssigned'] as bool? ?? true;
      final data = body['data'] ?? body;
      final attendanceData = data is Map<String, dynamic> ? data : null;

      return {
        'staffHasTemplate': staffHasTemplate,
        'template': template,
        'branchData': branchData,
        'shiftAssigned': shiftAssigned,
        'attendanceData': attendanceData,
        'halfDayLeave': body['halfDayLeave'],
        'checkInAllowed': body['checkInAllowed'] ?? true,
        'checkOutAllowed': body['checkOutAllowed'] ?? true,
        'leaveMessage': body['leaveMessage'],
        'isHoliday': body['isHoliday'] ?? false,
        'isWeeklyOff': body['isWeeklyOff'] ?? false,
        'isAlternateWorkDate': body['isAlternateWorkDate'] ?? false,
        'isCompensationWeekOff': body['isCompensationWeekOff'] ?? false,
        'isCompensationCompOff': body['isCompensationCompOff'] ?? false,
        'isPaidLeaveToday': body['isPaidLeaveToday'] ?? false,
        'checkedInFromApi': body['checkedIn'],
      };
    } catch (_) {
      return null;
    }
  }

  /// Same UI as attendance screen "Cannot mark attendance" alert.
  Future<void> _showValidationAlertDialog(String message) async {
    if (!mounted) return;
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        const String title = 'Cannot mark attendance';
        const IconData iconData = Icons.warning_amber_rounded;
        final Color iconColor = AppColors.primary;
        final colorScheme = Theme.of(context).colorScheme;
        return Dialog(
          backgroundColor: Colors.transparent,
          child: Material(
            color: Colors.transparent,
            child: Container(
              constraints: const BoxConstraints(maxWidth: 340),
              decoration: BoxDecoration(
                color: colorScheme.surface,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: colorScheme.shadow.withOpacity(0.2),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: iconColor.withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(iconData, size: 48, color: iconColor),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    message,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.4,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: Material(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(12),
                      child: InkWell(
                        onTap: () => Navigator.of(context).pop(),
                        borderRadius: BorderRadius.circular(12),
                        child: const Padding(
                          padding: EdgeInsets.symmetric(vertical: 14),
                          child: Text(
                            'OK',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  /// Same UI as attendance screen "You are Late" / "You are Early" alert.
  Future<void> _showWarningAlertDialog(
    String message, {
    bool isLate = false,
    bool isEarly = false,
  }) async {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        final String title = isLate
            ? 'You are Late'
            : isEarly
                ? 'You are Early'
                : 'Notice';
        final IconData iconData = isLate
            ? Icons.access_time_rounded
            : isEarly
                ? Icons.schedule_rounded
                : Icons.info_outline_rounded;
        final Color iconColor = AppColors.primary;
        final colorScheme = Theme.of(context).colorScheme;
        return Dialog(
          backgroundColor: Colors.transparent,
          child: Material(
            color: Colors.transparent,
            child: Container(
              constraints: const BoxConstraints(maxWidth: 340),
              decoration: BoxDecoration(
                color: colorScheme.surface,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: colorScheme.shadow.withOpacity(0.2),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: iconColor.withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(iconData, size: 48, color: iconColor),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    message,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.4,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: Material(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(12),
                      child: InkWell(
                        onTap: () => Navigator.of(context).pop(),
                        borderRadius: BorderRadius.circular(12),
                        child: const Padding(
                          padding: EdgeInsets.symmetric(vertical: 14),
                          child: Text(
                            'OK',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  /// Template helpers (mirror attendance screen for validation only).
  static String? _getShiftStartTimeFromDb(Map<String, dynamic>? template) {
    final v = template?['shiftStartTime']?.toString().trim();
    return (v != null && v.isNotEmpty) ? v : null;
  }

  static String? _getShiftEndTimeFromDb(Map<String, dynamic>? template) {
    final v = template?['shiftEndTime']?.toString().trim();
    return (v != null && v.isNotEmpty) ? v : null;
  }

  static int _getGracePeriodMinutes(Map<String, dynamic>? template) {
    if (template == null) return 15;
    final flat = template['gracePeriodMinutes'];
    if (flat != null) {
      if (flat is int) return flat;
      final parsed = int.tryParse(flat.toString());
      if (parsed != null) return parsed;
    }
    try {
      final shifts = template['settings']?['attendance']?['shifts'] as List?;
      if (shifts != null && shifts.isNotEmpty) {
        final shift = shifts[0] as Map<String, dynamic>?;
        final graceTime = shift?['graceTime'];
        if (graceTime is Map) {
          final value = graceTime['value'];
          final unit = graceTime['unit']?.toString().toLowerCase();
          final v = value is int ? value : int.tryParse(value?.toString() ?? '');
          if (v != null) {
            if (unit == 'hours') return v * 60;
            return v;
          }
        }
      }
    } catch (_) {}
    return 15;
  }

  static Map<String, String>? _getHalfDaySessionBoundaries(
      Map<String, dynamic>? template) {
    final shiftStartStr = _getShiftStartTimeFromDb(template);
    final shiftEndStr = _getShiftEndTimeFromDb(template);
    if (shiftStartStr == null || shiftEndStr == null) return null;
    try {
      final startParts = shiftStartStr.split(':').map(int.parse).toList();
      final endParts = shiftEndStr.split(':').map(int.parse).toList();
      int startTotalMinutes =
          startParts[0] * 60 + (startParts.length > 1 ? startParts[1] : 0);
      int endTotalMinutes =
          endParts[0] * 60 + (endParts.length > 1 ? endParts[1] : 0);
      if (endTotalMinutes <= startTotalMinutes) endTotalMinutes += 24 * 60;
      final halfMinutes = (endTotalMinutes - startTotalMinutes) ~/ 2;
      final session1EndMinutes = startTotalMinutes + halfMinutes;
      final session1EndHours = (session1EndMinutes ~/ 60) % 24;
      final session1EndMins = session1EndMinutes % 60;
      final session1End =
          '${session1EndHours.toString().padLeft(2, '0')}:${session1EndMins.toString().padLeft(2, '0')}';
      return {
        'session1Start': shiftStartStr,
        'session1End': session1End,
        'session2Start': session1End,
        'session2End': shiftEndStr,
      };
    } catch (_) {
      return null;
    }
  }

  static Map<String, String>? _getWorkingSessionTimings(
    Map<String, dynamic>? attendanceData,
    Map<String, dynamic>? halfDayLeave,
    Map<String, dynamic>? template,
  ) {
    final isHalfDay = (attendanceData?['status'] == 'Half Day') ||
        (halfDayLeave != null);
    if (!isHalfDay) return null;
    final session =
        halfDayLeave?['session']?.toString().trim() ??
        attendanceData?['session']?.toString().trim();
    if (session != '1' && session != '2') return null;
    final b = _getHalfDaySessionBoundaries(template);
    if (b == null) return null;
    if (session == '1') {
      return {'startTime': b['session2Start']!, 'endTime': b['session2End']!};
    }
    return {'startTime': b['session1Start']!, 'endTime': b['session1End']!};
  }

  static int _getGracePeriodMinutesForLateCheckIn(
    Map<String, dynamic>? attendanceData,
    Map<String, dynamic>? halfDayLeave,
    Map<String, dynamic>? template,
  ) {
    final session =
        halfDayLeave?['session']?.toString().trim() ??
        attendanceData?['session']?.toString().trim();
    if (session == '1') return 0;
    return _getGracePeriodMinutes(template);
  }

  /// Runs same validations as attendance screen _openMarkAttendanceScreen. Returns true if OK to open camera, false if blocked (alert already shown).
  Future<bool> _runFingerprintAttendanceValidations(
      Map<String, dynamic> data) async {
    final staffHasTemplate = data['staffHasTemplate'] as bool? ?? false;
    final template = data['template'] as Map<String, dynamic>?;
    final branchData = data['branchData'] as Map<String, dynamic>?;
    final shiftAssigned = data['shiftAssigned'] as bool? ?? true;
    final attendanceData = data['attendanceData'] as Map<String, dynamic>?;
    final halfDayLeave = data['halfDayLeave'] as Map<String, dynamic>?;
    final checkInAllowed = data['checkInAllowed'] as bool? ?? true;
    final checkOutAllowed = data['checkOutAllowed'] as bool? ?? true;
    final leaveMessage = data['leaveMessage']?.toString();
    final isHoliday = data['isHoliday'] as bool? ?? false;
    final isWeeklyOff = data['isWeeklyOff'] as bool? ?? false;
    final isAlternateWorkDate = data['isAlternateWorkDate'] as bool? ?? false;
    final isCompensationWeekOff =
        data['isCompensationWeekOff'] as bool? ?? false;
    final isCompensationCompOff =
        data['isCompensationCompOff'] as bool? ?? false;
    final isPaidLeaveToday = data['isPaidLeaveToday'] as bool? ?? false;
    final punchIn = attendanceData?['punchIn'];
    final punchOut = attendanceData?['punchOut'];
    final checkedInFromApi = data['checkedInFromApi'] as bool?;
    final isCheckedIn =
        checkedInFromApi ?? (punchIn != null && punchOut == null);
    final isCompleted = punchIn != null && punchOut != null;
    final status = attendanceData?['status'] ?? '';
    final isAdminMarked =
        (punchIn == null && punchOut == null) &&
        (status == 'Present' || status == 'Approved');

    if (isCompleted || isAdminMarked) return false;

    if (staffHasTemplate != true) {
      await _showValidationAlertDialog(
        'Attendance template is not assigned. Contact HR.',
      );
      return false;
    }
    if (template == null) {
      await _showValidationAlertDialog('Template not mapped. Contact HR.');
      return false;
    }
    if (shiftAssigned != true) {
      await _showValidationAlertDialog('Shift not assigned. Contact HR.');
      return false;
    }
    if (branchData == null) {
      await _showValidationAlertDialog('Branch not assigned.');
      return false;
    }
    final branchStatus =
        (branchData['status']?.toString().trim().toUpperCase()) ?? '';
    if (branchStatus != 'ACTIVE') {
      await _showValidationAlertDialog('Your branch is not active.');
      return false;
    }
    final geofence = branchData['geofence'] as Map<String, dynamic>?;
    final geofenceEnabled = geofence?['enabled'] == true;
    if (!geofenceEnabled) {
      await _showValidationAlertDialog(
        'Geo fence is not set for your branch.',
      );
      return false;
    }
    final branchLat = geofence?['latitude'];
    final branchLng = geofence?['longitude'];
    final latLngSet =
        branchLat != null &&
        branchLng != null &&
        (branchLat is num ||
            (branchLat is String &&
                branchLat.toString().trim().isNotEmpty)) &&
        (branchLng is num ||
            (branchLng is String &&
                branchLng.toString().trim().isNotEmpty));
    if (!latLngSet) {
      await _showValidationAlertDialog(
        'Lat and long is not set for the branch.',
      );
      return false;
    }
    if (template['isActive'] == false) {
      await _showValidationAlertDialog(
        'Attendance template is not active. Contact HR.',
      );
      return false;
    }
    final shiftStart = _getShiftStartTimeFromDb(template);
    final shiftEnd = _getShiftEndTimeFromDb(template);
    if (shiftStart == null ||
        shiftStart.isEmpty ||
        shiftEnd == null ||
        shiftEnd.isEmpty) {
      await _showValidationAlertDialog(
        shiftAssigned == true
            ? 'Shift timings not set. Contact HR.'
            : 'Shift not assigned. Contact HR.',
      );
      return false;
    }

    final isSecondHalfLeave =
        halfDayLeave != null &&
        (halfDayLeave['halfDayType'] == 'Second Half Day' ||
            halfDayLeave['halfDaySession'] == 'Second Half Day' ||
            halfDayLeave['session'] == '2');
    final isFirstHalfLeave =
        halfDayLeave != null &&
        (halfDayLeave['halfDayType'] == 'First Half Day' ||
            halfDayLeave['halfDaySession'] == 'First Half Day' ||
            halfDayLeave['session'] == '1');
    final isOnLeave = halfDayLeave != null;
    if (!isCheckedIn && isOnLeave && !checkInAllowed) {
      SnackBarUtils.showSnackBar(
        context,
        ErrorMessageUtils.sanitizeForDisplay(
          isSecondHalfLeave
              ? 'Not allowed check-in. You are on leave on second half.'
              : isFirstHalfLeave
                  ? 'Not allowed check-in. You are on leave on first half.'
                  : (leaveMessage ?? 'Check-in is not allowed at this time.'),
        ),
        isError: true,
      );
      return false;
    }
    if (isCheckedIn && isOnLeave && !checkOutAllowed) {
      SnackBarUtils.showSnackBar(
        context,
        ErrorMessageUtils.sanitizeForDisplay(
          isSecondHalfLeave
              ? 'Not allowed check-out. You are on leave on second half.'
              : isFirstHalfLeave
                  ? 'Not allowed check-out. You are on leave on first half.'
                  : (leaveMessage ?? 'Check-out is not allowed at this time.'),
        ),
        isError: true,
      );
      return false;
    }
    if (isHoliday && template['allowAttendanceOnHolidays'] == false) {
      SnackBarUtils.showSnackBar(context, 'Today is a holiday', isError: true);
      return false;
    }
    if (isCompensationWeekOff) {
      SnackBarUtils.showSnackBar(
        context,
        'Today is compensation week off',
        isError: true,
      );
      return false;
    }
    if (isCompensationCompOff) {
      SnackBarUtils.showSnackBar(
        context,
        'Today is comp off',
        isError: true,
      );
      return false;
    }
    if (isPaidLeaveToday) {
      SnackBarUtils.showSnackBar(
        context,
        'Today is paid leave',
        isError: true,
      );
      return false;
    }
    if (isWeeklyOff &&
        template['allowAttendanceOnWeeklyOff'] == false &&
        !isAlternateWorkDate) {
      SnackBarUtils.showSnackBar(
        context,
        'Today is a holiday',
        isError: true,
      );
      return false;
    }

    final now = DateTime.now();
    if (!isCheckedIn) {
      final sessionTimings = _getWorkingSessionTimings(
          attendanceData, halfDayLeave, template);
      final shiftEndStrForBlock =
          sessionTimings?['endTime'] ?? _getShiftEndTimeFromDb(template);
      if (shiftEndStrForBlock != null &&
          shiftEndStrForBlock.isNotEmpty) {
        try {
          final parts =
              shiftEndStrForBlock.split(':').map(int.parse).toList();
          final shiftEndForBlock = DateTime(
            now.year,
            now.month,
            now.day,
            parts[0],
            parts.length > 1 ? parts[1] : 0,
          );
          if (now.isAfter(shiftEndForBlock)) {
            SnackBarUtils.showSnackBar(
              context,
              'Check-in not allowed after shift end time ($shiftEndStrForBlock).',
              isError: true,
            );
            return false;
          }
        } catch (_) {}
      }
    }

    String? alertMessage;
    bool shouldBlock = false;
    final allowLateEntry =
        template['allowLateEntry'] ??
        template['lateEntryAllowed'] ??
        true;
    final allowEarlyExit =
        template['allowEarlyExit'] ??
        template['earlyExitAllowed'] ??
        true;
    if (!isCheckedIn) {
      final sessionTimings = _getWorkingSessionTimings(
          attendanceData, halfDayLeave, template);
      final shiftStartStr =
          sessionTimings?['startTime'] ?? _getShiftStartTimeFromDb(template);
      if (shiftStartStr == null && allowLateEntry == false) {
        alertMessage = 'Shift start time not set. Contact HR.';
        shouldBlock = true;
      } else if (shiftStartStr != null) {
        try {
          final parts = shiftStartStr.split(':').map(int.parse).toList();
          final gracePeriod =
              _getGracePeriodMinutesForLateCheckIn(
                  attendanceData, halfDayLeave, template);
          final shiftStartOnly = DateTime(
            now.year,
            now.month,
            now.day,
            parts[0],
            parts.length > 1 ? parts[1] : 0,
          );
          final graceEnd =
              shiftStartOnly.add(Duration(minutes: gracePeriod));
          if (now.isAfter(graceEnd)) {
            final lateMinutes = (now.difference(shiftStartOnly).inMilliseconds /
                    (60 * 1000))
                .round()
                .clamp(0, 999);
            alertMessage =
                'You are $lateMinutes minute${lateMinutes == 1 ? '' : 's'} late. Shift start: $shiftStartStr.';
            if (allowLateEntry == false) shouldBlock = true;
          }
        } catch (_) {}
      }
    }
    if (isCheckedIn && alertMessage == null) {
      final sessionTimings = _getWorkingSessionTimings(
          attendanceData, halfDayLeave, template);
      final shiftEndStr =
          sessionTimings?['endTime'] ?? _getShiftEndTimeFromDb(template);
      if (shiftEndStr == null && allowEarlyExit == false) {
        alertMessage = 'Shift end time not set. Contact HR.';
        shouldBlock = true;
      } else if (shiftEndStr != null) {
        try {
          final parts = shiftEndStr.split(':').map(int.parse).toList();
          final shiftEnd = DateTime(
            now.year,
            now.month,
            now.day,
            parts[0],
            parts.length > 1 ? parts[1] : 0,
          );
          if (now.isBefore(shiftEnd)) {
            final earlyMinutes = shiftEnd.difference(now).inMinutes;
            alertMessage =
                'You are $earlyMinutes minutes early. Shift end time: $shiftEndStr';
            if (allowEarlyExit == false) shouldBlock = true;
          }
        } catch (_) {}
      }
    }
    if (alertMessage != null) {
      final isLate = alertMessage.contains('late');
      final isEarly = alertMessage.contains('early');
      await _showWarningAlertDialog(alertMessage, isLate: isLate, isEarly: isEarly);
      if (!mounted) return false;
      if (shouldBlock) return false;
    }
    return true;
  }

  Future<void> _submitAttendanceFromFile(
    BuildContext context,
    File file, {
    Position? position,
    String? address,
    String? area,
    String? city,
    String? pincode,
  }) async {
    final result = await FaceDetectionHelper.detectFromFile(file);
    if (!mounted) return;
    if (!result.valid) {
      _isSubmittingFromFingerprint = false;
      Navigator.of(context).pop();
      SnackBarUtils.showSnackBar(
        context,
        result.message ?? 'Please take a selfie with exactly one face visible.',
        isError: true,
      );
      return;
    }

    // Use pre-fetched location if provided; otherwise fetch now
    Position? usePosition = position;
    String useAddress = address ?? '';
    String? useArea = area;
    String? useCity = city;
    String? usePincode = pincode;
    if (usePosition == null && address == null) {
      final loc = await _getCurrentLocation();
      usePosition = loc.position;
      useAddress = loc.address;
      useArea = loc.area;
      useCity = loc.city;
      usePincode = loc.pincode;
    }

    final stored = await AttendanceTemplateStore.loadTemplateDetails();
    final template = stored != null && stored['template'] != null
        ? (stored['template'] is Map<String, dynamic>
            ? stored['template'] as Map<String, dynamic>
            : Map<String, dynamic>.from(stored['template'] as Map))
        : null;
    final requireSelfie = template?['requireSelfie'] ?? true;
    final requireGeolocation = template?['requireGeolocation'] ?? true;
    if (requireGeolocation && usePosition == null) {
      if (mounted) {
        _isSubmittingFromFingerprint = false;
        Navigator.of(context).pop();
        SnackBarUtils.showSnackBar(context, 'Could not get location.', isError: true);
      }
      return;
    }

    final todayRes = await _attendanceService.getTodayAttendance();
    bool isCheckedIn = false;
    if (todayRes['data'] is Map<String, dynamic>) {
      final d = todayRes['data'] as Map<String, dynamic>;
      final punchIn = d['punchIn'];
      final punchOut = d['punchOut'];
      final hasIn = punchIn != null && punchIn.toString().isNotEmpty;
      final hasOut = punchOut != null && punchOut.toString().isNotEmpty;
      isCheckedIn = hasIn && !hasOut;
    }

    List<int> imageBytes = await file.readAsBytes();
    String base64Image = base64Encode(imageBytes);
    final selfiePayload = 'data:image/jpeg;base64,$base64Image';

    if (AppConstants.enableAttendanceFaceMatching &&
        requireSelfie &&
        selfiePayload.isNotEmpty) {
      try {
        final verify = await _authService.verifyFace(selfiePayload);
        if (!mounted) return;
        if (verify['success'] != true || verify['match'] != true) {
          _isSubmittingFromFingerprint = false;
          Navigator.of(context).pop();
          SnackBarUtils.showSnackBar(
            context,
            ErrorMessageUtils.sanitizeForDisplay(
              verify['message']?.toString() ?? 'Face not matching.',
            ),
            isError: true,
          );
          return;
        }
      } catch (_) {
        if (mounted) {
          _isSubmittingFromFingerprint = false;
          Navigator.of(context).pop();
          SnackBarUtils.showSnackBar(context, 'Face verification failed. Please try again.', isError: true);
        }
        return;
      }
    }

    if (!mounted) return;
    final lat = usePosition?.latitude ?? 0.0;
    final lng = usePosition?.longitude ?? 0.0;
    if (isCheckedIn) {
      context.read<AttendanceBloc>().add(
        AttendanceCheckOutRequested(
          lat: lat,
          lng: lng,
          address: useAddress,
          area: useArea,
          city: useCity,
          pincode: usePincode,
          selfie: selfiePayload,
        ),
      );
    } else {
      context.read<AttendanceBloc>().add(
        AttendanceCheckInRequested(
          lat: lat,
          lng: lng,
          address: useAddress,
          area: useArea,
          city: useCity,
          pincode: usePincode,
          selfie: selfiePayload,
        ),
      );
    }
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
          if (_isSubmittingFromFingerprint) {
            _isSubmittingFromFingerprint = false;
            if (mounted) Navigator.of(context).pop();
            if (mounted) {
              SnackBarUtils.showSnackBar(
                context,
                'Checked In Successfully!',
                backgroundColor: AppColors.primary,
              );
            }
            await PresenceTrackingService().setTrackingAllowed();
            PresenceTrackingService().startTracking();
          } else {
            await PresenceTrackingService().setTrackingAllowed();
            PresenceTrackingService().startTracking();
          }
        } else if (state is AttendanceCheckOutSuccess) {
          if (_isSubmittingFromFingerprint) {
            _isSubmittingFromFingerprint = false;
            if (mounted) Navigator.of(context).pop();
            if (mounted) {
              SnackBarUtils.showSnackBar(
                context,
                'Checked Out Successfully!',
                backgroundColor: AppColors.primary,
              );
            }
            await PresenceTrackingService().stopTracking();
          } else {
            await PresenceTrackingService().stopTracking();
          }
        } else if (state is AttendanceFailure && _isSubmittingFromFingerprint) {
          _isSubmittingFromFingerprint = false;
          if (mounted) Navigator.of(context).pop();
          if (mounted) {
            SnackBarUtils.showSnackBar(
              context,
              ErrorMessageUtils.sanitizeForDisplay(state.message),
              isError: true,
            );
          }
        }
      },
      child: PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, result) {
          if (didPop) return;
          if (_currentIndex != 0) {
            setState(() => _currentIndex = 0);
          } else {
            // Dashboard is the root route (pushReplacement from splash/login).
            // Popping would leave empty stack = black screen. Exit app instead.
            SystemNavigator.pop();
          }
        },
        child: Scaffold(
          body: IndexedStack(
            index: _currentIndex.clamp(0, screens.length - 1),
            children: screens,
          ),
          bottomNavigationBar: AppBottomNavigationBar(
            currentIndex: _currentIndex.clamp(0, 5),
            onTap: (index) async {
              if (index == 5) {
                // Same validations as attendance screen before check-in/check-out
                final validationData = await _fetchAttendanceValidationData();
                if (!mounted) return;
                if (validationData == null) {
                  SnackBarUtils.showSnackBar(
                    context,
                    'Unable to load attendance details. Try again.',
                    isError: true,
                  );
                  return;
                }
                final canProceed =
                    await _runFingerprintAttendanceValidations(validationData);
                if (!mounted) return;
                if (!canProceed) return;

                // Get location before opening camera
                showDialog(
                  context: context,
                  barrierDismissible: false,
                  builder: (ctx) => const AlertDialog(
                    content: Row(
                      children: [
                        SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                        SizedBox(width: 16),
                        Text('Getting location…'),
                      ],
                    ),
                  ),
                );
                final location = await _getCurrentLocation();
                if (!mounted) return;
                Navigator.of(context).pop(); // Dismiss "Getting location..."
                final stored = await AttendanceTemplateStore.loadTemplateDetails();
                final template = stored != null && stored['template'] != null
                    ? (stored['template'] is Map<String, dynamic>
                        ? stored['template'] as Map<String, dynamic>
                        : Map<String, dynamic>.from(stored['template'] as Map))
                    : null;
                final requireGeolocation = template?['requireGeolocation'] ?? true;
                if (requireGeolocation && location.position == null) {
                  SnackBarUtils.showSnackBar(
                    context,
                    'Location is required. Please enable location and try again.',
                    isError: true,
                  );
                  return;
                }
                final locationStr = location.address.isNotEmpty
                    ? location.address
                    : (location.area != null
                        ? '${location.area}, ${location.city ?? ''}${location.pincode != null ? ' ${location.pincode}' : ''}'
                        : null);
                final result = await SelfieCameraScreen.captureSelfie(
                  context,
                  location: locationStr,
                  onRefreshLocation: () async {
                    final loc = await _getCurrentLocation();
                    return loc.address.isNotEmpty
                        ? loc.address
                        : (loc.area != null
                            ? '${loc.area}, ${loc.city ?? ''}${loc.pincode != null ? ' ${loc.pincode}' : ''}'
                            : null);
                  },
                );
                if (!mounted) return;
                File? file;
                if (result is File) {
                  file = result;
                } else if (identical(result, useImagePickerFallback)) {
                  SnackBarUtils.showSnackBar(
                    context,
                    'Camera unavailable. Try again from Attendance.',
                    isError: true,
                  );
                  return;
                }
                if (file == null) return; // Cancelled
                _isSubmittingFromFingerprint = true;
                showDialog(
                  context: context,
                  barrierDismissible: false,
                  builder: (ctx) => const AlertDialog(
                    content: Row(
                      children: [
                        SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                        SizedBox(width: 16),
                        Text('Submitting attendance…'),
                      ],
                    ),
                  ),
                );
                await _submitAttendanceFromFile(
                  context,
                  file,
                  position: location.position,
                  address: location.address,
                  area: location.area,
                  city: location.city,
                  pincode: location.pincode,
                );
                return;
              }
              final normalized = _normalizeTabIndex(index);
              setState(() => _currentIndex = normalized);
            },
          ),
        ),
      ),
    );
  }

}
