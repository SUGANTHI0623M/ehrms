import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';
import 'package:background_location_tracker/background_location_tracker.dart';
import '../../config/app_colors.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/menu_icon_button.dart';
import '../../services/geo/live_tracking_service.dart';
import '../geo/live_tracking_screen.dart';
import '../../services/request_service.dart';
import '../../services/attendance_service.dart';
import '../../services/auth_service.dart';
import '../../services/salary_service.dart';
import '../../utils/salary_structure_calculator.dart';
import '../../utils/fine_calculation_util.dart';
import '../../utils/attendance_display_util.dart';

class HomeDashboardScreen extends StatefulWidget {
  final Function(int index, {int subTabIndex})? onNavigate;

  /// When true, only the body content is built (no Scaffold/AppBar/drawer). Use when embedded in Dashboard.
  final bool embeddedInDashboard;

  /// Used when embedded in Dashboard: drawer tab index and callback for tab switching.
  final int? dashboardTabIndex;
  final void Function(int index)? onNavigateToIndex;

  /// When true, this screen is the active tab. Used to refresh once when opening.
  final bool? isActiveTab;

  const HomeDashboardScreen({
    super.key,
    this.onNavigate,
    this.embeddedInDashboard = false,
    this.dashboardTabIndex,
    this.onNavigateToIndex,
    this.isActiveTab,
  });

  @override
  State<HomeDashboardScreen> createState() => _HomeDashboardScreenState();
}

class _HomeDashboardScreenState extends State<HomeDashboardScreen> {
  String _userName = 'User';
  String _companyName = '';

  final RequestService _requestService = RequestService();
  final AttendanceService _attendanceService = AttendanceService();
  final AuthService _authService = AuthService();
  final SalaryService _salaryService = SalaryService();

  List<dynamic> _recentLeaves = [];
  List<dynamic> _activeLoans = [];
  bool _isLoadingDashboard = false;
  bool _isRefreshingInBackground = false;
  bool _isFetchingMonthAttendance = false;
  Map<String, dynamic>? _todayAttendance;
  Map<String, dynamic>? _monthData;
  Map<String, dynamic>? _stats;
  DateTime _selectedMonth = DateTime.now();

  // Salary calculation data (same logic as Salary Overview "This Month Net")
  double _calculatedMonthSalary = 0;
  int _workingDaysForSalary =
      0; // Full-month working days used for salary (same as Salary Overview)

  // Active loans count (from loan request module)
  int _activeLoansCount = 0;

  bool _isCandidate = false;
  bool _liveTrackingActive = false;

  @override
  void initState() {
    super.initState();
    _loadData();
    _checkLiveTracking();
  }

  @override
  void didUpdateWidget(HomeDashboardScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Whenever user opens or switches to Dashboard tab, refresh all values
    if (widget.isActiveTab == true && oldWidget.isActiveTab != true) {
      _loadData();
      _checkLiveTracking();
    }
  }

  Future<void> _checkLiveTracking() async {
    final active = await LiveTrackingService().isActive();
    // Sync: if user tapped "Stop tracking" in notification, native stopped but we had stale state
    if (active) {
      final isTracking = await BackgroundLocationTrackerManager.isTracking();
      if (!isTracking) {
        await LiveTrackingService().stopTracking();
        if (mounted) setState(() => _liveTrackingActive = false);
        return;
      }
    }
    if (mounted) setState(() => _liveTrackingActive = active);
  }

