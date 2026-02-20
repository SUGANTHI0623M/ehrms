import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:table_calendar/table_calendar.dart';
import '../../config/app_colors.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/menu_icon_button.dart';
import '../../services/attendance_service.dart';
import '../../services/auth_service.dart';
import '../../utils/attendance_display_util.dart';
import '../attendance/selfie_checkin_screen.dart';
import '../../utils/snackbar_utils.dart';

class AttendanceScreen extends StatefulWidget {
  final int initialTabIndex;
  final int? dashboardTabIndex;
  final void Function(int index)? onNavigateToIndex;

  /// When true, this screen is the active tab (e.g. user switched to Attendance). Used to refresh once on open.
  final bool? isActiveTab;

  const AttendanceScreen({
    super.key,
    this.initialTabIndex = 0,
    this.dashboardTabIndex,
    this.onNavigateToIndex,
    this.isActiveTab,
  });

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen>
    with SingleTickerProviderStateMixin {
  TabController? _tabController;
  Map<String, dynamic>? _attendanceData;
  final AttendanceService _attendanceService = AttendanceService();
  final AuthService _authService = AuthService();

  // History State
  List<dynamic> _historyList = [];
  int _page = 1;
  int _totalPages = 1;
  int _totalRecords = 0;
  bool _isLoadingHistory = false;
  final int _limit = 10;

  /// Recent activity: always today + last 5 days. Not affected by History tab month change.
  List<dynamic> _recentActivityList = [];

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

  /// Branch data from /attendance/today (status, geofence) for check-in/out validation.
  Map<String, dynamic>? _branchData;
  bool _attendanceStatusFetched =
      false; // true only after first fetch completes (avoids flashing "not mapped")
  bool?
  _staffHasAttendanceTemplate; // from profile/staff collection at load (null = not yet checked)
  bool _retryingTemplateFetch = false; // avoid infinite retry
  bool _isOnLeave = false;
  String? _leaveMessage;
  Map<String, dynamic>? _halfDayLeave;
  bool _checkInAllowed = true;
  bool _checkOutAllowed = true;
  bool _isHoliday = false;
  bool _isWeeklyOff = false;
  Map<String, dynamic>? _holidayInfo;
  bool? _checkedInFromApi;

  /// Company fine calculation (company.settings.payroll.fineCalculation) fetched by staff's businessId.
  Map<String, dynamic>? _fineCalculation;

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

  @override
  void didUpdateWidget(AttendanceScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    // When user opens/switches to Attendance tab, refresh once
    if (widget.isActiveTab == true && oldWidget.isActiveTab != true) {
      _refreshData(forceRefresh: true);
    }
  }

  Future<void> _initData({bool forceRefresh = false}) async {
    if (!mounted) return;
    // Clear lists and show loader so we never show stale data (avoids Jan → Feb flicker)
    setState(() {
      _historyList = [];
      _monthData = null;
      _isLoadingHistory = true;
      _isLoadingMonthData = true;
      _retryingTemplateFetch = false;
    });
    if (!mounted) return;
    // Check staff's template id from profile first (from staffs collection at login) so we never show "Template not mapped" then refresh to check-in/out
    await _updateStaffHasAttendanceTemplate();
    if (!mounted) return;
    // Always fetch today's attendance status on init (for Mark Attendance tab)
    await _fetchAttendanceStatus(date: DateTime.now());
    if (!mounted) return;
    await _fetchHistory(refresh: true);
    if (!mounted) return;
    await _fetchMonthData(
      _focusedDay.year,
      _focusedDay.month,
      forceRefresh: forceRefresh,
    );
    if (!mounted) return;
    await _fetchFineCalculation();
  }

  Future<void> _fetchFineCalculation() async {
    try {
      final result = await _attendanceService.getFineCalculation();
      if (!mounted) return;
      if (result['success'] == true && result['data'] != null) {
        setState(
          () => _fineCalculation = result['data'] as Map<String, dynamic>?,
        );
      } else {
        setState(() => _fineCalculation = null);
      }
    } catch (_) {
      if (mounted) setState(() => _fineCalculation = null);
    }
  }

  /// Load from profile whether staff has attendanceTemplateId (staffs collection). Used to avoid showing "Template not mapped" then refreshing to punch.
  Future<void> _updateStaffHasAttendanceTemplate() async {
    try {
      final profileResult = await _authService.getProfile();
      if (!mounted) return;
      final staffData =
          profileResult['data']?['staffData'] as Map<String, dynamic>?;
      final templateId = staffData?['attendanceTemplateId'];
      final hasTemplate =
          templateId != null &&
          (templateId is String
              ? templateId.toString().trim().isNotEmpty
              : true);
      if (mounted) setState(() => _staffHasAttendanceTemplate = hasTemplate);
    } catch (_) {
      if (mounted) setState(() => _staffHasAttendanceTemplate = null);
    }
  }

  Future<void> _refreshData({bool forceRefresh = false}) async {
    if (!mounted) return;
    if (forceRefresh) {
      _attendanceService.clearCachesForRefresh();
    }
    final year = _focusedDay.year;
    final month = _focusedDay.month;
    if (_tabController?.index == 0) {
      await _fetchAttendanceStatus(date: DateTime.now());
      if (!mounted) return;
      await _fetchHistory(refresh: true);
      if (!mounted) return;
      await _fetchMonthData(year, month, forceRefresh: forceRefresh);
    } else {
      await _fetchAttendanceStatus(date: _focusedDay);
      if (!mounted) return;
      await _fetchHistory(refresh: true);
      if (!mounted) return;
      await _fetchMonthData(year, month, forceRefresh: forceRefresh);
    }
    if (!mounted) return;
    await _fetchFineCalculation();
  }

  Future<void> _fetchMonthData(
    int year,
    int month, {
    bool forceRefresh = false,
  }) async {
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
    final result = await _attendanceService.getMonthAttendance(
      year,
      month,
      forceRefresh: forceRefresh,
    );
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
              // Use date-only from API so calendar day matches backend (avoids timezone shifting e.g. Feb 4 UTC becoming Feb 3 in UTC-)
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
              if (dayYear != year || dayMonth != month) continue;

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
      // Recent activity: always today + last 5 days. Only update when fetching current month.
      final nowDate = DateTime.now();
      if (year == nowDate.year &&
          month == nowDate.month &&
          _monthData != null) {
        final combined = _getCombinedMonthHistory();
        final todayOnly = DateTime(nowDate.year, nowDate.month, nowDate.day);
        _recentActivityList = combined.where((e) {
          try {
            final d = _extractDateOnly(e['date']);
            final dateOnly = DateTime(d.year, d.month, d.day);
            final diff = todayOnly.difference(dateOnly).inDays;
            return diff >= 0 && diff < 6; // today and last 5 days
          } catch (_) {
            return false;
          }
        }).toList();
        _recentActivityList.sort((a, b) {
          DateTime da = _extractDateOnly(a['date']);
          DateTime db = _extractDateOnly(b['date']);
          return db.compareTo(da); // newest first
        });
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
    final dateToFetch = date ?? (DateTime.now());
    String formattedDate = dateToFetch.toIso8601String().split('T')[0];
    bool didRetry = false;

    try {
      final result = await _attendanceService.getAttendanceByDate(
        formattedDate,
      );

      if (result['success'] && mounted) {
        final responseBody = result['data'];
        Map<String, dynamic>? data;
        Map<String, dynamic>? template;

        if (responseBody != null) {
          if (responseBody is Map<String, dynamic> &&
              responseBody.containsKey('data')) {
            data = responseBody['data'];
            template = responseBody['template'];
            final branch = responseBody['branch'];

            setState(() {
              _attendanceTemplate = template;
              _branchData = branch is Map<String, dynamic> ? branch : null;
              _isOnLeave = responseBody['isOnLeave'] ?? false;
              _leaveMessage = responseBody['leaveMessage'] as String?;
              _halfDayLeave =
                  responseBody['halfDayLeave'] as Map<String, dynamic>?;
              _checkInAllowed = responseBody['checkInAllowed'] ?? true;
              _checkOutAllowed = responseBody['checkOutAllowed'] ?? true;
              _isHoliday = responseBody['isHoliday'] ?? false;
              _isWeeklyOff = responseBody['isWeeklyOff'] ?? false;
              _holidayInfo = responseBody['holidayInfo'];
              _checkedInFromApi = responseBody['checkedIn'] as bool?;
            });
          } else {
            data = responseBody;
            if (responseBody is Map<String, dynamic> &&
                responseBody.containsKey('checkedIn')) {
              setState(
                () => _checkedInFromApi = responseBody['checkedIn'] as bool?,
              );
            }
          }
        }

        if (mounted) setState(() => _attendanceData = data);

        // Staff has template id but response had no template (e.g. first request failed) — retry once so we don't show "Template not mapped" then refresh to punch
        if (mounted &&
            _attendanceTemplate == null &&
            _staffHasAttendanceTemplate == true &&
            !_retryingTemplateFetch) {
          didRetry = true;
          setState(() => _retryingTemplateFetch = true);
          await _fetchAttendanceStatus(date: dateToFetch);
        }
      }
    } finally {
      if (mounted && !didRetry) setState(() => _attendanceStatusFetched = true);
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
    String displayStatus = AttendanceDisplayUtil.formatAttendanceDisplayStatus(
      status,
      leaveType,
      session,
    );
    if (status == 'Pending') {
      displayStatus = 'Waiting for Approval';
    }
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
        lateMinutes != null ||
        earlyMinutes != null ||
        (fineHours != null && fineHours > 0) ||
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
        branchName ??= punchOutLoc['branchName'] ?? record['branchName'];
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
                                    _formatHalfDaySessionLabel(session),
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
                                _formatWorkHoursWithUnits(
                                  workHours is num ? workHours as num? : null,
                                ),
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
                                      if (lateMinutes != null) ...[
                                        _buildFineRow(
                                          'Late Minutes',
                                          '${lateMinutes.toInt()} min',
                                          Icons.schedule,
                                          Colors.orange,
                                        ),
                                        const SizedBox(height: 8),
                                      ],
                                      if (earlyMinutes != null) ...[
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

                              // Location - Punch In (only when location is present)
                              if (punchInAddress != null &&
                                  punchInAddress.trim().isNotEmpty) ...[
                                _buildDetailRow(
                                  'Check-in Location',
                                  punchInAddress,
                                  Icons.location_on,
                                ),
                                const SizedBox(height: 16),
                              ],

                              // Location - Punch Out (only when location is present)
                              if (punchOutAddress != null &&
                                  punchOutAddress.trim().isNotEmpty) ...[
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

  Future<void> _showWarningAlert(
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
        final Color iconColor = isLate
            ? const Color(0xFFFF9800)
            : isEarly
            ? const Color(0xFF2196F3)
            : AppColors.warning;

        return Dialog(
          backgroundColor: Colors.transparent,
          child: Material(
            color: Colors.transparent,
            child: Container(
              constraints: const BoxConstraints(maxWidth: 340),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Icon in light bubble
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
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
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
                      color: AppColors.error,
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

  /// Shows a popup alert for check-in/check-out validation failures (blocks marking attendance).
  /// Uses the same UI style as the "You are late" / "You are early" dialog.
  Future<void> _showValidationAlert(String message) async {
    if (!mounted) return;
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        const String title = 'Cannot mark attendance';
        const IconData iconData = Icons.warning_amber_rounded;
        final Color iconColor = AppColors.error;

        return Dialog(
          backgroundColor: Colors.transparent,
          child: Material(
            color: Colors.transparent,
            child: Container(
              constraints: const BoxConstraints(maxWidth: 340),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
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
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
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
                      color: AppColors.error,
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

  /// Shift start time from DB (template). Single fallback when template not loaded.
  String _getShiftStartTime() {
    return _attendanceTemplate?['shiftStartTime']?.toString().trim() ?? '09:30';
  }

  /// Shift end time from DB (template). Single fallback when template not loaded.
  String _getShiftEndTime() {
    return _attendanceTemplate?['shiftEndTime']?.toString().trim() ?? '18:30';
  }

  /// Shift start from DB only (no fallback). Use for notice message so we never show hardcoded time.
  String? _getShiftStartTimeFromDb() {
    final v = _attendanceTemplate?['shiftStartTime']?.toString().trim();
    return (v != null && v.isNotEmpty) ? v : null;
  }

  /// Shift end from DB only (no fallback). Use for notice message so we never show hardcoded time.
  String? _getShiftEndTimeFromDb() {
    final v = _attendanceTemplate?['shiftEndTime']?.toString().trim();
    return (v != null && v.isNotEmpty) ? v : null;
  }

  static String _formatHhMmForDisplay(String hhmm) {
    final parts = hhmm.split(':');
    final h = int.tryParse(parts[0].trim()) ?? 0;
    final m = parts.length > 1 ? (int.tryParse(parts[1].trim()) ?? 0) : 0;
    final hour = h % 12 == 0 ? 12 : h % 12;
    final ampm = h < 12 ? 'AM' : 'PM';
    if (m == 0) return '$hour:00 $ampm';
    return '$hour:${m.toString().padLeft(2, '0')} $ampm';
  }

  String _formatHalfDaySessionLabel(String session) {
    final b = _getHalfDaySessionBoundaries();
    if (b == null) {
      return session == '1'
          ? 'Session 1 (First Half)'
          : 'Session 2 (Second Half)';
    }
    if (session == '1') {
      return 'Session 1 (${_formatHhMmForDisplay(b['session1Start']!)} – ${_formatHhMmForDisplay(b['session1End']!)})';
    }
    return 'Session 2 (${_formatHhMmForDisplay(b['session2Start']!)} – ${_formatHhMmForDisplay(b['session2End']!)})';
  }

  // Half-day session boundaries from shift: equal halves. Session 1 = first (total/2) hrs, Session 2 = next (total/2) hrs.
  // E.g. 10:00–19:00 (9h) → Session 1 = 10:00–14:30, Session 2 = 14:30–19:00. Matches backend getHalfDaySessionBoundaries.
  Map<String, String>? _getHalfDaySessionBoundaries() {
    final shiftStartStr = _getShiftStartTimeFromDb();
    final shiftEndStr = _getShiftEndTimeFromDb();
    if (shiftStartStr == null || shiftEndStr == null) return null;
    try {
      final startParts = shiftStartStr.split(':').map(int.parse).toList();
      final endParts = shiftEndStr.split(':').map(int.parse).toList();
      int startTotalMinutes =
          startParts[0] * 60 + (startParts.length > 1 ? startParts[1] : 0);
      int endTotalMinutes =
          endParts[0] * 60 + (endParts.length > 1 ? endParts[1] : 0);
      if (endTotalMinutes <= startTotalMinutes) endTotalMinutes += 24 * 60;
      final durationMinutes = endTotalMinutes - startTotalMinutes;
      final halfMinutes = durationMinutes ~/ 2;
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
    } catch (e) {
      return null;
    }
  }

  // Helper to get working session timings for Half Day (when employee is working, not on leave).
  // Session 1 leave → employee works Session 2. Session 2 leave → employee works Session 1.
  Map<String, String>? _getWorkingSessionTimings() {
    final bool isHalfDay =
        (_attendanceData?['status'] == 'Half Day') || _halfDayLeave != null;
    if (!isHalfDay) return null;

    final session =
        _halfDayLeave?['session']?.toString().trim() ??
        _attendanceData?['session']?.toString().trim();

    if (session != '1' && session != '2') return null;

    final b = _getHalfDaySessionBoundaries();
    if (b == null) return null;

    if (session == '1') {
      return {'startTime': b['session2Start']!, 'endTime': b['session2End']!};
    }
    if (session == '2') {
      return {'startTime': b['session1Start']!, 'endTime': b['session1End']!};
    }
    return null;
  }

  /// For half-day Session 1 leave (employee works Session 2): no grace. Otherwise use template grace.
  int _getGracePeriodMinutesForLateCheckIn() {
    final session =
        _halfDayLeave?['session']?.toString().trim() ??
        _attendanceData?['session']?.toString().trim();
    if (session == '1') return 0; // Session 2 working: no grace
    return _getGracePeriodMinutes();
  }

  // Helper to determine if late
  bool _isLateCheckIn(String? punchInTime) {
    if (punchInTime == null) return false;
    try {
      final punchIn = DateTime.parse(punchInTime).toLocal();

      // For Half Day: use working session start time, otherwise use full-day shift start from DB
      final sessionTimings = _getWorkingSessionTimings();
      final shiftStartStr =
          sessionTimings?['startTime'] ?? _getShiftStartTime();
      final parts = shiftStartStr.split(':').map(int.parse).toList();
      final gracePeriod = _getGracePeriodMinutesForLateCheckIn();

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

      final shiftEndStr = _getShiftEndTime();
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

      final shiftEndStr = _getShiftEndTime();
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

  /// Formats work hours (value from API is in minutes) with unit "min" / "mins".
  String _formatWorkHoursWithUnits(num? workHours) {
    if (workHours == null) return 'N/A';
    final mins = workHours.toDouble();
    final m = mins.round();
    if (m == 0) return '0 mins';
    return '$m min${m == 1 ? '' : 's'}';
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
      else if (_leaveDateSet.contains(dateStr)) {
        bgColor = const Color(0xFFBFDBFE); // On Leave - light blue
      }
      // 6. Present without leaveType → Green
      else if (isPresentStatus) {
        bgColor = const Color(0xFFDCFCE7); // Present - Light Green
      }
      // 7. Other attendance statuses (Pending treated as Absent). Show red when status is Absent in attendances collection.
      else if (_dayStatusByDate.containsKey(dateStr)) {
        if (status == 'Pending' || isAbsentStatus || status == 'Rejected') {
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
    // Today's attendance is fetched only on: screen init (_initData), tab switch (listener), and pull-to-refresh.
    // Do NOT fetch inside build — it caused repeated /attendance/today calls and "Too many requests".
    return RefreshIndicator(
      onRefresh: () => _refreshData(forceRefresh: true),
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
            _buildRecentActivityList(),
          ],
        ),
      ),
    );
  }

  Widget _buildHistoryTab() {
    return RefreshIndicator(
      onRefresh: () => _refreshData(forceRefresh: true),
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

  /// Builds formula text from company.settings.payroll.fineCalculation (fetched by businessId).
  String get _fineCalculationFormulaText {
    final fc = _fineCalculation;
    if (fc == null) return 'Fine formula: (loading…)';
    final formula = fc['formula'];
    if (formula != null && formula.toString().trim().isNotEmpty) {
      return formula.toString().trim();
    }
    final method =
        fc['calculationMethod'] ?? fc['calculationType'] ?? 'shiftBased';
    final rules = fc['fineRules'];
    final enabled = fc['enabled'] == true;
    final applyFines = fc['applyFines'] != false;
    final parts = <String>[
      'Fine calculation Formula: method=$method',
      'enabled=$enabled',
      'applyFines=$applyFines',
    ];
    if (rules is List && rules.isNotEmpty) {
      final ruleDesc = rules
          .map((r) => '${r['type'] ?? ''}(${r['applyTo'] ?? 'both'})')
          .join(', ');
      parts.add('rules: $ruleDesc');
    }
    return parts.join('; ');
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
                if (value == 'All' || value == 'Late' || value == 'Low Hours') {
                  final now = DateTime.now();
                  _fetchMonthData(now.year, now.month);
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(value: 'All', child: Text('All')),
                const PopupMenuItem(
                  value: 'Late',
                  child: Text('Late login / Early exit'),
                ),
                const PopupMenuItem(
                  value: 'Low Hours',
                  child: Text('Late hours'),
                ),
              ],
            ),
        ],
      ),
      drawer: AppDrawer(
        currentIndex: widget.dashboardTabIndex ?? 4,
        onNavigateToIndex: widget.onNavigateToIndex,
      ),
      body: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          //fine formula
          if (1 == 0)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              color: Colors.grey.shade100,
              child: SelectableText(
                _fineCalculationFormulaText,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade800,
                  height: 1.35,
                ),
              ),
            ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [_buildMarkAttendanceTab(), _buildHistoryTab()],
            ),
          ),
        ],
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

  /// Opens the punch in/out (selfie check-in) screen. No-op if attendance already completed or admin-marked for today.
  Future<void> _openMarkAttendanceScreen() async {
    final punchIn = _attendanceData?['punchIn'];
    final punchOut = _attendanceData?['punchOut'];
    final isCheckedIn = punchIn != null && punchOut == null;
    final isCompleted = punchIn != null && punchOut != null;
    final isAdminMarked =
        (punchIn == null && punchOut == null) &&
        ((_attendanceData?['status'] ?? '') == 'Present' ||
            (_attendanceData?['status'] ?? '') == 'Approved');

    if (isCompleted || isAdminMarked) return;

    // --- Check-in/check-out validation: show popup and block if any check fails ---
    if (_staffHasAttendanceTemplate != true) {
      await _showValidationAlert(
        'Attendance template is not assigned. Contact HR.',
      );
      return;
    }
    if (_attendanceTemplate == null) {
      await _showValidationAlert('Template not mapped. Contact HR.');
      return;
    }
    if (_branchData == null) {
      await _showValidationAlert('Branch not assigned.');
      return;
    }
    final branchStatus =
        (_branchData!['status']?.toString().trim().toUpperCase()) ?? '';
    if (branchStatus != 'ACTIVE') {
      await _showValidationAlert('Your branch is not active.');
      return;
    }
    final geofence = _branchData!['geofence'] as Map<String, dynamic>?;
    final geofenceEnabled = geofence?['enabled'] == true;
    if (!geofenceEnabled) {
      await _showValidationAlert('Geo fence is not set for your branch.');
      return;
    }
    final branchLat = geofence?['latitude'];
    final branchLng = geofence?['longitude'];
    final bool latLngSet =
        branchLat != null &&
        branchLng != null &&
        (branchLat is num ||
            (branchLat is String && branchLat.toString().trim().isNotEmpty)) &&
        (branchLng is num ||
            (branchLng is String && branchLng.toString().trim().isNotEmpty));
    if (!latLngSet) {
      await _showValidationAlert('Lat and long is not set for the branch.');
      return;
    }
    if (_attendanceTemplate!['isActive'] == false) {
      await _showValidationAlert(
        'Attendance template is not active. Contact HR.',
      );
      return;
    }
    final shiftStart = _getShiftStartTimeFromDb();
    final shiftEnd = _getShiftEndTimeFromDb();
    if (shiftStart == null ||
        shiftStart.isEmpty ||
        shiftEnd == null ||
        shiftEnd.isEmpty) {
      await _showValidationAlert('Shift timing not set. Contact HR.');
      return;
    }
    // --- End validation ---

    // Half-day leave: block check-in/out during leave half and show specific red snackbar
    final bool isSecondHalfLeave =
        _halfDayLeave != null &&
        (_halfDayLeave!['halfDayType'] == 'Second Half Day' ||
            _halfDayLeave!['halfDaySession'] == 'Second Half Day' ||
            _halfDayLeave!['session'] == '2');
    final bool isFirstHalfLeave =
        _halfDayLeave != null &&
        (_halfDayLeave!['halfDayType'] == 'First Half Day' ||
            _halfDayLeave!['halfDaySession'] == 'First Half Day' ||
            _halfDayLeave!['session'] == '1');
    if (!isCheckedIn && _isOnLeave && !_checkInAllowed) {
      final String msg = isSecondHalfLeave
          ? 'Not allowed check-in. You are on leave on second half.'
          : isFirstHalfLeave
          ? 'Not allowed check-in. You are on leave on first half.'
          : (_leaveMessage ?? 'Check-in is not allowed at this time.');
      SnackBarUtils.showSnackBar(context, msg, isError: true);
      return;
    }
    if (isCheckedIn && _isOnLeave && !_checkOutAllowed) {
      final String msg = isSecondHalfLeave
          ? 'Not allowed check-out. You are on leave on second half.'
          : isFirstHalfLeave
          ? 'Not allowed check-out. You are on leave on first half.'
          : (_leaveMessage ?? 'Check-out is not allowed at this time.');
      SnackBarUtils.showSnackBar(context, msg, isError: true);
      return;
    }

    if (_isHoliday &&
        _attendanceTemplate?['allowAttendanceOnHolidays'] == false) {
      SnackBarUtils.showSnackBar(context, "Today is a holiday", isError: true);
      return;
    }
    if (_isWeeklyOff &&
        _attendanceTemplate?['allowAttendanceOnWeeklyOff'] == false) {
      SnackBarUtils.showSnackBar(context, "Today is a holiday", isError: true);
      return;
    }

    final now = DateTime.now();
    String? alertMessage;
    if (!isCheckedIn) {
      final allowLateEntry =
          _attendanceTemplate?['allowLateEntry'] ??
          _attendanceTemplate?['lateEntryAllowed'] ??
          true;
      final sessionTimings = _getWorkingSessionTimings();
      final shiftStartStr =
          sessionTimings?['startTime'] ?? _getShiftStartTimeFromDb();
      if (shiftStartStr == null && allowLateEntry == false) {
        alertMessage = 'Shift start time not set. Contact HR.';
      } else if (shiftStartStr != null) {
        try {
          final parts = shiftStartStr.split(':').map(int.parse).toList();
          final gracePeriod = _getGracePeriodMinutesForLateCheckIn();
          final shiftStartOnly = DateTime(
            now.year,
            now.month,
            now.day,
            parts[0],
            parts[1],
          );
          final graceEnd = shiftStartOnly.add(Duration(minutes: gracePeriod));
          // Late = check-in after grace window. Late minutes always from shift start (not grace end).
          if (now.isAfter(graceEnd) && allowLateEntry == false) {
            final diffMs = now.difference(shiftStartOnly).inMilliseconds;
            final lateMinutes = (diffMs / (60 * 1000)).round().clamp(0, 999);
            alertMessage =
                "You are $lateMinutes minute${lateMinutes == 1 ? '' : 's'} late. Shift start: $shiftStartStr.";
          }
        } catch (_) {}
      }
    }
    if (isCheckedIn && alertMessage == null) {
      final allowEarlyExit =
          _attendanceTemplate?['allowEarlyExit'] ??
          _attendanceTemplate?['earlyExitAllowed'] ??
          true;
      final sessionTimings = _getWorkingSessionTimings();
      final shiftEndStr =
          sessionTimings?['endTime'] ?? _getShiftEndTimeFromDb();
      if (shiftEndStr == null && allowEarlyExit == false) {
        alertMessage = 'Shift end time not set. Contact HR.';
      } else if (shiftEndStr != null) {
        try {
          final parts = shiftEndStr.split(':').map(int.parse).toList();
          final shiftEnd = DateTime(
            now.year,
            now.month,
            now.day,
            parts[0],
            parts[1],
          );
          if (now.isBefore(shiftEnd) && allowEarlyExit == false) {
            final earlyMinutes = shiftEnd.difference(now).inMinutes;
            alertMessage =
                "You are $earlyMinutes minutes early. Shift end time: $shiftEndStr";
          }
        } catch (_) {}
      }
    }
    if (alertMessage != null) {
      final isLate = alertMessage.contains('late');
      final isEarly = alertMessage.contains('early');
      await _showWarningAlert(alertMessage, isLate: isLate, isEarly: isEarly);
    }
    if (!mounted) return;
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
    if (!mounted) return;
    // Refresh attendance screen when returning from check-in/check-out so latest punch and fine data is shown
    _attendanceService.clearCachesForRefresh();
    await _refreshData(forceRefresh: true);
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

    // Prefer API's checkedIn so we show Check Out when backend found today's check-in (handles date/timezone)
    final isCheckedIn =
        _checkedInFromApi ?? (punchIn != null && punchOut == null);
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

    // Half-day leave only when leave is approved (API sends halfDayLeave).
    // Prefer API (halfDayLeave) for which half to display so "Second Half" leave shows as "leave on second half", not first.
    final bool isHalfDayLeave = _halfDayLeave != null;
    final Object? _attendanceHalf =
        _attendanceData?['halfDaySession'] ?? _attendanceData?['session'];
    final Object? _apiHalf =
        _halfDayLeave?['halfDayType'] ??
        _halfDayLeave?['halfDaySession'] ??
        _halfDayLeave?['session'];
    final Object? _resolvedHalf = _apiHalf ?? _attendanceHalf;
    final bool _isFirstHalfLeave =
        _resolvedHalf == 'First Half Day' || _resolvedHalf == '1';
    final bool _isSecondHalfLeave =
        _resolvedHalf == 'Second Half Day' || _resolvedHalf == '2';

    // PRIORITY 1: Check if On Approved Leave.
    // Full-day leave: show leave-only card (no punch). Half-day: show leave-only card only when
    // currently in leave session (check-in and check-out both disallowed); otherwise show punch card with half-day message.
    bool isActuallyOnLeave = _isOnLeave;
    final bool inLeaveSessionNow =
        isHalfDayLeave && !_checkInAllowed && !_checkOutAllowed;
    final bool shouldShowLeaveOnlyCard =
        isActuallyOnLeave && (!isHalfDayLeave || inLeaveSessionNow);

    if (shouldShowLeaveOnlyCard) {
      // Show approved leave message: half-day → "You are on leave - First Half" / "Second Half" (based on attendance.halfDaySession / API); full-day → generic
      final String message;
      if (isHalfDayLeave && (_isFirstHalfLeave || _isSecondHalfLeave)) {
        message =
            _leaveMessage ??
            (_isFirstHalfLeave
                ? 'You are on leave - First Half'
                : 'You are on leave - Second Half');
      } else {
        message =
            _leaveMessage ??
            'Your leave request is approved. Enjoy your leave.';
      }
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

    // Loading: until fetch completed, or staff has template but we're still loading/retrying (never show "Template not mapped" then refresh to punch)
    if (!_attendanceStatusFetched ||
        (_attendanceTemplate == null && _staffHasAttendanceTemplate == true)) {
      return Card(
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: const Padding(
          padding: EdgeInsets.all(32.0),
          child: Center(
            child: SizedBox(
              width: 32,
              height: 32,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
        ),
      );
    }

    // Template not mapped: only when staff has no attendance template id (from staffs collection at login)
    if (_attendanceTemplate == null && _staffHasAttendanceTemplate != true) {
      return Card(
        elevation: 0,
        color: Colors.orange.withOpacity(0.05),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Colors.orange.withOpacity(0.2)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.schedule, size: 48, color: Colors.orange),
                const SizedBox(height: 16),
                const Text(
                  'Template not mapped. Contact HR.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Colors.orange,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
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

    final bool punchDisabled =
        isHalfDayLeave &&
        ((!isCheckedIn && !_checkInAllowed) ||
            (isCheckedIn && !_checkOutAllowed));
    return Opacity(
      opacity: punchDisabled ? 0.65 : 1.0,
      child: IgnorePointer(
        ignoring: punchDisabled,
        child: GestureDetector(
          onTap: () {
            if (!isCompleted && !isAdminMarked && !punchDisabled) {
              _openMarkAttendanceScreen();
            }
          },
          child: Card(
            elevation: 0,
            color: punchDisabled ? Colors.grey.shade100 : Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: punchDisabled
                  ? BorderSide(color: Colors.grey.shade300)
                  : BorderSide.none,
            ),
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (halfDayCheckInAllowed)
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
                          border: Border.all(
                            color: Colors.blue.withOpacity(0.2),
                          ),
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
                                // Prefer half-day session message; never show generic "Enjoy your leave" when in working half
                                (_halfDayLeave?['message']
                                                ?.toString()
                                                .trim()
                                                .isNotEmpty ==
                                            true
                                        ? _halfDayLeave!['message']!
                                              .toString()
                                              .trim()
                                        : null) ??
                                    ((_leaveMessage ?? '').trim().isNotEmpty &&
                                            !(_leaveMessage ?? '').contains(
                                              'Enjoy your leave',
                                            )
                                        ? _leaveMessage!.trim()
                                        : null) ??
                                    'Check-in allowed',
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
                  // Show button only if not completed and not admin-marked (tap card also opens screen); when punchDisabled show "You are on leave" instead
                  if (!isCompleted && !isAdminMarked)
                    SizedBox(
                      width: double.infinity,
                      child: punchDisabled
                          ? Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                color: Colors.blue.withOpacity(0.08),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: Colors.blue.withOpacity(0.2),
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  _isFirstHalfLeave
                                      ? 'You are on leave - First Half'
                                      : 'You are on leave - Second Half',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.blue.shade800,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            )
                          : ElevatedButton.icon(
                              onPressed: _openMarkAttendanceScreen,
                              icon: Icon(
                                (_attendanceTemplate?['requireSelfie'] ?? true)
                                    ? Icons.camera_alt
                                    : Icons.touch_app,
                              ),
                              label: Text(
                                isCheckedIn
                                    ? (_attendanceTemplate?['requireSelfie'] ??
                                              true)
                                          ? 'Selfie Check Out'
                                          : 'Check Out'
                                    : (_attendanceTemplate?['requireSelfie'] ??
                                          true)
                                    ? 'Selfie Check In'
                                    : 'Check In',
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: isCheckedIn
                                    ? AppColors.error
                                    : AppColors.primary,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  vertical: 12,
                                ),
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
                                      : status == 'Approved' ||
                                            status == 'Present'
                                      ? Icons.check_circle
                                      : Icons.info_outline,
                                  color: status == 'Pending'
                                      ? Colors.orange
                                      : status == 'Approved' ||
                                            status == 'Present'
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
                                        : status == 'Approved' ||
                                              status == 'Present'
                                        ? AppColors.success
                                        : Colors.blue,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            // Show remark if admin-marked and has remarks
                            if (isAdminMarked &&
                                _attendanceData?['remarks'] != null)
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
          ),
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
              if (address != null && address.trim().isNotEmpty)
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

  /// Recent activity: always today + last 5 days. Unaffected by History tab month change.
  Widget _buildRecentActivityList() {
    if (_recentActivityList.isEmpty && _isLoadingMonthData) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24.0),
          child: CircularProgressIndicator(),
        ),
      );
    }
    return _buildHistoryList(limit: 6, forceDisplayList: _recentActivityList);
  }

  Widget _buildHistoryList({int? limit, List<dynamic>? forceDisplayList}) {
    // When forceDisplayList is set (e.g. for Recent Activity), use it and skip filter logic.
    if (forceDisplayList != null) {
      final displayList = limit != null
          ? forceDisplayList.take(limit).toList()
          : List<dynamic>.from(forceDisplayList);
      return _buildHistoryListBody(displayList);
    }

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

    return _buildHistoryListBody(displayList);
  }

  Widget _buildHistoryListBody(List<dynamic> displayList) {
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

              // Extract location (only show when non-empty)
              String? locationAddress;
              if (record['location'] != null &&
                  record['location']['punchIn'] != null) {
                final addr = record['location']['punchIn']['address'];
                if (addr != null && addr.toString().trim().isNotEmpty) {
                  locationAddress = addr.toString();
                }
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
                      // Left Side: Selfie (only when present) + Info
                      Expanded(
                        child: Row(
                          children: [
                            // Selfie Images - only show circles when a photo exists (no placeholder)
                            if (hasPunchInSelfie || hasPunchOutSelfie)
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (hasPunchInSelfie)
                                    GestureDetector(
                                      onTap: () {
                                        _showSelfieDialog(
                                          punchInSelfieUrl,
                                          "Check-in Selfie",
                                        );
                                      },
                                      child: Container(
                                        width: 38,
                                        height: 38,
                                        margin: const EdgeInsets.only(right: 4),
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: Colors.green.withOpacity(
                                              0.5,
                                            ),
                                            width: 1.5,
                                          ),
                                          image: DecorationImage(
                                            image: NetworkImage(
                                              punchInSelfieUrl,
                                            ),
                                            fit: BoxFit.cover,
                                          ),
                                        ),
                                      ),
                                    ),
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
                                    ),
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
