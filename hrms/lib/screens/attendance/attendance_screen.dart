import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:table_calendar/table_calendar.dart';
import '../../config/app_colors.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/menu_icon_button.dart';
import '../../services/attendance_service.dart';
import '../../utils/attendance_display_util.dart';
import '../attendance/selfie_checkin_screen.dart';
import '../../utils/snackbar_utils.dart';
import 'package:flutter/services.dart';

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
  int _totalPages = 1;
  int _totalRecords = 0;
  bool _isLoadingHistory = false;
  final int _limit = 10;

  // Calendar State
  Map<String, dynamic>? _monthData;
  DateTime _selectedDay = DateTime.now();
  DateTime _focusedDay = DateTime.now();
  bool _calendarInitialPageHandled =
      false; // Ignore wrong initial onPageChanged (e.g. January)
  bool _isLoadingMonthData =
      false; // True until month data for History is loaded

  // Precomputed maps/sets for calendar coloring (mirrors dashboard calendar)
  final Map<String, String> _dayStatusByDate = {};
  final Map<String, String?> _dayLeaveTypeByDate = {};
  final Map<String, num?> _dayWorkHoursByDate = {};
  final Set<String> _holidayDateSet = {};
  final Set<String> _weekOffDateSet = {};
  final Set<String> _presentDateSet = {};
  final Set<String> _absentDateSet = {};
  final Set<String> _leaveDateSet = {};

  String _activeFilter = 'All'; // Filter for history list

  // Template & Rule State
  Map<String, dynamic>? _attendanceTemplate;
  bool _isOnLeave = false;
  String? _leaveMessage;
  Map<String, dynamic>? _halfDayLeave;
  bool _checkInAllowed = true;
  bool _checkOutAllowed = true;
  bool _isHoliday = false;
  bool _isWeeklyOff = false;
  Map<String, dynamic>? _holidayInfo;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    final todayOnly = DateTime(now.year, now.month, now.day);
    if (_focusedDay.isAfter(todayOnly)) {
      _focusedDay = todayOnly;
      _selectedDay = todayOnly;
    }
    if (_selectedDay.isAfter(todayOnly)) {
      _selectedDay = todayOnly;
    }
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialTabIndex,
    );
    _tabController!.addListener(() {
      if (!mounted) return;
      setState(() {});
      // When switching to Mark Attendance tab, always refresh today's attendance status
      if (_tabController!.index == 0) {
        _fetchAttendanceStatus(date: DateTime.now());
      }
    });
    _initData();
  }

  @override
  void dispose() {
    _tabController?.dispose();
    super.dispose();
  }

  Future<void> _initData() async {
    if (!mounted) return;
    // Clear lists and show loader so we never show stale data (avoids Jan → Feb flicker)
    setState(() {
      _historyList = [];
      _monthData = null;
      _isLoadingHistory = true;
      _isLoadingMonthData = true;
    });
    if (!mounted) return;
    // Always fetch today's attendance status on init (for Mark Attendance tab)
    await _fetchAttendanceStatus(date: DateTime.now());
    if (!mounted) return;
    await _fetchHistory(refresh: true);
    if (!mounted) return;
    await _fetchMonthData(_focusedDay.year, _focusedDay.month);
  }

  Future<void> _refreshData() async {
    if (!mounted) return;
    // Refresh all data for the current tab
    if (_tabController?.index == 0) {
      // Mark Attendance tab - always fetch today's status
      await _fetchAttendanceStatus(date: DateTime.now());
      if (!mounted) return;
      await _fetchHistory(refresh: true);
    } else {
      // History tab - fetch status for focused day and refresh history/month data
      await _fetchAttendanceStatus(date: _focusedDay);
      if (!mounted) return;
      await _fetchHistory(refresh: true);
      if (!mounted) return;
      await _fetchMonthData(_focusedDay.year, _focusedDay.month);
    }
  }

  Future<void> _fetchMonthData(int year, int month) async {
    if (mounted) {
      setState(() {
        _isLoadingMonthData = true;
        // Clear existing month data/maps immediately so UI doesn't show stale markings
        _monthData = null;
        _dayStatusByDate.clear();
        _dayLeaveTypeByDate.clear();
        _dayWorkHoursByDate.clear();
        _holidayDateSet.clear();
        _weekOffDateSet.clear();
        _presentDateSet.clear();
        _absentDateSet.clear();
        _leaveDateSet.clear();
      });
    }
    final result = await _attendanceService.getMonthAttendance(year, month);
    if (!mounted) return;

    setState(() {
      _isLoadingMonthData = false;

      if (!result['success']) {
        return;
      }

      _monthData = result['data'];

      // Rebuild lookup maps/sets so History calendar matches dashboard calendar.
      _dayStatusByDate.clear();
      _dayLeaveTypeByDate.clear();
      _dayWorkHoursByDate.clear();
      _holidayDateSet.clear();
      _weekOffDateSet.clear();
      _presentDateSet.clear();
      _absentDateSet.clear();
      _leaveDateSet.clear();

      if (_monthData != null) {
        // Attendance-based maps
        if (_monthData!['attendance'] != null) {
          for (var entry in _monthData!['attendance']) {
            try {
              final d = DateTime.parse(entry['date']).toLocal();
              // Ensure we only map dates for the requested month/year
              if (d.year != year || d.month != month) continue;
              final dateStr = DateFormat('yyyy-MM-dd').format(d);

              _dayStatusByDate[dateStr] =
                  (entry['status'] as String?) ?? 'Present';
              final leaveType = entry['leaveType'] as String?;
              if (leaveType != null && leaveType.isNotEmpty) {
                _dayLeaveTypeByDate[dateStr] = leaveType;
              }

              num? workHours = entry['workHours'] as num?;

              // Calculate workHours from punchIn and punchOut if not already present
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
                    if (duration.inMinutes > 0) {
                      workHours = duration.inMinutes / 60.0;
                    }
                  } catch (_) {
                    // Ignore parse errors; leave workHours null
                  }
                }
              }

              _dayWorkHoursByDate[dateStr] = workHours;
            } catch (_) {
              // Skip invalid date entries
              continue;
            }
          }
        }

        // Holiday dates
        if (_monthData!['holidays'] != null) {
          for (var h in _monthData!['holidays']) {
            try {
              final d = DateTime.parse(h['date'].toString()).toLocal();
              if (d.year != year || d.month != month) continue;
              final dateStr = DateFormat('yyyy-MM-dd').format(d);
              _holidayDateSet.add(dateStr);
            } catch (_) {
              continue;
            }
          }
        }

        // Week off dates (already computed by backend)
        if (_monthData!['weekOffDates'] != null) {
          for (var dateStr in _monthData!['weekOffDates']) {
            if (dateStr is String) {
              _weekOffDateSet.add(dateStr);
            }
          }
        }

        // Present dates
        if (_monthData!['presentDates'] != null) {
          for (var dateStr in _monthData!['presentDates']) {
            if (dateStr is String) {
              _presentDateSet.add(dateStr);
            }
          }
        }

        // Absent dates
        if (_monthData!['absentDates'] != null) {
          for (var dateStr in _monthData!['absentDates']) {
            if (dateStr is String) {
              _absentDateSet.add(dateStr);
            }
          }
        }

        // Approved leave dates (treat as On Leave when no overriding attendance)
        if (_monthData!['leaveDates'] != null) {
          for (var dateStr in _monthData!['leaveDates']) {
            if (dateStr is String) {
              _leaveDateSet.add(dateStr);
            }
          }
        }
      }
    });
  }

  Future<void> _fetchHistory({bool refresh = false, int? page}) async {
    if (!mounted || _isLoadingHistory) return;

    final pageToFetch = page ?? (refresh ? 1 : _page);

    setState(() {
      _isLoadingHistory = true;
      if (refresh || pageToFetch == 1) {
        _historyList = [];
      }
    });

    final result = await _attendanceService.getAttendanceHistory(
      page: pageToFetch,
      limit: _limit,
    );

    if (result['success'] && mounted) {
      final List<dynamic> newData = result['data']['data'];
      final pagination = result['data']['pagination'];

      setState(() {
        // For refresh or first page, replace the list.
        // For subsequent pages, append to preserve earlier history.
        if (refresh || pageToFetch == 1) {
          _historyList = newData;
        } else {
          _historyList = [..._historyList, ...newData];
        }
        _page = pageToFetch;
        _totalRecords = pagination['total'] ?? 0;
        _totalPages = ((_totalRecords / _limit).ceil())
            .clamp(1, double.infinity)
            .toInt();
        _isLoadingHistory = false;
      });
    } else {
      if (mounted) setState(() => _isLoadingHistory = false);
    }
  }

  Future<void> _fetchAttendanceStatus({DateTime? date}) async {
    if (!mounted) return;
    // For Mark Attendance tab, always use today's date. For History tab, use provided date or focused day.
    final dateToFetch = date ?? (DateTime.now());
    String formattedDate = dateToFetch.toIso8601String().split('T')[0];

    final result = await _attendanceService.getAttendanceByDate(formattedDate);

    if (result['success'] && mounted) {
      final responseBody = result['data'];
      Map<String, dynamic>? data;
      Map<String, dynamic>? template;

      if (responseBody != null) {
        if (responseBody is Map<String, dynamic> &&
            responseBody.containsKey('data')) {
          data = responseBody['data'];
          template = responseBody['template'];

          setState(() {
            _attendanceTemplate = template;
            _isOnLeave = responseBody['isOnLeave'] ?? false;
            _leaveMessage = responseBody['leaveMessage'] as String?;
            _halfDayLeave =
                responseBody['halfDayLeave'] as Map<String, dynamic>?;
            _checkInAllowed = responseBody['checkInAllowed'] ?? true;
            _checkOutAllowed = responseBody['checkOutAllowed'] ?? true;
            _isHoliday = responseBody['isHoliday'] ?? false;
            _isWeeklyOff = responseBody['isWeeklyOff'] ?? false;
            _holidayInfo = responseBody['holidayInfo'];
          });
        } else {
          data = responseBody;
        }
      }

      setState(() {
        _attendanceData = data;
      });
    }
  }

  // Helper method to extract date only (ignoring time and timezone)
  // This ensures dates are displayed correctly regardless of timezone
  // MongoDB stores dates in UTC, so we parse the full ISO string, convert to local,
  // and then extract the date components to preserve the correct date in user's timezone
  DateTime _extractDateOnly(dynamic dateValue) {
    if (dateValue == null) return DateTime.now();
    try {
      String dateStr = dateValue.toString();

      // Parse the full ISO string (handles both with and without time)
      DateTime parsed;
      if (dateStr.contains('T')) {
        // Full ISO string with time (e.g., "2026-01-26T10:30:00.000Z")
        parsed = DateTime.parse(dateStr).toLocal();
      } else {
        // Date only string (e.g., "2026-01-26")
        // Parse and assume it's in local timezone for date-only strings
        final parts = dateStr.split('-');
        if (parts.length == 3) {
          parsed = DateTime(
            int.parse(parts[0]),
            int.parse(parts[1]),
            int.parse(parts[2]),
          );
        } else {
          parsed = DateTime.parse(dateStr).toLocal();
        }
      }

      // Extract date components from local time and create a new DateTime
      // This ensures the date is preserved in the user's local timezone
      return DateTime(parsed.year, parsed.month, parsed.day);
    } catch (e) {
      return DateTime.now();
    }
  }

  // Helper method to format time
  String _formatTime(dynamic isoString) {
    if (isoString == null ||
        isoString.toString().isEmpty ||
        isoString == 'null') {
      return '--:--';
    }
    try {
      final date = DateTime.parse(isoString.toString()).toLocal();
      return DateFormat('hh:mm a').format(date);
    } catch (e) {
      return '--:--';
    }
  }

  String _formatApprovedAt(dynamic value) {
    if (value == null || value.toString().isEmpty || value == 'null') {
      return '--';
    }
    try {
      final date = DateTime.parse(value.toString()).toLocal();
      return DateFormat('MMM dd, yyyy \'at\' hh:mm a').format(date);
    } catch (e) {
      return value.toString();
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

  // Helper method to get combined history for the focused month.
  // When _monthData is null we return [] so the UI shows loader (no stale _historyList).
  List<dynamic> _getCombinedMonthHistory() {
    if (_monthData == null) {
      return [];
    }

    final attendance = (_monthData!['attendance'] as List?) ?? [];
    final weekOffDates =
        (_monthData!['weekOffDates'] as List?)?.cast<String>() ?? const [];
    final absentDates =
        (_monthData!['absentDates'] as List?)?.cast<String>() ?? const [];
    final holidayDates =
        (_monthData!['holidayDates'] as List?)?.cast<String>() ?? const [];
    final leaveDates =
        (_monthData!['leaveDates'] as List?)?.cast<String>() ?? const [];

    List<dynamic> combined = List.from(attendance);

    // Helper to check if date already has a record
    bool hasRecord(String dateStr) {
      return combined.any((r) {
        try {
          final rDate = _extractDateOnly(r['date']);
          final rDateStr = DateFormat('yyyy-MM-dd').format(rDate);
          return rDateStr == dateStr;
        } catch (_) {
          return false;
        }
      });
    }

    for (var dateStr in absentDates) {
      if (!hasRecord(dateStr)) {
        combined.add({'date': dateStr, 'status': 'Absent'});
      }
    }
    for (var dateStr in weekOffDates) {
      if (!hasRecord(dateStr)) {
        combined.add({'date': dateStr, 'status': 'Weekend'});
      }
    }
    for (var dateStr in holidayDates) {
      if (!hasRecord(dateStr)) {
        combined.add({'date': dateStr, 'status': 'Holiday'});
      }
    }
    for (var dateStr in leaveDates) {
      if (!hasRecord(dateStr)) {
        combined.add({'date': dateStr, 'status': 'On Leave'});
      }
    }

    combined.sort((a, b) {
      DateTime da = _extractDateOnly(a['date']);
      DateTime db = _extractDateOnly(b['date']);
      return db.compareTo(da);
    });

    // Show history only up to today; exclude future days
    final now = DateTime.now();
    final todayOnly = DateTime(now.year, now.month, now.day);
    combined = combined.where((e) {
      try {
        final d = _extractDateOnly(e['date']);
        return !d.isAfter(todayOnly);
      } catch (_) {
        return true;
      }
    }).toList();

    return combined;
  }

  void _showAttendanceDetails(Map<String, dynamic> record) {
    final dateStr = record['date'] ?? '';
    String formattedDate = 'Invalid Date';
    try {
      final d = _extractDateOnly(dateStr);
      formattedDate = DateFormat('MMM dd, yyyy').format(d);
    } catch (_) {
      formattedDate = dateStr.toString();
    }

    final punchIn = record['punchIn'];
    final punchOut = record['punchOut'];
    final workHours = record['workHours'];
    final status = record['status'] ?? 'Present';
    // Prefer half-day details from Leaves collection (leaveDetails), else from attendance record
    final leaveDetails = record['leaveDetails'] as Map<String, dynamic>?;
    final leaveType =
        (leaveDetails?['leaveType'] ?? record['leaveType']) as String?;
    final session = (leaveDetails?['session'] ?? record['session'])?.toString();
    final leaveReason = leaveDetails?['reason'] as String?;
    final approvedAt = leaveDetails?['approvedAt'];
    final approvedByObj = leaveDetails?['approvedBy'] as Map<String, dynamic>?;
    final approvedByName = approvedByObj?['name'] as String?;
    final displayStatus = AttendanceDisplayUtil.formatAttendanceDisplayStatus(
      status,
      leaveType,
      session,
    );
    final isLateIn = _isLateCheckIn(punchIn);
    final isLateOut = _isLateCheckOut(punchOut);
    final isEarlyOut = _isEarlyCheckOut(punchOut);
    final isLowHours = _isLowWorkHours(workHours);

    // Fine information
    final lateMinutes = record['lateMinutes'] as num?;
    final earlyMinutes = record['earlyMinutes'] as num?;
    final fineHours = record['fineHours'] as num?;
    final fineAmount = record['fineAmount'] as num?;
    final hasFineInfo =
        (lateMinutes != null && lateMinutes > 0) ||
        (earlyMinutes != null && earlyMinutes > 0) ||
        (fineAmount != null && fineAmount > 0);

    // Extract location details
    String? punchInAddress;
    String? punchOutAddress;
    String? branchName;

    if (record['location'] != null) {
      final location = record['location'];
      if (location['punchIn'] != null) {
        final punchInLoc = location['punchIn'];
        punchInAddress =
            punchInLoc['address'] ??
            '${punchInLoc['area'] ?? ''}, ${punchInLoc['city'] ?? ''}, ${punchInLoc['pincode'] ?? ''}';
        branchName = punchInLoc['branchName'] ?? record['branchName'];
      }
      if (location['punchOut'] != null) {
        final punchOutLoc = location['punchOut'];
        punchOutAddress =
            punchOutLoc['address'] ??
            '${punchOutLoc['area'] ?? ''}, ${punchOutLoc['city'] ?? ''}, ${punchOutLoc['pincode'] ?? ''}';
        if (branchName == null) {
          branchName = punchOutLoc['branchName'] ?? record['branchName'];
        }
      }
    }

    // Selfie URLs
    final punchInSelfieUrl = record['punchInSelfie'];
    final punchOutSelfieUrl = record['punchOutSelfie'];
    final bool hasPunchInSelfie =
        punchInSelfieUrl != null &&
        punchInSelfieUrl.toString().startsWith('http');
    final bool hasPunchOutSelfie =
        punchOutSelfieUrl != null &&
        punchOutSelfieUrl.toString().startsWith('http');

    // Status color
    Color statusColor = Colors.green;
    if (status == 'Pending') {
      statusColor = Colors.orange;
    } else if (status == 'Absent' || status == 'Rejected') {
      statusColor = Colors.red;
    } else if (status == 'On Leave') {
      statusColor = Colors.blue;
    } else if (status == 'Half Day') {
      statusColor = Colors.purple;
    } else if (status == 'Weekend') {
      statusColor = Colors.deepPurple;
    } else if (status == 'Holiday') {
      statusColor = Colors.amber;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          final pageController = PageController();
          int currentPage = 0;

          return DraggableScrollableSheet(
            initialChildSize: 0.9,
            minChildSize: 0.5,
            maxChildSize: 0.95,
            builder: (context, scrollController) => Container(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Attendance Details',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const Divider(),
                  Expanded(
                    child: PageView(
                      controller: pageController,
                      onPageChanged: (index) {
                        setModalState(() {
                          currentPage = index;
                        });
                      },
                      children: [
                        // Page 1: Basic Details
                        SingleChildScrollView(
                          controller: scrollController,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Date
                              _buildDetailRow(
                                'Date',
                                formattedDate,
                                Icons.calendar_today,
                              ),
                              const SizedBox(height: 16),

                              // Status (with leave type e.g. Present (CL), Half Day (Session 1))
                              _buildDetailRow(
                                'Status',
                                displayStatus,
                                Icons.info_outline,
                                statusColor,
                              ),
                              // Leave details from Leaves collection: Leave type, Session, Reason, Approved at, Approved by
                              if (leaveDetails != null) ...[
                                if (leaveType != null &&
                                    leaveType.toString().trim().isNotEmpty) ...[
                                  const SizedBox(height: 16),
                                  _buildDetailRow(
                                    'Leave type',
                                    leaveType.toString().trim(),
                                    Icons.event_busy,
                                  ),
                                ],
                                if (session != null && session.isNotEmpty) ...[
                                  const SizedBox(height: 16),
                                  _buildDetailRow(
                                    'Session',
                                    session == '1'
                                        ? 'Session 1 (First Half: 10:00 AM – 2:00 PM)'
                                        : 'Session 2 (Second Half: 3:00 PM – 7:00 PM)',
                                    Icons.schedule,
                                  ),
                                ],
                                if (leaveReason != null &&
                                    leaveReason
                                        .toString()
                                        .trim()
                                        .isNotEmpty) ...[
                                  const SizedBox(height: 16),
                                  _buildDetailRow(
                                    'Leave reason',
                                    leaveReason.toString().trim(),
                                    Icons.note_outlined,
                                  ),
                                ],
                                if (approvedAt != null) ...[
                                  const SizedBox(height: 16),
                                  _buildDetailRow(
                                    'Approved at',
                                    _formatApprovedAt(approvedAt),
                                    Icons.check_circle_outline,
                                  ),
                                ],
                                if (approvedByName != null &&
                                    approvedByName
                                        .toString()
                                        .trim()
                                        .isNotEmpty) ...[
                                  const SizedBox(height: 16),
                                  _buildDetailRow(
                                    'Approved by',
                                    approvedByName.toString().trim(),
                                    Icons.person_outline,
                                  ),
                                ],
                              ],
                              const SizedBox(height: 16),

                              // Branch Name
                              if (branchName != null &&
                                  branchName.isNotEmpty) ...[
                                _buildDetailRow(
                                  'Branch Name',
                                  branchName,
                                  Icons.business,
                                ),
                                const SizedBox(height: 16),
                              ],

                              // Shift Time
                              if (_attendanceTemplate != null &&
                                  (_attendanceTemplate!['shiftStartTime'] !=
                                          null ||
                                      _attendanceTemplate!['shiftEndTime'] !=
                                          null)) ...[
                                _buildDetailRow(
                                  'Shift Time',
                                  '${_attendanceTemplate!['shiftStartTime'] ?? 'N/A'} - ${_attendanceTemplate!['shiftEndTime'] ?? 'N/A'}',
                                  Icons.access_time,
                                ),
                                const SizedBox(height: 16),
                              ],

                              // Punch In
                              _buildDetailRow(
                                'Punch In',
                                _formatTime(punchIn),
                                Icons.login_rounded,
                              ),
                              if (isLateIn) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.orange.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: Colors.orange),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.warning,
                                        size: 16,
                                        color: Colors.orange,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        'Late Check-in',
                                        style: TextStyle(
                                          color: Colors.orange,
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                              const SizedBox(height: 16),

                              // Punch Out
                              _buildDetailRow(
                                'Punch Out',
                                _formatTime(punchOut),
                                Icons.logout_rounded,
                              ),
                              if (isLateOut) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.blue.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: Colors.blue),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.schedule,
                                        size: 16,
                                        color: Colors.blue,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        'Late Check-out',
                                        style: TextStyle(
                                          color: Colors.blue,
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                              if (isEarlyOut) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.red.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: Colors.red),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.exit_to_app,
                                        size: 16,
                                        color: Colors.red,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        'Early Exit',
                                        style: TextStyle(
                                          color: Colors.red,
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                              const SizedBox(height: 16),

                              // Work Hours
                              _buildDetailRow(
                                'Work Hours',
                                workHours != null
                                    ? '${workHours.toStringAsFixed(2)} hrs'
                                    : 'N/A',
                                Icons.access_time,
                              ),
                              if (isLowHours) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.red.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: Colors.red),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.timer_off,
                                        size: 16,
                                        color: Colors.red,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        'Low Work Hours',
                                        style: TextStyle(
                                          color: Colors.red,
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                              const SizedBox(height: 16),

                              // Fine Information Section
                              if (hasFineInfo) ...[
                                Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: Colors.grey.shade300,
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Icon(
                                            Icons.money_off,
                                            color: Colors.red.shade700,
                                            size: 20,
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            'Fine Details',
                                            style: TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.red.shade700,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      if (lateMinutes != null &&
                                          lateMinutes > 0) ...[
                                        _buildFineRow(
                                          'Late Minutes',
                                          '${lateMinutes.toInt()} min',
                                          Icons.schedule,
                                          Colors.orange,
                                        ),
                                        const SizedBox(height: 8),
                                      ],
                                      if (earlyMinutes != null &&
                                          earlyMinutes > 0) ...[
                                        _buildFineRow(
                                          'Early Minutes',
                                          '${earlyMinutes.toInt()} min',
                                          Icons.exit_to_app,
                                          Colors.red,
                                        ),
                                        const SizedBox(height: 8),
                                      ],
                                      if (fineHours != null &&
                                          fineHours > 0) ...[
                                        _buildFineRow(
                                          'Fine Hours',
                                          '${(fineHours.toDouble() / 60).toStringAsFixed(2)} hrs',
                                          Icons.timer,
                                          Colors.purple,
                                        ),
                                        const SizedBox(height: 8),
                                      ],
                                      if (fineAmount != null &&
                                          fineAmount > 0) ...[
                                        const Divider(height: 20),
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            Row(
                                              children: [
                                                Icon(
                                                  Icons.currency_rupee,
                                                  color: Colors.red.shade700,
                                                  size: 20,
                                                ),
                                                const SizedBox(width: 8),
                                                Text(
                                                  'Fine Amount',
                                                  style: TextStyle(
                                                    fontSize: 14,
                                                    fontWeight: FontWeight.w600,
                                                    color: Colors.red.shade700,
                                                  ),
                                                ),
                                              ],
                                            ),
                                            Text(
                                              '₹${NumberFormat('#,##0.00').format(fineAmount)}',
                                              style: TextStyle(
                                                fontSize: 18,
                                                fontWeight: FontWeight.bold,
                                                color: Colors.red.shade700,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 16),
                              ],

                              // Location - Punch In
                              if (punchInAddress != null &&
                                  punchInAddress.isNotEmpty) ...[
                                _buildDetailRow(
                                  'Check-in Location',
                                  punchInAddress,
                                  Icons.location_on,
                                ),
                                const SizedBox(height: 16),
                              ],

                              // Location - Punch Out
                              if (punchOutAddress != null &&
                                  punchOutAddress.isNotEmpty) ...[
                                _buildDetailRow(
                                  'Check-out Location',
                                  punchOutAddress,
                                  Icons.location_on,
                                ),
                                const SizedBox(height: 16),
                              ],
                            ],
                          ),
                        ),
                        // Page 2: Selfies (if available)
                        if (hasPunchInSelfie || hasPunchOutSelfie)
                          SingleChildScrollView(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Selfies',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                if (hasPunchInSelfie) ...[
                                  GestureDetector(
                                    onTap: () => _showSelfieDialog(
                                      punchInSelfieUrl,
                                      "Check-in Selfie",
                                    ),
                                    child: Container(
                                      width: double.infinity,
                                      height: 300,
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(
                                          color: Colors.green,
                                          width: 2,
                                        ),
                                        image: DecorationImage(
                                          image: NetworkImage(punchInSelfieUrl),
                                          fit: BoxFit.cover,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  const Text(
                                    'Check-in Selfie',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 24),
                                ],
                                if (hasPunchOutSelfie) ...[
                                  GestureDetector(
                                    onTap: () => _showSelfieDialog(
                                      punchOutSelfieUrl,
                                      "Check-out Selfie",
                                    ),
                                    child: Container(
                                      width: double.infinity,
                                      height: 300,
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(
                                          color: Colors.red,
                                          width: 2,
                                        ),
                                        image: DecorationImage(
                                          image: NetworkImage(
                                            punchOutSelfieUrl,
                                          ),
                                          fit: BoxFit.cover,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  const Text(
                                    'Check-out Selfie',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ],
                            ),
                          )
                        else
                          // If no selfies, show empty page with message
                          Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.camera_alt_outlined,
                                  size: 64,
                                  color: Colors.grey.shade400,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No Selfies Available',
                                  style: TextStyle(
                                    fontSize: 16,
                                    color: Colors.grey.shade600,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                  // Page Indicator (if multiple pages)
                  if (hasPunchInSelfie || hasPunchOutSelfie)
                    Column(
                      children: [
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: currentPage == 0 ? 24 : 8,
                              height: 8,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(4),
                                color: currentPage == 0
                                    ? AppColors.primary
                                    : Colors.grey.shade300,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              width: currentPage == 1 ? 24 : 8,
                              height: 8,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(4),
                                color: currentPage == 1
                                    ? AppColors.primary
                                    : Colors.grey.shade300,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Swipe left/right to view more',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey.shade600,
                            fontStyle: FontStyle.italic,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildFineRow(String label, String value, IconData icon, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: Colors.grey.shade700,
              ),
            ),
          ],
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildDetailRow(
    String label,
    String value,
    IconData icon, [
    Color? valueColor,
  ]) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: AppColors.primary),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: valueColor ?? AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _showWarningAlert(String message) async {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 28),
              const SizedBox(width: 8),
              const Text('Notice'),
            ],
          ),
          content: Text(message),
          actions: <Widget>[
            TextButton(
              child: const Text(
                'OK',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
          ],
        );
      },
    );
  }

  // Used when attendance settings icon is shown in app bar (currently hidden)
  // ignore: unused_element
  void _showAttendanceSettings() {
    if (_attendanceTemplate == null) {
      SnackBarUtils.showSnackBar(
        context,
        'Attendance settings not available',
        isError: true,
      );
      return;
    }

    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 400),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Attendance Settings',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                _attendanceTemplate?['name'] ?? 'Default Template',
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 24),
              Flexible(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildSettingItem(
                        'Geolocation',
                        _attendanceTemplate?['requireGeolocation'] ?? false,
                        'Required',
                        'Not Required',
                      ),
                      const SizedBox(height: 16),
                      _buildSettingItem(
                        'Selfie',
                        _attendanceTemplate?['requireSelfie'] ?? false,
                        'Required',
                        'Not Required',
                      ),
                      const SizedBox(height: 16),
                      _buildSettingItem(
                        'Late Entry',
                        _attendanceTemplate?['lateEntryAllowed'] ??
                            _attendanceTemplate?['allowLateEntry'] ??
                            true,
                        'Allowed',
                        'Not Allowed',
                      ),
                      const SizedBox(height: 16),
                      _buildSettingItem(
                        'Early Exit',
                        _attendanceTemplate?['earlyExitAllowed'] ??
                            _attendanceTemplate?['allowEarlyExit'] ??
                            true,
                        'Allowed',
                        'Not Allowed',
                      ),
                      const SizedBox(height: 16),
                      _buildSettingItem(
                        'Overtime',
                        _attendanceTemplate?['overtimeAllowed'] ??
                            _attendanceTemplate?['allowOvertime'] ??
                            true,
                        'Allowed',
                        'Not Allowed',
                      ),
                      const SizedBox(height: 16),
                      _buildSettingItem(
                        'Attendance on Holidays',
                        _attendanceTemplate?['allowAttendanceOnHolidays'] ??
                            false,
                        'Allowed',
                        'Not Allowed',
                      ),
                      const SizedBox(height: 16),
                      _buildSettingItem(
                        'Attendance on Weekly Off',
                        _attendanceTemplate?['allowAttendanceOnWeeklyOff'] ??
                            false,
                        'Allowed',
                        'Not Allowed',
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

  Widget _buildSettingItem(
    String label,
    bool value,
    String trueLabel,
    String falseLabel,
  ) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: value
                ? AppColors.success.withOpacity(0.1)
                : Colors.red.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: value ? AppColors.success : Colors.red,
              width: 1,
            ),
          ),
          child: Text(
            value ? trueLabel : falseLabel,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: value ? AppColors.success : Colors.red,
            ),
          ),
        ),
      ],
    );
  }

  /// Grace period in minutes from DB (template). Prefers [gracePeriodMinutes],
  /// then [settings.attendance.shifts[0].graceTime]. Defaults to 15 only when absent.
  int _getGracePeriodMinutes() {
    final template = _attendanceTemplate;
    if (template == null) return 15;

    // Prefer flat gracePeriodMinutes (set by backend from company settings)
    final flat = template['gracePeriodMinutes'];
    if (flat != null) {
      if (flat is int) return flat;
      final parsed = int.tryParse(flat.toString());
      if (parsed != null) return parsed;
    }

    // Fallback: nested settings.attendance.shifts[0].graceTime
    try {
      final shifts = template['settings']?['attendance']?['shifts'] as List?;
      if (shifts != null && shifts.isNotEmpty) {
        final shift = shifts[0] as Map<String, dynamic>?;
        final graceTime = shift?['graceTime'];
        if (graceTime is Map) {
          final value = graceTime['value'];
          final unit = graceTime['unit']?.toString().toLowerCase();
          final v = value is int
              ? value
              : int.tryParse(value?.toString() ?? '');
          if (v != null) {
            if (unit == 'hours') return v * 60;
            return v;
          }
        }
      }
    } catch (_) {}

    return 15;
  }

  // Helper to get working session timings for Half Day, calculated from shift times in DB
  // Session 1 leave → employee works Session 2 (last 5 hours of shift)
  // Session 2 leave → employee works Session 1 (first 5 hours of shift)
  Map<String, String>? _getWorkingSessionTimings() {
    final bool isHalfDay =
        (_attendanceData?['status'] == 'Half Day') || _halfDayLeave != null;
    if (!isHalfDay) return null;

    final session =
        _halfDayLeave?['session']?.toString().trim() ??
        _attendanceData?['session']?.toString().trim();

    if (session != '1' && session != '2') return null;

    // Get shift times from DB (template)
    final shiftStartStr = _attendanceTemplate?['shiftStartTime'] ?? '10:00';
    final shiftEndStr = _attendanceTemplate?['shiftEndTime'] ?? '19:00';

    try {
      final startParts = shiftStartStr.split(':').map(int.parse).toList();
      final startTotalMinutes = startParts[0] * 60 + startParts[1];
      const sessionDurationMinutes = 5 * 60; // 5 hours = 300 minutes

      if (session == '1') {
        // Session 1 leave: employee works Session 2 (fixed: 2:00 PM - shift end)
        // Session 2 start is fixed at 14:00 (2:00 PM), end uses shift end from DB
        return {
          'startTime': '14:00', // Fixed: 2:00 PM
          'endTime':
              shiftEndStr, // Use shift end from DB (e.g., 19:00 or 19:15)
        };
      } else if (session == '2') {
        // Session 2 leave: employee works Session 1 (first 5 hours of shift)
        final session1EndMinutes = startTotalMinutes + sessionDurationMinutes;
        final session1EndHours = session1EndMinutes ~/ 60;
        final session1EndMins = session1EndMinutes % 60;

        return {
          'startTime': shiftStartStr,
          'endTime':
              '${session1EndHours.toString().padLeft(2, '0')}:${session1EndMins.toString().padLeft(2, '0')}',
        };
      }
    } catch (e) {
      // Fallback to fixed times if calculation fails
      if (session == '1') {
        return {'startTime': '14:00', 'endTime': '19:00'};
      } else if (session == '2') {
        return {'startTime': '10:00', 'endTime': '15:00'};
      }
    }
    return null;
  }

  // Helper to determine if late
  bool _isLateCheckIn(String? punchInTime) {
    if (punchInTime == null) return false;
    try {
      final punchIn = DateTime.parse(punchInTime).toLocal();

      // For Half Day: use working session start time, otherwise use full-day shift start
      final sessionTimings = _getWorkingSessionTimings();
      final shiftStartStr =
          sessionTimings?['startTime'] ??
          _attendanceTemplate?['shiftStartTime'] ??
          "09:30";
      final parts = shiftStartStr.split(':').map(int.parse).toList();
      final gracePeriod = _getGracePeriodMinutes();

      final shiftStart = DateTime(
        punchIn.year,
        punchIn.month,
        punchIn.day,
        parts[0],
        parts[1],
      ).add(Duration(minutes: gracePeriod));

      return punchIn.isAfter(shiftStart);
    } catch (e) {
      return false;
    }
  }

  bool _isLateCheckOut(String? punchOutTime) {
    if (punchOutTime == null) return false;
    try {
      final punchOut = DateTime.parse(punchOutTime).toLocal();

      final shiftEndStr = _attendanceTemplate?['shiftEndTime'] ?? "18:30";
      final parts = shiftEndStr.split(':').map(int.parse).toList();

      final shiftEnd = DateTime(
        punchOut.year,
        punchOut.month,
        punchOut.day,
        parts[0],
        parts[1],
      );

      return punchOut.isAfter(shiftEnd);
    } catch (e) {
      return false;
    }
  }

  bool _isEarlyCheckOut(String? punchOutTime) {
    if (punchOutTime == null) return false;
    try {
      final punchOut = DateTime.parse(punchOutTime).toLocal();

      final shiftEndStr = _attendanceTemplate?['shiftEndTime'] ?? "18:30";
      final parts = shiftEndStr.split(':').map(int.parse).toList();

      final shiftEnd = DateTime(
        punchOut.year,
        punchOut.month,
        punchOut.day,
        parts[0],
        parts[1],
      );

      return punchOut.isBefore(shiftEnd);
    } catch (e) {
      return false;
    }
  }

  bool _isLowWorkHours(num? workHours) {
    if (workHours == null) return false;
    // Assuming < 9 hours is low
    return workHours < 9;
  }

  /*
  // OLD calendar day builder - kept for reference (uses different color logic)
  Widget _buildCustomDay(DateTime day) {
    // ... old implementation ...
  }
  */

  Widget _buildCustomDay(DateTime day) {
    if (_monthData == null) {
      // Fallback: just show the day number with today's border if month data is unavailable
      final now = DateTime.now();
      final todayOnly = DateTime(now.year, now.month, now.day);
      final dateOnly = DateTime(day.year, day.month, day.day);
      return Container(
        margin: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          border: dateOnly == todayOnly
              ? Border.all(color: AppColors.primary, width: 2)
              : null,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Center(
          child: Text('${day.day}', style: const TextStyle(fontSize: 13)),
        ),
      );
    }

    final now = DateTime.now();
    final todayOnly = DateTime(now.year, now.month, now.day);
    final dateStr = DateFormat('yyyy-MM-dd').format(day);

    final bool isCurrentMonth =
        day.year == _focusedDay.year && day.month == _focusedDay.month;
    final bool isToday =
        isCurrentMonth &&
        day.day == now.day &&
        day.month == now.month &&
        day.year == now.year;

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
      final bool isHoliday = _holidayDateSet.contains(dateStr);
      final int dayOfWeek = day.weekday; // 1=Mon, ..., 7=Sun

      // Week off from backend, plus force Sundays as week off
      bool isWeekOff = _weekOffDateSet.contains(dateStr);
      if (dayOfWeek == DateTime.sunday) {
        isWeekOff = true;
      }

      final bool isPresentFromBackend = _presentDateSet.contains(dateStr);
      final bool isAbsentFromBackend = _absentDateSet.contains(dateStr);

      // Dark grey text for week offs
      if (isWeekOff) {
        textColor = const Color(0xFF475569);
      }

      // Priority: Present with LeaveType (Green) > Half Day (On Leave Blue) > Holiday > Week Off > Leave without attendance (On Leave Blue) > Present > Absent > Not Marked
      final status = _dayStatusByDate[dateStr];
      final hasLeaveType = _dayLeaveTypeByDate.containsKey(dateStr);
      final isPresentStatus =
          status == 'Present' || status == 'Approved' || isPresentFromBackend;
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
      else if (_leaveDateSet.contains(dateStr)) {
        bgColor = const Color(0xFFBFDBFE); // On Leave - light blue
      }
      // 6. Present without leaveType → Green
      else if (isPresentStatus) {
        bgColor = const Color(0xFFDCFCE7); // Present - Light Green
      }
      // 7. Other attendance statuses
      else if (_dayStatusByDate.containsKey(dateStr)) {
        if (status == 'Pending') {
          bgColor = const Color(0xFFFFEDD5); // Pending - light orange
        } else if (status == 'Absent' || status == 'Rejected') {
          bgColor = const Color(0xFFFEE2E2); // Absent - light red
        } else if (status == 'On Leave') {
          bgColor = const Color(0xFFBFDBFE); // On Leave - light blue
        }
      }
      // 8. Absent from backend
      else if (isAbsentFromBackend) {
        if (!isWeekOff) {
          bgColor = const Color(0xFFFEE2E2); // Absent - light red
        }
      }
      // 9. Future dates
      else {
        final today = DateTime(now.year, now.month, now.day);
        final candidate = DateTime(day.year, day.month, day.day);
        if (candidate.isAfter(today)) {
          bgColor = const Color(0xFFE2E8F0); // Not Marked - Light grey
          textColor = const Color(0xFFCBD5E1); // Light grey text
        }
      }

      // Leave type abbreviation logic (inside isCurrentMonth block where variables are available):
      // - If Present with leaveType → Show CL/SL/HA (green background)
      // - If Half Day → Show "HA" (blue background)
      // - If Leave date without attendance → Show "L" (purple background)
      final statusForDay = _dayStatusByDate[dateStr] ?? '';
      final isPresentStatusForAbbr =
          statusForDay == 'Present' ||
          statusForDay == 'Approved' ||
          isPresentFromBackend;
      final isHalfDayStatusForAbbr =
          statusForDay == 'Half Day' ||
          statusForDay.toLowerCase() == 'half day';
      final hasLeaveTypeForAbbr = _dayLeaveTypeByDate.containsKey(dateStr);

      if (isPresentStatusForAbbr && hasLeaveTypeForAbbr) {
        // Present with leaveType → Show CL/SL/HA (green background)
        leaveTypeAbbr = AttendanceDisplayUtil.leaveTypeToAbbreviation(
          _dayLeaveTypeByDate[dateStr],
        );
      } else if (isHalfDayStatusForAbbr) {
        // Half Day → Show "HA" (blue background)
        leaveTypeAbbr = 'HA';
      } else if (_leaveDateSet.contains(dateStr) && !isPresentStatusForAbbr) {
        // Leave date without attendance → Show "L" (purple background)
        leaveTypeAbbr = 'L';
      }

      // Low work-hours indicator
      workHours = _dayWorkHoursByDate[dateStr];
      isLowHours = workHours != null && _isLowWorkHours(workHours);
      isFuture = DateTime(day.year, day.month, day.day).isAfter(todayOnly);
    }

    return Container(
      margin: const EdgeInsets.all(4), // 8px spacing between cells
      decoration: BoxDecoration(
        color: bgColor == Colors.transparent ? null : bgColor,
        borderRadius: BorderRadius.circular(8),
        border: isToday ? Border.all(color: AppColors.primary, width: 2) : null,
      ),
      child: Stack(
        children: [
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '${day.day}',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: isToday ? FontWeight.bold : FontWeight.w500,
                    color: bgColor != Colors.transparent ? textColor : null,
                  ),
                ),
                if (leaveTypeAbbr != null && leaveTypeAbbr.isNotEmpty) ...[
                  const SizedBox(height: 0),
                  Text(
                    leaveTypeAbbr,
                    style: TextStyle(
                      fontSize: 8,
                      fontWeight: FontWeight.w600,
                      color:
                          (bgColor != Colors.transparent
                                  ? textColor
                                  : const Color(0xFF1E293B))
                              .withOpacity(0.9),
                    ),
                  ),
                ],
              ],
            ),
          ),
          // Red dot indicator for low work hours (top-left corner)
          if (isLowHours && !isFuture && bgColor != Colors.transparent)
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
              const SizedBox(width: 8),
              Text(
                DateFormat('MMMM yyyy').format(_focusedDay),
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
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
                    // Allow navigation to future months to see holidays/weekends
                    final newFocusedDay = DateTime(_focusedDay.year, m, 1);
                    setState(() {
                      _focusedDay = newFocusedDay;
                      _selectedDay = newFocusedDay;
                    });
                    // Immediately fetch month data for the new month (includes future holidays/weekends)
                    _fetchMonthData(newFocusedDay.year, m);
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
                    // Allow navigation to future months to see holidays/weekends
                    final newFocusedDay = DateTime(y, _focusedDay.month, 1);
                    setState(() {
                      _focusedDay = newFocusedDay;
                      _selectedDay = newFocusedDay;
                    });
                    // Immediately fetch month data for the new year/month (includes future holidays/weekends)
                    _fetchMonthData(y, _focusedDay.month);
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
    // Ensure we always have today's attendance data when Mark Attendance tab is visible
    // Check if _attendanceData is for today, if not, fetch it
    final now = DateTime.now();
    final todayStr = now.toIso8601String().split('T')[0];
    // If we don't have attendance data or it's for a different date, fetch today's data
    if (_attendanceData == null ||
        (_attendanceData?['date'] != null &&
            !_attendanceData!['date'].toString().startsWith(todayStr))) {
      // Fetch today's attendance status in the background
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _tabController?.index == 0) {
          _fetchAttendanceStatus(date: DateTime.now());
        }
      });
    }

    return RefreshIndicator(
      onRefresh: _refreshData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionHeader(
              DateFormat('MMM dd, yyyy').format(DateTime.now()),
            ),
            const SizedBox(height: 12),
            _buildAttendanceCard(),
            const SizedBox(height: 24),
            const Text(
              'Recent Activity',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 12),
            _buildHistoryList(limit: 5),
          ],
        ),
      ),
    );
  }

  Widget _buildHistoryTab() {
    return RefreshIndicator(
      onRefresh: _refreshData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
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
                key: ValueKey(
                  '${_focusedDay.year}-${_focusedDay.month}',
                ), // Force rebuild when month/year changes
                firstDay: DateTime(2020),
                lastDay: DateTime.now().add(
                  const Duration(days: 730),
                ), // Allow 2 years in future
                focusedDay: _focusedDay,
                selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
                onDaySelected: (selectedDay, focusedDay) {
                  // Allow selecting future dates to view holidays/weekends (but can't mark attendance)
                  setState(() {
                    _selectedDay = selectedDay;
                    _focusedDay = focusedDay;
                  });
                  // Fetch attendance status for selected day (will be null for future dates, which is fine)
                  _fetchAttendanceStatus(date: selectedDay);
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
                  final now = DateTime.now();
                  final currentMonthStart = DateTime(now.year, now.month, 1);
                  final incomingMonthStart = DateTime(
                    focusedDay.year,
                    focusedDay.month,
                    1,
                  );
                  // TableCalendar can fire onPageChanged on first build with wrong month (e.g. January); ignore that so we stay on current month
                  if (!_calendarInitialPageHandled) {
                    _calendarInitialPageHandled = true;
                    if (incomingMonthStart != currentMonthStart) {
                      setState(() {
                        _focusedDay = DateTime(now.year, now.month, now.day);
                        _selectedDay = DateTime(now.year, now.month, now.day);
                      });
                      _fetchMonthData(now.year, now.month);
                      return;
                    }
                  }
                  // Allow navigation to future months to see holidays/weekends
                  setState(() {
                    _focusedDay = focusedDay;
                    // Reset selected day to first day of the new month when swiping
                    _selectedDay = DateTime(
                      focusedDay.year,
                      focusedDay.month,
                      1,
                    );
                  });
                  _fetchMonthData(focusedDay.year, focusedDay.month);
                },
              ),
            ),
            const SizedBox(height: 12),
            _buildStatusLegend(),
            const SizedBox(height: 16),
            const Text(
              'Attendance History',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            _buildHistoryList(),
            if (_totalPages > 1 &&
                _activeFilter != 'All' &&
                _activeFilter != 'This Month' &&
                _activeFilter != 'This Week') ...[
              const SizedBox(height: 24),
              _buildPaginationControls(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPaginationControls() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Previous button
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: _page > 1 ? () => _fetchHistory(page: _page - 1) : null,
            color: _page > 1 ? AppColors.primary : Colors.grey,
          ),
          const SizedBox(width: 8),
          // Page numbers
          Row(
            mainAxisSize: MainAxisSize.min,
            children: List.generate(
              _totalPages.clamp(0, 10), // Show max 10 pages
              (index) {
                final pageNum = index + 1;
                final isCurrentPage = pageNum == _page;
                return GestureDetector(
                  onTap: () => _fetchHistory(page: pageNum),
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: isCurrentPage
                          ? AppColors.primary
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isCurrentPage
                            ? AppColors.primary
                            : Colors.grey.shade300,
                      ),
                    ),
                    child: Text(
                      '$pageNum',
                      style: TextStyle(
                        color: isCurrentPage
                            ? Colors.white
                            : AppColors.textPrimary,
                        fontWeight: isCurrentPage
                            ? FontWeight.bold
                            : FontWeight.normal,
                        fontSize: 12,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(width: 8),
          // Next button
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: _page < _totalPages
                ? () => _fetchHistory(page: _page + 1)
                : null,
            color: _page < _totalPages ? AppColors.primary : Colors.grey,
          ),
        ],
      ),
    );
  }

  Widget _buildStatusLegend() {
    return Wrap(
      spacing: 12,
      runSpacing: 8,
      children: [
        _legendItem(const Color(0xFFDCFCE7), 'Present'),
        // Use light red circle for Absent, matching cell background
        _legendItem(const Color(0xFFFEE2E2), 'Absent'),
        // Use the same soft yellow as the calendar cell background for Holiday
        _legendItem(const Color(0xFFFEF3C7), 'Holiday'),
        _legendItem(const Color(0xFFE9D5FF), 'Weekend'),
        _legendItem(const Color(0xFFBFDBFE), 'On Leave'),
        // No need Pending / Not Marked labels in History legend
        // Low Work Hours with red dot
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: const Color(0xFFDCFCE7), // Present background
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Container(
                  width: 6,
                  height: 6,
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 4),
            const Text('Low Work Hours', style: TextStyle(fontSize: 10)),
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
        leading: const MenuIconButton(),
        title: const Text('Attendance'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
          unselectedLabelColor: Colors.black,
          indicatorSize: TabBarIndicatorSize.tab,
          labelPadding: const EdgeInsets.symmetric(horizontal: 8),
          indicator: BoxDecoration(
            color: AppColors.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(6),
          ),
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
                // Fetch month data if needed for the selected filter
                if (value == 'All' ||
                    value == 'This Month' ||
                    value == 'This Week' ||
                    value == 'Late' ||
                    value == 'Low Hours') {
                  final now = DateTime.now();
                  _fetchMonthData(now.year, now.month);
                }
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
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: Colors.black,
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

    // For the Mark Attendance card, we ALWAYS use TODAY's date (not _focusedDay)
    // This ensures check-in/check-out buttons always work for today, regardless of History calendar selection
    // Mark Attendance tab always shows today's attendance, so no need to check past/future dates
    // (we already fetch today's data in _fetchAttendanceStatus)
    // If _attendanceData is null, it means no attendance marked for today yet (show check-in button)
    // We don't need to check past/future dates since this tab is always for today

    // Extract Status first
    String status = _attendanceData?['status'] ?? 'Not Marked';

    final isCheckedIn = punchIn != null && punchOut == null;
    final isCompleted = punchIn != null && punchOut != null;

    // Check if this is admin-marked attendance (status is Present/Approved but no punch times)
    final isAdminMarked =
        (punchIn == null && punchOut == null) &&
        (status == 'Present' || status == 'Approved');

    final isLate =
        _isLateCheckIn(punchIn) &&
        !(_attendanceTemplate?['allowLateEntry'] ??
            _attendanceTemplate?['lateEntryAllowed'] ??
            true);

    // Half-day helpers
    final bool isHalfDayLeave = status == 'Half Day' || _halfDayLeave != null;
    final bool hasOpenPunch = isCheckedIn;

    // PRIORITY 1: Check if On Approved Leave (session-aware: full-day blocks all day;
    // for half-day we still allow check-in/out when there is an open punch)
    bool isActuallyOnLeave = _isOnLeave;

    final bool shouldShowLeaveOnlyCard =
        isActuallyOnLeave && !(isHalfDayLeave && hasOpenPunch);

    if (shouldShowLeaveOnlyCard) {
      // Show approved leave message (session-based for half-day)
      final message =
          _leaveMessage ?? 'Your leave request is approved. Enjoy your leave.';
      return Card(
        elevation: 0,
        color: Colors.blue.withOpacity(0.05),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Colors.blue.withOpacity(0.1)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Center(
            child: Column(
              children: [
                Icon(Icons.beach_access, size: 48, color: Colors.blue),
                const SizedBox(height: 16),
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Colors.blue,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Half-day leave but outside session: show info banner and allow check-in (show punch card below)
    final halfDayCheckInAllowed = _halfDayLeave != null && _checkInAllowed;

    // Unified Non-Working Day Card (Holiday, Weekly Off)
    // Only show this if they are NOT allowed to mark attendance
    // Note: Leave is handled above with highest priority
    bool showHolidayCard = false;
    String holidayText = "Today Holiday";
    IconData holidayIcon = Icons.beach_access;
    Color holidayColor = Colors.orange;

    if (_isHoliday &&
        (_attendanceTemplate?['allowAttendanceOnHolidays'] == false ||
            _attendanceTemplate?['allowAttendanceOnHolidays'] == null)) {
      showHolidayCard = true;
      holidayText = "Today's a Holiday";
      holidayIcon = Icons.celebration;
      holidayColor = Colors.green;
    } else if (_isWeeklyOff &&
        (_attendanceTemplate?['allowAttendanceOnWeeklyOff'] == false ||
            _attendanceTemplate?['allowAttendanceOnWeeklyOff'] == null)) {
      showHolidayCard = true;
      holidayText =
          "Today is a Holiday"; // As per request: "Today is a holiday" for weekly off too
      holidayIcon = Icons.event_available;
      holidayColor = Colors.orange;
    }

    if (showHolidayCard) {
      return Card(
        elevation: 0,
        color: holidayColor.withOpacity(0.05),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: holidayColor.withOpacity(0.1)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Center(
            child: Column(
              children: [
                Icon(holidayIcon, size: 48, color: holidayColor),
                const SizedBox(height: 16),
                Text(
                  holidayText,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: holidayColor,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _isHoliday
                      ? (_holidayInfo?['name'] ?? "Public Holiday")
                      : "Relax and enjoy your day!",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: holidayColor.withOpacity(0.8)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (halfDayCheckInAllowed && (_leaveMessage ?? '').isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 16.0),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    vertical: 10,
                    horizontal: 12,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.blue.withOpacity(0.2)),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        size: 20,
                        color: Colors.blue.shade700,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _leaveMessage ?? 'Check-in allowed',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.blue.shade800,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
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
            // Show button only if not completed and not admin-marked
            if (!isCompleted && !isAdminMarked)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    // PRIORITY 1: Block if on approved leave (session-aware)
                    final bool isHalfDayLeave =
                        (_attendanceData?['status'] == 'Half Day') ||
                        _halfDayLeave != null;
                    final bool hasOpenPunch = isCheckedIn;

                    // For half-day with an open punch (checked in but not out),
                    // we must always allow showing and using the Check In/Out button.
                    final bool shouldBypassLeaveBlock =
                        isHalfDayLeave && hasOpenPunch;

                    if (isActuallyOnLeave && !shouldBypassLeaveBlock) {
                      SnackBarUtils.showSnackBar(
                        context,
                        _leaveMessage ??
                            "Your leave request is approved. Check-in/out is not allowed.",
                        isError: true,
                      );
                      return;
                    }

                    // For half-day we never hide/block checkout once user is checked in.
                    // Still honour _checkOutAllowed for non half-day scenarios only.
                    if (!shouldBypassLeaveBlock &&
                        isCheckedIn &&
                        !_checkOutAllowed) {
                      SnackBarUtils.showSnackBar(
                        context,
                        _leaveMessage ??
                            'Half-day leave Approved for Session 2. Check-out not allowed at this time.',
                        isError: true,
                      );
                      return;
                    }

                    // 1. HARD BLOCKS: Holiday/Weekly Off (if restricted)
                    if (_isHoliday &&
                        _attendanceTemplate?['allowAttendanceOnHolidays'] ==
                            false) {
                      SnackBarUtils.showSnackBar(
                        context,
                        "Today is a holiday",
                        isError: true,
                      );
                      return;
                    }

                    if (_isWeeklyOff &&
                        _attendanceTemplate?['allowAttendanceOnWeeklyOff'] ==
                            false) {
                      SnackBarUtils.showSnackBar(
                        context,
                        "Today is a holiday",
                        isError: true,
                      );
                      return;
                    }

                    // 2. Check Late Entry / Early Exit - Show alert if NOT allowed, but still allow action
                    final now = DateTime.now();
                    String? alertMessage;

                    // Check Late Entry - show alert if NOT allowed
                    if (!isCheckedIn) {
                      final allowLateEntry =
                          _attendanceTemplate?['allowLateEntry'] ??
                          _attendanceTemplate?['lateEntryAllowed'] ??
                          true; // Default to true if not specified

                      // For Half Day: use working session start time, otherwise use full-day shift start
                      final sessionTimings = _getWorkingSessionTimings();
                      final shiftStartStr =
                          sessionTimings?['startTime'] ??
                          _attendanceTemplate?['shiftStartTime'] ??
                          "09:30";
                      final parts = shiftStartStr
                          .split(':')
                          .map(int.parse)
                          .toList();
                      // Grace time from DB (template merged from company settings)
                      final gracePeriod = _getGracePeriodMinutes();
                      final shiftStartOnly = DateTime(
                        now.year,
                        now.month,
                        now.day,
                        parts[0],
                        parts[1],
                      );
                      final graceEnd = shiftStartOnly.add(
                        Duration(minutes: gracePeriod),
                      );

                      if (now.isAfter(graceEnd)) {
                        // Late minutes = minutes after grace period ended (matches backend fine logic)
                        final lateMinutes = now.difference(graceEnd).inMinutes;
                        if (allowLateEntry == false) {
                          // Show alert: shift start from DB, grace from DB
                          alertMessage = gracePeriod > 0
                              ? "You are $lateMinutes minute late. Shift start: $shiftStartStr (grace: ${gracePeriod} min)."
                              : "You are $lateMinutes minute late. Shift start time: $shiftStartStr";
                        }
                        // If allowed, proceed silently (no alert)
                      }
                    }

                    // Check Early Exit - show alert if NOT allowed
                    if (isCheckedIn && alertMessage == null) {
                      final allowEarlyExit =
                          _attendanceTemplate?['allowEarlyExit'] ??
                          _attendanceTemplate?['earlyExitAllowed'] ??
                          true; // Default to true if not specified

                      // For Half Day: use working session end time, otherwise use full-day shift end
                      final sessionTimings = _getWorkingSessionTimings();
                      final shiftEndStr =
                          sessionTimings?['endTime'] ??
                          _attendanceTemplate?['shiftEndTime'] ??
                          "18:30";
                      final parts = shiftEndStr
                          .split(':')
                          .map(int.parse)
                          .toList();
                      final shiftEnd = DateTime(
                        now.year,
                        now.month,
                        now.day,
                        parts[0],
                        parts[1],
                      );

                      if (now.isBefore(shiftEnd)) {
                        final earlyMinutes = shiftEnd.difference(now).inMinutes;
                        if (allowEarlyExit == false) {
                          // Show alert but still allow check-out
                          alertMessage =
                              "You are ${earlyMinutes} minutes early. Shift end time: ${shiftEndStr}";
                        }
                        // If allowed, proceed silently (no alert)
                      }
                    }

                    // Show alert if not allowed, but still proceed to check-in/out
                    if (alertMessage != null) {
                      await _showWarningAlert(alertMessage);
                    }

                    // Always proceed to check-in/out (alert is informational only)
                    await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => SelfieCheckInScreen(
                          template: _attendanceTemplate,
                          isCheckedIn: isCheckedIn,
                          isCompleted: isCompleted,
                        ),
                      ),
                    );
                    _initData(); // Refresh everything on return
                  },
                  icon: Icon(
                    (_attendanceTemplate?['requireSelfie'] ?? true)
                        ? Icons.camera_alt
                        : Icons.touch_app,
                  ),
                  label: Text(
                    isCheckedIn
                        ? (_attendanceTemplate?['requireSelfie'] ?? true)
                              ? 'Selfie Check Out'
                              : 'Check Out'
                        : (_attendanceTemplate?['requireSelfie'] ?? true)
                        ? 'Selfie Check In'
                        : 'Check In',
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
            // Completed State Logic or Admin-Marked Attendance
            else if (isCompleted || isAdminMarked)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Center(
                  child: Column(
                    children: [
                      Row(
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
                            status == 'Pending'
                                ? 'Waiting for Approval'
                                : status,
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
                      // Show remark if admin-marked and has remarks
                      if (isAdminMarked && _attendanceData?['remarks'] != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 8.0),
                          child: Text(
                            _attendanceData!['remarks'],
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                              fontStyle: FontStyle.italic,
                            ),
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
                      fontSize: 12,
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
    // Use month data for All, This Month, This Week, Late, and Low Hours
    // (if month data is available, it's more complete than paginated data)
    final bool useMonthData =
        _activeFilter == 'All' ||
        _activeFilter == 'This Month' ||
        _activeFilter == 'This Week' ||
        _activeFilter == 'Late' ||
        _activeFilter == 'Low Hours';

    // For month-based view: show loader until month data is loaded (avoids Jan→Feb flicker)
    if (useMonthData && _monthData == null) {
      if (_isLoadingMonthData || _isLoadingHistory) {
        return const Center(
          child: Padding(
            padding: EdgeInsets.all(24.0),
            child: CircularProgressIndicator(),
          ),
        );
      }
      // Month fetch failed or not started: show empty
    }

    if (!useMonthData && _isLoadingHistory && _historyList.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24.0),
          child: CircularProgressIndicator(),
        ),
      );
    }

    // Determine which list to display based on filter
    List<dynamic> displayList;

    if (useMonthData) {
      List<dynamic> combined = _getCombinedMonthHistory();

      final now = DateTime.now();
      final currentMonth = DateTime(now.year, now.month);
      final nextMonth = DateTime(now.year, now.month + 1);

      if (_activeFilter == 'This Month') {
        // Filter to show only current month's records
        combined = combined.where((r) {
          try {
            final d = _extractDateOnly(r['date']);
            return d.isAfter(currentMonth.subtract(const Duration(days: 1))) &&
                d.isBefore(nextMonth);
          } catch (_) {
            return false;
          }
        }).toList();
      } else if (_activeFilter == 'This Week') {
        final weekAgo = DateTime(
          now.year,
          now.month,
          now.day,
        ).subtract(const Duration(days: 7));
        combined = combined.where((r) {
          try {
            final d = _extractDateOnly(r['date']);
            return d.isAfter(weekAgo) || isSameDay(d, weekAgo);
          } catch (_) {
            return false;
          }
        }).toList();
      } else if (_activeFilter == 'Late') {
        // Filter for late check-in OR late check-out
        combined = combined.where((r) {
          // Skip non-attendance records (Absent, Holiday, Weekend, On Leave)
          if (r['status'] != null &&
              (r['status'] == 'Absent' ||
                  r['status'] == 'Holiday' ||
                  r['status'] == 'Weekend' ||
                  r['status'] == 'On Leave')) {
            return false;
          }
          // Check for late check-in OR late check-out
          return _isLateCheckIn(r['punchIn']) || _isLateCheckOut(r['punchOut']);
        }).toList();
      } else if (_activeFilter == 'Low Hours') {
        // Filter for low work hours
        combined = combined.where((r) {
          // Skip non-attendance records (Absent, Holiday, Weekend, On Leave)
          if (r['status'] != null &&
              (r['status'] == 'Absent' ||
                  r['status'] == 'Holiday' ||
                  r['status'] == 'Weekend' ||
                  r['status'] == 'On Leave')) {
            return false;
          }
          // Calculate workHours if not present
          num? workHours = r['workHours'];
          if (workHours == null &&
              r['punchIn'] != null &&
              r['punchOut'] != null) {
            try {
              final punchIn = DateTime.parse(r['punchIn']).toLocal();
              final punchOut = DateTime.parse(r['punchOut']).toLocal();
              final duration = punchOut.difference(punchIn);
              workHours = duration.inMinutes / 60.0;
            } catch (_) {
              // If parsing fails, skip this record
              return false;
            }
          }
          return _isLowWorkHours(workHours);
        }).toList();
      }
      // For 'All', show all combined data (already filtered to today)

      displayList = combined;
      // Month/Week/Late/Low Hours history is derived from loaded month data
    } else {
      // Fallback: filters work on the paginated _historyList (if month data not available)
      displayList = _historyList.where((r) {
        if (_activeFilter == 'Late Check-in' || _activeFilter == 'Late') {
          // Check for late check-in OR late check-out
          return _isLateCheckIn(r['punchIn']) || _isLateCheckOut(r['punchOut']);
        } else if (_activeFilter == 'Late Check-out' ||
            _activeFilter == 'Late Out') {
          return _isLateCheckOut(r['punchOut']);
        } else if (_activeFilter == 'Low Work Hours' ||
            _activeFilter == 'Low Hours') {
          return _isLowWorkHours(r['workHours']);
        }
        return true;
      }).toList();
    }

    if (limit != null) {
      displayList = displayList.take(limit).toList();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // History List
        if (displayList.isEmpty && !_isLoadingHistory)
          Center(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.history_toggle_off,
                    size: 36,
                    color: AppColors.textSecondary.withOpacity(0.5),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'No history records found',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11,
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
            separatorBuilder: (c, i) => const SizedBox(height: 6),
            itemBuilder: (context, index) {
              final record = displayList[index];
              // Safely parse date - extract date only to avoid timezone issues
              String dateStr = record['date'] ?? '';
              try {
                final d = _extractDateOnly(dateStr);
                dateStr = DateFormat('MMM dd, yyyy').format(d);
              } catch (_) {
                dateStr = 'Invalid Date';
              }

              final punchIn = record['punchIn'];
              final punchOut = record['punchOut'];
              final workHours = record['workHours'];
              final isLateIn = _isLateCheckIn(punchIn);
              final isLateOut = _isLateCheckOut(punchOut);
              final isEarlyOut = _isEarlyCheckOut(punchOut);
              final isLowHours = _isLowWorkHours(workHours);

              // Define status and tags before usage
              String status = record['status'] ?? 'Present';
              List<String> tags = [];

              final bool allowLate =
                  _attendanceTemplate?['allowLateEntry'] ??
                  _attendanceTemplate?['lateEntryAllowed'] ??
                  true;
              final bool allowEarly =
                  _attendanceTemplate?['earlyExitAllowed'] ??
                  _attendanceTemplate?['allowEarlyExit'] ??
                  true;
              final bool allowOvertime =
                  _attendanceTemplate?['overtimeAllowed'] ??
                  _attendanceTemplate?['allowOvertime'] ??
                  true;

              if (isLateIn && !allowLate) tags.add('Late In');
              if (isLateOut && !(allowOvertime || allowEarly)) {
                tags.add('Late Out');
              }
              if (isEarlyOut && !allowEarly) tags.add('Early Exit');
              if (isLowHours && !allowEarly) tags.add('Low Hrs');

              // Prefer half-day details from Leaves collection (leaveDetails)
              final leaveDetails =
                  record['leaveDetails'] as Map<String, dynamic>?;
              final leaveType =
                  (leaveDetails?['leaveType'] ?? record['leaveType'])
                      as String?;
              final session = (leaveDetails?['session'] ?? record['session'])
                  ?.toString();
              String displayStatus =
                  AttendanceDisplayUtil.formatAttendanceDisplayStatus(
                    status,
                    leaveType,
                    session,
                  );
              Color statusColor = Colors.green;

              if (status == 'Pending') {
                displayStatus = 'Waiting for Approval';
                statusColor = Colors.orange;
              } else if (status == 'Absent' || status == 'Rejected') {
                statusColor = Colors.red;
              } else if (status == 'On Leave') {
                statusColor = Colors.blue;
              } else if (status == 'Half Day') {
                statusColor = Colors.purple;
              } else if (status == 'Weekend') {
                statusColor = Colors.deepPurple;
              } else if (status == 'Holiday') {
                statusColor = Colors.amber;
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

              return GestureDetector(
                onTap: () => _showAttendanceDetails(record),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
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
                                    width: 38,
                                    height: 38,
                                    margin: const EdgeInsets.only(right: 4),
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: Colors.green.withOpacity(0.5),
                                        width: 1.5,
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
                                            size: 18,
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
                                      width: 38,
                                      height: 38,
                                      margin: const EdgeInsets.only(right: 8),
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: Colors.red.withOpacity(0.5),
                                          width: 2,
                                        ),
                                        image: DecorationImage(
                                          image: NetworkImage(
                                            punchOutSelfieUrl,
                                          ),
                                          fit: BoxFit.cover,
                                        ),
                                      ),
                                    ),
                                  )
                                else
                                  const SizedBox(
                                    width: 4,
                                  ), // Spacer if no second image
                              ],
                            ),

                            // Text Info
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    dateStr,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                    ),
                                  ),
                                  const SizedBox(height: 2),

                                  // Location
                                  if (locationAddress != null)
                                    Padding(
                                      padding: const EdgeInsets.only(
                                        bottom: 2.0,
                                      ),
                                      child: Row(
                                        children: [
                                          Icon(
                                            Icons.location_on,
                                            size: 9,
                                            color: Colors.grey[600],
                                          ),
                                          const SizedBox(width: 2),
                                          Expanded(
                                            child: Text(
                                              locationAddress,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: TextStyle(
                                                fontSize: 9,
                                                color: Colors.grey[600],
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),

                                  // Status Badge & Tags
                                  Wrap(
                                    spacing: 3,
                                    runSpacing: 2,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 4,
                                          vertical: 1,
                                        ),
                                        decoration: BoxDecoration(
                                          color: statusColor.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(
                                            3,
                                          ),
                                        ),
                                        child: Text(
                                          displayStatus,
                                          style: TextStyle(
                                            color: statusColor,
                                            fontSize: 9,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      ...tags.map(
                                        (tag) => Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 4,
                                            vertical: 1,
                                          ),
                                          decoration: BoxDecoration(
                                            color: Colors.orange.withOpacity(
                                              0.1,
                                            ),
                                            borderRadius: BorderRadius.circular(
                                              3,
                                            ),
                                          ),
                                          child: Text(
                                            tag,
                                            style: const TextStyle(
                                              color: Colors.orange,
                                              fontSize: 9,
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
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            "In: ${_formatTime(record['punchIn'])}",
                            style: const TextStyle(fontSize: 11),
                          ),
                          Text(
                            "Out: ${_formatTime(record['punchOut'])}",
                            style: const TextStyle(fontSize: 11),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    );
  }
}
