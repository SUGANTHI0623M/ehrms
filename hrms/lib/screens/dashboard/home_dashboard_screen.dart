import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';
import '../../config/app_colors.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/menu_icon_button.dart';
import '../../services/request_service.dart';
import '../../services/attendance_service.dart';
import '../../services/auth_service.dart';
import '../../utils/salary_structure_calculator.dart';

class HomeDashboardScreen extends StatefulWidget {
  final Function(int index, {int subTabIndex})? onNavigate;
  const HomeDashboardScreen({super.key, this.onNavigate});

  @override
  State<HomeDashboardScreen> createState() => _HomeDashboardScreenState();
}

class _HomeDashboardScreenState extends State<HomeDashboardScreen> {
  String _userName = 'User';
  String _companyName = '';

  final RequestService _requestService = RequestService();
  final AttendanceService _attendanceService = AttendanceService();
  final AuthService _authService = AuthService();

  List<dynamic> _recentLeaves = [];
  List<dynamic> _activeLoans = [];
  bool _isLoadingDashboard = false;
  Map<String, dynamic>? _todayAttendance;
  Map<String, dynamic>? _monthData;
  Map<String, dynamic>? _stats;
  DateTime _selectedMonth = DateTime.now();
  
  // Salary calculation data (calculated from salary module)
  int _calculatedPresentDays = 0;
  double _calculatedMonthSalary = 0;
  static const String _cachedSalaryKey = 'dashboard_cached_month_salary';
  
  // Active loans count (from loan request module)
  int _activeLoansCount = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    // Prevent duplicate refresh calls
    if (_isLoadingDashboard) return;
    
    setState(() => _isLoadingDashboard = true);

