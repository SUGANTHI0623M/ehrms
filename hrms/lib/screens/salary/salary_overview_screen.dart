import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'dart:async';
import '../../config/app_colors.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/menu_icon_button.dart';
import '../../services/salary_service.dart';
import '../../services/auth_service.dart';
import '../../services/attendance_service.dart';
import '../../utils/salary_structure_calculator.dart';
import '../../utils/fine_calculation_util.dart';
import '../../utils/app_event_bus.dart';
import 'salary_structure_detail_screen.dart';

class SalaryOverviewScreen extends StatefulWidget {
  final int? dashboardTabIndex;
  final void Function(int index)? onNavigateToIndex;

  /// When true, this tab is visible. Used to refresh once when user opens the screen.
  final bool? isActiveTab;

  const SalaryOverviewScreen({
    super.key,
    this.dashboardTabIndex,
    this.onNavigateToIndex,
    this.isActiveTab,
  });

  @override
  State<SalaryOverviewScreen> createState() => _SalaryOverviewScreenState();
}

class _SalaryOverviewScreenState extends State<SalaryOverviewScreen> {
  final SalaryService _salaryService = SalaryService();
  final AuthService _authService = AuthService();
  final AttendanceService _attendanceService = AttendanceService();
  late final StreamSubscription<AppEvent> _attendanceEventSub;
  bool _isLoading = true;
  String _error = '';
  bool _isFetching = false; // Prevent concurrent fetches
  Timer? _debounceTimer; // Debounce timer for rapid calls

  String _selectedMonth = DateFormat('MMMM').format(DateTime.now());
  String _selectedYear = DateFormat('yyyy').format(DateTime.now());

  // Calculated salary data
  CalculatedSalaryStructure? _calculatedSalary;
  ProratedSalary? _proratedSalary;
  WorkingDaysInfo? _workingDaysInfo;
  double _presentDays = 0;
  Map<String, dynamic>? _staffSalary;
  Map<String, dynamic>? _currentPayroll;
  List<dynamic> _attendanceRecords = [];
  List<DateTime> _holidays = [];
  String _weeklyOffPattern = 'standard';
  List<int> _weeklyHolidays =
      []; // Day numbers: 0=Sunday, 1=Monday, ..., 6=Saturday
  Map<String, dynamic> _fineInfo = {
    'totalFineAmount': 0.0,
    'lateDays': 0,
    'totalLateMinutes': 0,
  };

  final List<String> _months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  final List<String> _years = ['2023', '2024', '2025', '2026', '2027'];

  @override
  void initState() {
    super.initState();
    // Auto-refresh salary when attendance changes (e.g. punch in/out)
    // Use debounce to prevent rapid calls
    _attendanceEventSub = AppEventBus.on(
      AppEventType.attendanceChanged,
    ).listen((_) => _fetchSalaryData(debounce: true));
    _fetchSalaryData();
  }

  @override
  void didUpdateWidget(SalaryOverviewScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Refresh once when user opens the salary overview tab
    if (widget.isActiveTab == true && oldWidget.isActiveTab != true) {
      _fetchSalaryData();
    }
  }