  Future<void> _openLiveTracking() async {
    final info = await LiveTrackingService().getActiveTaskInfo();
    if (!mounted || info == null) return;
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => LiveTrackingScreen(
          taskId: info['taskId'] as String,
          taskMongoId: info['taskMongoId'] as String,
          pickupLocation: LatLng(
            info['pickupLat'] as double,
            info['pickupLng'] as double,
          ),
          dropoffLocation: LatLng(
            info['dropoffLat'] as double,
            info['dropoffLng'] as double,
          ),
          task: null,
        ),
      ),
    );
    if (mounted) _checkLiveTracking();
  }

  Future<void> _loadData() async {
    final hasCachedData = _stats != null;
    // Full-screen loading only when no cached data; otherwise show content and refresh in background
    if (!hasCachedData) {
      setState(() => _isLoadingDashboard = true);
    } else {
      setState(() => _isRefreshingInBackground = true);
    }

    try {
      // Load local user data (name, company) from SharedPreferences
      final prefs = await SharedPreferences.getInstance();
      final userString = prefs.getString('user');
      if (userString != null) {
        final data = jsonDecode(userString);
        if (mounted) {
          setState(() {
            _userName = data['name'] ?? 'User';
            _isCandidate =
                (data['role'] ?? '').toString().toLowerCase() == 'candidate';
            final cachedCompanyName = data['companyName'];
            if (cachedCompanyName is String &&
                cachedCompanyName.trim().isNotEmpty) {
              _companyName = cachedCompanyName.trim();
            }
          });
        }
      }

      // Run dashboard, month attendance, and loans in parallel for faster load
      final dashboardFuture = _requestService.getDashboardData();
      _fetchMonthAttendance(forceRefresh: true);
      _fetchActiveLoans();

      final result = await dashboardFuture;
      if (mounted) {
        if (result['success']) {
          final data = result['data'];
          final stats = data['stats'];
          final activeLoansList = stats?['activeLoansList'];
          final loansList = activeLoansList is List
              ? activeLoansList
              : <dynamic>[];
          setState(() {
            _stats = stats;
            _recentLeaves = data['recentLeaves'] ?? [];
            _activeLoans = loansList;
            _activeLoansCount = loansList.length;
            _todayAttendance = stats?['attendanceToday'];
          });
          _calculateSalaryFromModule();
        }
        setState(() {
          _isLoadingDashboard = false;
          _isRefreshingInBackground = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoadingDashboard = false;
          _isRefreshingInBackground = false;
        });
      }
    }
  }

  Future<void> _fetchMonthAttendance({bool forceRefresh = false}) async {
    // Prevent concurrent calls for same operation
    if (_isFetchingMonthAttendance && !forceRefresh) return;

    _isFetchingMonthAttendance = true;
    try {
      final result = await _attendanceService.getMonthAttendance(
        _selectedMonth.year,
        _selectedMonth.month,
        forceRefresh: forceRefresh,
      );
      if (mounted) {
        if (result['success']) {
          setState(() {
            _monthData = result['data'];
          });
        }
      }
    } finally {
      if (mounted) {
        _isFetchingMonthAttendance = false;
      }
    }
  }

  Future<void> _fetchActiveLoans() async {
    try {
      final result = await _requestService.getLoanRequests(
        status: 'Active',
        page: 1,
        limit: 100, // Get all active loans
      );
      if (mounted && result['success']) {
        List<dynamic> loans = [];
        if (result['data'] is Map) {
          loans = result['data']['loans'] ?? [];
        } else if (result['data'] is List) {
          loans = result['data'];
        }
        setState(() {
          _activeLoans = loans;
          _activeLoansCount = loans.length;
        });
      }
    } catch (e) {
      // Ignore
    }
  }

  Future<void> _calculateSalaryFromModule() async {
    try {
      final now = DateTime.now();
      final monthIndex = now.month;
      final year = now.year;

      // 1. Fetch staff profile (same as Salary Overview)
      final profileResult = await _authService.getProfile();
      if (profileResult['success'] != true) return;

      final staffData = profileResult['data']?['staffData'];
      if (staffData == null || staffData['salary'] == null) return;

      final staffSalary = staffData['salary'] as Map<String, dynamic>;
      final basicSalary = staffSalary['basicSalary'];
      if (basicSalary == null || (basicSalary is num && basicSalary <= 0)) {
        return;
      }

      // Company name from business
      String? companyName;
      try {
        final businessData = staffData['businessId'];
        if (businessData is Map<String, dynamic>) {
          companyName = businessData['name']?.toString();
        }
      } catch (_) {}

      // Business settings (weekly off, holidays) - same as Salary Overview
      Map<String, dynamic>? businessSettings;
      if (staffData['branchId'] != null &&
          staffData['branchId'] is Map &&
          staffData['branchId']['businessId'] != null &&
          staffData['branchId']['businessId'] is Map) {
        businessSettings = staffData['branchId']['businessId'];
      } else if (staffData['businessId'] != null &&
          staffData['businessId'] is Map) {
        businessSettings = staffData['businessId'];
      }

      String weeklyOffPattern = 'standard';
      List<int> weeklyHolidays = [];
      if (businessSettings != null &&
          businessSettings['settings'] != null &&
          businessSettings['settings']['business'] != null) {
        final business =
            businessSettings['settings']['business'] as Map<String, dynamic>;
        weeklyOffPattern = (business['weeklyOffPattern'] is String)
            ? business['weeklyOffPattern'] as String
            : 'standard';
        if (business['weeklyHolidays'] != null &&
            business['weeklyHolidays'] is List) {
          weeklyHolidays = (business['weeklyHolidays'] as List)
              .map((h) {
                if (h is Map) {
                  final day = h['day'];
                  return (day is int) ? day : (day is num ? day.toInt() : -1);
                }
                return -1;
              })
              .where((day) => day >= 0 && day <= 6)
              .toList();
        }
      }

      // 2. Backend payroll stats (for working days only; This Month Net uses client calculation with Present + Approved)
      Map<String, dynamic>? backendStats;
      try {
        final statsResult = await _salaryService.getSalaryStats(
          month: monthIndex,
          year: year,
        );
        if (statsResult['stats'] != null) {
          backendStats = statsResult['stats'] as Map<String, dynamic>;
        }
      } catch (e) {
        // Ignore
      }

      // 3. Fetch attendance for current month
      final attendanceResult = await _attendanceService.getMonthAttendance(
        year,
        monthIndex,
      );
      List<dynamic> attendanceRecords = [];
      List<DateTime> holidays = [];
      if (attendanceResult['success'] == true) {
        final attendanceData = attendanceResult['data'];
        attendanceRecords = attendanceData['attendance'] ?? [];
        if (attendanceData['holidays'] != null) {
          holidays = (attendanceData['holidays'] as List)
              .map((h) {
                try {
                  return DateTime.parse(h['date']);
                } catch (e) {
                  return null;
                }
              })
              .whereType<DateTime>()
              .toList();
        }
      }

      // 4. Present days – prefer backend (same as payslip/salary overview); else compute from records
      double presentDays = 0;
      if (backendStats != null &&
          backendStats['attendance'] != null &&
          (backendStats['attendance'] as Map)['presentDays'] != null) {
        presentDays =
            ((backendStats['attendance'] as Map)['presentDays'] as num)
                .toDouble();
      }
      // Present days = till today only (same as backend / salary overview)
      if (presentDays == 0 && attendanceRecords.isNotEmpty) {
        final todayDate = DateTime(
          DateTime.now().year,
          DateTime.now().month,
          DateTime.now().day,
        );
        for (final record in attendanceRecords) {
          final recordDateStr = record['date'] as String?;
          if (recordDateStr != null) {
            try {
              final recordDate = DateTime.parse(recordDateStr).toLocal();
              final recordDay = DateTime(
                recordDate.year,
                recordDate.month,
                recordDate.day,
              );
              if (recordDay.isAfter(todayDate)) continue; // Skip future dates
            } catch (_) {}
          }
          final status = (record['status'] as String? ?? '')
              .trim()
              .toLowerCase();
          if (status == 'present' ||
              status == 'approved' ||
              status == 'half day') {
            final leaveType = (record['leaveType'] as String? ?? '')
                .trim()
                .toLowerCase();
            final isHalfDay = status == 'half day' || leaveType == 'half day';
            if (isHalfDay) {
              presentDays += 0.5;
            } else {
              presentDays += 1.0;
            }
          }
        }
      }
      // 5. Working days - use full-month working days (same as Salary Overview / payslip)
      // Prefer payroll/stats API (full month); if missing or suspiciously low (e.g. "days so far"),
      // use frontend calculateWorkingDays for full month so "This Month Net" matches Salary Overview.
      WorkingDaysInfo? workingDaysInfo;
      final lastDayOfMonth = DateTime(year, monthIndex + 1, 0).day;
      const minReasonableWorkingDays =
          10; // Full month has at least ~10 working days
      if (backendStats != null &&
          backendStats['attendance'] != null &&
          (backendStats['attendance'] as Map)['workingDays'] != null) {
        final backendAttendance =
            backendStats['attendance'] as Map<String, dynamic>;
        final backendWorkingDays =
            backendAttendance['workingDays'] as int? ?? 0;
        final backendHolidays = backendAttendance['holidays'] as int? ?? 0;
        final backendFullMonth =
            backendAttendance['workingDaysFullMonth'] as int?;
        if (backendWorkingDays >= minReasonableWorkingDays) {
          workingDaysInfo = WorkingDaysInfo(
            totalDays: lastDayOfMonth,
            workingDays: backendWorkingDays,
            weekends: 0,
            holidayCount: backendHolidays,
            workingDaysFullMonth: backendFullMonth,
          );
        }
      }
      workingDaysInfo ??= calculateWorkingDays(
        year,
        monthIndex,
        holidays,
        weeklyOffPattern,
        weeklyHolidays,
      );

      // 6. Salary structure (same as Salary Overview)
      final salaryInputs = SalaryStructureInputs.fromMap(staffSalary);
      final calculatedSalary = calculateSalaryStructure(salaryInputs);

      // 7. Fine calculation - shift timing, fine settings, daily salary, total fine (same as Salary Overview)
      final staffShiftName = staffData['shiftName'] as String?;
      ShiftTiming? shiftTiming = createShiftTimingFromBusinessSettings(
        businessSettings,
        staffShiftName,
      );
      if (shiftTiming == null) {
        Map<String, dynamic>? attendanceTemplate;
        try {
          final todayAttendance = await _attendanceService.getTodayAttendance();
          if (todayAttendance['success'] == true &&
              todayAttendance['data'] != null) {
            attendanceTemplate =
                todayAttendance['data']['template'] as Map<String, dynamic>?;
          }
        } catch (_) {}
        shiftTiming = createShiftTimingFromTemplate(attendanceTemplate);
      }

      final fineSettings = createFineSettingsFromBusinessSettings(
        businessSettings,
      );

      // Daily salary = Monthly NET salary / This month working days (1 day salary = net/this month WD)
      double? dailySalary;
      final thisMonthWorkingDays =
          workingDaysInfo.workingDaysFullMonth ?? workingDaysInfo.workingDays;
      if (thisMonthWorkingDays > 0) {
        dailySalary =
            calculatedSalary.monthly.netMonthlySalary / thisMonthWorkingDays;
      }

      double shiftHours = 9.0;
      if (shiftTiming != null) {
        shiftHours = calculateShiftHours(
          shiftTiming.startTime,
          shiftTiming.endTime,
        );
      } else {
        try {
          final todayAttendance = await _attendanceService.getTodayAttendance();
          if (todayAttendance['success'] == true &&
              todayAttendance['data'] != null) {
            final template =
                todayAttendance['data']['template'] as Map<String, dynamic>?;
            if (template != null) {
              final startTime =
                  template['shiftStartTime'] as String? ?? '09:30';
              final endTime = template['shiftEndTime'] as String? ?? '18:30';
              shiftHours = calculateShiftHours(startTime, endTime);
            }
          }
        } catch (_) {}
      }

      // 7. Fine calculation – ONLY for Present or Approved status
      // EXCLUDE Absent and Pending from fine calculation
      double totalFineAmount = 0.0;
      for (final record in attendanceRecords) {
        final status = (record['status'] as String? ?? '').trim().toLowerCase();

        // ONLY calculate fine for Present or Approved status
        // Skip Absent, Pending, Rejected, etc.
        if (status != 'present' && status != 'approved') continue;
        double fineAmount = (record['fineAmount'] as num?)?.toDouble() ?? 0.0;
        int lateMinutes = (record['lateMinutes'] as num?)?.toInt() ?? 0;
        if (fineAmount == 0 && lateMinutes == 0 && dailySalary != null) {
          final punchInStr = record['punchIn'] as String?;
          if (punchInStr != null) {
            try {
              final punchInTime = DateTime.parse(punchInStr).toLocal();
              final attendanceDateStr = record['date'] as String?;
              final attendanceDate = attendanceDateStr != null
                  ? DateTime.parse(attendanceDateStr).toLocal()
                  : DateTime(
                      punchInTime.year,
                      punchInTime.month,
                      punchInTime.day,
                    );
              final staffLabel =
                  record['employeeId']?.toString() ??
                  record['user']?.toString() ??
                  record['date']?.toString();
              final fineResult = calculateFine(
                punchInTime: punchInTime,
                attendanceDate: attendanceDate,
                shiftTiming: shiftTiming,
                fineSettings: fineSettings,
                dailySalary: dailySalary,
                staffLabel: staffLabel,
              );
              lateMinutes = fineResult.lateMinutes;
              fineAmount = fineResult.fineAmount;
            } catch (_) {}
          }
        }
        if (fineAmount > 0 || lateMinutes > 0) totalFineAmount += fineAmount;
      }

      // Use calculatePayrollFine for Present or Approved status ONLY
      // EXCLUDE Absent and Pending from fine calculation
      if (dailySalary != null && dailySalary > 0) {
        final attendanceRecordsList = attendanceRecords
            .where((record) {
              final s = (record['status'] as String? ?? '')
                  .trim()
                  .toLowerCase();
              // ONLY Present or Approved status
              return s == 'present' || s == 'approved';
            })
            .map((record) => record as Map<String, dynamic>)
            .toList();
        final calculatedTotalFine = calculatePayrollFine(
          attendanceRecords: attendanceRecordsList,
          dailySalary: dailySalary,
          shiftHours: shiftHours,
          fineSettings: fineSettings,
        );
        if (calculatedTotalFine > totalFineAmount || totalFineAmount == 0) {
          totalFineAmount = calculatedTotalFine;
        }
      }

      // 8. Prorated salary using THIS MONTH working days (same as Salary Overview)
      final thisMonthWorkingDaysForProration =
          workingDaysInfo.workingDaysFullMonth ?? workingDaysInfo.workingDays;
      final proratedSalary = calculateProratedSalary(
        calculatedSalary,
        thisMonthWorkingDaysForProration,
        presentDays,
        totalFineAmount,
      );

      final rawThisMonthNet = proratedSalary.proratedNetSalary;
      final displayThisMonthNet = rawThisMonthNet < 0 ? 0.0 : rawThisMonthNet;

      if (mounted) {
        final workingDaysUsed = workingDaysInfo.workingDays;
        setState(() {
          _calculatedMonthSalary = displayThisMonthNet;
          _workingDaysForSalary = workingDaysUsed;
          if (_companyName.isEmpty &&
              companyName != null &&
              companyName.trim().isNotEmpty) {
            _companyName = companyName.trim();
          }
        });
      }
    } catch (e) {
      // Ignore
    }
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width > 800;

    // Stats extraction
    final pendingLeaves = _stats?['pendingLeaves']?.toString() ?? '0';

    // Use active loans count from loan request module
    final activeLoansCount = _activeLoansCount.toString();

    // Use calculated salary from salary module (same logic as Salary Overview); show backend value until client calc completes
    String monthSalary = '';
    final salaryValue = _calculatedMonthSalary > 0
        ? _calculatedMonthSalary
        : (_stats?['currentMonthSalary'] as num?)?.toDouble() ?? 0.0;
    if (salaryValue > 0) {
      // Format with thousand separators and 2 decimal places
      final formatter = NumberFormat('#,##0.00');
      monthSalary = formatter.format(salaryValue);
    }
    final salaryStatus = _stats?['payrollStatus'] ?? 'Pending';

    // Present days from dashboard stats (only 'Present' status); working days from salary calc (full month, same as Salary Overview)
    // Use same working/present days as payslip and salary overview (from backend)
    final presentDays =
        _stats?['attendanceSummary']?['presentDays']?.toString() ?? '0';
    final totalDaysForCard =
        _stats?['attendanceSummary']?['totalDays']?.toString() ??
        (_workingDaysForSalary > 0 ? _workingDaysForSalary.toString() : '0');

    final content = RefreshIndicator(
      onRefresh: _loadData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcome Card
            _buildWelcomeCard(),
            const SizedBox(height: 32),

            // 2. Summary Cards
            GridView.count(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 1.6,
              children: [
                _buildSummaryCard(
                  title: 'Pending Leaves',
                  value: pendingLeaves,
                  isWide: isWide,
                ),
                _buildActiveLoansCard(
                  activeLoansCount: activeLoansCount,
                  activeLoans: _activeLoans,
                  isWide: isWide,
                ),
                _buildSummaryCard(
                  title: 'This Month Net',
                  value: monthSalary.isNotEmpty ? '₹$monthSalary' : '--',
                  subValue: presentDays != '0'
                      ? '$presentDays days present'
                      : (salaryStatus == 'Pending' ? 'Pending' : ''),
                  isWide: isWide,
                ),
                if (!_isCandidate)
                  _buildSummaryCard(
                    title: 'Present Days',
                    value: presentDays,
                    subValue: 'Out of $totalDaysForCard working days',
                    isWide: isWide,
                  ),
              ],
            ),

            const SizedBox(height: 32),

            // 3. Quick Actions
            const Text(
              'Quick Actions',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.02),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: _buildQuickActionButtons(),
                ),
              ),
            ),

            const SizedBox(height: 32),

            // 4. Recent Leaves & Attendance
            isWide
                ? Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: _buildRecentLeavesCard()),
                      if (!_isCandidate) ...[
                        const SizedBox(width: 24),
                        Expanded(child: _buildMonthAttendanceCard()),
                      ],
                    ],
                  )
                : Column(
                    children: [
                      _buildRecentLeavesCard(),
                      if (!_isCandidate) ...[
                        const SizedBox(height: 24),
                        _buildMonthAttendanceCard(),
                      ],
                    ],
                  ),
          ],
        ),
      ),
    );
    if (widget.embeddedInDashboard) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          leading: const MenuIconButton(),
          title: const Text(
            'Dashboard',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          centerTitle: true,
          elevation: 0,
          actions: [
            if (_isRefreshingInBackground)
              const Padding(
                padding: EdgeInsets.only(right: 8),
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            if (_liveTrackingActive)
              IconButton(
                icon: const Icon(Icons.gps_fixed),
                tooltip: 'Live tracking in progress',
                onPressed: _openLiveTracking,
              ),
          ],
        ),
        drawer: AppDrawer(
          currentIndex: widget.dashboardTabIndex ?? 0,
          onNavigateToIndex: widget.onNavigateToIndex,
        ),
        body: content,
      );
    }
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        leading: const MenuIconButton(),
        title: const Text(
          'Dashboard',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        elevation: 0,
        actions: [
          if (_isRefreshingInBackground)
            const Padding(
              padding: EdgeInsets.only(right: 8),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          if (_liveTrackingActive)
            IconButton(
              icon: const Icon(Icons.gps_fixed),
              tooltip: 'Live tracking in progress',
              onPressed: _openLiveTracking,
            ),
        ],
      ),
      drawer: const AppDrawer(),
      body: content,
    );
  }

  Widget _buildWelcomeCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              _companyName.isNotEmpty ? _companyName : '',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
                letterSpacing: 0.5,
              ),
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  'Welcome',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.white.withOpacity(0.8),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  _userName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildQuickActionButtons() {
    final buttons = <Widget>[];
    final onNavigate = widget.onNavigate;

    if (!_isCandidate && onNavigate != null) {
      buttons.add(
        _buildQuickActionButton(
          icon: Icons.fingerprint,
          label: 'Attendance',
          color: Colors.redAccent,
          onTap: () => onNavigate(4, subTabIndex: 0),
        ),
      );
    }

    if (onNavigate != null) {
      buttons.addAll([
        _buildQuickActionButton(
          icon: Icons.calendar_today,
          label: 'Apply Leave',
          color: Colors.blue,
          onTap: () => onNavigate(1, subTabIndex: 0),
        ),
        _buildQuickActionButton(
          icon: Icons.account_balance_wallet,
          label: 'Request Loan',
          color: Colors.green,
          onTap: () => onNavigate(1, subTabIndex: 1),
        ),
        _buildQuickActionButton(
          icon: Icons.receipt,
          label: 'Expense Claim',
          color: Colors.orange,
          onTap: () => onNavigate(1, subTabIndex: 2),
        ),
        _buildQuickActionButton(
          icon: Icons.attach_money,
          label: 'Request Payslip',
          color: Colors.purple,
          onTap: () => onNavigate(1, subTabIndex: 3),
        ),
      ]);
    }

    return buttons;
  }

  Widget _buildSummaryCard({
    required String title,
    required String value,
    String? subValue,
    required bool isWide,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 12,
              color: Colors.black,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              // Slightly smaller text for This Month Net to fit full amount
              fontSize: title == 'This Month Net' ? 16 : 18,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF1E293B),
            ),
          ),
          if (subValue != null) ...[
            const SizedBox(height: 2),
            Text(
              subValue,
              style: const TextStyle(
                fontSize: 10,
                color: Colors.black,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildActiveLoansCard({
    required String activeLoansCount,
    required List<dynamic> activeLoans,
    required bool isWide,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Active Loans',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 12,
              color: Colors.black,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            activeLoansCount,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E293B),
            ),
          ),
          if (activeLoans.isNotEmpty) ...[
            const SizedBox(height: 6),
            ...activeLoans.take(2).map((loan) {
              final amount = loan['amount']?.toString() ?? '0';
              final loanType = loan['loanType']?.toString() ?? 'Loan';
              return Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        loanType,
                        style: const TextStyle(
                          fontSize: 10,
                          color: Colors.black,
                          fontWeight: FontWeight.w500,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      '₹$amount',
                      style: const TextStyle(
                        fontSize: 10,
                        color: Color(0xFF1E293B),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              );
            }),
            if (activeLoans.length > 2)
              Text(
                '+${activeLoans.length - 2} more',
                style: const TextStyle(
                  fontSize: 9,
                  color: Colors.black,
                  fontWeight: FontWeight.w500,
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _buildQuickActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(height: 6),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.black,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRecentLeavesCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Recent Leave Requests',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 24),

          if (_isLoadingDashboard)
            const Center(child: CircularProgressIndicator())
          else if (_recentLeaves.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 20.0),
                child: Text(
                  'No recent leave requests',
                  style: TextStyle(color: Colors.grey),
                ),
              ),
            )
          else ...[
            _buildLeaveItem(_recentLeaves.first),
            const SizedBox(height: 24),
          ],

          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () {
                final fn = widget.onNavigate;
                if (fn != null) fn(1, subTabIndex: 0);
              },
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                side: const BorderSide(color: Color(0xFFE2E8F0)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text(
                'View All Leaves',
                style: TextStyle(color: Color(0xFF1E293B)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLeaveItem(dynamic leave) {
    final startDateArgs = DateTime.parse(leave['startDate']);
    final endDateArgs = DateTime.parse(leave['endDate']);
    final dateRange =
        '${DateFormat('MMM dd, yyyy').format(startDateArgs)} - ${DateFormat('MMM dd, yyyy').format(endDateArgs)}';

    Color statusColor = Colors.grey;
    if (leave['status'] == 'Approved') {
      statusColor = Colors.green;
    } else if (leave['status'] == 'Rejected') {
      statusColor = Colors.red;
    } else {
      statusColor = Colors.orange;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFE2E8F0)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  leave['leaveType'] ?? 'Leave',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E293B),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  dateRange,
                  style: const TextStyle(fontSize: 12, color: Colors.black),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              leave['status'] ?? 'N/A',
              style: TextStyle(
                fontSize: 12,
                color: statusColor,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMonthAttendanceCard() {
    final monthName = DateFormat('MMMM yyyy').format(_selectedMonth);
    // Prefer dashboard attendanceSummary (same source as payslip and salary overview)
    final summary = _stats?['attendanceSummary'] as Map<String, dynamic>?;
    final stats = summary != null
        ? {
            'workingDays': summary['totalDays'],
            'thisMonthWorkingDays': summary['thisMonthWorkingDays'],
            'presentDays': summary['presentDays'],
            'absentDays': summary['absentDays'],
            'halfDayPaidLeaveCount': summary['halfDayPaidLeaveCount'],
            'leaveDays': summary['leaveDays'],
            'holidaysCount': _monthData?['stats']?['holidaysCount'],
            'weekOffs': _monthData?['stats']?['weekOffs'],
          }
        : _monthData?['stats'];

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.calendar_month,
                size: 20,
                color: Color(0xFF1E293B),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'This Month Attendance ($monthName)',
                  style: const TextStyle(
                    fontSize: 16, // Slightly smaller font
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E293B),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildTodayAttendanceSubCard(),
          const SizedBox(height: 20),
          _buildMonthStatsRow(
            workingDays: stats?['workingDays']?.toString() ?? '0',
            thisMonthWorkingDays: stats?['thisMonthWorkingDays']?.toString(),
            holidays: stats?['holidaysCount']?.toString() ?? '0',
            weekOffs: stats?['weekOffs']?.toString() ?? '0',
            presentDays: stats?['presentDays']?.toString() ?? '0',
            absentDays: stats?['absentDays']?.toString() ?? '0',
            halfDayPaidLeaveCount: stats?['halfDayPaidLeaveCount']?.toString(),
            leaveDays: stats?['leaveDays']?.toString(),
          ),
          const SizedBox(height: 24),
          _buildSimpleCalendar(),
          const SizedBox(height: 24),
          _buildStatusLegend(),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () {
                final fn = widget.onNavigate;
                if (fn != null) fn(4, subTabIndex: 1);
              },
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                side: const BorderSide(color: Color(0xFFE2E8F0)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'View Full Attendance',
                style: TextStyle(
                  color: Color(0xFF1E293B),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTodayAttendanceSubCard() {
    final now = DateTime.now();
    final todayLabel = "Today (${DateFormat('dd MMM').format(now)})";

    String formatTime(String? isoString) {
      if (isoString == null) return '--:--';
      try {
        final date = DateTime.parse(isoString).toLocal();
        return DateFormat('hh:mm:ss a').format(date);
      } catch (e) {
        return '--:--';
      }
    }

    final punchIn = _todayAttendance?['punchIn'];
    final punchOut = _todayAttendance?['punchOut'];
    final address = _todayAttendance != null
        ? (_todayAttendance?['address'] ?? 'Recorded')
        : 'None';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  todayLabel,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF475569),
                    fontSize: 14,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: _todayAttendance != null
                        ? (_todayAttendance?['status'] == 'Pending'
                              ? Colors.orange.withOpacity(0.1)
                              : (_todayAttendance?['status'] == 'Rejected' ||
                                        _todayAttendance?['status'] == 'Absent'
                                    ? Colors.red.withOpacity(0.1)
                                    : _todayAttendance?['status'] == 'On Leave'
                                    ? Colors.blue.withOpacity(0.1)
                                    : Colors.green.withOpacity(0.1)))
                        : Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _todayAttendance != null
                        ? (_todayAttendance?['status'] == 'Pending'
                              ? 'Waiting for Approval'
                              : AttendanceDisplayUtil.formatAttendanceDisplayStatus(
                                  _todayAttendance?['status'] ?? 'Present',
                                  _todayAttendance?['leaveType'],
                                ))
                        : 'Absent',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: _todayAttendance != null
                          ? (_todayAttendance?['status'] == 'Pending'
                                ? Colors.orange
                                : (_todayAttendance?['status'] == 'Rejected' ||
                                          _todayAttendance?['status'] ==
                                              'Absent'
                                      ? Colors.red
                                      : _todayAttendance?['status'] ==
                                            'On Leave'
                                      ? Colors.blue
                                      : Colors.green))
                          : Colors.red,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Punch In',
                style: TextStyle(color: Colors.black, fontSize: 13),
              ),
              Flexible(
                child: Text(
                  formatTime(punchIn),
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1E293B),
                    fontSize: 13,
                  ),
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.end,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Punch Out',
                style: TextStyle(color: Colors.black, fontSize: 13),
              ),
              Flexible(
                child: Text(
                  formatTime(punchOut),
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1E293B),
                    fontSize: 13,
                  ),
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.end,
                ),
              ),
            ],
          ),
          if (_todayAttendance != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(
                  Icons.location_on,
                  size: 14,
                  color: Color(0xFF94A3B8),
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    address,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11, color: Colors.black),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMonthStatsRow({
    required String workingDays,
    String? thisMonthWorkingDays,
    required String holidays,
    required String weekOffs,
    required String presentDays,
    required String absentDays,
    String? halfDayPaidLeaveCount,
    String? leaveDays,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDBEAFE)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _buildStatItem(presentDays, 'Present'),
            Container(width: 1, height: 30, color: const Color(0xFFDBEAFE)),
            _buildStatItem(absentDays, 'Absent'),
            Container(width: 1, height: 30, color: const Color(0xFFDBEAFE)),
            _buildStatItem(workingDays, 'Working'),
            Container(width: 1, height: 30, color: const Color(0xFFDBEAFE)),
            if (thisMonthWorkingDays != null) ...[
              _buildStatItem(thisMonthWorkingDays, 'Month W.D.'),
              Container(width: 1, height: 30, color: const Color(0xFFDBEAFE)),
            ],
            if (halfDayPaidLeaveCount != null) ...[
              _buildStatItem(halfDayPaidLeaveCount, 'Half day PL'),
              Container(width: 1, height: 30, color: const Color(0xFFDBEAFE)),
            ],
            if (leaveDays != null) ...[
              _buildStatItem(leaveDays, 'Leave'),
              Container(width: 1, height: 30, color: const Color(0xFFDBEAFE)),
            ],
            _buildStatItem(holidays, 'Holidays'),
            Container(width: 1, height: 30, color: const Color(0xFFDBEAFE)),
            _buildStatItem(weekOffs, 'Week Offs'),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String value, String label) {
    return Container(
      width: 80,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            value,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E40AF),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              color: Colors.black,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSimpleCalendar() {
    final now = DateTime.now();
    final firstDayOfMonth = DateTime(
      _selectedMonth.year,
      _selectedMonth.month,
      1,
    );
    final lastDayOfMonth = DateTime(
      _selectedMonth.year,
      _selectedMonth.month + 1,
      0,
    );
    final prevMonthLastDay = DateTime(
      _selectedMonth.year,
      _selectedMonth.month,
      0,
    );
    final int firstDayWeekday = firstDayOfMonth.weekday % 7;

    List<DateTime> days = [];
    for (int i = firstDayWeekday - 1; i >= 0; i--) {
      days.add(
        DateTime(
          prevMonthLastDay.year,
          prevMonthLastDay.month,
          prevMonthLastDay.day - i,
        ),
      );
    }
    for (int i = 1; i <= lastDayOfMonth.day; i++) {
      days.add(DateTime(_selectedMonth.year, _selectedMonth.month, i));
    }
    while (days.length % 7 != 0) {
      days.add(
        DateTime(
          lastDayOfMonth.year,
          lastDayOfMonth.month + 1,
          days.length - (lastDayOfMonth.day + firstDayWeekday) + 1,
        ),
      );
    }

    // Use date strings (yyyy-MM-dd) as keys to avoid conflicts and ensure accurate matching
    Map<String, String> dayStatusByDate = {};
    Map<String, String?> dayLeaveTypeByDate = {};
    Map<String, num?> dayWorkHoursByDate = {};
    if (_monthData != null && _monthData!['attendance'] != null) {
      for (var entry in _monthData!['attendance']) {
        try {
          // Use date-only from API so calendar day matches backend (avoids timezone shifting)
          final dateVal = entry['date'];
          String dateStr;
          if (dateVal is String && dateVal.toString().contains('T')) {
            dateStr = dateVal.toString().split('T').first;
          } else {
            final d = DateTime.parse(dateVal.toString()).toLocal();
            dateStr = DateFormat('yyyy-MM-dd').format(d);
          }
          final parts = dateStr.split('-');
          if (parts.length != 3) continue;
          final dayYear = int.tryParse(parts[0]) ?? 0;
          final dayMonth = int.tryParse(parts[1]) ?? 0;
          if (dayYear != _selectedMonth.year ||
              dayMonth != _selectedMonth.month) {
            continue;
          }
          dayStatusByDate[dateStr] = entry['status'] ?? 'Present';
          final leaveType = entry['leaveType'] as String?;
          if (leaveType != null && leaveType.isNotEmpty) {
            dayLeaveTypeByDate[dateStr] = leaveType;
          }
          num? workHours = entry['workHours'] as num?;

          // Calculate workHours from punchIn and punchOut if not available
          if (workHours == null) {
            final punchIn = entry['punchIn'];
            final punchOut = entry['punchOut'];
            if (punchIn != null && punchOut != null) {
              try {
                final punchInTime = DateTime.parse(
                  punchIn.toString(),
                ).toLocal();
                final punchOutTime = DateTime.parse(
                  punchOut.toString(),
                ).toLocal();
                final duration = punchOutTime.difference(punchInTime);
                workHours = duration.inMinutes / 60.0; // Convert to hours
              } catch (_) {
                // If parsing fails, leave workHours as null
              }
            }
          }

          dayWorkHoursByDate[dateStr] = workHours;
        } catch (e) {
          // Skip invalid date entries
          continue;
        }
      }
    }

    // Create a set of holiday date strings for quick lookup
    Set<String> holidayDateSet = {};
    if (_monthData != null && _monthData!['holidays'] != null) {
      for (var h in _monthData!['holidays']) {
        try {
          final d = DateTime.parse(h['date']).toLocal();
          final dateStr = DateFormat('yyyy-MM-dd').format(d);
          // Check both year and month to ensure correct matching
          if (d.year == _selectedMonth.year &&
              d.month == _selectedMonth.month) {
            holidayDateSet.add(dateStr);
          }
        } catch (e) {
          // Skip invalid date entries
          continue;
        }
      }
    }

    // Create a set of week off dates from backend (source of truth - already calculated based on attendance template)
    Set<String> weekOffDateSet = {};
    if (_monthData != null && _monthData!['weekOffDates'] != null) {
      final weekOffDates = _monthData!['weekOffDates'] as List;
      for (var dateStr in weekOffDates) {
        if (dateStr is String) {
          weekOffDateSet.add(dateStr);
        }
      }
    }

    // Create a set of present dates from backend
    Set<String> presentDateSet = {};
    if (_monthData != null && _monthData!['presentDates'] != null) {
      final presentDates = _monthData!['presentDates'] as List;
      for (var dateStr in presentDates) {
        if (dateStr is String) {
          presentDateSet.add(dateStr);
        }
      }
    }

    // Create a set of absent dates (working days without attendance records)
    Set<String> absentDateSet = {};
    if (_monthData != null && _monthData!['absentDates'] != null) {
      final absentDates = _monthData!['absentDates'] as List;
      for (var dateStr in absentDates) {
        if (dateStr is String) {
          absentDateSet.add(dateStr);
        }
      }
    }

    // Create a set of approved leave dates (for showing "L" on calendar)
    Set<String> leaveDateSet = {};
    if (_monthData != null && _monthData!['leaveDates'] != null) {
      for (var dateStr in _monthData!['leaveDates']) {
        if (dateStr is String) {
          leaveDateSet.add(dateStr);
        }
      }
    }

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            IconButton(
              icon: const Icon(Icons.chevron_left),
              onPressed: () {
                setState(() {
                  _selectedMonth = DateTime(
                    _selectedMonth.year,
                    _selectedMonth.month - 1,
                  );
                });
                // Call async function after setState completes
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  _fetchMonthAttendance(forceRefresh: true);
                });
              },
            ),
            Text(
              DateFormat('MMMM yyyy').format(_selectedMonth),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            IconButton(
              icon: const Icon(Icons.chevron_right),
              onPressed: () {
                setState(() {
                  _selectedMonth = DateTime(
                    _selectedMonth.year,
                    _selectedMonth.month + 1,
                  );
                });
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  _fetchMonthAttendance(forceRefresh: true);
                });
              },
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
              .map(
                (d) => SizedBox(
                  width: 30,
                  child: Center(
                    child: Text(
                      d,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.black,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 8),
        GridView.builder(
          key: ValueKey(
            'calendar_${_selectedMonth.year}_${_selectedMonth.month}',
          ),
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 7,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
          ),
          itemCount: days.length,
          itemBuilder: (context, index) {
            final dayDate = days[index];
            final dateStr = DateFormat('yyyy-MM-dd').format(dayDate);
            final bool isCurrentMonth = dayDate.month == _selectedMonth.month;
            final bool isToday =
                isCurrentMonth &&
                dayDate.day == now.day &&
                dayDate.month == now.month &&
                dayDate.year == now.year;
            Color bgColor = Colors.transparent;
            Color textColor = isCurrentMonth
                ? const Color(0xFF1E293B)
                : const Color(0xFFCBD5E1);

            // Initialize variables before use
            num? workHours;
            bool isLowHours = false;
            bool isFuture = false;
            String? leaveTypeAbbr;

            if (isCurrentMonth) {
              final bool isHoliday = holidayDateSet.contains(dateStr);

              final dayOfWeek =
                  dayDate.weekday % 7; // 0=Sunday, 1=Monday, ..., 6=Saturday

              // Use backend calculated week off dates, but add validation:
              // 1. Sundays (day 0) should ALWAYS be week off
              // 2. Fridays (day 5) should NEVER be week off unless explicitly in backend data
              bool isWeekOff = weekOffDateSet.contains(dateStr);

              // Validation: Sundays are always week off
              if (dayOfWeek == 0) {
                isWeekOff = true;
              }

              // Check if present from backend presentDates array
              final bool isPresentFromBackend = presentDateSet.contains(
                dateStr,
              );

              // Set dark grey text color for Sundays/week offs
              if (isWeekOff) {
                textColor = const Color(0xFF475569); // Dark grey color
              }

              // Priority: Present with LeaveType (Green) > Half Day (On Leave Blue) > Holiday > Week Off > Leave without attendance (On Leave Blue) > Present > Absent > Not Marked
              // IMPORTANT: Week offs (especially Sundays) should NEVER be marked as absent
              final status = dayStatusByDate[dateStr];
              final hasLeaveType = dayLeaveTypeByDate.containsKey(dateStr);
              // Never treat as present when record is Pending/Absent/Rejected (trust attendance list over presentDates)
              final isAbsentStatus =
                  (status ?? '').toString().toLowerCase() == 'absent';
              final isPresentStatus =
                  (status == 'Present' ||
                      status == 'Approved' ||
                      isPresentFromBackend) &&
                  status != 'Pending' &&
                  !isAbsentStatus &&
                  status != 'Rejected';
              final isHalfDayStatus =
                  status == 'Half Day' || (status?.toLowerCase() == 'half day');

              // 1. Present with leaveType → Green background with CL/SL/HA
              if (isPresentStatus && hasLeaveType) {
                bgColor = const Color(0xFFDCFCE7); // Present - Light Green
              }
              // 2. Half Day status → On Leave blue background with "HA"
              else if (isHalfDayStatus) {
                bgColor = const Color(0xFFBFDBFE); // Half Day - On Leave blue
              }
              // 3. Holiday
              else if (isHoliday) {
                bgColor = const Color(0xFFFEF3C7); // Holiday - Light yellow
              }
              // 4. Week Off
              else if (isWeekOff) {
                bgColor = const Color(0xFFE9D5FF); // Week Off - Light purple
              }
              // 5. Leave date but no attendance → Blue with "L"
              else if (leaveDateSet.contains(dateStr)) {
                bgColor = const Color(0xFFBFDBFE); // On Leave - light blue
              }
              // 6. Present without leaveType → Green
              else if (isPresentStatus) {
                bgColor = const Color(0xFFDCFCE7); // Present - Light Green
              }
              // 7. Other attendance statuses (Pending treated as Absent). Show red when status is Absent in attendances collection.
              else if (dayStatusByDate.containsKey(dateStr)) {
                if (status == 'Pending' ||
                    isAbsentStatus ||
                    status == 'Rejected') {
                  bgColor = const Color(0xFFFEE2E2); // Absent - Light red
                } else if (status == 'On Leave') {
                  bgColor = const Color(0xFFBFDBFE); // On Leave - light blue
                }
              }
              // 8. Absent from backend (never show today as absent - day may be in progress or data stale)
              else if (absentDateSet.contains(dateStr)) {
                if (!isWeekOff && !isToday) {
                  bgColor = const Color(0xFFFEE2E2); // Absent - Light red
                } else if (isToday) {
                  // Today: show as not marked so user isn't shown absent incorrectly
                  bgColor = const Color(0xFFE2E8F0); // Not Marked - Light grey
                }
              }
              // 9. Future dates
              else {
                final todayOnly = DateTime(now.year, now.month, now.day);
                final dateOnly = DateTime(
                  dayDate.year,
                  dayDate.month,
                  dayDate.day,
                );
                if (dateOnly.isAfter(todayOnly)) {
                  bgColor = const Color(0xFFE2E8F0); // Not Marked - Light grey
                }
              }

              // For today: prefer live _todayAttendance so we show Present if user has punched in
              if (isToday && _todayAttendance != null) {
                final st =
                    _todayAttendance!['status']?.toString().toLowerCase() ?? '';
                if (st == 'present' || st == 'approved') {
                  bgColor = const Color(0xFFDCFCE7); // Present - Light Green
                }
              }

              // Leave type abbreviation logic (inside isCurrentMonth block where variables are available):
              // - If Present with leaveType → Show CL/SL/HA (green background)
              // - If Half Day → Show "HA" (blue background)
              // - If Leave date without attendance → Show "L" (purple background)
              final statusForDay = dayStatusByDate[dateStr] ?? '';
              final isAbsentStatusForAbbr =
                  (statusForDay.toString().toLowerCase() == 'absent');
              final isPresentStatusForAbbr =
                  (statusForDay == 'Present' ||
                      statusForDay == 'Approved' ||
                      isPresentFromBackend) &&
                  statusForDay != 'Pending' &&
                  !isAbsentStatusForAbbr &&
                  statusForDay != 'Rejected';
              final isHalfDayStatusForAbbr =
                  statusForDay == 'Half Day' ||
                  statusForDay.toLowerCase() == 'half day';
              final hasLeaveTypeForAbbr = dayLeaveTypeByDate.containsKey(
                dateStr,
              );

              if (isPresentStatusForAbbr && hasLeaveTypeForAbbr) {
                // Present with leaveType → Show CL/SL/HA (green background)
                leaveTypeAbbr = AttendanceDisplayUtil.leaveTypeToAbbreviation(
                  dayLeaveTypeByDate[dateStr],
                );
              } else if (isHalfDayStatusForAbbr) {
                // Half Day → Show "HA" (blue background)
                leaveTypeAbbr = 'HA';
              } else if (leaveDateSet.contains(dateStr) &&
                  !isPresentStatusForAbbr) {
                // Leave date without attendance → Show "L" (purple background)
                leaveTypeAbbr = 'L';
              }

              // Low work-hours indicator
              workHours = dayWorkHoursByDate[dateStr];

              // Calculate workHours from punchIn and punchOut if not available
              if ((workHours == null || workHours == 0) &&
                  _monthData != null &&
                  _monthData!['attendance'] != null) {
                try {
                  final entry = (_monthData!['attendance'] as List).firstWhere((
                    e,
                  ) {
                    try {
                      final d = DateTime.parse(e['date']).toLocal();
                      final eDateStr = DateFormat('yyyy-MM-dd').format(d);
                      return eDateStr == dateStr;
                    } catch (_) {
                      return false;
                    }
                  }, orElse: () => null);

                  if (entry != null) {
                    final punchIn = entry['punchIn'];
                    final punchOut = entry['punchOut'];
                    if (punchIn != null && punchOut != null) {
                      try {
                        final punchInTime = DateTime.parse(
                          punchIn.toString(),
                        ).toLocal();
                        final punchOutTime = DateTime.parse(
                          punchOut.toString(),
                        ).toLocal();
                        final duration = punchOutTime.difference(punchInTime);
                        if (duration.inMinutes > 0) {
                          workHours =
                              duration.inMinutes / 60.0; // Convert to hours
                        }
                      } catch (_) {
                        // If parsing fails, leave workHours as null
                      }
                    }
                  }
                } catch (_) {
                  // If lookup fails, leave workHours as is
                }
              }

              isLowHours = workHours != null && workHours < 9;
              isFuture = DateTime(
                dayDate.year,
                dayDate.month,
                dayDate.day,
              ).isAfter(DateTime(now.year, now.month, now.day));
            }

            return Container(
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(8),
                border: isToday
                    ? Border.all(color: AppColors.primary, width: 2)
                    : null,
              ),
              child: Stack(
                children: [
                  Align(
                    alignment: Alignment.center,
                    child: Padding(
                      padding: const EdgeInsets.all(1.0),
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '${dayDate.day}',
                              style: TextStyle(
                                fontSize: 11,
                                height: 1.0,
                                fontWeight: isToday
                                    ? FontWeight.bold
                                    : FontWeight.w500,
                                color: textColor,
                              ),
                            ),
                            if (leaveTypeAbbr != null &&
                                leaveTypeAbbr.isNotEmpty) ...[
                              Text(
                                leaveTypeAbbr,
                                style: TextStyle(
                                  fontSize: 7,
                                  height: 1.0,
                                  fontWeight: FontWeight.w600,
                                  color: textColor.withOpacity(0.9),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                  // Red dot indicator for low work hours (top-left corner)
                  if (isLowHours &&
                      !isFuture &&
                      bgColor.value != Colors.transparent.value)
                    Positioned(
                      top: 4,
                      left: 4,
                      child: Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildStatusLegend() {
    return Wrap(
      spacing: 16,
      runSpacing: 12,
      children: [
        _buildLegendItem(const Color(0xFFDCFCE7), 'Present'),
        // Use light red to match calendar cell background for Absent
        _buildLegendItem(const Color(0xFFFEE2E2), 'Absent'),
        // Use same soft yellow as calendar Holiday cell background
        _buildLegendItem(const Color(0xFFFEF3C7), 'Holiday'),
        _buildLegendItem(const Color(0xFFE9D5FF), 'Weekend'),
        _buildLegendItem(const Color(0xFFBFDBFE), 'On Leave'),
        // Low Work Hours with red dot
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: const Color(0xFFDCFCE7), // Present background
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Container(
                  width: 5,
                  height: 5,
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            const Text(
              'Low Work Hours',
              style: TextStyle(fontSize: 11, color: Colors.black),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildLegendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 8),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.black)),
      ],
    );
  }
}
