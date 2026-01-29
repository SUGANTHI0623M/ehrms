import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../config/app_colors.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/menu_icon_button.dart';
import '../../services/salary_service.dart';
import '../../services/auth_service.dart';
import '../../services/attendance_service.dart';
import '../../utils/salary_structure_calculator.dart';
import '../../utils/fine_calculation_util.dart';
import 'salary_structure_detail_screen.dart';

class SalaryOverviewScreen extends StatefulWidget {
  const SalaryOverviewScreen({super.key});

  @override
  State<SalaryOverviewScreen> createState() => _SalaryOverviewScreenState();
}

class _SalaryOverviewScreenState extends State<SalaryOverviewScreen> {
  final SalaryService _salaryService = SalaryService();
  final AuthService _authService = AuthService();
  final AttendanceService _attendanceService = AttendanceService();
  bool _isLoading = true;
  String _error = '';

  String _selectedMonth = DateFormat('MMMM').format(DateTime.now());
  String _selectedYear = DateFormat('yyyy').format(DateTime.now());

  // Calculated salary data
  CalculatedSalaryStructure? _calculatedSalary;
  ProratedSalary? _proratedSalary;
  WorkingDaysInfo? _workingDaysInfo;
  int _presentDays = 0;
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
    _fetchSalaryData();
  }

  Future<void> _fetchSalaryData() async {
    // Log to help debug loading / refresh issues
    debugPrint('[SalaryOverview] _fetchSalaryData called. '
        'month=$_selectedMonth year=$_selectedYear');

    setState(() {
      _isLoading = true;
      _error = '';
    });

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
        throw Exception('No salary structure found');
      }

      _staffSalary = staffData['salary'] as Map<String, dynamic>;

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

      print('DEBUG: Business Settings from profile: $businessSettings');
      
      if (businessSettings != null &&
          businessSettings['settings'] != null &&
          businessSettings['settings']['business'] != null) {
        final business =
            businessSettings['settings']['business'] as Map<String, dynamic>;
        print('DEBUG: Business settings.business: $business');
        // Get weeklyOffPattern - check if it exists, default to 'standard'
        final weeklyOffPatternValue = business['weeklyOffPattern'];
        _weeklyOffPattern = (weeklyOffPatternValue != null && weeklyOffPatternValue is String) 
            ? weeklyOffPatternValue 
            : 'standard';
        print('DEBUG: Parsed weeklyOffPattern: $_weeklyOffPattern (raw: $weeklyOffPatternValue)');
        
        // Get weeklyHolidays - must be a List
        if (business['weeklyHolidays'] != null && business['weeklyHolidays'] is List) {
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
          print('DEBUG: Parsed weeklyHolidays: $_weeklyHolidays (raw list length: ${weeklyHolidaysList.length})');
        } else {
          print('DEBUG: weeklyHolidays is null or not a List (type: ${business['weeklyHolidays']?.runtimeType})');
          _weeklyHolidays = []; // Default to empty if not found
        }
      } else {
        print('DEBUG: Business settings not found in profile response');
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
        print('DEBUG: Salary Stats Result: $statsResult');
        if (statsResult['stats'] != null) {
          backendStats = statsResult['stats'];
          print('DEBUG: Backend Stats: $backendStats');
          if (backendStats != null) {
            print('DEBUG: Backend Attendance: ${backendStats['attendance']}');
            final attendance = backendStats['attendance'];
            if (attendance != null && attendance is Map<String, dynamic>) {
              print('DEBUG: Backend Working Days: ${attendance['workingDays']}');
              print('DEBUG: Backend Holidays: ${attendance['holidays']}');
            }
          }
        } else {
          print('DEBUG: No stats in backend response');
        }
      } catch (e) {
        print('Error fetching payroll stats: $e');
      }

      // 3. Fetch attendance for the month
      final attendanceResult = await _attendanceService.getMonthAttendance(
        year,
        monthIndex,
      );
      if (attendanceResult['success'] == true) {
        final attendanceData = attendanceResult['data'];
        _attendanceRecords = attendanceData['attendance'] ?? [];

        // Extract holidays from attendance data
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
      }

      // 4. Calculate present days from attendance and fine information
      _presentDays = _attendanceRecords.where((record) {
        final status = record['status'] as String?;
        return status == 'Present' || status == 'Approved';
      }).length;

      // Calculate fine information using grace time logic
      // Get shift timing from business settings based on staff's shiftName
      final staffShiftName = staffData['shiftName'] as String?;
      print('DEBUG: Staff Shift Name: $staffShiftName');
      
      // Create shift timing from business settings (priority: shift-specific grace time)
      ShiftTiming? shiftTiming;
      if (businessSettings != null && staffShiftName != null) {
        shiftTiming = createShiftTimingFromBusinessSettings(
          businessSettings,
          staffShiftName,
        );
        print('DEBUG: Shift Timing from Business Settings: ${shiftTiming != null ? "Found" : "Not Found"}');
        if (shiftTiming != null) {
          print('DEBUG: Shift: ${shiftTiming.name}, Start: ${shiftTiming.startTime}, End: ${shiftTiming.endTime}');
          print('DEBUG: Grace Time: ${shiftTiming.graceTime != null ? "${shiftTiming.graceTime!.value} ${shiftTiming.graceTime!.unit}" : "None"}');
        }
      }
      
      // Fallback: Try to get from attendance template if shift not found in business settings
      if (shiftTiming == null) {
        Map<String, dynamic>? attendanceTemplate;
        try {
          final todayAttendance = await _attendanceService.getTodayAttendance();
          if (todayAttendance['success'] == true && todayAttendance['data'] != null) {
            attendanceTemplate = todayAttendance['data']['template'] as Map<String, dynamic>?;
          }
        } catch (e) {
          print('Error fetching attendance template: $e');
        }
        shiftTiming = createShiftTimingFromTemplate(attendanceTemplate);
        print('DEBUG: Using fallback shift timing from template');
      }
      
      // Create fine settings from business settings
      final fineSettings = createFineSettingsFromBusinessSettings(businessSettings);
      print('DEBUG: Fine Settings - Enabled: ${fineSettings.enabled}, Calculation Type: ${fineSettings.calculationType}');

      // Calculate daily salary for fine calculation
      double? dailySalary;
      if (_staffSalary != null && _calculatedSalary != null && _workingDaysInfo != null) {
        // Daily Salary = Monthly Gross Salary / Working Days
        dailySalary = _calculatedSalary!.monthly.grossSalary / _workingDaysInfo!.workingDays;
      }

      // Calculate shift hours from shift timing
      double shiftHours = 9.0; // Default 9 hours
      if (shiftTiming != null) {
        shiftHours = calculateShiftHours(shiftTiming.startTime, shiftTiming.endTime);
        print('DEBUG: Shift Hours calculated: $shiftHours hours (${shiftTiming.startTime} to ${shiftTiming.endTime})');
      } else {
        // Fallback: Try to get from attendance template
        Map<String, dynamic>? attendanceTemplate;
        try {
          final todayAttendance = await _attendanceService.getTodayAttendance();
          if (todayAttendance['success'] == true && todayAttendance['data'] != null) {
            attendanceTemplate = todayAttendance['data']['template'] as Map<String, dynamic>?;
          }
        } catch (e) {
          print('Error fetching attendance template for shift hours: $e');
        }
        
        if (attendanceTemplate != null) {
          final startTime = attendanceTemplate['shiftStartTime'] as String? ?? "09:30";
          final endTime = attendanceTemplate['shiftEndTime'] as String? ?? "18:30";
          shiftHours = calculateShiftHours(startTime, endTime);
          print('DEBUG: Shift Hours from template: $shiftHours hours');
        }
      }

      // Calculate fine information using the utility
      double totalFineAmount = 0.0;
      int lateDays = 0;
      int totalLateMinutes = 0;
      
      for (final record in _attendanceRecords) {
        final status = record['status'] as String?;
        if (status == 'Present' || status == 'Approved' || status == 'Half Day') {
          // Try to get existing fineAmount first (from backend calculation)
          final existingFineAmount = (record['fineAmount'] as num?)?.toDouble() ?? 0.0;
          final existingLateMinutes = (record['lateMinutes'] as num?)?.toInt() ?? 0;
          
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
              } catch (e) {
                print('Error calculating fine for record: $e');
              }
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
      }
      
      // Alternative: Use payroll fine calculation utility for aggregation
      // This matches backend's calculatePayrollFine function
      if (dailySalary != null && dailySalary > 0) {
        // Convert List<dynamic> to List<Map<String, dynamic>>
        final attendanceRecordsList = _attendanceRecords
            .map((record) => record as Map<String, dynamic>)
            .toList();
        
        final calculatedTotalFine = calculatePayrollFine(
          attendanceRecords: attendanceRecordsList,
          dailySalary: dailySalary,
          shiftHours: shiftHours,
          fineSettings: fineSettings,
        );
        
        // Use the calculated total if it's greater (more accurate) or if backend didn't provide fines
        if (calculatedTotalFine > totalFineAmount || totalFineAmount == 0) {
          totalFineAmount = calculatedTotalFine;
        }
      }
      
      _fineInfo = {
        'totalFineAmount': totalFineAmount,
        'lateDays': lateDays,
        'totalLateMinutes': totalLateMinutes,
      };

      // 5. Calculate working days - Use dashboard API as primary source (same logic as dashboard)
      // Dashboard API has the correct working days calculation
      // Since dashboard calculates up to today, we need to use the same logic for full month
      // The backend stats API should have the full month calculation, but if it fails, 
      // we'll use the dashboard's calculation logic via frontend with correct business settings
      
      // Try backend stats API first (has full month calculation)
      if (backendStats != null && backendStats['attendance'] != null) {
        final backendAttendance =
            backendStats['attendance'] as Map<String, dynamic>;
        final backendWorkingDays =
            backendAttendance['workingDays'] as int? ?? 0;
        final backendHolidays = backendAttendance['holidays'] as int? ?? 0;
        print('DEBUG: Using backend stats API - workingDays: $backendWorkingDays, holidays: $backendHolidays');
        _workingDaysInfo = WorkingDaysInfo(
          totalDays: DateTime(year, monthIndex + 1, 0).day,
          workingDays: backendWorkingDays,
          weekends: 0, // Not used
          holidayCount: backendHolidays,
        );
      } else {
        // Backend stats API failed - use frontend calculation with correct business settings
        // The frontend calculation uses the same logic as dashboard, but for full month
        print('WARNING: Backend stats not available, using frontend calculation');
        print('DEBUG: Frontend params - weeklyOffPattern: $_weeklyOffPattern, weeklyHolidays: $_weeklyHolidays, holidays count: ${_holidays.length}');
        _workingDaysInfo = calculateWorkingDays(
          year,
          monthIndex,
          _holidays,
          _weeklyOffPattern,
          _weeklyHolidays,
        );
        print('DEBUG: Frontend calculated working days: ${_workingDaysInfo?.workingDays}');
      }

      // 6. Calculate salary structure from staff salary
      if (_staffSalary != null && _staffSalary!['basicSalary'] != null) {
        final salaryInputs = SalaryStructureInputs.fromMap(_staffSalary!);
        _calculatedSalary = calculateSalaryStructure(salaryInputs);

        // 6. Calculate prorated salary (including fine amount)
        if (_workingDaysInfo != null) {
          _proratedSalary = calculateProratedSalary(
            _calculatedSalary!,
            _workingDaysInfo!.workingDays,
            _presentDays,
            _fineInfo['totalFineAmount'] as double,
          );
        }
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
        print('Error fetching payroll: $e');
      }

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
      debugPrint('[SalaryOverview] Error: $_error');
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
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error.isNotEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Error: $_error',
                    style: const TextStyle(color: Colors.red),
                  ),
                  ElevatedButton(
                    onPressed: _fetchSalaryData,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            )
          : _calculatedSalary == null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _error.isNotEmpty
                        ? 'Error: $_error'
                        : 'No salary structure found',
                    style: const TextStyle(color: Colors.red),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _fetchSalaryData,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: _fetchSalaryData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
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
                              _fetchSalaryData();
                            }
                          }),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildDropdown(_selectedYear, _years, (val) {
                            if (val != null) {
                              setState(() => _selectedYear = val);
                              _fetchSalaryData();
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
            currencyFormat.format(
              _calculatedSalary!.monthly.netMonthlySalary,
            ),
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
        border: Border.all(
          color: Colors.grey.shade200,
          width: 1,
        ),
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
              style: const TextStyle(
                color: Colors.black,
                fontSize: 9,
              ),
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
    final absent = working - present;
    final holidays = _workingDaysInfo!.holidayCount;
    final percent = _proratedSalary!.attendancePercentage;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.grey.shade200,
        ),
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
              const Text(
                'Attendance Summary',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
              ),
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildAttStat('Working Days', '$working'),
              _buildAttStat('Present Days', '$present', color: Colors.green),
              _buildAttStat('Absent Days', '$absent', color: Colors.red),
              _buildAttStat('Holidays', '$holidays', color: Colors.orange),
            ],
          ),
          // Fine Summary
          if (_fineInfo['totalFineAmount'] > 0) ...[
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
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
                    ),
                  ],
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
            child: Text(
              format.format(amount),
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
              textAlign: TextAlign.right,
              overflow: TextOverflow.ellipsis,
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
