import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';
import '../../config/app_colors.dart';
import '../../widgets/app_drawer.dart';
import '../../services/request_service.dart';
import '../../services/attendance_service.dart';

class HomeDashboardScreen extends StatefulWidget {
  final Function(int index, {int subTabIndex})? onNavigate;
  const HomeDashboardScreen({super.key, this.onNavigate});

  @override
  State<HomeDashboardScreen> createState() => _HomeDashboardScreenState();
}

class _HomeDashboardScreenState extends State<HomeDashboardScreen> {
  String _userName = 'User';

  final RequestService _requestService = RequestService();
  final AttendanceService _attendanceService = AttendanceService();

  List<dynamic> _recentLeaves = [];
  bool _isLoadingDashboard = false;
  Map<String, dynamic>? _todayAttendance;
  Map<String, dynamic>? _monthData;
  Map<String, dynamic>? _stats;
  DateTime _selectedMonth = DateTime.now();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoadingDashboard = true);

    // Load local user name
    final prefs = await SharedPreferences.getInstance();
    final userString = prefs.getString('user');
    if (userString != null) {
      final data = jsonDecode(userString);
      setState(() {
        _userName = data['name'] ?? 'User';
      });
    }

    // Fetch unified dashboard data
    final result = await _requestService.getDashboardData();
    if (mounted) {
      if (result['success']) {
        final data = result['data'];
        setState(() {
          _stats = data['stats'];
          _recentLeaves = data['recentLeaves'] ?? [];
          _todayAttendance = data['stats']?['attendanceToday'];
          _isLoadingDashboard = false;
        });
      } else {
        setState(() => _isLoadingDashboard = false);
      }
    }

    // Still fetch month attendance separately as it depends on _selectedMonth
    _fetchMonthAttendance();
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

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width > 800;

    // Stats extraction
    final pendingLeaves = _stats?['pendingLeaves']?.toString() ?? '0';
    final activeLoans = _stats?['activeLoans']?.toString() ?? '0';
    final monthSalary = _stats?['currentMonthSalary']?.toString() ?? '0';
    final salaryStatus = _stats?['payrollStatus'] ?? 'Pending';

    final attSummary = _stats?['attendanceSummary'];
    final presentDays = attSummary?['presentDays']?.toString() ?? '0';
    final totalDays = attSummary?['totalDays']?.toString() ?? '0';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Dashboard',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.white),
        backgroundColor: AppColors.primary,
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
                  _buildSummaryCard(
                    title: 'Active Loans',
                    value: activeLoans,
                    isWide: isWide,
                  ),
                  _buildSummaryCard(
                    title: 'Month Salary',
                    value: '₹$monthSalary',
                    subValue: salaryStatus,
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
              'Askeva eHRMS',
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
      _buildQuickActionButton(
        icon: Icons.fingerprint,
        label: 'Attendance',
        color: Colors.redAccent,
        onTap: () => widget.onNavigate?.call(4, subTabIndex: 0),
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
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E293B),
            ),
          ),
          if (subValue != null) ...[
            const SizedBox(height: 2),
            Text(
              subValue,
              style: const TextStyle(
                fontSize: 10,
                color: Color(0xFF94A3B8),
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
                color: Color(0xFF475569),
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
                    color: Color(0xFF64748B),
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
                style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
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
                style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
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
                      color: Color(0xFF94A3B8),
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
            color: Color(0xFF64748B),
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
    for (int i = firstDayWeekday - 1; i >= 0; i--)
      days.add(
        DateTime(
          prevMonthLastDay.year,
          prevMonthLastDay.month,
          prevMonthLastDay.day - i,
        ),
      );
    for (int i = 1; i <= lastDayOfMonth.day; i++)
      days.add(DateTime(_selectedMonth.year, _selectedMonth.month, i));
    while (days.length % 7 != 0)
      days.add(
        DateTime(
          lastDayOfMonth.year,
          lastDayOfMonth.month + 1,
          days.length - (lastDayOfMonth.day + firstDayWeekday) + 1,
        ),
      );

    Map<int, String> dayStatus = {};
    if (_monthData != null && _monthData!['attendance'] != null) {
      for (var entry in _monthData!['attendance']) {
        final d = DateTime.parse(entry['date']);
        if (d.month == _selectedMonth.month)
          dayStatus[d.day] = entry['status'] ?? 'Present';
      }
    }

    List<int> holidayDays = [];
    if (_monthData != null && _monthData!['holidays'] != null) {
      for (var h in _monthData!['holidays']) {
        final d = DateTime.parse(h['date']);
        if (d.month == _selectedMonth.month) holidayDays.add(d.day);
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
                        color: Color(0xFF94A3B8),
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
              bool isWeekOff = false;
              if (_monthData != null && _monthData!['weekOffDates'] != null) {
                final dateStr = DateFormat('yyyy-MM-dd').format(dayDate);
                isWeekOff = (_monthData!['weekOffDates'] as List).contains(
                  dateStr,
                );
              } else {
                // Fallback to Sunday if weekOffDates is not available
                isWeekOff = dayDate.weekday == DateTime.sunday;
              }

              if (holidayDays.contains(dayDate.day))
                bgColor = const Color(0xFFFEF3C7);
              else if (isWeekOff)
                bgColor = const Color(0xFFF1F5F9);
              else if (dayStatus.containsKey(dayDate.day)) {
                final status = dayStatus[dayDate.day];
                if (status == 'Present' || status == 'Approved')
                  bgColor = const Color(0xFFDCFCE7);
                else if (status == 'Pending')
                  bgColor = const Color(0xFFFFEDD5);
                else if (status == 'Absent')
                  bgColor = const Color(0xFFFEE2E2);
                else if (status == 'Half Day')
                  bgColor = const Color(0xFFDBEAFE);
                else if (status == 'On Leave')
                  bgColor = const Color(0xFFF3E8FF);
              }
            }
            return Container(
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(8),
                border: isToday
                    ? Border.all(color: AppColors.primary, width: 2)
                    : null,
              ),
              child: Center(
                child: Text(
                  '${dayDate.day}',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: isToday ? FontWeight.bold : FontWeight.w500,
                    color: textColor,
                  ),
                ),
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
        _buildLegendItem(const Color(0xFF22C55E), 'Present'),
        _buildLegendItem(const Color(0xFFEF4444), 'Absent'),
        _buildLegendItem(const Color(0xFFF59E0B), 'Holiday'),
        _buildLegendItem(const Color(0xFF94A3B8), 'Weekend'),
        _buildLegendItem(const Color(0xFF3B82F6), 'Half Day'),
        _buildLegendItem(const Color(0xFFA855F7), 'On Leave'),
        _buildLegendItem(const Color(0xFFF97316), 'Pending'),
        _buildLegendItem(const Color(0xFFE2E8F0), 'Not Marked'),
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
          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
        ),
      ],
    );
  }
}
