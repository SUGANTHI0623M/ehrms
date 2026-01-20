import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:table_calendar/table_calendar.dart';
import '../../config/app_colors.dart';
import '../../widgets/app_drawer.dart';
import '../../services/attendance_service.dart';
import '../attendance/selfie_checkin_screen.dart';

class AttendanceScreen extends StatefulWidget {
  final int initialTabIndex;
  const AttendanceScreen({super.key, this.initialTabIndex = 0});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen>
    with SingleTickerProviderStateMixin {
  TabController? _tabController;
  Map<String, dynamic>? _attendanceData;
  final AttendanceService _attendanceService = AttendanceService();

  // History State
  List<dynamic> _historyList = [];
  int _page = 1;
  bool _isLoadingHistory = false;
  bool _hasMoreHistory = true;
  final int _limit = 10;

  // Calendar State
  Map<String, dynamic>? _monthData;
  List<dynamic> _monthAttendance = [];
  List<dynamic> _monthHolidays = [];
  DateTime _selectedDay = DateTime.now();
  DateTime _focusedDay = DateTime.now();
  String _activeFilter = 'All'; // Filter for history list

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialTabIndex,
    );
    _tabController!.addListener(() {
      setState(() {});
    });
    _initData();
  }

  @override
  void dispose() {
    _tabController?.dispose();
    super.dispose();
  }

  Future<void> _initData() async {
    await _fetchAttendanceStatus();
    await _fetchHistory(refresh: true);
    await _fetchMonthData(_focusedDay.year, _focusedDay.month);
  }

  Future<void> _fetchMonthData(int year, int month) async {
    final result = await _attendanceService.getMonthAttendance(year, month);
    if (result['success'] && mounted) {
      setState(() {
        _monthData = result['data'];
        _monthAttendance = result['data']['attendance'] ?? [];
        _monthHolidays = result['data']['holidays'] ?? [];
      });
    }
  }

  Future<void> _fetchHistory({bool refresh = false}) async {
    if (_isLoadingHistory) return;
    if (refresh) {
      _page = 1;
      _hasMoreHistory = true;
      _historyList.clear();
    }
    if (!_hasMoreHistory) return;

    setState(() => _isLoadingHistory = true);

    final result = await _attendanceService.getAttendanceHistory(
      page: _page,
      limit: _limit,
    );

    if (result['success'] && mounted) {
      final List<dynamic> newData = result['data']['data'];
      final pagination = result['data']['pagination'];

      setState(() {
        // If page 1, check if today's record needs to be prepended
        if (_page == 1 && _attendanceData != null) {
          final todayStr = DateTime.now().toIso8601String().split('T')[0];
          bool todayExists = newData.any((r) => r['date'] == todayStr);
          // If API didn't return today's record (maybe because it's sorted or paginated differently), we add it manually from _attendanceData
          if (!todayExists) {
            // We might need to ensure _attendanceData has the same structure as history items
            // Usually _attendanceData from getAttendanceByDate is similar
            // Just prepend it
            // _historyList.add(_attendanceData); // Wait, this might be duplicate if API eventually returns it.
            // However, user specifically asked "before all in attendance history show today".
            // Let's assume the API returns it if it exists.
            // The issue is if "today" is just created it might not be in the first page of history if history is sorted differently?
            // The backend `getAttendanceHistory` sorts `{ date: -1 }`. So today SHOULD be first.
            // If it's not appearing, maybe `_attendanceData` is available but not yet saved/synced or fetched separately.
            // Let's trust the API for now, but if the user insists, we can manually inject.

            // Re-reading user request: "before all in attendance history show today".
            // If I have local state `_attendanceData` which is fresh, I should probably show it.
            // Let's merge if not present.
            if (_attendanceData!['date'] == todayStr) {
              _historyList.insert(0, _attendanceData);
              // Remove duplicate if it was actually in newData but we missed check?
              // Actually newData comes from API.
            }
          }
        }
        _historyList.addAll(newData);

        // Remove duplicates if any (simple check by _id if available)
        final ids = <String>{};
        final uniqueList = <dynamic>[];
        for (var item in _historyList) {
          if (item['_id'] != null) {
            if (ids.add(item['_id'])) uniqueList.add(item);
          } else {
            uniqueList.add(item);
          }
        }
        _historyList = uniqueList;

        _page++;
        _hasMoreHistory =
            _historyList.length <
            pagination['total'] +
                (pagination['total'] == 0 && _attendanceData != null ? 1 : 0);
        _isLoadingHistory = false;
      });
    } else {
      if (mounted) setState(() => _isLoadingHistory = false);
    }
  }

  Future<void> _fetchAttendanceStatus() async {
    // Format date as YYYY-MM-DD
    String formattedDate = _focusedDay.toIso8601String().split('T')[0];

    final result = await _attendanceService.getAttendanceByDate(formattedDate);

    if (result['success'] && mounted) {
      final responseBody = result['data'];
      Map<String, dynamic>? data;
      // ignore: unused_local_variable
      Map<String, dynamic>? branch;

      if (responseBody != null) {
        if (responseBody is Map<String, dynamic> &&
            responseBody.containsKey('data')) {
          data = responseBody['data'];
          if (responseBody.containsKey('branch')) {
            branch = responseBody['branch'];
          }
        } else {
          // Fallback if structure is different
          data = responseBody;
        }
      }

      setState(() {
        _attendanceData = data;
      });
    }
  }

  // Helper method to format time
  String _formatTime(String? isoString) {
    if (isoString == null) return '--:--';
    try {
      final date = DateTime.parse(isoString).toLocal();
      return DateFormat('hh:mm a').format(date);
    } catch (e) {
      return '--:--';
    }
  }

  void _showSelfieDialog(String imageUrl, [String title = "Selfie View"]) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Image.network(imageUrl, fit: BoxFit.cover),
          ],
        ),
      ),
    );
  }

  // Helper to determine if late
  bool _isLateCheckIn(String? punchInTime) {
    if (punchInTime == null) return false;
    try {
      final checkIn = DateTime.parse(punchInTime).toLocal();
      // Assume shift starts at 9:30 AM with 15 min grace => 9:45 AM
      final shiftStart = DateTime(
        checkIn.year,
        checkIn.month,
        checkIn.day,
        9,
        45,
      );
      return checkIn.isAfter(shiftStart);
    } catch (e) {
      return false;
    }
  }

  bool _isLateCheckOut(String? punchOutTime) {
    if (punchOutTime == null) return false;
    try {
      final checkOut = DateTime.parse(punchOutTime).toLocal();
      // Assume shift ends at 6:30 PM => 18:30
      final shiftEnd = DateTime(
        checkOut.year,
        checkOut.month,
        checkOut.day,
        18,
        30,
      );
      // Late check-out usually means staying AFTER shift end?
      // Or does user mean "Left Early"? Usually "Late Check-out" means worked late.
      // If user meant "Early checkout", the terminlogy is different.
      // Assuming "Late Check-out" as filter means people who stayed late.
      return checkOut.isAfter(shiftEnd);
    } catch (e) {
      return false;
    }
  }

  bool _isLowWorkHours(num? workHours) {
    if (workHours == null) return false;
    // Assuming < 9 hours is low
    return workHours < 9;
  }

  Widget _buildCustomDay(DateTime day) {
    final now = DateTime.now();
    final dateOnly = DateTime(day.year, day.month, day.day);
    final todayOnly = DateTime(now.year, now.month, now.day);

    if (dateOnly.isAfter(todayOnly)) {
      return Center(
        child: Text('${day.day}', style: const TextStyle(color: Colors.grey)),
      );
    }

    // Logic for colors
    final dateStr = DateFormat('yyyy-MM-dd').format(day);
    final record = _monthAttendance.firstWhere(
      (r) => r['date'].toString().split('T')[0] == dateStr,
      orElse: () => null,
    );

    Color? bgColor;
    bool isHalfHalf = false;

    // Is it a Sunday (Week Off)?
    if (day.weekday == DateTime.sunday) {
      bgColor = Colors.green[100];
    } else {
      // Is it a Holiday?
      bool isHoliday = _monthHolidays.any(
        (h) => h['date'].toString().split('T')[0] == dateStr,
      );

      if (isHoliday) {
        bgColor = Colors.green[100];
      } else if (record == null) {
        // Absent (Past date, no record, not Sunday/Holiday)
        bgColor = Colors.red[100];
      } else {
        // Record exists - Check status
        final punchIn = record['punchIn'];
        final workHours = record['workHours'] ?? 0;

        final isLate = _isLateCheckIn(punchIn);
        final isLow = _isLowWorkHours(workHours);

        if (isLate && isLow) {
          isHalfHalf = true;
        } else if (isLate) {
          bgColor = Colors.orange[100];
        } else if (isLow) {
          bgColor = Colors.purple[100];
        } else {
          bgColor = Colors.yellow[200]; // Correct and Present
        }
      }
    }

    return Container(
      margin: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: !isHalfHalf ? bgColor : null,
        shape: BoxShape.circle,
        gradient: isHalfHalf
            ? LinearGradient(
                colors: [Colors.orange[100]!, Colors.purple[100]!],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : null,
      ),
      child: Center(
        child: Text(
          '${day.day}',
          style: TextStyle(
            color: (bgColor != null || isHalfHalf) ? Colors.black87 : null,
            fontWeight: dateOnly == todayOnly ? FontWeight.bold : null,
            decoration: dateOnly == todayOnly ? TextDecoration.underline : null,
          ),
        ),
      ),
    );
  }

  Widget _buildCalendarHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(Icons.calendar_month, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                DateFormat('MMMM yyyy').format(_focusedDay),
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          Row(
            children: [
              DropdownButton<int>(
                value: _focusedDay.month,
                underline: const SizedBox(),
                items: List.generate(12, (i) => i + 1).map((m) {
                  return DropdownMenuItem(
                    value: m,
                    child: Text(DateFormat('MMM').format(DateTime(2024, m))),
                  );
                }).toList(),
                onChanged: (m) {
                  if (m != null) {
                    setState(() {
                      _focusedDay = DateTime(_focusedDay.year, m, 1);
                      _fetchMonthData(_focusedDay.year, m);
                    });
                  }
                },
              ),
              const SizedBox(width: 8),
              DropdownButton<int>(
                value: _focusedDay.year,
                underline: const SizedBox(),
                items: List.generate(11, (i) => 2020 + i).map((y) {
                  return DropdownMenuItem(value: y, child: Text('$y'));
                }).toList(),
                onChanged: (y) {
                  if (y != null) {
                    setState(() {
                      _focusedDay = DateTime(y, _focusedDay.month, 1);
                      _fetchMonthData(y, _focusedDay.month);
                    });
                  }
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMarkAttendanceTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Mark your daily attendance',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          _buildSectionHeader(
            'Attendance - ${DateFormat('MMM dd, yyyy').format(DateTime.now())}',
          ),
          const SizedBox(height: 12),
          _buildAttendanceCard(),
          const SizedBox(height: 24),
          const Text(
            'Recent Activity',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 12),
          _buildHistoryList(limit: 5),
        ],
      ),
    );
  }

  Widget _buildHistoryTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildCalendarHeader(),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: TableCalendar(
              firstDay: DateTime(2020),
              lastDay: DateTime.now().add(const Duration(days: 365)),
              focusedDay: _focusedDay,
              selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
              onDaySelected: (selectedDay, focusedDay) {
                setState(() {
                  _selectedDay = selectedDay;
                  _focusedDay = focusedDay;
                });
              },
              headerVisible: false, // Using custom header
              calendarFormat: CalendarFormat.month,
              daysOfWeekHeight: 40,
              calendarBuilders: CalendarBuilders(
                defaultBuilder: (context, day, focusedDay) {
                  return _buildCustomDay(day);
                },
                holidayBuilder: (context, day, focusedDay) {
                  return _buildCustomDay(day);
                },
                outsideBuilder: (context, day, focusedDay) {
                  return const SizedBox.shrink();
                },
              ),
              onPageChanged: (focusedDay) {
                setState(() {
                  _focusedDay = focusedDay;
                });
                _fetchMonthData(focusedDay.year, focusedDay.month);
              },
            ),
          ),
          const SizedBox(height: 16),
          _buildStatusLegend(),
          const SizedBox(height: 24),
          const Text(
            'Attendance History',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          _buildHistoryList(),
        ],
      ),
    );
  }

  Widget _buildStatusLegend() {
    return Wrap(
      spacing: 12,
      runSpacing: 8,
      children: [
        _legendItem(Colors.yellow[200]!, 'Present'),
        _legendItem(Colors.red[100]!, 'Absent'),
        _legendItem(Colors.orange[100]!, 'Late In'),
        _legendItem(Colors.purple[100]!, 'Low Hrs'),
        _legendItem(Colors.green[100]!, 'Week Off/Holiday'),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [Colors.orange[100]!, Colors.purple[100]!],
                ),
              ),
            ),
            const SizedBox(width: 4),
            const Text('Late + Low Hrs', style: TextStyle(fontSize: 10)),
          ],
        ),
      ],
    );
  }

  Widget _legendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 10)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Attendance'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Mark Attendance'),
            Tab(text: 'History'),
          ],
        ),
        actions: [
          if (_tabController?.index == 1)
            PopupMenuButton<String>(
              icon: const Icon(Icons.filter_list),
              onSelected: (value) {
                setState(() {
                  _activeFilter = value;
                });
              },
              itemBuilder: (context) => [
                const PopupMenuItem(value: 'All', child: Text('All')),
                const PopupMenuItem(
                  value: 'This Month',
                  child: Text('This Month'),
                ),
                const PopupMenuItem(
                  value: 'This Week',
                  child: Text('This Week'),
                ),
                const PopupMenuItem(value: 'Late', child: Text('Late')),
                const PopupMenuItem(
                  value: 'Low Hours',
                  child: Text('Low Hours'),
                ),
              ],
            ),
        ],
      ),
      drawer: const AppDrawer(),
      body: TabBarView(
        controller: _tabController,
        children: [_buildMarkAttendanceTab(), _buildHistoryTab()],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: AppColors.textSecondary,
      ),
    );
  }

  Widget _buildAttendanceCard() {
    final punchIn = _attendanceData?['punchIn'];
    final punchOut = _attendanceData?['punchOut'];

    // Extract location details
    final punchInLoc = _attendanceData?['location']?['punchIn'];
    final punchOutLoc = _attendanceData?['location']?['punchOut'];

    String? punchInAddress;
    // Helper to format address with lat/lng
    String formatLoc(Map<String, dynamic> loc) {
      String addr = '';
      if (loc['address'] != null && loc['address'].toString().isNotEmpty) {
        addr = loc['address'];
      } else {
        final area = loc['area'] ?? '';
        final city = loc['city'] ?? '';
        final pincode = loc['pincode'] ?? '';
        List<String> parts = [
          area,
          city,
          pincode,
        ].where((s) => s != null && s.isNotEmpty).cast<String>().toList();
        if (parts.isNotEmpty) addr = parts.join(', ');
      }
      return addr;
    }

    if (punchInLoc != null) {
      punchInAddress = formatLoc(punchInLoc);
    }

    String? punchOutAddress;
    if (punchOutLoc != null) {
      punchOutAddress = formatLoc(punchOutLoc);
    }

    // Logic for "Leave" / "Absent" / "Closed"
    final now = DateTime.now();
    final dateOnlyFocused = DateTime(
      _focusedDay.year,
      _focusedDay.month,
      _focusedDay.day,
    );
    final dateOnlyNow = DateTime(now.year, now.month, now.day);

    final isFuture = dateOnlyFocused.isAfter(dateOnlyNow);
    final isPast = dateOnlyFocused.isBefore(dateOnlyNow);

    // If data is null
    if (_attendanceData == null) {
      if (isPast) {
        return Card(
          elevation: 0,
          color: Colors.red[50], // Light red for absent
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Padding(
            padding: EdgeInsets.all(32.0),
            child: Center(
              child: Column(
                children: [
                  Icon(Icons.lock_clock, size: 48, color: Colors.red),
                  SizedBox(height: 16),
                  Text(
                    "Attendance Closed",
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.red,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    "You did not mark attendance",
                    style: TextStyle(color: Colors.redAccent),
                  ),
                ],
              ),
            ),
          ),
        );
      } else if (isFuture) {
        return const Card(
          child: Padding(
            padding: EdgeInsets.all(20),
            child: Center(child: Text("Future Date")),
          ),
        );
      }
    }

    final isCheckedIn = punchIn != null && punchOut == null;
    final isCompleted = punchIn != null && punchOut != null;
    final isLate = _isLateCheckIn(punchIn);

    // Extract Status
    String status = _attendanceData?['status'] ?? 'Not Marked';

    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            _buildAttendanceRow(
              'Punch In',
              _formatTime(punchIn),
              Icons.login_rounded,
              AppColors.success,
              address: punchInAddress,
              isPlaceholder: punchIn == null,
              isLate: isLate,
            ),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12.0),
              child: Divider(height: 1, color: AppColors.divider),
            ),
            _buildAttendanceRow(
              'Punch Out',
              _formatTime(punchOut),
              Icons.logout_rounded,
              AppColors.error,
              address: punchOutAddress,
              isPlaceholder: punchOut == null,
            ),
            const SizedBox(height: 20),
            if (isPast && isCheckedIn)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.error.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Center(
                  child: Text(
                    'Check-out time over',
                    style: TextStyle(
                      color: AppColors.error,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              )
            else if (!isCompleted && !isPast && !isFuture)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const SelfieCheckInScreen(),
                      ),
                    );
                    _fetchAttendanceStatus(); // Refresh on return
                  },
                  icon: const Icon(Icons.camera_alt),
                  label: Text(
                    isCheckedIn ? 'Selfie Check Out' : 'Selfie Check In',
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isCheckedIn
                        ? AppColors.error
                        : AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              )
            // Completed State Logic
            else if (isCompleted)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Center(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        status == 'Pending'
                            ? Icons.hourglass_bottom_rounded
                            : status == 'Approved' || status == 'Present'
                            ? Icons.check_circle
                            : Icons.info_outline,
                        color: status == 'Pending'
                            ? Colors.orange
                            : status == 'Approved' || status == 'Present'
                            ? AppColors.success
                            : Colors.blue,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        status == 'Pending' ? 'Waiting for Approval' : status,
                        style: TextStyle(
                          color: status == 'Pending'
                              ? Colors.orange
                              : status == 'Approved' || status == 'Present'
                              ? AppColors.success
                              : Colors.blue,
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

  Widget _buildAttendanceRow(
    String label,
    String time,
    IconData icon,
    Color color, {
    String? address,
    bool isPlaceholder = false,
    bool isLate = false,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color, size: 24),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Row(
                children: [
                  Text(
                    time,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: isPlaceholder
                          ? AppColors.textSecondary
                          : AppColors.textPrimary,
                    ),
                  ),
                  if (isLate)
                    Container(
                      margin: const EdgeInsets.only(left: 8),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.orange.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: Colors.orange, width: 0.5),
                      ),
                      child: const Text(
                        'Late',
                        style: TextStyle(
                          fontSize: 10,
                          color: Colors.deepOrange,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),
              if (address != null && address.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 4.0),
                  child: Row(
                    children: [
                      Icon(
                        Icons.location_on,
                        size: 12,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          address,
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                            height: 1.3,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHistoryList({int? limit}) {
    // Apply local filtering based on _activeFilter
    List<dynamic> filteredList = _historyList;
    if (_activeFilter == 'Late Check-in' || _activeFilter == 'Late') {
      filteredList = _historyList
          .where((r) => _isLateCheckIn(r['punchIn']))
          .toList();
    } else if (_activeFilter == 'Late Check-out' ||
        _activeFilter == 'Late Out') {
      filteredList = _historyList
          .where((r) => _isLateCheckOut(r['punchOut']))
          .toList();
    } else if (_activeFilter == 'Low Work Hours' ||
        _activeFilter == 'Low Hours') {
      filteredList = _historyList
          .where((r) => _isLowWorkHours(r['workHours']))
          .toList();
    } else if (_activeFilter == 'This Week') {
      final now = DateTime.now();
      final weekAgo = now.subtract(const Duration(days: 7));
      filteredList = _historyList.where((r) {
        final d = DateTime.parse(r['date']);
        return d.isAfter(weekAgo);
      }).toList();
    } else if (_activeFilter == 'This Month') {
      final now = DateTime.now();
      filteredList = _historyList.where((r) {
        final d = DateTime.parse(r['date']);
        return d.year == now.year && d.month == now.month;
      }).toList();
    }

    final displayList = limit != null
        ? filteredList.take(limit).toList()
        : filteredList;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // History List
        if (displayList.isEmpty && !_isLoadingHistory)
          Center(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                children: [
                  Icon(
                    Icons.history_toggle_off,
                    size: 48,
                    color: AppColors.textSecondary.withOpacity(0.5),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'No history records found',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: displayList.length,
            separatorBuilder: (c, i) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final record = displayList[index];
              // Safely parse date
              String dateStr = record['date'] ?? '';
              try {
                final d = DateTime.parse(dateStr);
                dateStr = DateFormat('MMM dd, yyyy').format(d);
              } catch (_) {}

              final punchIn = record['punchIn'];
              final punchOut = record['punchOut'];
              final workHours = record['workHours'];
              final isLateIn = _isLateCheckIn(punchIn);
              final isLateOut = _isLateCheckOut(punchOut);
              final isLowHours = _isLowWorkHours(workHours);

              // Define status and tags before usage
              String status = record['status'] ?? 'Present';
              List<String> tags = [];
              if (isLateIn) tags.add('Late In');
              if (isLateOut) tags.add('Late Out');
              if (isLowHours) tags.add('Low Hrs');

              String displayStatus = status;
              Color statusColor = Colors.green;

              if (status == 'Pending') {
                displayStatus = 'Waiting for Approval';
                statusColor = Colors.orange;
              } else if (status == 'Absent' ||
                  status == 'Rejected' ||
                  status == 'On Leave') {
                statusColor = Colors.red;
              } else if (status == 'Half Day') {
                statusColor = Colors.purple;
              }

              // Determine logic for selfie image
              final punchInSelfieUrl = record['punchInSelfie'];
              final bool hasPunchInSelfie =
                  punchInSelfieUrl != null &&
                  punchInSelfieUrl.toString().startsWith('http');

              final punchOutSelfieUrl = record['punchOutSelfie'];
              final bool hasPunchOutSelfie =
                  punchOutSelfieUrl != null &&
                  punchOutSelfieUrl.toString().startsWith('http');

              // Extract location
              String? locationAddress;
              if (record['location'] != null &&
                  record['location']['punchIn'] != null &&
                  record['location']['punchIn']['address'] != null) {
                locationAddress = record['location']['punchIn']['address'];
              }

              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Left Side: Selfie + Info
                    Expanded(
                      child: Row(
                        children: [
                          // Selfie Images
                          Row(
                            children: [
                              // Punch In
                              GestureDetector(
                                onTap: () {
                                  if (hasPunchInSelfie) {
                                    _showSelfieDialog(
                                      punchInSelfieUrl,
                                      "Check-in Selfie",
                                    );
                                  }
                                },
                                child: Container(
                                  width: 45,
                                  height: 45,
                                  margin: const EdgeInsets.only(right: 6),
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: Colors.green.withOpacity(0.5),
                                      width: 2,
                                    ),
                                    image: hasPunchInSelfie
                                        ? DecorationImage(
                                            image: NetworkImage(
                                              punchInSelfieUrl,
                                            ),
                                            fit: BoxFit.cover,
                                          )
                                        : null,
                                    color: hasPunchInSelfie
                                        ? null
                                        : AppColors.primary.withOpacity(0.1),
                                  ),
                                  child: !hasPunchInSelfie
                                      ? Icon(
                                          Icons.person,
                                          size: 20,
                                          color: AppColors.primary,
                                        )
                                      : null,
                                ),
                              ),

                              // Punch Out (if exists)
                              if (hasPunchOutSelfie)
                                GestureDetector(
                                  onTap: () {
                                    _showSelfieDialog(
                                      punchOutSelfieUrl,
                                      "Check-out Selfie",
                                    );
                                  },
                                  child: Container(
                                    width: 45,
                                    height: 45,
                                    margin: const EdgeInsets.only(right: 12),
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: Colors.red.withOpacity(0.5),
                                        width: 2,
                                      ),
                                      image: DecorationImage(
                                        image: NetworkImage(punchOutSelfieUrl),
                                        fit: BoxFit.cover,
                                      ),
                                    ),
                                  ),
                                )
                              else
                                const SizedBox(
                                  width: 6,
                                ), // Spacer if no second image
                            ],
                          ),

                          // Text Info
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  dateStr,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),

                                // Location
                                if (locationAddress != null)
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 4.0),
                                    child: Row(
                                      children: [
                                        Icon(
                                          Icons.location_on,
                                          size: 10,
                                          color: Colors.grey[600],
                                        ),
                                        const SizedBox(width: 2),
                                        Expanded(
                                          child: Text(
                                            locationAddress,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              fontSize: 10,
                                              color: Colors.grey[600],
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),

                                // Status Badge & Tags
                                Wrap(
                                  spacing: 4,
                                  runSpacing: 4,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: statusColor.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        displayStatus,
                                        style: TextStyle(
                                          color: statusColor,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    ...tags.map(
                                      (tag) => Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.orange.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(
                                            4,
                                          ),
                                        ),
                                        child: Text(
                                          tag,
                                          style: const TextStyle(
                                            color: Colors.orange,
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Right Side: Time
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          "In: ${_formatTime(record['punchIn'])}",
                          style: const TextStyle(fontSize: 12),
                        ),
                        Text(
                          "Out: ${_formatTime(record['punchOut'])}",
                          style: const TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),

        if (_hasMoreHistory && limit == null)
          Padding(
            padding: const EdgeInsets.only(top: 16.0),
            child: Center(
              child: _isLoadingHistory
                  ? const CircularProgressIndicator()
                  : TextButton(
                      onPressed: () => _fetchHistory(),
                      child: const Text("Load More"),
                    ),
            ),
          ),
      ],
    );
  }
}
