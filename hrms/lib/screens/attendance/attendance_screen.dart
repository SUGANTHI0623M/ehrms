import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../config/app_colors.dart';
import '../../widgets/app_drawer.dart';
import '../../services/attendance_service.dart';
import '../attendance/selfie_checkin_screen.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  Map<String, dynamic>? _attendanceData;
  final AttendanceService _attendanceService = AttendanceService();

  // History State
  List<dynamic> _historyList = [];
  int _page = 1;
  bool _isLoadingHistory = false;
  bool _hasMoreHistory = true;
  final int _limit = 10;

  @override
  void initState() {
    super.initState();
    _fetchAttendanceStatus();
    _fetchHistory();
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

    // If filter is specific, pass it? Backend currently only supports date filter on history.
    // Ideally backend should support 'status' filter.
    // For now we just fetch all history. The UI requirement was "show in history in pagination 10 records".

    final result = await _attendanceService.getAttendanceHistory(
      page: _page,
      limit: _limit,
    );

    if (result['success'] && mounted) {
      final List<dynamic> newData = result['data']['data'];
      final pagination = result['data']['pagination'];

      setState(() {
        _historyList.addAll(newData);
        _page++;
        _hasMoreHistory = _historyList.length < pagination['total'];
        _isLoadingHistory = false;
      });
    } else {
      if (mounted) setState(() => _isLoadingHistory = false);
    }
  }

  Future<void> _fetchAttendanceStatus() async {
    // Format date as YYYY-MM-DD
    String formattedDate = _focusedDay.toIso8601String().split('T')[0];

    // We already added getAttendanceByDate to service, so let's use it
    final result = await _attendanceService.getAttendanceByDate(formattedDate);

    if (result['success'] && mounted) {
      // The API now returns { data: ..., branch: ... } structure due to previous edits on backend controller
      // But let's check what getTodayAttendance/getAttendanceByDate returns in service.
      // In service Step 174, it returns `jsonDecode(response.body)`.
      // The controller Step 202 modified the response to be `{ data: attendance, branch: branchInfo }`.

      final responseBody = result['data'];
      Map<String, dynamic>? data;

      if (responseBody != null) {
        if (responseBody is Map<String, dynamic> &&
            responseBody.containsKey('data')) {
          data = responseBody['data'];
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Attendance'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      drawer: const AppDrawer(),
      body: SingleChildScrollView(
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
              'Attendance - ${DateFormat('MMM dd, yyyy').format(_focusedDay)}',
            ),
            const SizedBox(height: 12),
            _buildAttendanceCard(),
            const SizedBox(height: 24),
            _buildHistorySection(),
          ],
        ),
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

      // Append Lat/Lng if requested
      if (loc['latitude'] != null && loc['longitude'] != null) {
        String latLng = "[Lat: ${loc['latitude']}, Lng: ${loc['longitude']}]";
        if (addr.isNotEmpty) {
          return "$addr\n$latLng";
        }
        return latLng;
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
    // If _attendanceData is null, check if _focusedDay is today or past
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
        // Past date with no record -> Attendance Closed / Absent
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
      // If today and null, standard "Not checked in yet" (which shows blank rows below)
    }

    final isCheckedIn = punchIn != null && punchOut == null;
    final isCompleted = punchIn != null && punchOut != null;

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
            else if (!isCompleted)
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
            else
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.success.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Center(
                  child: Text(
                    'Attendance Completed',
                    style: TextStyle(
                      color: AppColors.success,
                      fontWeight: FontWeight.bold,
                    ),
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
        // Status Badge if available
        if (address != null && !isPlaceholder)
          Container(
            margin: const EdgeInsets.only(top: 2),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(4),
            ),
            child: const Text(
              'Present',
              style: TextStyle(fontSize: 10, color: AppColors.primary),
            ),
            // In a real scenario, pass the status here
          ),
      ],
    );
  }

  // Filter State
  String _selectedFilter = 'All';
  final List<String> _filters = [
    'All',
    'Late Check-in',
    'Late Check-out',
    'Low Work Hours',
  ];

  // Calendar State
  DateTime _focusedDay = DateTime.now();

  Widget _buildHistorySection() {
    // For now, simpler placeholder for the Calendar and Filter UI
    // as we might not have the full sync logic and TableCalendar package installed yet?
    // I will use standard widgets.

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Attendance History',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            IconButton(
              icon: const Icon(Icons.calendar_month),
              onPressed: () async {
                final DateTime? picked = await showDatePicker(
                  context: context,
                  initialDate: _focusedDay,
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now(),
                );
                if (picked != null) {
                  setState(() {
                    _focusedDay = picked;
                    // TODO: Fetch specific date
                    _fetchAttendanceStatus(); // Now fetches for proper date using _focusedDay
                  });
                }
              },
            ),
          ],
        ),
        const SizedBox(height: 12),
        // Filters
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: _filters.map((filter) {
              final isSelected = _selectedFilter == filter;
              return Padding(
                padding: const EdgeInsets.only(right: 8.0),
                child: FilterChip(
                  label: Text(filter),
                  selected: isSelected,
                  onSelected: (bool selected) {
                    setState(() {
                      _selectedFilter = selected ? filter : 'All';
                      // TODO: Fetch filtered list
                    });
                  },
                  backgroundColor: Colors.white,
                  selectedColor: AppColors.primary.withOpacity(0.2),
                  checkmarkColor: AppColors.primary,
                  labelStyle: TextStyle(
                    color: isSelected
                        ? AppColors.primary
                        : AppColors.textSecondary,
                    fontWeight: isSelected
                        ? FontWeight.bold
                        : FontWeight.normal,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: BorderSide(
                      color: isSelected
                          ? AppColors.primary
                          : Colors.grey.shade300,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 16),

        // List placeholder
        const SizedBox(height: 16),

        // History List with Pagination
        if (_historyList.isEmpty && !_isLoadingHistory)
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
            physics:
                const NeverScrollableScrollPhysics(), // Handled by outer SingleScrollView?
            // Wait, outer is SingleScrollView. Inner ListView shrinkWrap=true is okay but not efficient for pagination scroll.
            // Better approach: Since user asked for pagination, usually implies infinite scroll.
            // But inside a Column inside SingleScrollView, we can't easily detect scroll end.
            // We'll use a "Load More" button for simplicity given structure.
            itemCount: _historyList.length,
            separatorBuilder: (c, i) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final record = _historyList[index];
              final date = record['date'] ?? '';
              final status = record['status'] ?? 'Present';
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
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          date,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          status,
                          style: TextStyle(
                            color: status.contains('Late')
                                ? Colors.orange
                                : status == 'Absent'
                                ? Colors.red
                                : Colors.green,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    // Show timings if available
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

        if (_hasMoreHistory)
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