    try {
      // Load local user name
      final prefs = await SharedPreferences.getInstance();
      final userString = prefs.getString('user');
      if (userString != null) {
        final data = jsonDecode(userString);
        if (mounted) {
          setState(() {
            _userName = data['name'] ?? 'User';
          });
        }
      }

      // Fetch unified dashboard data
      final result = await _requestService.getDashboardData();
      if (mounted) {
        if (result['success']) {
          final data = result['data'];
          setState(() {
            _stats = data['stats'];
            _recentLeaves = data['recentLeaves'] ?? [];
            _activeLoans = data['stats']?['activeLoansList'] ?? [];
            _todayAttendance = data['stats']?['attendanceToday'];
          });
        }
      }

      // Load cached salary first for instant UI
      await _loadCachedSalary();

      // Fetch month attendance first (needed for salary calculation)
      await _fetchMonthAttendance();
      
      // Fetch active loans from loan request module
      await _fetchActiveLoans();
      
      // Calculate salary from salary module (after month attendance is fetched)
      await _calculateSalaryFromModule();
    } finally {
      if (mounted) {
        setState(() => _isLoadingDashboard = false);
      }
    }
  }

  Future<void> _fetchMonthAttendance() async {
    // We don't want to show a big loader for just the calendar update
    final result = await _attendanceService.getMonthAttendance(
      _selectedMonth.year,
      _selectedMonth.month,
    );
    if (mounted) {
      if (result['success']) {
        setState(() {
          _monthData = result['data'];
        });
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
      debugPrint('Error fetching active loans: $e');
    }
  }

  Future<void> _loadCachedSalary() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getDouble(_cachedSalaryKey);
      if (cached != null && mounted) {
        setState(() {
          _calculatedMonthSalary = cached;
        });
      }
    } catch (_) {
      // Ignore cache errors
    }
  }

  Future<void> _calculateSalaryFromModule() async {
    try {
      final now = DateTime.now();
      final monthIndex = now.month;
      final year = now.year;

      // 1. Fetch staff profile to get salary structure
      final profileResult = await _authService.getProfile();
      if (profileResult['success'] != true) {
        return;
      }

      final staffData = profileResult['data']?['staffData'];
      if (staffData == null || staffData['salary'] == null) {
        return;
      }

      // Extract company name from business data (Company collection)
      String? companyName;
      try {
        final businessData = staffData['businessId'];
        if (businessData is Map<String, dynamic>) {
          companyName = businessData['name']?.toString();
        }
      } catch (_) {
        // Ignore parsing errors and keep companyName null
      }

      final staffSalary = staffData['salary'] as Map<String, dynamic>;

      // 2. Fetch attendance for current month
      final attendanceResult = await _attendanceService.getMonthAttendance(
        year,
        monthIndex,
      );
      
      List<dynamic> attendanceRecords = [];
      if (attendanceResult['success'] == true) {
        final attendanceData = attendanceResult['data'];
        attendanceRecords = attendanceData['attendance'] ?? [];
      }

      // 3. Calculate present days
      int presentDays = attendanceRecords.where((record) {
        final status = record['status'] as String?;
        return status == 'Present' || status == 'Approved';
      }).length;

      // 4. Calculate fine amount
      double totalFineAmount = 0.0;
      for (final record in attendanceRecords) {
        final fineAmount = (record['fineAmount'] as num?)?.toDouble() ?? 0.0;
        totalFineAmount += fineAmount;
      }

      // 5. Get working days info from month data or calculate it
      WorkingDaysInfo? workingDaysInfo;
      if (_monthData != null && _monthData!['stats'] != null) {
        final stats = _monthData!['stats'] as Map<String, dynamic>;
        final totalDays = DateTime(year, monthIndex + 1, 0).day;
        workingDaysInfo = WorkingDaysInfo(
          totalDays: totalDays,
          workingDays: (stats['workingDays'] as num?)?.toInt() ?? 0,
          weekends: 0,
          holidayCount: (stats['holidaysCount'] as num?)?.toInt() ?? 0,
        );
      } else {
        // Calculate working days if month data not available
        // Extract holidays from attendance records
        List<DateTime> holidays = [];
        if (attendanceResult['success'] == true) {
          final attendanceData = attendanceResult['data'];
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
        
        // Get weekly off pattern from business settings
        String weeklyOffPattern = 'standard';
        List<int> weeklyHolidays = [];
        if (staffData['branchId'] != null && staffData['branchId'] is Map) {
          final branchData = staffData['branchId'] as Map<String, dynamic>;
          if (branchData['businessId'] != null && branchData['businessId'] is Map) {
            final businessData = branchData['businessId'] as Map<String, dynamic>;
            if (businessData['settings'] != null && businessData['settings']['business'] != null) {
              final business = businessData['settings']['business'] as Map<String, dynamic>;
              weeklyOffPattern = business['weeklyOffPattern'] ?? 'standard';
              if (business['weeklyHolidays'] != null && business['weeklyHolidays'] is List) {
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
          }
        }
        
        workingDaysInfo = calculateWorkingDays(
          year,
          monthIndex,
          holidays,
          weeklyOffPattern,
          weeklyHolidays,
        );
      }

      // 6. Calculate salary structure
      final salaryInputs = SalaryStructureInputs.fromMap(staffSalary);
      final calculatedSalary = calculateSalaryStructure(salaryInputs);

      // 7. Calculate prorated salary
      ProratedSalary? proratedSalary;
      if (workingDaysInfo != null) {
        proratedSalary = calculateProratedSalary(
          calculatedSalary,
          workingDaysInfo.workingDays,
          presentDays,
          totalFineAmount,
        );
      }

      final newMonthSalary = proratedSalary?.proratedNetSalary ?? 0;

      if (mounted) {
        setState(() {
          _calculatedPresentDays = presentDays;
          _calculatedMonthSalary = newMonthSalary;
          if (companyName != null && companyName.trim().isNotEmpty) {
            _companyName = companyName.trim();
          }
        });
      }

      // Persist latest salary for faster future dashboard loads
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setDouble(_cachedSalaryKey, newMonthSalary);
      } catch (_) {
        // Ignore cache write errors
      }
    } catch (e) {
      debugPrint('Error calculating salary: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width > 800;

    // Stats extraction
    final pendingLeaves = _stats?['pendingLeaves']?.toString() ?? '0';
    
    // Use active loans count from loan request module
    final activeLoansCount = _activeLoansCount.toString();
    
    // Use calculated salary from salary module
    // Show exact salary amount without K/L rounding
    String monthSalary = '';
    if (_calculatedMonthSalary > 0) {
      final salaryValue = _calculatedMonthSalary;
      // Format with thousand separators and 2 decimal places
      final formatter = NumberFormat('#,##0.00');
      monthSalary = formatter.format(salaryValue);
    }
    final salaryStatus = _stats?['payrollStatus'] ?? 'Pending';

    // Use present days from dashboard stats (already calculated - only counts 'Present' status)
    final presentDays = _stats?['attendanceSummary']?['presentDays']?.toString() ?? '0';
    final totalDays = _stats?['attendanceSummary']?['totalDays']?.toString() ?? '0';

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
      ),
      drawer: const AppDrawer(),
      body: RefreshIndicator(
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
                    title: 'Month Salary',
                    value: monthSalary.isNotEmpty ? '₹$monthSalary' : '--',
                    subValue: presentDays != '0' ? '$presentDays days present' : (salaryStatus == 'Pending' ? 'Pending' : ''),
                    isWide: isWide,
                  ),
                  _buildSummaryCard(
                    title: 'Present Days',
                    value: presentDays,
                    subValue: 'Out of $totalDays working days',
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
                padding: const EdgeInsets.symmetric(
                  vertical: 16,
                  horizontal: 8,
                ),
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
                        const SizedBox(width: 24),
                        Expanded(child: _buildMonthAttendanceCard()),
                      ],
                    )
                  : Column(
                      children: [
                        _buildRecentLeavesCard(),
                        const SizedBox(height: 24),
                        _buildMonthAttendanceCard(),
                      ],
                    ),
            ],
          ),
        ),
      ),
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
              _companyName.isNotEmpty ? _companyName : 'Askeva eHRMS',
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
    return [
      _buildQuickActionButton(
        icon: Icons.fingerprint,
        label: 'Attendance',
        color: Colors.redAccent,
        onTap: () => widget.onNavigate?.call(4, subTabIndex: 0),
      ),
      _buildQuickActionButton(
        icon: Icons.calendar_today,
        label: 'Apply Leave',
        color: Colors.blue,
        onTap: () => widget.onNavigate?.call(1, subTabIndex: 0),
      ),
      _buildQuickActionButton(
        icon: Icons.account_balance_wallet,
        label: 'Request Loan',
        color: Colors.green,
        onTap: () => widget.onNavigate?.call(1, subTabIndex: 1),
      ),
      _buildQuickActionButton(
        icon: Icons.receipt,
        label: 'Expense Claim',
        color: Colors.orange,
        onTap: () => widget.onNavigate?.call(1, subTabIndex: 2),
      ),
      _buildQuickActionButton(
        icon: Icons.attach_money,
        label: 'Request Payslip',
        color: Colors.purple,
        onTap: () => widget.onNavigate?.call(1, subTabIndex: 3),
      ),
    ];
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
              // Slightly smaller text for Month Salary to fit full amount
              fontSize: title == 'Month Salary' ? 16 : 18,
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
                      '₹${amount}',
                      style: const TextStyle(
                        fontSize: 10,
                        color: Color(0xFF1E293B),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
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
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Column(
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
                widget.onNavigate?.call(1, subTabIndex: 0);
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
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.black,
                  ),
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
    final stats = _monthData?['stats'];

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
            holidays: stats?['holidaysCount']?.toString() ?? '0',
            weekOffs: stats?['weekOffs']?.toString() ?? '0',
            presentDays: stats?['presentDays']?.toString() ?? '0',
            absentDays: stats?['absentDays']?.toString() ?? '0',
          ),
          const SizedBox(height: 24),
          _buildSimpleCalendar(),
          const SizedBox(height: 24),
          _buildStatusLegend(),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => widget.onNavigate?.call(4, subTabIndex: 1),
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
              Text(
                todayLabel,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF475569),
                  fontSize: 14,
                ),
              ),
              Container(
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
                            : (_todayAttendance?['status'] ?? 'Present'))
                      : 'Absent',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: _todayAttendance != null
                        ? (_todayAttendance?['status'] == 'Pending'
                              ? Colors.orange
                              : (_todayAttendance?['status'] == 'Rejected' ||
                                        _todayAttendance?['status'] == 'Absent'
                                    ? Colors.red
                                    : _todayAttendance?['status'] == 'On Leave'
                                    ? Colors.blue
                                    : Colors.green))
                        : Colors.red,
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
              Text(
                formatTime(punchIn),
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1E293B),
                  fontSize: 13,
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
              Text(
                formatTime(punchOut),
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1E293B),
                  fontSize: 13,
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
                    style: const TextStyle(
                      fontSize: 11,
                      color: Colors.black,
                    ),
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
    required String holidays,
    required String weekOffs,
    required String presentDays,
    required String absentDays,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDBEAFE)),
      ),
      child: Row(
        children: [
          Expanded(child: _buildStatItem(presentDays, 'Present')),
          Container(width: 1, height: 30, color: const Color(0xFFDBEAFE)),
          Expanded(child: _buildStatItem(absentDays, 'Absent')),
          Container(width: 1, height: 30, color: const Color(0xFFDBEAFE)),
          Expanded(child: _buildStatItem(workingDays, 'Working')),
          Container(width: 1, height: 30, color: const Color(0xFFDBEAFE)),
          Expanded(child: _buildStatItem(holidays, 'Holidays')),
          Container(width: 1, height: 30, color: const Color(0xFFDBEAFE)),
          Expanded(child: _buildStatItem(weekOffs, 'Week Offs')),
        ],
      ),
    );
  }

  Widget _buildStatItem(String value, String label) {
    return Column(
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
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontSize: 11,
            color: Colors.black,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
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
    Map<String, num?> dayWorkHoursByDate = {};
    if (_monthData != null && _monthData!['attendance'] != null) {
      for (var entry in _monthData!['attendance']) {
        try {
          final d = DateTime.parse(entry['date']).toLocal();
          final dateStr = DateFormat('yyyy-MM-dd').format(d);
          // Check both year and month to ensure correct matching
          if (d.year == _selectedMonth.year &&
              d.month == _selectedMonth.month) {
            dayStatusByDate[dateStr] = entry['status'] ?? 'Present';
            num? workHours = entry['workHours'] as num?;

            // Calculate workHours from punchIn and punchOut if not available
            if (workHours == null) {
              final punchIn = entry['punchIn'];
              final punchOut = entry['punchOut'];
              if (punchIn != null && punchOut != null) {
                try {
                  final punchInTime = DateTime.parse(punchIn).toLocal();
                  final punchOutTime = DateTime.parse(punchOut).toLocal();
                  final duration = punchOutTime.difference(punchInTime);
                  workHours = duration.inMinutes / 60.0; // Convert to hours
                } catch (_) {
                  // If parsing fails, leave workHours as null
                }
              }
            }

            dayWorkHoursByDate[dateStr] = workHours;
          }
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

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            IconButton(
              icon: const Icon(Icons.chevron_left),
              onPressed: () => setState(() {
                _selectedMonth = DateTime(
                  _selectedMonth.year,
                  _selectedMonth.month - 1,
                );
                _fetchMonthAttendance();
              }),
            ),
            Text(
              DateFormat('MMMM yyyy').format(_selectedMonth),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            IconButton(
              icon: const Icon(Icons.chevron_right),
              onPressed: () => setState(() {
                _selectedMonth = DateTime(
                  _selectedMonth.year,
                  _selectedMonth.month + 1,
                );
                _fetchMonthAttendance();
              }),
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
            if (isCurrentMonth) {
              final dateStr = DateFormat('yyyy-MM-dd').format(dayDate);
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

              // Priority: Holiday > Week Off > Present (from backend or attendance) > Attendance Status > Absent > Not Marked
              // IMPORTANT: Week offs (especially Sundays) should NEVER be marked as absent
              if (isHoliday) {
                bgColor = const Color(0xFFFEF3C7); // Holiday - Light yellow
              } else if (isWeekOff) {
                bgColor = const Color(0xFFE9D5FF); // Week Off - Light purple
              } else if (isPresentFromBackend ||
                  dayStatusByDate.containsKey(dateStr)) {
                // Check attendance status from records
                final status = dayStatusByDate[dateStr] ?? 'Present';
                if (status == 'Present' ||
                    status == 'Approved' ||
                    isPresentFromBackend) {
                  bgColor = const Color(0xFFDCFCE7); // Present - Light Green
                } else if (status == 'Pending') {
                  bgColor = const Color(0xFFFFEDD5); // Pending - Light orange
                } else if (status == 'Absent' || status == 'Rejected') {
                  bgColor = const Color(0xFFFEE2E2); // Absent - Light red
                } else if (status == 'Half Day') {
                  bgColor = const Color(0xFFDBEAFE); // Half Day - Light blue
                } else if (status == 'On Leave') {
                  bgColor = const Color(0xFFF3E8FF); // On Leave - Light purple
                }
              } else if (absentDateSet.contains(dateStr)) {
                // Working day without attendance record = Absent (light red)
                // Only if it's NOT a week off (backend should not include week offs in absentDates)
                if (!isWeekOff) {
                  bgColor = const Color(0xFFFEE2E2); // Absent - Light red
                }
              } else {
                // Future working day without attendance record - show as "Not Marked"
                final todayOnly = DateTime(now.year, now.month, now.day);
                final dateOnly = DateTime(
                  dayDate.year,
                  dayDate.month,
                  dayDate.day,
                );
                // Only show "Not Marked" for future dates
                if (dateOnly.isAfter(todayOnly)) {
                  bgColor = const Color(0xFFE2E8F0); // Not Marked - Light grey
                }
              }
            }

            // Check for low work hours (less than 9 hours) - only for current month dates
            num? workHours;
            bool isLowHours = false;
            bool isFuture = false;
            if (isCurrentMonth) {
              final dateStr = DateFormat('yyyy-MM-dd').format(dayDate);
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
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(8),
                border: isToday
                    ? Border.all(color: AppColors.primary, width: 2)
                    : null,
              ),
              child: Stack(
                children: [
                  Center(
                    child: Text(
                      '${dayDate.day}',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: isToday ? FontWeight.bold : FontWeight.w500,
                        color: textColor,
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
        _buildLegendItem(const Color(0xFFEF4444), 'Absent'),
        _buildLegendItem(const Color(0xFFF59E0B), 'Holiday'),
        _buildLegendItem(const Color(0xFFE9D5FF), 'Weekend'),
        _buildLegendItem(const Color(0xFF3B82F6), 'Half Day'),
        _buildLegendItem(const Color(0xFFA855F7), 'On Leave'),
        _buildLegendItem(const Color(0xFFF97316), 'Pending'),
        _buildLegendItem(const Color(0xFFE2E8F0), 'Not Marked'),
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
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Colors.black),
        ),
      ],
    );
  }
}