  @override
  void dispose() {
    _attendanceEventSub.cancel();
    _debounceTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchSalaryData({bool debounce = false}) async {
    // Prevent concurrent fetches
    if (_isFetching) {
      return;
    }

    // Debounce rapid calls (e.g., from event bus + dropdown changes)
    if (debounce) {
      _debounceTimer?.cancel();
      _debounceTimer = Timer(const Duration(milliseconds: 500), () {
        _fetchSalaryData(debounce: false);
      });
      return;
    }

    // Set fetching flag immediately to prevent concurrent calls
    _isFetching = true;
    if (mounted) {
      setState(() {
        _isLoading = true;
        _error = '';
      });
    }

    try {
      int monthIndex = _months.indexOf(_selectedMonth) + 1;
      int year = int.parse(_selectedYear);

      // 1. Fetch staff profile to get salary structure
      final profileResult = await _authService.getProfile();
      if (profileResult['success'] != true) {
        throw Exception('Failed to fetch profile');
      }

      final staffData = profileResult['data']?['staffData'];
      if (staffData == null || staffData['salary'] == null) {
        throw Exception(
          'No salary structure found. Please contact HR to set up your salary structure.',
        );
      }

      _staffSalary = staffData['salary'] as Map<String, dynamic>;

      // Validate that basicSalary exists and is valid
      final basicSalary = _staffSalary!['basicSalary'];
      if (basicSalary == null || (basicSalary is num && basicSalary <= 0)) {
        throw Exception(
          'Salary structure is incomplete. Basic salary is missing or invalid. Please contact HR.',
        );
      }

      // Get weekly off pattern and weekly holidays from business settings
      // Try to get from branchId.businessId first, then fallback to businessId
      Map<String, dynamic>? businessSettings;
      if (staffData['branchId'] != null &&
          staffData['branchId'] is Map &&
          staffData['branchId']['businessId'] != null) {
        // If branchId is populated with businessId, we need to fetch business separately
        // For now, check if business settings are in the response
        if (staffData['branchId']['businessId'] is Map) {
          businessSettings = staffData['branchId']['businessId'];
        }
      } else if (staffData['businessId'] != null &&
          staffData['businessId'] is Map) {
        businessSettings = staffData['businessId'];
      }

      if (businessSettings != null &&
          businessSettings['settings'] != null &&
          businessSettings['settings']['business'] != null) {
        final business =
            businessSettings['settings']['business'] as Map<String, dynamic>;
        // Get weeklyOffPattern - check if it exists, default to 'standard'
        final weeklyOffPatternValue = business['weeklyOffPattern'];
        _weeklyOffPattern =
            (weeklyOffPatternValue != null && weeklyOffPatternValue is String)
            ? weeklyOffPatternValue
            : 'standard';

        // Get weeklyHolidays - must be a List
        if (business['weeklyHolidays'] != null &&
            business['weeklyHolidays'] is List) {
          final weeklyHolidaysList = business['weeklyHolidays'] as List;
          _weeklyHolidays = weeklyHolidaysList
              .map((h) {
                if (h is Map) {
                  final day = h['day'];
                  return (day is int) ? day : (day is num ? day.toInt() : -1);
                }
                return -1;
              })
              .where((day) => day >= 0 && day <= 6)
              .toList();
        } else {
          _weeklyHolidays = []; // Default to empty if not found
        }
      } else {
        // Default values
        _weeklyOffPattern = 'standard';
        _weeklyHolidays = [];
      }

      // 2. Fetch payroll stats from backend (has correct working days calculation)
      Map<String, dynamic>? backendStats;
      try {
        final statsResult = await _salaryService.getSalaryStats(
          month: monthIndex,
          year: year,
        );
        if (statsResult['stats'] != null) {
          backendStats = statsResult['stats'];
        }
      } catch (e) {
        // Ignore errors
      }

      // 3. Fetch attendance for the month
      // Keep previous values in case new fetch fails, so UI doesn't jump to 0
      final prevAttendanceRecords = List<dynamic>.from(_attendanceRecords);
      final prevPresentDays = _presentDays;
      final prevProratedSalary = _proratedSalary;
      bool attendanceUpdated = false;

      // Add a small delay on first load to avoid immediate rate limiting
      // when multiple screens load simultaneously
      if (_attendanceRecords.isEmpty && prevAttendanceRecords.isEmpty) {
        await Future.delayed(const Duration(milliseconds: 300));
      }

      final attendanceResult = await _attendanceService.getMonthAttendance(
        year,
        monthIndex,
      );

      if (attendanceResult['success'] == true) {
        final attendanceData = attendanceResult['data'];
        final fetchedRecords = attendanceData['attendance'] ?? [];

        // Only update if we got valid data (non-empty array)
        // This prevents overwriting valid data with empty data
        if (fetchedRecords.isNotEmpty) {
          _attendanceRecords = fetchedRecords;
          attendanceUpdated = true;
        } else {
          // Keep existing _attendanceRecords - don't overwrite with empty data
        }

        // Extract holidays from attendance data (even if records are empty)
        if (attendanceData['holidays'] != null) {
          _holidays = (attendanceData['holidays'] as List)
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
      } else {
        // API call failed (rate limit, network error, etc.) - keep existing data
        // The service should have returned cached data if available, but if not,
        // we preserve what we have
      }

      // 4. Present days: prefer backend/stats (includes half-day leave from Leave collection)
      // Fallback: compute from attendance records only (Present=1, Half day=0.5, Approved=1)
      double computedPresentDays = 0;
      if (_attendanceRecords.isNotEmpty) {
        for (final record in _attendanceRecords) {
          final status = (record['status'] as String? ?? '')
              .trim()
              .toLowerCase();
          final leaveType = (record['leaveType'] as String? ?? '')
              .trim()
              .toLowerCase();
          final isHalfDay = status == 'half day' || leaveType == 'half day';
          if (isHalfDay) {
            computedPresentDays += 0.5;
          } else if (status == 'present' || status == 'approved') {
            computedPresentDays += 1;
          }
        }
      }
      // Use backend present days when available (matches payroll calculation)
      if (backendStats != null && backendStats['attendance'] != null) {
        final backendAttendance =
            backendStats['attendance'] as Map<String, dynamic>;
        final fromBackend = (backendAttendance['presentDays'] as num?)
            ?.toDouble();
        _presentDays = (fromBackend != null && fromBackend >= 0)
            ? fromBackend
            : computedPresentDays;
      } else if (attendanceResult['success'] == true &&
          attendanceResult['data'] != null) {
        final data = attendanceResult['data'] as Map<String, dynamic>;
        final stats = data['stats'] as Map<String, dynamic>?;
        final fromStats = (stats?['presentDays'] as num?)?.toDouble();
        _presentDays = (fromStats != null && fromStats >= 0)
            ? fromStats
            : computedPresentDays;
      } else {
        _presentDays = computedPresentDays;
      }
      // Restore previous data on failed fetch when we had data before
      if (!attendanceUpdated &&
          _attendanceRecords.isEmpty &&
          (prevAttendanceRecords.isNotEmpty || prevPresentDays > 0)) {
        _attendanceRecords
          ..clear()
          ..addAll(prevAttendanceRecords);
        _presentDays = prevPresentDays;
        if (prevProratedSalary != null) {
          _proratedSalary = prevProratedSalary;
        }
      } else if (!attendanceUpdated && _attendanceRecords.isEmpty) {
        _presentDays = 0;
      }

      // 4a. Working days (BEFORE fine so dailySalary can use current run)
      // Prefer backend stats, then attendance/month stats, then local calculation
      if (backendStats != null && backendStats['attendance'] != null) {
        final backendAttendance =
            backendStats['attendance'] as Map<String, dynamic>;
        final backendWorkingDays =
            (backendAttendance['workingDays'] as num?)?.toInt() ?? 0;
        final backendHolidays =
            (backendAttendance['holidays'] as num?)?.toInt() ?? 0;
        _workingDaysInfo = WorkingDaysInfo(
          totalDays: DateTime(year, monthIndex + 1, 0).day,
          workingDays: backendWorkingDays,
          weekends: 0,
          holidayCount: backendHolidays,
        );
      } else if (attendanceResult['success'] == true &&
          attendanceResult['data'] != null) {
        final data = attendanceResult['data'] as Map<String, dynamic>;
        final stats = data['stats'] as Map<String, dynamic>?;
        final statsWorkingDays = (stats?['workingDays'] as num?)?.toInt();
        final statsHolidays = (stats?['holidaysCount'] as num?)?.toInt();
        if (statsWorkingDays != null && statsWorkingDays >= 0) {
          _workingDaysInfo = WorkingDaysInfo(
            totalDays: DateTime(year, monthIndex + 1, 0).day,
            workingDays: statsWorkingDays,
            weekends: stats?['weekOffs'] as int? ?? 0,
            holidayCount: statsHolidays ?? 0,
          );
        } else {
          _workingDaysInfo = calculateWorkingDays(
            year,
            monthIndex,
            _holidays,
            _weeklyOffPattern,
            _weeklyHolidays,
          );
        }
      } else {
        _workingDaysInfo = calculateWorkingDays(
          year,
          monthIndex,
          _holidays,
          _weeklyOffPattern,
          _weeklyHolidays,
        );
      }

      // 4b. Salary structure (BEFORE fine so dailySalary can use current run)
      if (_staffSalary != null && _staffSalary!['basicSalary'] != null) {
        final salaryInputs = SalaryStructureInputs.fromMap(_staffSalary!);
        _calculatedSalary = calculateSalaryStructure(salaryInputs);
      }

      // Calculate fine information using grace time logic
      // Get shift timing from business settings based on staff's shiftName
      final staffShiftName = staffData['shiftName'] as String?;

      // Create shift timing from business settings (priority: shift-specific grace time)
      ShiftTiming? shiftTiming;
      if (businessSettings != null && staffShiftName != null) {
        shiftTiming = createShiftTimingFromBusinessSettings(
          businessSettings,
          staffShiftName,
        );
      }

      // Fallback: Try to get from attendance template if shift not found in business settings
      if (shiftTiming == null) {
        Map<String, dynamic>? attendanceTemplate;
        try {
          final todayAttendance = await _attendanceService.getTodayAttendance();
          if (todayAttendance['success'] == true &&
              todayAttendance['data'] != null) {
            attendanceTemplate =
                todayAttendance['data']['template'] as Map<String, dynamic>?;
          }
        } catch (e) {
          // Ignore errors
        }
        shiftTiming = createShiftTimingFromTemplate(attendanceTemplate);
      }

      // Create fine settings from business settings
      final fineSettings = createFineSettingsFromBusinessSettings(
        businessSettings,
      );

      // Calculate daily salary for fine calculation (only when working days > 0)
      double? dailySalary;
      if (_staffSalary != null &&
          _calculatedSalary != null &&
          _workingDaysInfo != null &&
          _workingDaysInfo!.workingDays > 0) {
        // Daily Salary = Monthly Gross Salary / Working Days (same as dashboard)
        dailySalary =
            _calculatedSalary!.monthly.grossSalary /
            _workingDaysInfo!.workingDays;
      }

      // Shift hours for calculatePayrollFine (same as dashboard)
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
        } catch (e) {
          // Ignore
        }
      }

      // Calculate fine information using the utility (same logic as dashboard)
      double totalFineAmount = 0.0;
      int lateDays = 0;
      int totalLateMinutes = 0;

      for (final record in _attendanceRecords) {
        final status = (record['status'] as String? ?? '').trim().toLowerCase();
        final leaveType = (record['leaveType'] as String? ?? '')
            .trim()
            .toLowerCase();
        final isCounted =
            status == 'present' ||
            status == 'approved' ||
            status == 'half day' ||
            leaveType == 'half day';
        if (!isCounted) continue;
        // Try to get existing fineAmount first (from backend calculation)
        final existingFineAmount =
            (record['fineAmount'] as num?)?.toDouble() ?? 0.0;
        final existingLateMinutes =
            (record['lateMinutes'] as num?)?.toInt() ?? 0;

        // If backend already calculated fine, use it
        // Otherwise, calculate it client-side using the same logic
        double fineAmount = existingFineAmount;
        int lateMinutes = existingLateMinutes;

        if (fineAmount == 0 && lateMinutes == 0) {
          // Calculate fine client-side if not provided by backend
          final punchInStr = record['punchIn'] as String?;
          if (punchInStr != null && dailySalary != null) {
            try {
              final punchInTime = DateTime.parse(punchInStr).toLocal();
              final attendanceDateStr = record['date'] as String?;
              DateTime attendanceDate;
              if (attendanceDateStr != null) {
                attendanceDate = DateTime.parse(attendanceDateStr).toLocal();
              } else {
                // Fallback to punchIn date
                attendanceDate = DateTime(
                  punchInTime.year,
                  punchInTime.month,
                  punchInTime.day,
                );
              }

              final fineResult = calculateFine(
                punchInTime: punchInTime,
                attendanceDate: attendanceDate,
                shiftTiming: shiftTiming,
                fineSettings: fineSettings,
                dailySalary: dailySalary,
              );

              lateMinutes = fineResult.lateMinutes;
              fineAmount = fineResult.fineAmount;
            } catch (e) {}
          }
        }

        if (fineAmount > 0 || lateMinutes > 0) {
          totalFineAmount += fineAmount;
          if (lateMinutes > 0) {
            lateDays++;
            totalLateMinutes += lateMinutes;
          }
        }
      }

      // Same as dashboard: use calculatePayrollFine and take max so calculation matches dashboard
      if (dailySalary != null && dailySalary > 0) {
        final attendanceRecordsList = _attendanceRecords
            .where((record) {
              final s = (record['status'] as String? ?? '')
                  .trim()
                  .toLowerCase();
              final lt = (record['leaveType'] as String? ?? '')
                  .trim()
                  .toLowerCase();
              return s == 'present' ||
                  s == 'approved' ||
                  s == 'half day' ||
                  lt == 'half day';
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

      // Use backend Late Login Fine when available (e.g. when client couldn't compute) so it matches payslip
      double finalTotalFineAmount = totalFineAmount;
      if (backendStats != null) {
        final deductionComponents =
            backendStats['deductionComponents'] as List<dynamic>?;
        if (deductionComponents != null) {
          for (final c in deductionComponents) {
            final map = c as Map<String, dynamic>?;
            if (map != null &&
                (map['name'] as String? ?? '').toLowerCase().contains(
                  'late login fine',
                )) {
              final backendFine = (map['amount'] as num?)?.toDouble() ?? 0.0;
              if (backendFine > 0) {
                finalTotalFineAmount = backendFine;
                break;
              }
            }
          }
        }
      }

      _fineInfo = {
        'totalFineAmount': finalTotalFineAmount,
        'lateDays': lateDays,
        'totalLateMinutes': totalLateMinutes,
      };

      // 5. Calculate prorated salary (working days, present days, and late login fine included)
      if (_calculatedSalary != null && _workingDaysInfo != null) {
        _proratedSalary = calculateProratedSalary(
          _calculatedSalary!,
          _workingDaysInfo!.workingDays,
          _presentDays,
          finalTotalFineAmount,
        );
      }

      // 8. Fetch current month payroll if available
      try {
        final payrollData = await _salaryService.getPayrolls(page: 1, limit: 1);
        if (payrollData['success'] == true && payrollData['data'] != null) {
          final payrolls = payrollData['data']['payrolls'] as List?;
          if (payrolls != null && payrolls.isNotEmpty) {
            final payroll = payrolls.first;
            final payrollMonth = payroll['month'];
            final payrollYear = payroll['year'];
            if (payrollMonth == monthIndex && payrollYear == year) {
              _currentPayroll = payroll;
            }
          }
        }
      } catch (e) {
        // Ignore payroll fetch errors
      }

      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      // Extract a user-friendly error message
      String errorMessage = 'Your salary not updated';
      if (e is Exception) {
        final errorStr = e.toString();
        if (errorStr.contains('Exception: ')) {
          errorMessage = errorStr.replaceFirst('Exception: ', '');
        } else {
          errorMessage = errorStr;
        }
      } else {
        errorMessage = e.toString();
      }

      if (mounted) {
        setState(() {
          _error = errorMessage;
          _isLoading = false;
        });
      }
    } finally {
      _isFetching = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        leading: const MenuIconButton(),
        title: const Text(
          'Salary Overview',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        actions: [
          if (_currentPayroll != null &&
              (_currentPayroll!['status'] == 'Processed' ||
                  _currentPayroll!['status'] == 'Paid'))
            Container(
              margin: const EdgeInsets.only(right: 16),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.2),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.success),
              ),
              child: Text(
                'Processed',
                style: TextStyle(
                  color: AppColors.success,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
        ],
      ),
      drawer: AppDrawer(
        currentIndex: widget.dashboardTabIndex ?? 2,
        onNavigateToIndex: widget.onNavigateToIndex,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error.isNotEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.error_outline,
                      size: 64,
                      color: Colors.grey.shade500,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _error,
                      style: TextStyle(
                        color: Colors.grey.shade700,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _fetchSalaryData,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 32,
                          vertical: 12,
                        ),
                      ),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            )
          : _calculatedSalary == null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.error_outline,
                      size: 64,
                      color: Colors.grey.shade500,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Your salary not updated',
                      style: TextStyle(
                        color: Colors.grey.shade700,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Please contact HR to set up your salary structure.',
                      style: TextStyle(color: Colors.grey, fontSize: 12),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _fetchSalaryData,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 32,
                          vertical: 12,
                        ),
                      ),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Month/Year Filter
                  Row(
                    children: [
                      Expanded(
                        child: _buildDropdown(_selectedMonth, _months, (val) {
                          if (val != null) {
                            setState(() => _selectedMonth = val);
                            _fetchSalaryData(debounce: true);
                          }
                        }),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildDropdown(_selectedYear, _years, (val) {
                          if (val != null) {
                            setState(() => _selectedYear = val);
                            _fetchSalaryData(debounce: true);
                          }
                        }),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildSummaryCards(),
                  const SizedBox(height: 16),
                  _buildAttendanceSummary(),
                  const SizedBox(height: 16),
                  _buildEarningsDeductions(),
                  const SizedBox(height: 16),
                  _buildTotalCTC(),
                  const SizedBox(height: 24),
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [AppColors.primary, AppColors.primaryDark],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) =>
                                const SalaryStructureDetailScreen(),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.receipt_long, color: Colors.white),
                          const SizedBox(width: 8),
                          const Text(
                            'View Full Salary Structure Details',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildSummaryCards() {
    if (_calculatedSalary == null || _proratedSalary == null) {
      return const SizedBox.shrink();
    }

    final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');
    final isProcessed =
        _currentPayroll != null &&
        (_currentPayroll!['status'] == 'Processed' ||
            _currentPayroll!['status'] == 'Paid');

    final rawThisMonthNet = _proratedSalary!.proratedNetSalary;
    // Do not show negative net for card display – clamp at 0
    final displayThisMonthNet = rawThisMonthNet < 0 ? 0.0 : rawThisMonthNet;

    return LayoutBuilder(
      builder: (context, constraints) {
        // Use Grid or Row based on width
        bool isWide = constraints.maxWidth > 600;

        final List<Widget> cards = [
          _buildStatCard(
            'Monthly Gross',
            currencyFormat.format(_calculatedSalary!.monthly.grossSalary),
            isProcessed ? 'From processed payroll' : 'From salary structure',
            Colors.green.shade50,
          ),
          _buildStatCard(
            'This Month Gross',
            currencyFormat.format(_proratedSalary!.proratedGrossSalary),
            _workingDaysInfo != null
                ? 'Based on $_presentDays present days out of ${_workingDaysInfo!.workingDays} working days\n${_proratedSalary!.attendancePercentage.toStringAsFixed(1)}% attendance'
                : 'Pro-rated',
            Colors.blue.shade50,
          ),
          _buildStatCard(
            'Monthly Net',
            currencyFormat.format(_calculatedSalary!.monthly.netMonthlySalary),
            isProcessed ? 'From processed payroll' : 'From salary structure',
            Colors.green.shade50,
          ),
          _buildStatCard(
            'This Month Net',
            currencyFormat.format(displayThisMonthNet),
            _workingDaysInfo != null
                ? 'Expected take-home this month\n$_presentDays days present'
                : 'Expected take-home',
            Colors.green.shade50,
          ),
        ];

        return GridView.count(
          crossAxisCount: isWide ? 4 : 2, // 2 cols on mobile
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: isWide ? 1.5 : 1.3,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          children: cards,
        );
      },
    );
  }

  Widget _buildStatCard(
    String title,
    String value,
    String subtitle,
    Color bgColor,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200, width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: Colors.black,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 6),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(
                color: AppColors.success,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Flexible(
            child: Text(
              subtitle,
              style: const TextStyle(color: Colors.black, fontSize: 9),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttendanceSummary() {
    if (_workingDaysInfo == null || _proratedSalary == null) {
      return const SizedBox.shrink();
    }

    final working = _workingDaysInfo!.workingDays;
    final present = _presentDays;
    final absent = (working - present).clamp(0.0, double.infinity);
    final absentStr = absent == absent.roundToDouble()
        ? '${absent.toInt()}'
        : absent.toStringAsFixed(1);
    final holidays = _workingDaysInfo!.holidayCount;
    final percent = _proratedSalary!.attendancePercentage;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'Attendance Summary',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '${percent.toStringAsFixed(1)}%',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          LayoutBuilder(
            builder: (context, constraints) {
              final narrow = constraints.maxWidth < 320;
              return Wrap(
                spacing: narrow ? 8 : 16,
                runSpacing: 8,
                children: [
                  _buildAttStat('Working Days', '$working'),
                  _buildAttStat(
                    'Present Days',
                    '$present',
                    color: Colors.green,
                  ),
                  _buildAttStat('Absent Days', absentStr, color: Colors.red),
                  _buildAttStat('Holidays', '$holidays', color: Colors.orange),
                ],
              );
            },
          ),
          // Fine Summary
          if (_fineInfo['totalFineAmount'] > 0) ...[
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Late Login Fine',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: Colors.red[700],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${_fineInfo['lateDays']} late day(s) • ${_fineInfo['totalLateMinutes']} min late',
                        style: TextStyle(fontSize: 10, color: Colors.grey[600]),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                Text(
                  NumberFormat.currency(
                    locale: 'en_IN',
                    symbol: '₹',
                  ).format(_fineInfo['totalFineAmount']),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: Colors.red[700],
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAttStat(String label, String val, {Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        const SizedBox(height: 4),
        Text(
          val,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 12,
            color: color ?? Colors.black87,
          ),
        ),
      ],
    );
  }

  Widget _buildEarningsDeductions() {
    if (_calculatedSalary == null) {
      return const SizedBox.shrink();
    }

    final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');

    // Build earnings list from calculated salary
    final List<Map<String, dynamic>> earnings = [];
    if (_calculatedSalary!.monthly.basicSalary > 0) {
      earnings.add({
        'name': 'Basic Salary',
        'amount': _calculatedSalary!.monthly.basicSalary,
      });
    }
    if (_calculatedSalary!.monthly.dearnessAllowance > 0) {
      earnings.add({
        'name': 'DA',
        'amount': _calculatedSalary!.monthly.dearnessAllowance,
      });
    }
    if (_calculatedSalary!.monthly.houseRentAllowance > 0) {
      earnings.add({
        'name': 'HRA',
        'amount': _calculatedSalary!.monthly.houseRentAllowance,
      });
    }
    if (_calculatedSalary!.monthly.specialAllowance > 0) {
      earnings.add({
        'name': 'Special Allowance',
        'amount': _calculatedSalary!.monthly.specialAllowance,
      });
    }
    if (_calculatedSalary!.monthly.employerPF > 0) {
      earnings.add({
        'name': 'Employer PF',
        'amount': _calculatedSalary!.monthly.employerPF,
      });
    }
    if (_calculatedSalary!.monthly.employerESI > 0) {
      earnings.add({
        'name': 'Employer ESI',
        'amount': _calculatedSalary!.monthly.employerESI,
      });
    }

    // Build deductions list from calculated salary
    final List<Map<String, dynamic>> deductions = [];
    if (_calculatedSalary!.monthly.employeePF > 0) {
      deductions.add({
        'name': 'Employee PF',
        'amount': _calculatedSalary!.monthly.employeePF,
      });
    }
    if (_calculatedSalary!.monthly.employeeESI > 0) {
      deductions.add({
        'name': 'Employee ESI',
        'amount': _calculatedSalary!.monthly.employeeESI,
      });
    }
    if (_fineInfo['totalFineAmount'] > 0) {
      deductions.add({
        'name': 'Late Login Fine',
        'amount': _fineInfo['totalFineAmount'] as double,
      });
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Earnings
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Monthly Earnings',
                style: TextStyle(
                  color: Colors.green,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: Colors.green.shade50.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green.shade100),
                ),
                child: Column(
                  children: [
                    if (earnings.isEmpty)
                      Padding(
                        padding: const EdgeInsets.all(8),
                        child: Text(
                          'No earnings data',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ...((earnings as List)
                        .map(
                          (e) => _buildRow(
                            e['name'] ?? 'Item',
                            e['amount']?.toDouble() ?? 0,
                            currencyFormat,
                          ),
                        )
                        .toList()),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 16),
        // Deductions
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Monthly Deductions',
                style: TextStyle(
                  color: Colors.red,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: Colors.red.shade50.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade100),
                ),
                child: Column(
                  children: [
                    if (deductions.isEmpty)
                      Padding(
                        padding: const EdgeInsets.all(8),
                        child: Text(
                          'No deductions',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ...((deductions as List)
                        .map(
                          (e) => _buildRow(
                            e['name'] ?? 'Item',
                            e['amount']?.toDouble() ?? 0,
                            currencyFormat,
                          ),
                        )
                        .toList()),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRow(String label, double amount, NumberFormat format) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: const TextStyle(fontSize: 12),
              overflow: TextOverflow.ellipsis,
              maxLines: 2,
            ),
          ),
          Flexible(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerRight,
              child: Text(
                format.format(amount),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
                textAlign: TextAlign.right,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTotalCTC() {
    if (_calculatedSalary == null) {
      return const SizedBox.shrink();
    }

    final currencyFormat = NumberFormat.currency(locale: 'en_IN', symbol: '₹');

    // Get values from calculated salary structure
    final annualGrossSalary = _calculatedSalary!.yearly.annualGrossSalary;
    final annualIncentive = _calculatedSalary!.yearly.annualIncentive;
    final annualBenefits = _calculatedSalary!.yearly.totalAnnualBenefits;
    final annualMobileAllowance =
        _calculatedSalary!.yearly.annualMobileAllowance;
    final ctc = _calculatedSalary!.totalCTC;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Total CTC (Annual)',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 11,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 12),
          _buildRow('Annual Gross Salary', annualGrossSalary, currencyFormat),
          if (annualIncentive > 0) ...[
            const SizedBox(height: 8),
            _buildRow('Annual Incentive', annualIncentive, currencyFormat),
          ],
          if (annualBenefits > 0) ...[
            const SizedBox(height: 8),
            _buildRow('Annual Benefits', annualBenefits, currencyFormat),
          ],
          if (annualMobileAllowance > 0) ...[
            const SizedBox(height: 8),
            _buildRow(
              'Mobile Allowance',
              annualMobileAllowance,
              currencyFormat,
            ),
          ],
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total CTC',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
              ),
              Text(
                currencyFormat.format(ctc),
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDropdown(
    String value,
    List<String> items,
    ValueChanged<String?> onChanged,
  ) {
    return Container(
      height: 40,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          items: items
              .map(
                (e) => DropdownMenuItem(
                  value: e,
                  child: Text(e, style: const TextStyle(fontSize: 12)),
                ),
              )
              .toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }
}
