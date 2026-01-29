import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:table_calendar/table_calendar.dart';
import '../../config/app_colors.dart';
import '../../widgets/app_drawer.dart';
import '../../widgets/menu_icon_button.dart';
import '../../services/attendance_service.dart';
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
  List<dynamic> _monthAttendance = [];
  List<dynamic> _monthHolidays = [];
  DateTime _selectedDay = DateTime.now();
  DateTime _focusedDay = DateTime.now();
  String _activeFilter = 'All'; // Filter for history list

  // Template & Rule State
  Map<String, dynamic>? _attendanceTemplate;
  bool _isOnLeave = false;
  bool _isHoliday = false;
  bool _isWeeklyOff = false;
  Map<String, dynamic>? _leaveInfo;
  Map<String, dynamic>? _holidayInfo;

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

  Future<void> _refreshData() async {
    // Refresh all data for the current tab
    await _fetchAttendanceStatus();
    if (_tabController?.index == 0) {
      // Mark Attendance tab - refresh status and recent history
      await _fetchHistory(refresh: true);
    } else {
      // History tab - refresh history and month data
      await _fetchHistory(refresh: true);
      await _fetchMonthData(_focusedDay.year, _focusedDay.month);
    }
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

  Future<void> _fetchHistory({bool refresh = false, int? page}) async {
    if (_isLoadingHistory) return;
    
    final pageToFetch = page ?? (refresh ? 1 : _page);

    setState(() => _isLoadingHistory = true);

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
        _totalPages = ((_totalRecords / _limit).ceil()).clamp(1, double.infinity).toInt();
        _isLoadingHistory = false;
      });
    } else {
      if (mounted) setState(() => _isLoadingHistory = false);
    }
  }

  Future<void> _fetchAttendanceStatus() async {
    // Fetch status for the currently focused day
    String formattedDate = _focusedDay.toIso8601String().split('T')[0];

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
            _isHoliday = responseBody['isHoliday'] ?? false;
            _isWeeklyOff = responseBody['isWeeklyOff'] ?? false;
            _leaveInfo = responseBody['leaveInfo'];
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
    final isLateIn = _isLateCheckIn(punchIn);
    final isLateOut = _isLateCheckOut(punchOut);
    final isEarlyOut = _isEarlyCheckOut(punchOut);
    final isLowHours = _isLowWorkHours(workHours);
    
    // Fine information
    final lateMinutes = record['lateMinutes'] as num?;
    final earlyMinutes = record['earlyMinutes'] as num?;
    final fineHours = record['fineHours'] as num?;
    final fineAmount = record['fineAmount'] as num?;
    final hasFineInfo = (lateMinutes != null && lateMinutes > 0) || 
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
        punchInAddress = punchInLoc['address'] ?? 
          '${punchInLoc['area'] ?? ''}, ${punchInLoc['city'] ?? ''}, ${punchInLoc['pincode'] ?? ''}';
        branchName = punchInLoc['branchName'] ?? record['branchName'];
      }
      if (location['punchOut'] != null) {
        final punchOutLoc = location['punchOut'];
        punchOutAddress = punchOutLoc['address'] ?? 
          '${punchOutLoc['area'] ?? ''}, ${punchOutLoc['city'] ?? ''}, ${punchOutLoc['pincode'] ?? ''}';
        if (branchName == null) {
          branchName = punchOutLoc['branchName'] ?? record['branchName'];
        }
      }
    }

    // Selfie URLs
    final punchInSelfieUrl = record['punchInSelfie'];
    final punchOutSelfieUrl = record['punchOutSelfie'];
    final bool hasPunchInSelfie = punchInSelfieUrl != null && punchInSelfieUrl.toString().startsWith('http');
    final bool hasPunchOutSelfie = punchOutSelfieUrl != null && punchOutSelfieUrl.toString().startsWith('http');

    // Status color
    Color statusColor = Colors.green;
    if (status == 'Pending') {
      statusColor = Colors.orange;
    } else if (status == 'Absent' || status == 'Rejected' || status == 'On Leave') {
      statusColor = Colors.red;
    } else if (status == 'Half Day') {
      statusColor = Colors.purple;
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
                              _buildDetailRow('Date', formattedDate, Icons.calendar_today),
                              const SizedBox(height: 16),
                              
                              // Status
                              _buildDetailRow('Status', status, Icons.info_outline, statusColor),
                              const SizedBox(height: 16),
                              
                              // Branch Name
                              if (branchName != null && branchName.isNotEmpty) ...[
                                _buildDetailRow('Branch Name', branchName, Icons.business),
                                const SizedBox(height: 16),
                              ],
                              
                              // Punch In
                              _buildDetailRow('Punch In', _formatTime(punchIn), Icons.login_rounded),
                              if (isLateIn) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: Colors.orange.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: Colors.orange),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.warning, size: 16, color: Colors.orange),
                                      const SizedBox(width: 4),
                                      Text('Late Check-in', style: TextStyle(color: Colors.orange, fontSize: 12, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                ),
                              ],
                              const SizedBox(height: 16),
                              
                              // Punch Out
                              _buildDetailRow('Punch Out', _formatTime(punchOut), Icons.logout_rounded),
                              if (isLateOut) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: Colors.blue.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: Colors.blue),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.schedule, size: 16, color: Colors.blue),
                                      const SizedBox(width: 4),
                                      Text('Late Check-out', style: TextStyle(color: Colors.blue, fontSize: 12, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                ),
                              ],
                              if (isEarlyOut) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: Colors.red.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: Colors.red),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.exit_to_app, size: 16, color: Colors.red),
                                      const SizedBox(width: 4),
                                      Text('Early Exit', style: TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                ),
                              ],
                              const SizedBox(height: 16),
                              
                              // Work Hours
                              _buildDetailRow('Work Hours', workHours != null ? '${workHours.toStringAsFixed(2)} hrs' : 'N/A', Icons.access_time),
                              if (isLowHours) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: Colors.red.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: Colors.red),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.timer_off, size: 16, color: Colors.red),
                                      const SizedBox(width: 4),
                                      Text('Low Work Hours', style: TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.bold)),
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
                                    border: Border.all(color: Colors.grey.shade300),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Icon(Icons.money_off, color: Colors.red.shade700, size: 20),
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
                                      if (lateMinutes != null && lateMinutes > 0) ...[
                                        _buildFineRow('Late Minutes', '${lateMinutes.toInt()} min', Icons.schedule, Colors.orange),
                                        const SizedBox(height: 8),
                                      ],
                                      if (earlyMinutes != null && earlyMinutes > 0) ...[
                                        _buildFineRow('Early Minutes', '${earlyMinutes.toInt()} min', Icons.exit_to_app, Colors.red),
                                        const SizedBox(height: 8),
                                      ],
                                      if (fineHours != null && fineHours > 0) ...[
                                        _buildFineRow('Fine Hours', '${(fineHours.toDouble() / 60).toStringAsFixed(2)} hrs', Icons.timer, Colors.purple),
                                        const SizedBox(height: 8),
                                      ],
                                      if (fineAmount != null && fineAmount > 0) ...[
                                        const Divider(height: 20),
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Row(
                                              children: [
                                                Icon(Icons.currency_rupee, color: Colors.red.shade700, size: 20),
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
                              if (punchInAddress != null && punchInAddress.isNotEmpty) ...[
                                _buildDetailRow('Check-in Location', punchInAddress, Icons.location_on),
                                const SizedBox(height: 16),
                              ],
                              
                              // Location - Punch Out
                              if (punchOutAddress != null && punchOutAddress.isNotEmpty) ...[
                                _buildDetailRow('Check-out Location', punchOutAddress, Icons.location_on),
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
                                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 16),
                                if (hasPunchInSelfie) ...[
                                  GestureDetector(
                                    onTap: () => _showSelfieDialog(punchInSelfieUrl, "Check-in Selfie"),
                                    child: Container(
                                      width: double.infinity,
                                      height: 300,
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: Colors.green, width: 2),
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
                                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 24),
                                ],
                                if (hasPunchOutSelfie) ...[
                                  GestureDetector(
                                    onTap: () => _showSelfieDialog(punchOutSelfieUrl, "Check-out Selfie"),
                                    child: Container(
                                      width: double.infinity,
                                      height: 300,
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: Colors.red, width: 2),
                                        image: DecorationImage(
                                          image: NetworkImage(punchOutSelfieUrl),
                                          fit: BoxFit.cover,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  const Text(
                                    'Check-out Selfie',
                                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
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
                                Icon(Icons.camera_alt_outlined, size: 64, color: Colors.grey.shade400),
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
                                color: currentPage == 0 ? AppColors.primary : Colors.grey.shade300,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              width: currentPage == 1 ? 24 : 8,
                              height: 8,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(4),
                                color: currentPage == 1 ? AppColors.primary : Colors.grey.shade300,
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

  Widget _buildDetailRow(String label, String value, IconData icon, [Color? valueColor]) {
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
              Icon(
                Icons.warning_amber_rounded,
                color: Colors.orange,
                size: 28,
              ),
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

  // Helper to determine if late
  bool _isLateCheckIn(String? punchInTime) {
    if (punchInTime == null) return false;
    try {
      final punchIn = DateTime.parse(punchInTime).toLocal();

      final shiftStartStr = _attendanceTemplate?['shiftStartTime'] ?? "09:30";
      final parts = shiftStartStr.split(':').map(int.parse).toList();
      final gracePeriod = _attendanceTemplate?['gracePeriodMinutes'] ?? 15;

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

  /// New calendar day builder aligned with dashboard calendar logic.
  /// Uses backend-provided weekOffDates / absentDates / presentDates and
  /// applies the same colors as the dashboard.
  Widget _buildCustomDay(DateTime day) {
    final now = DateTime.now();
    final dateOnly = DateTime(day.year, day.month, day.day);
    final todayOnly = DateTime(now.year, now.month, now.day);
    final bool isFuture = dateOnly.isAfter(todayOnly);

    final dateStr = DateFormat('yyyy-MM-dd').format(day);

    // Backend arrays from month data (same as dashboard)
    final weekOffDates =
        (_monthData?['weekOffDates'] as List?)?.cast<String>() ?? const [];
    final absentDates =
        (_monthData?['absentDates'] as List?)?.cast<String>() ?? const [];
    final presentDates =
        (_monthData?['presentDates'] as List?)?.cast<String>() ?? const [];
    final holidayDates =
        (_monthData?['holidayDates'] as List?)?.cast<String>() ?? const [];

    // Build a small status map from attendance records (for Half Day / On Leave etc.)
    String? statusFromRecord;
    num? workHours;
    
    // Try to find record in _monthAttendance
    dynamic record;
    try {
      record = _monthAttendance.firstWhere((r) {
        try {
          final rDate = _extractDateOnly(r['date']);
          final rDateStr = DateFormat('yyyy-MM-dd').format(rDate);
          return rDateStr == dateStr;
        } catch (_) {
          return false;
        }
      }, orElse: () => null);
    } catch (_) {
      record = null;
    }
    
    if (record != null) {
      statusFromRecord = record['status'] as String?;
      workHours = record['workHours'] as num?;
      
      // Calculate workHours from punchIn and punchOut if not available
      if (workHours == null || workHours == 0) {
        final punchIn = record['punchIn'];
        final punchOut = record['punchOut'];
        if (punchIn != null && punchOut != null) {
          try {
            final punchInTime = DateTime.parse(punchIn.toString()).toLocal();
            final punchOutTime = DateTime.parse(punchOut.toString()).toLocal();
            final duration = punchOutTime.difference(punchInTime);
            if (duration.inMinutes > 0) {
              workHours = duration.inMinutes / 60.0; // Convert to hours
            }
          } catch (e) {
            // If parsing fails, leave workHours as null
            workHours = null;
          }
        }
      }
    }

    final bool isHoliday =
        holidayDates.contains(dateStr) ||
        _monthHolidays.any(
          (h) => h['date'].toString().split('T')[0] == dateStr,
        );

    final int dayOfWeek = day.weekday % 7; // 0=Sun, 1=Mon, ..., 6=Sat

    // Week off from backend, plus force Sundays as week off
    bool isWeekOff = weekOffDates.contains(dateStr);
    if (dayOfWeek == 0) {
      isWeekOff = true;
    }

    final bool isPresentFromBackend = presentDates.contains(dateStr);
    final bool isAbsentFromBackend = absentDates.contains(dateStr);
    
    // If we have a present date but no workHours from record, try to get it from _monthData
    if ((isPresentFromBackend || statusFromRecord == 'Present' || statusFromRecord == 'Approved') && 
        workHours == null && _monthData != null && _monthData!['attendance'] != null) {
      try {
        final entry = (_monthData!['attendance'] as List).firstWhere(
          (e) {
            try {
              final d = _extractDateOnly(e['date']);
              final eDateStr = DateFormat('yyyy-MM-dd').format(d);
              return eDateStr == dateStr;
            } catch (_) {
              return false;
            }
          },
          orElse: () => null,
        );
        
        if (entry != null) {
          workHours = entry['workHours'] as num?;
          // Calculate from punchIn/punchOut if still not available
          if ((workHours == null || workHours == 0)) {
            final punchIn = entry['punchIn'];
            final punchOut = entry['punchOut'];
            if (punchIn != null && punchOut != null) {
              try {
                final punchInTime = DateTime.parse(punchIn.toString()).toLocal();
                final punchOutTime = DateTime.parse(punchOut.toString()).toLocal();
                final duration = punchOutTime.difference(punchInTime);
                if (duration.inMinutes > 0) {
                  workHours = duration.inMinutes / 60.0;
                }
              } catch (_) {
                // If parsing fails, leave workHours as null
              }
            }
          }
        }
      } catch (_) {
        // If lookup fails, leave workHours as is
      }
    }
    
    // Calculate isLowHours after all workHours lookups
    bool isLowHours = workHours != null && _isLowWorkHours(workHours);

    // Also derive low-work-hours from history list, which already uses
    // _isLowWorkHours and is known to be correct (shows "Low Hrs" tag).
    bool isLowHoursFromHistory = false;
    for (final rec in _historyList) {
      try {
        final d = _extractDateOnly(rec['date']);
        final recDateStr = DateFormat('yyyy-MM-dd').format(d);
        if (recDateStr == dateStr && _isLowWorkHours(rec['workHours'])) {
          isLowHoursFromHistory = true;
          break;
        }
      } catch (_) {
        // Ignore malformed records
      }
    }

    // Final flag: either month data OR history marks this date as low-hours.
    isLowHours = isLowHours || isLowHoursFromHistory;

    // Color selection (same as dashboard)
    // Priority: Holiday > Week Off > Present > Attendance Status > Absent > Not Marked (for future)
    Color? bgColor;
    Color textColor = const Color(0xFF1E293B);

    if (isHoliday) {
      bgColor = const Color(0xFFFEF3C7); // Holiday - Light yellow
    } else if (isWeekOff) {
      bgColor = const Color(0xFFE9D5FF); // Week Off - light purple
      textColor = const Color(0xFF475569); // Dark grey for week offs
    } else if (isPresentFromBackend ||
        statusFromRecord == 'Present' ||
        statusFromRecord == 'Approved') {
      bgColor = const Color(0xFFDCFCE7); // Present - Light Green
    } else if (statusFromRecord == 'Pending') {
      bgColor = const Color(0xFFFFEDD5); // Pending - light orange
    } else if (statusFromRecord == 'Half Day') {
      bgColor = const Color(0xFFDBEAFE); // Half Day - light blue
    } else if (statusFromRecord == 'On Leave') {
      bgColor = const Color(0xFFF3E8FF); // On Leave - light purple
    } else if (isAbsentFromBackend && !isFuture) {
      // Only past working days without attendance = Absent (backend is already
      // restricted to dates up to today)
      bgColor = const Color(0xFFFEE2E2); // Absent - light red
    } else if (isFuture) {
      // Future working day without attendance record - show as "Not Marked"
      bgColor = const Color(0xFFE2E8F0); // Not Marked - Light grey
      textColor = const Color(0xFFCBD5E1); // Light grey text
    } else {
      // Past dates without any classification stay transparent
      bgColor = null;
    }

    // Use rectangle shape like dashboard calendar (not circle)
    // Add margin to create spacing between cells (8px like dashboard)
    return Container(
      margin: const EdgeInsets.all(
        4,
      ), // 4px margin on all sides = 8px spacing between cells
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
        border: dateOnly == todayOnly
            ? Border.all(color: AppColors.primary, width: 2)
            : null,
      ),
      child: Stack(
        children: [
          Center(
            child: Text(
              '${day.day}',
              style: TextStyle(
                fontSize: 13,
                fontWeight: dateOnly == todayOnly
                    ? FontWeight.bold
                    : FontWeight.w500,
                color: bgColor != null ? textColor : null,
              ),
            ),
          ),
          // Red dot indicator for low work hours (top-left corner)
          // Show red dot if: low hours, not future, and has a background color (present/attendance record)
          if (isLowHours &&
              !isFuture &&
              bgColor != null &&
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
    return RefreshIndicator(
      onRefresh: _refreshData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionHeader(
              DateFormat('MMM dd, yyyy').format(_focusedDay),
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
                firstDay: DateTime(2020),
                lastDay: DateTime.now().add(const Duration(days: 365)),
                focusedDay: _focusedDay,
                selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
                onDaySelected: (selectedDay, focusedDay) {
                  setState(() {
                    _selectedDay = selectedDay;
                    _focusedDay = focusedDay;
                  });
                  _fetchAttendanceStatus(); // Fetch status for selected day
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
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            _buildHistoryList(),
            if (_totalPages > 1) ...[
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
            onPressed: _page > 1
                ? () => _fetchHistory(page: _page - 1)
                : null,
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
        _legendItem(const Color(0xFFEF4444), 'Absent'),
        _legendItem(const Color(0xFFFEF3C7), 'Holiday'),
        _legendItem(const Color(0xFFE9D5FF), 'Weekend'),
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
          //hide this icon
          if (1==1)
            IconButton(
              icon: const Icon(Icons.settings),
              onPressed: _showAttendanceSettings,
              tooltip: 'Attendance Settings',
            ),
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

    // For the Mark Attendance card, we ALWAYS compare against NOW

    final now = DateTime.now();
    final dateOnlyFocused = DateTime(
      _focusedDay.year,
      _focusedDay.month,
      _focusedDay.day,
    );
    final dateOnlyNow = DateTime(now.year, now.month, now.day);
    final isFuture = dateOnlyFocused.isAfter(dateOnlyNow);
    final isPast = dateOnlyFocused.isBefore(dateOnlyNow);

    if (_attendanceData == null) {
      if (isPast) {
        return Card(
          elevation: 0,
          color: Colors.grey.withOpacity(0.05),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.grey.withOpacity(0.1)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Center(
              child: Column(
                children: [
                  Icon(
                    Icons.history_toggle_off,
                    size: 48,
                    color: Colors.grey[400],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    "Attendance Closed",
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "You did not mark attendance for this day.",
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
          ),
        );
      } else if (isFuture) {
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
                  const Icon(Icons.upcoming, size: 48, color: Colors.blue),
                  SizedBox(height: 16),
                  Text(
                    "Future Date",
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.blue,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    "You cannot mark attendance for future dates.",
                    style: TextStyle(color: Colors.blue),
                  ),
                ],
              ),
            ),
          ),
        );
      }
    }

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

    // PRIORITY 1: Check if On Approved Leave (highest priority - overrides all other rules)
    // This check must happen FIRST before any other attendance validations
    bool isActuallyOnLeave = _isOnLeave || status == 'On Leave';

    if (isActuallyOnLeave) {
      // Show approved leave message - this takes precedence over all other rules
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
                const Text(
                  "Your leave request is approved. Enjoy your leave.",
                  textAlign: TextAlign.center,
                  style: TextStyle(
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
            // Show button only if not completed and not admin-marked
            if (!isCompleted && !isAdminMarked)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    // PRIORITY 1: Block if on approved leave (highest priority)
                    if (isActuallyOnLeave) {
                      SnackBarUtils.showSnackBar(
                        context,
                        "Your leave request is approved. Check-in/out is not allowed.",
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
                      final allowLateEntry = _attendanceTemplate?['allowLateEntry'] ??
                          _attendanceTemplate?['lateEntryAllowed'] ??
                          true; // Default to true if not specified

                      final shiftStartStr =
                          _attendanceTemplate?['shiftStartTime'] ?? "09:30";
                      final parts = shiftStartStr
                          .split(':')
                          .map(int.parse)
                          .toList();
                      final gracePeriod =
                          _attendanceTemplate?['gracePeriodMinutes'] ?? 15;
                      final shiftStart = DateTime(
                        now.year,
                        now.month,
                        now.day,
                        parts[0],
                        parts[1],
                      ).add(Duration(minutes: gracePeriod));

                      if (now.isAfter(shiftStart)) {
                        final lateMinutes = now.difference(shiftStart).inMinutes;
                        if (allowLateEntry == false) {
                          // Show alert but still allow check-in
                          alertMessage =
                              "Late entry not allowed. You are ${lateMinutes} minute(s) late. Shift start time: ${shiftStartStr}";
                        }
                        // If allowed, proceed silently (no alert)
                      }
                    }

                    // Check Early Exit - show alert if NOT allowed
                    if (isCheckedIn && alertMessage == null) {
                      final allowEarlyExit = _attendanceTemplate?['allowEarlyExit'] ??
                          _attendanceTemplate?['earlyExitAllowed'] ??
                          true; // Default to true if not specified

                      final shiftEndStr =
                          _attendanceTemplate?['shiftEndTime'] ?? "18:30";
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
                              "Early exit not allowed. You are ${earlyMinutes} minute(s) early. Shift end time: ${shiftEndStr}";
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
                        builder: (context) =>
                            SelfieCheckInScreen(template: _attendanceTemplate),
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
    if (_isLoadingHistory && _historyList.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24.0),
          child: CircularProgressIndicator(),
        ),
      );
    }
    
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
        try {
          final d = _extractDateOnly(r['date']);
          final weekAgoDate = DateTime(
            weekAgo.year,
            weekAgo.month,
            weekAgo.day,
          );
          final recordDate = DateTime(d.year, d.month, d.day);
          return recordDate.isAfter(weekAgoDate) ||
              recordDate.isAtSameMomentAs(weekAgoDate);
        } catch (_) {
          return false;
        }
      }).toList();
    } else if (_activeFilter == 'This Month') {
      final now = DateTime.now();
      filteredList = _historyList.where((r) {
        try {
          final d = _extractDateOnly(r['date']);
          return d.year == now.year && d.month == now.month;
        } catch (_) {
          return false;
        }
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
                      fontSize: 12,
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

              return GestureDetector(
                onTap: () => _showAttendanceDetails(record),
                child: Container(
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
              ),
              );
            },
          ),

      ],
    );
  }
}
