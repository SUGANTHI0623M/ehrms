// hrms/lib/screens/geo/my_tasks_screen.dart
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:hrms/config/app_colors.dart';
import 'package:hrms/models/task.dart';
import 'package:hrms/services/customer_service.dart';
import 'package:hrms/services/task_service.dart';
import 'package:hrms/screens/dashboard/dashboard_screen.dart';
import 'package:hrms/screens/geo/add_task_screen.dart';
import 'package:hrms/widgets/app_drawer.dart';
import 'package:hrms/widgets/bottom_navigation_bar.dart';
import 'package:hrms/screens/geo/arrived_screen.dart';
import 'package:hrms/screens/geo/completed_task_detail_screen.dart';
import 'package:hrms/screens/geo/task_detail_screen.dart';
import 'package:intl/intl.dart';
import 'package:hrms/utils/date_display_util.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MyTasksScreen extends StatefulWidget {
  final int? dashboardTabIndex;
  final void Function(int index)? onNavigateToIndex;

  const MyTasksScreen({
    super.key,
    this.dashboardTabIndex,
    this.onNavigateToIndex,
  });

  @override
  State<MyTasksScreen> createState() => _MyTasksScreenState();
}

class _MyTasksScreenState extends State<MyTasksScreen>
    with WidgetsBindingObserver, SingleTickerProviderStateMixin {
  String? _loggedInStaffId;
  List<Task> _tasks = [];
  bool _isLoading = true;
  String? _errorMessage;

  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  DateTime? _filterStartDate;
  DateTime? _filterEndDate;
  bool _isSelectionMode = false;
  final Set<String> _selectedTaskIds = {};
  bool _exporting = false;
  bool _showFilterSection = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _tabController = TabController(length: 6, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging && mounted) setState(() {});
    });
    _loadLoggedInStaffId();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  List<Task> get _filteredTasks {
    List<Task> list = _tasks;
    final tabIndex = _tabController.index;
    switch (tabIndex) {
      case 1: // Not yet Started
        list = list
            .where(
              (t) =>
                  t.status == TaskStatus.assigned ||
                  t.status == TaskStatus.scheduled ||
                  t.status == TaskStatus.approved ||
                  t.status == TaskStatus.staffapproved,
            )
            .toList();
        break;
      case 2: // In progress
        list = list
            .where(
              (t) =>
                  t.status == TaskStatus.inProgress ||
                  t.status == TaskStatus.arrived ||
                  t.status == TaskStatus.exited,
            )
            .toList();
        break;
      case 3: // Pending
        list = list.where((t) => t.status == TaskStatus.pending).toList();
        break;
      case 4: // Completed
        list = list
            .where(
              (t) =>
                  t.status == TaskStatus.completed ||
                  t.status == TaskStatus.waitingForApproval,
            )
            .toList();
        break;
      case 5: // Rejected
        list = list.where((t) => t.status == TaskStatus.rejected).toList();
        break;
    }
    // Search: customer name, task name, taskId
    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.trim().toLowerCase();
      list = list.where((t) {
        if (t.taskId.toLowerCase().contains(q)) return true;
        if (t.taskTitle.toLowerCase().contains(q)) return true;
        if (t.customer != null &&
            t.customer!.customerName.toLowerCase().contains(q))
          return true;
        return false;
      }).toList();
    }
    // Date filter (expectedCompletionDate or completedDate in range)
    if (_filterStartDate != null || _filterEndDate != null) {
      list = list.where((t) {
        final DateTime checkDate = t.completedDate ?? t.expectedCompletionDate;
        if (_filterStartDate != null &&
            checkDate.isBefore(
              DateTime(
                _filterStartDate!.year,
                _filterStartDate!.month,
                _filterStartDate!.day,
              ),
            ))
          return false;
        if (_filterEndDate != null) {
          final endOfDay = DateTime(
            _filterEndDate!.year,
            _filterEndDate!.month,
            _filterEndDate!.day,
            23,
            59,
            59,
          );
          if (checkDate.isAfter(endOfDay)) return false;
        }
        return true;
      }).toList();
    }
    return list;
  }

  void _refreshFilters() {
    setState(() {
      _searchQuery = _searchController.text;
    });
  }

  Widget _buildFilterSection() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Search with Refresh on the right
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Customer name, task name, task ID',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    filled: true,
                    fillColor: Colors.white,
                  ),
                  onChanged: (_) =>
                      setState(() => _searchQuery = _searchController.text),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.refresh),
                tooltip: 'Refresh',
                onPressed: () {
                  _refreshFilters();
                  _fetchTasks();
                },
                style: IconButton.styleFrom(
                  backgroundColor: Colors.white,
                  side: BorderSide(color: Colors.grey.shade300),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.calendar_today, size: 16),
                  label: Text(
                    _filterStartDate == null
                        ? 'Start date'
                        : DateFormat('dd/MM/yy').format(_filterStartDate!),
                    style: const TextStyle(fontSize: 12),
                  ),
                  onPressed: () async {
                    final d = await showDatePicker(
                      context: context,
                      initialDate: _filterStartDate ?? DateTime.now(),
                      firstDate: DateTime(2020),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (d != null) setState(() => _filterStartDate = d);
                  },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.calendar_today, size: 16),
                  label: Text(
                    _filterEndDate == null
                        ? 'End date'
                        : DateFormat('dd/MM/yy').format(_filterEndDate!),
                    style: const TextStyle(fontSize: 12),
                  ),
                  onPressed: () async {
                    final d = await showDatePicker(
                      context: context,
                      initialDate:
                          _filterEndDate ?? _filterStartDate ?? DateTime.now(),
                      firstDate: _filterStartDate ?? DateTime(2020),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (d != null) setState(() => _filterEndDate = d);
                  },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Escape a CSV field: wrap in quotes and double any internal quotes.
  String _csvEscape(String value) {
    final cleaned = value
        .replaceAll('"', '""')
        .replaceAll('\r', ' ')
        .replaceAll('\n', ' ');
    return '"$cleaned"';
  }

  Future<void> _exportSelectedToCsv() async {
    final ids = _selectedTaskIds.toList();
    if (ids.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select at least one task to export')),
      );
      return;
    }
    final toExport = _filteredTasks
        .where((t) => ids.contains(t.id ?? t.taskId))
        .toList();
    if (toExport.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No selected tasks in current filter')),
      );
      return;
    }
    setState(() => _exporting = true);
    try {
      final dir = await getTemporaryDirectory();
      final file = File(
        '${dir.path}/tasks_export_${DateFormat('yyyyMMdd_HHmm').format(DateTime.now())}.csv',
      );
      // CSV with S.No, Task ID, Customer Name, Address only (table format for Google Sheets)
      const csvHeader = 'S.No,Task ID,Customer Name,Address\r\n';
      final sb = StringBuffer(csvHeader);
      int sno = 1;
      for (final t in toExport) {
        final customerName = t.customer?.customerName ?? '';
        final address = t.customer != null
            ? '${t.customer!.address}, ${t.customer!.city}, ${t.customer!.pincode}'
                  .trim()
            : '';
        final row = [
          sno++,
          t.taskId,
          _csvEscape(customerName),
          _csvEscape(address),
        ];
        sb.write(row.join(','));
        sb.write('\r\n');
      }
      // UTF-8 BOM so Google Sheets / Excel opens without corruption
      final content = sb.toString();
      final bytes = <int>[0xEF, 0xBB, 0xBF, ...utf8.encode(content)];
      await file.writeAsBytes(bytes);
      await OpenFilex.open(file.path);
      if (mounted) {
        setState(() {
          _isSelectionMode = false;
          _selectedTaskIds.clear();
          _exporting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Exported ${toExport.length} task(s)')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _exporting = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Export failed: $e')));
      }
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    if (state == AppLifecycleState.resumed && mounted) {
      _refreshWhenReturning();
    }
  }

  void _refreshWhenReturning() {
    if (_loggedInStaffId != null || _tasks.isNotEmpty) {
      _fetchTasks();
    }
  }

  Future<void> _loadLoggedInStaffId() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userString = prefs.getString('user');
      if (userString == null || userString.isEmpty) {
        if (mounted) {
          setState(() {
            _isLoading = false;
            _errorMessage = 'User not logged in.';
          });
        }
        return;
      }
      Map<String, dynamic>? userData;
      try {
        userData = jsonDecode(userString) as Map<String, dynamic>?;
      } catch (_) {
        if (mounted) {
          setState(() {
            _isLoading = false;
            _errorMessage = 'Invalid user data.';
          });
        }
        return;
      }
      if (userData == null) {
        if (mounted) {
          setState(() {
            _isLoading = false;
            _errorMessage = 'User not logged in.';
          });
        }
        return;
      }
      // API returns id and staffId (staffId = assigned-to-me for tasks)
      final staffId = userData['staffId'] ?? userData['_id'] ?? userData['id'];
      if (staffId != null) {
        if (mounted) {
          setState(() {
            _loggedInStaffId = staffId is String ? staffId : staffId.toString();
          });
        }
      }
      debugPrint('[MyTasks] staffId for tasks: $_loggedInStaffId');
      await _fetchTasks();
    } catch (e, st) {
      debugPrint('[MyTasks] _loadLoggedInStaffId error: $e\n$st');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Failed to load: ${e.toString()}';
        });
      }
    }
  }

  Future<void> _fetchTasks() async {
    if (!mounted) return;
    try {
      List<Task> assignedTasks;
      if (_loggedInStaffId != null && _loggedInStaffId!.isNotEmpty) {
        debugPrint('[MyTasks] Fetching tasks for staff: $_loggedInStaffId');
        assignedTasks = await TaskService().getAssignedTasks(_loggedInStaffId!);
      } else {
        debugPrint('[MyTasks] No staffId, fetching all tasks');
        assignedTasks = await TaskService().getAllTasks();
      }

      if (!mounted) return;
      List<Task> tasksWithCustomer = [];
      for (var task in assignedTasks) {
        if (task.customerId != null && task.customerId!.isNotEmpty) {
          try {
            final customer = await CustomerService().getCustomerById(
              task.customerId!,
            );
            tasksWithCustomer.add(task.copyWith(customer: customer));
          } catch (_) {
            tasksWithCustomer.add(task);
          }
        } else {
          tasksWithCustomer.add(task);
        }
        if (!mounted) return;
      }

      if (mounted) {
        setState(() {
          _tasks = tasksWithCustomer;
          _isLoading = false;
          _errorMessage = null;
        });
      }
    } catch (e, st) {
      debugPrint('[MyTasks] Error: $e\n$st');
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load tasks';
          _isLoading = false;
        });
      }
    }
  }

  Color _getStatusChipColor(TaskStatus status) {
    switch (status) {
      case TaskStatus.pending:
        return Colors.orange.shade600;
      case TaskStatus.inProgress:
        return Colors.blue.shade600;
      case TaskStatus.arrived:
        return Colors.indigo.shade600;
      case TaskStatus.exited:
        return Colors.amber.shade700;
      case TaskStatus.completed:
        return Colors.green.shade600;
      case TaskStatus.waitingForApproval:
        return Colors.amber.shade600;
      case TaskStatus.assigned:
        return Colors.green.shade600;
      case TaskStatus.scheduled:
        return Colors.blue.shade600;
      case TaskStatus.approved:
      case TaskStatus.staffapproved:
        return Colors.teal.shade600;
      case TaskStatus.rejected:
        return Colors.red.shade600;
      case TaskStatus.reopened:
        return Colors.teal.shade600;
      case TaskStatus.cancelled:
        return Colors.grey.shade600;
      case TaskStatus.onlineReady:
        return Colors.grey.shade600;
      default:
        return Colors.grey.shade600;
    }
  }

  String _statusLabel(TaskStatus status) {
    switch (status) {
      case TaskStatus.assigned:
        return 'Assigned';
      case TaskStatus.pending:
        return 'Pending';
      case TaskStatus.scheduled:
        return 'Scheduled';
      case TaskStatus.approved:
      case TaskStatus.staffapproved:
        return 'Approved';
      case TaskStatus.inProgress:
        return 'In Progress';
      case TaskStatus.arrived:
        return 'Arrived';
      case TaskStatus.exited:
        return 'Exited';
      case TaskStatus.waitingForApproval:
        return 'Waiting for Approval';
      case TaskStatus.completed:
        return 'Completed';
      case TaskStatus.rejected:
        return 'Rejected';
      case TaskStatus.cancelled:
        return 'Cancelled';
      case TaskStatus.reopened:
        return 'Reopened';
      case TaskStatus.onlineReady:
        return 'Ready';
      default:
        return 'Unknown';
    }
  }

  Widget _buildTaskProgressBar() {
    final total = _tasks.length;
    if (total == 0) return const SizedBox.shrink();
    final completed = _tasks
        .where((t) => t.status == TaskStatus.completed)
        .length;
    final inProgress = _tasks
        .where((t) => t.status == TaskStatus.inProgress)
        .length;
    final pending = _tasks
        .where(
          (t) =>
              t.status == TaskStatus.pending ||
              t.status == TaskStatus.assigned ||
              t.status == TaskStatus.scheduled ||
              t.status == TaskStatus.staffapproved,
        )
        .length;
    final percentage = total > 0 ? (completed / total * 100).round() : 0;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '$percentage% complete',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
              ),
              Flexible(
                child: Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  alignment: WrapAlignment.end,
                  children: [
                    _progressChip('$completed done', Colors.green.shade600),
                    _progressChip(
                      '$inProgress in progress',
                      Colors.blue.shade600,
                    ),
                    _progressChip('$pending pending', Colors.orange.shade600),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: total > 0 ? completed / total : 0.0,
              backgroundColor: Colors.grey.shade300,
              valueColor: AlwaysStoppedAnimation<Color>(Colors.green.shade600),
              minHeight: 6,
            ),
          ),
        ],
      ),
    );
  }

  Widget _progressChip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.5), width: 0.5),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  Widget _buildRequirementChip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color, width: 0.5),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w500,
        ),
        overflow: TextOverflow.ellipsis,
      ),
    );
  }

  Widget _buildTaskCardDetailRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 14, color: Colors.grey.shade600),
          const SizedBox(width: 6),
          Text(
            '$label: ',
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey.shade700,
              fontWeight: FontWeight.w500,
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 12,
                color: Colors.black87,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (Navigator.of(context).canPop()) {
          Navigator.of(context).pop();
        } else {
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => const DashboardScreen()),
            (route) => false,
          );
        }
      },
      child: Scaffold(
        drawer: const AppDrawer(),
        backgroundColor: Colors.white,
        appBar: AppBar(
          leading: _isSelectionMode
              ? IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => setState(() {
                    _isSelectionMode = false;
                    _selectedTaskIds.clear();
                  }),
                )
              : Builder(
                  builder: (ctx) => IconButton(
                    icon: const Icon(Icons.menu_rounded),
                    onPressed: () => Scaffold.of(ctx).openDrawer(),
                  ),
                ),
          title: Text(
            _isSelectionMode
                ? 'Select tasks to export (${_selectedTaskIds.length})'
                : 'My Tasks',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          centerTitle: true,
          elevation: 0,
          bottom: _isSelectionMode
              ? null
              : TabBar(
                  controller: _tabController,
                  isScrollable: true,
                  padding: EdgeInsets.zero,
                  tabAlignment: TabAlignment.start,
                  labelColor: AppColors.primary,
                  unselectedLabelColor: Colors.black,
                  indicatorColor: AppColors.primary,
                  indicatorSize: TabBarIndicatorSize.tab,
                  labelPadding: const EdgeInsets.symmetric(horizontal: 12),
                  labelStyle: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                  unselectedLabelStyle: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                  indicator: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  tabs: const [
                    Tab(text: 'All Tasks'),
                    Tab(text: 'Not yet Started'),
                    Tab(text: 'In progress'),
                    Tab(text: 'Pending'),
                    Tab(text: 'Completed'),
                    Tab(text: 'Rejected'),
                  ],
                ),
          actions: [
            if (_isSelectionMode)
              TextButton(
                onPressed: _exporting ? null : _exportSelectedToCsv,
                child: _exporting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Export'),
              )
            else ...[
              IconButton(
                icon: Icon(
                  _showFilterSection
                      ? Icons.filter_alt
                      : Icons.filter_alt_outlined,
                  color: _showFilterSection ? AppColors.primary : null,
                ),
                tooltip: _showFilterSection ? 'Hide filter' : 'Show filter',
                onPressed: () =>
                    setState(() => _showFilterSection = !_showFilterSection),
              ),
              IconButton(
                icon: Icon(
                  Icons.download_outlined,
                  color: Colors.grey.shade400,
                ),
                tooltip: 'Export disabled',
                onPressed: null,
              ),
            ],
          ],
        ),
        body: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _errorMessage != null
            ? Center(child: Text(_errorMessage!))
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (!_isSelectionMode && _tasks.isNotEmpty)
                    _buildTaskProgressBar(),
                  if (!_isSelectionMode && _showFilterSection)
                    _buildFilterSection(),
                  Expanded(
                    child: _tasks.isEmpty
                        ? RefreshIndicator(
                            onRefresh: _fetchTasks,
                            child: SingleChildScrollView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              child: SizedBox(
                                height:
                                    MediaQuery.of(context).size.height * 0.6,
                                child: Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.assignment_turned_in_rounded,
                                        size: 80,
                                        color: Colors.grey.shade300,
                                      ),
                                      const SizedBox(height: 12),
                                      Text(
                                        'No tasks assigned yet',
                                        style: TextStyle(
                                          fontSize: 16,
                                          color: Colors.grey.shade600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          )
                        : _filteredTasks.isEmpty
                        ? RefreshIndicator(
                            onRefresh: _fetchTasks,
                            child: SingleChildScrollView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              child: SizedBox(
                                height:
                                    MediaQuery.of(context).size.height * 0.5,
                                child: Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.filter_list_off,
                                        size: 64,
                                        color: Colors.grey.shade400,
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        'No tasks match filters',
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: Colors.grey.shade600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _fetchTasks,
                            child: ListView.builder(
                              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                              itemCount: _filteredTasks.length,
                              itemBuilder: (context, index) {
                                final task = _filteredTasks[index];
                                final taskKey = task.id ?? task.taskId;
                                final isCompleted =
                                    task.status == TaskStatus.completed;
                                final statusColor = _getStatusChipColor(
                                  task.status,
                                );
                                final isSelected = _selectedTaskIds.contains(
                                  taskKey,
                                );

                                return InkWell(
                                  onTap: _isSelectionMode
                                      ? () => setState(() {
                                          if (_selectedTaskIds.contains(
                                            taskKey,
                                          )) {
                                            _selectedTaskIds.remove(taskKey);
                                          } else {
                                            _selectedTaskIds.add(taskKey);
                                          }
                                        })
                                      : () {
                                          if (isCompleted) {
                                            Navigator.push(
                                              context,
                                              MaterialPageRoute(
                                                builder: (context) =>
                                                    CompletedTaskDetailScreen(
                                                      task: task,
                                                    ),
                                              ),
                                            );
                                          } else if (task.status ==
                                              TaskStatus.arrived) {
                                            Navigator.push(
                                              context,
                                              MaterialPageRoute(
                                                builder: (context) => ArrivedScreen(
                                                  taskMongoId: task.id,
                                                  taskId: task.taskId,
                                                  task: task,
                                                  totalDuration: Duration(
                                                    seconds:
                                                        task.tripDurationSeconds ??
                                                        0,
                                                  ),
                                                  totalDistanceKm:
                                                      task.tripDistanceKm ??
                                                      0.0,
                                                  isWithinGeofence: false,
                                                  arrivalTime:
                                                      task.arrivalTime ??
                                                      DateTime.now(),
                                                  sourceLat:
                                                      task.sourceLocation?.lat,
                                                  sourceLng:
                                                      task.sourceLocation?.lng,
                                                  sourceAddress: task
                                                      .sourceLocation
                                                      ?.address,
                                                  destLat: task
                                                      .destinationLocation
                                                      ?.lat,
                                                  destLng: task
                                                      .destinationLocation
                                                      ?.lng,
                                                  destAddress: task
                                                      .destinationLocation
                                                      ?.address,
                                                ),
                                              ),
                                            );
                                          } else {
                                            Navigator.push(
                                              context,
                                              MaterialPageRoute(
                                                builder: (context) =>
                                                    TaskDetailScreen(
                                                      task: task,
                                                    ),
                                              ),
                                            );
                                          }
                                        },
                                  borderRadius: BorderRadius.circular(14),
                                  child: Container(
                                    margin: const EdgeInsets.only(bottom: 8),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(
                                        color: isSelected
                                            ? AppColors.primary
                                            : Colors.grey.shade200,
                                        width: isSelected ? 2 : 1,
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withOpacity(0.04),
                                          blurRadius: 6,
                                          offset: const Offset(0, 2),
                                        ),
                                      ],
                                    ),
                                    child: Padding(
                                      padding: const EdgeInsets.all(12),
                                      child: Opacity(
                                        opacity: isCompleted ? 0.7 : 1.0,
                                        child: Row(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Padding(
                                              padding: const EdgeInsets.only(
                                                right: 10,
                                                top: 2,
                                              ),
                                              child: Icon(
                                                _isSelectionMode
                                                    ? (isSelected
                                                          ? Icons.check_circle
                                                          : Icons
                                                                .radio_button_unchecked)
                                                    : Icons.assignment_rounded,
                                                color: _isSelectionMode
                                                    ? (isSelected
                                                          ? AppColors.primary
                                                          : Colors.grey)
                                                    : AppColors.primary,
                                                size: _isSelectionMode
                                                    ? 22
                                                    : 20,
                                              ),
                                            ),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                children: [
                                                  Row(
                                                    mainAxisAlignment:
                                                        MainAxisAlignment
                                                            .spaceBetween,
                                                    children: [
                                                      Expanded(
                                                        child: Text(
                                                          'Task #${task.taskId}',
                                                          style:
                                                              const TextStyle(
                                                                fontSize: 14,
                                                                fontWeight:
                                                                    FontWeight
                                                                        .bold,
                                                                color: Colors
                                                                    .black,
                                                              ),
                                                          maxLines: 1,
                                                          overflow: TextOverflow
                                                              .ellipsis,
                                                        ),
                                                      ),
                                                      Text(
                                                        DateDisplayUtil.formatShortDate(
                                                          task.expectedCompletionDate,
                                                        ),
                                                        style: TextStyle(
                                                          fontSize: 10,
                                                          color: Colors
                                                              .grey
                                                              .shade700,
                                                          fontWeight:
                                                              FontWeight.w500,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                  const SizedBox(height: 4),
                                                  Text(
                                                    task.taskTitle,
                                                    style: const TextStyle(
                                                      fontSize: 15,
                                                      fontWeight:
                                                          FontWeight.bold,
                                                      color: Colors.black,
                                                    ),
                                                    maxLines: 1,
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                  ),
                                                  const SizedBox(height: 4),
                                                  Row(
                                                    children: [
                                                      Icon(
                                                        Icons
                                                            .calendar_today_outlined,
                                                        size: 12,
                                                        color: Colors
                                                            .grey
                                                            .shade600,
                                                      ),
                                                      const SizedBox(width: 4),
                                                      Flexible(
                                                        child: Text(
                                                          'Expected: ${DateDisplayUtil.formatShortDate(task.expectedCompletionDate)}',
                                                          style: TextStyle(
                                                            fontSize: 11,
                                                            color: Colors
                                                                .grey
                                                                .shade800,
                                                            fontWeight:
                                                                FontWeight.w500,
                                                          ),
                                                          overflow: TextOverflow
                                                              .ellipsis,
                                                        ),
                                                      ),
                                                      if (isCompleted &&
                                                          task.completedDate !=
                                                              null) ...[
                                                        const SizedBox(
                                                          width: 12,
                                                        ),
                                                        Flexible(
                                                          child: Text(
                                                            'Completed: ${DateDisplayUtil.formatShortDate(task.completedDate!)}',
                                                            style: TextStyle(
                                                              fontSize: 11,
                                                              color: Colors
                                                                  .grey
                                                                  .shade800,
                                                              fontWeight:
                                                                  FontWeight
                                                                      .w500,
                                                            ),
                                                            overflow:
                                                                TextOverflow
                                                                    .ellipsis,
                                                          ),
                                                        ),
                                                      ],
                                                    ],
                                                  ),
                                                  if (task.customer !=
                                                      null) ...[
                                                    const SizedBox(height: 4),
                                                    _buildTaskCardDetailRow(
                                                      icon: Icons
                                                          .person_outline_rounded,
                                                      label: 'Customer',
                                                      value:
                                                          task
                                                                      .customer!
                                                                      .customerNumber !=
                                                                  null &&
                                                              task
                                                                  .customer!
                                                                  .customerNumber!
                                                                  .isNotEmpty
                                                          ? '${task.customer!.customerName} · ${task.customer!.customerNumber}'
                                                          : task
                                                                .customer!
                                                                .customerName,
                                                    ),
                                                  ],
                                                  _buildTaskCardDetailRow(
                                                    icon: Icons
                                                        .location_on_outlined,
                                                    label: 'Destination',
                                                    value:
                                                        task
                                                            .destinationLocation
                                                            ?.displayAddress ??
                                                        '${task.customer?.address ?? ''}, ${task.customer?.city ?? ''}, ${task.customer?.pincode ?? ''}'
                                                            .trim(),
                                                  ),
                                                  const SizedBox(height: 8),
                                                  Row(
                                                    mainAxisAlignment:
                                                        MainAxisAlignment
                                                            .spaceBetween,
                                                    children: [
                                                      Expanded(
                                                        child: Wrap(
                                                          spacing: 6,
                                                          runSpacing: 4,
                                                          children: [
                                                            if (task
                                                                .isOtpRequired)
                                                              _buildRequirementChip(
                                                                'OTP',
                                                                Colors.blue,
                                                              ),
                                                            if (task
                                                                .isGeoFenceRequired)
                                                              _buildRequirementChip(
                                                                'Geo',
                                                                Colors.purple,
                                                              ),
                                                            if (task
                                                                .isPhotoRequired)
                                                              _buildRequirementChip(
                                                                'Photo',
                                                                Colors.orange,
                                                              ),
                                                            if (task
                                                                .isFormRequired)
                                                              _buildRequirementChip(
                                                                'Form',
                                                                Colors.teal,
                                                              ),
                                                          ],
                                                        ),
                                                      ),
                                                      Container(
                                                        padding:
                                                            const EdgeInsets.symmetric(
                                                              horizontal: 8,
                                                              vertical: 4,
                                                            ),
                                                        decoration: BoxDecoration(
                                                          color: statusColor
                                                              .withOpacity(0.1),
                                                          borderRadius:
                                                              BorderRadius.circular(
                                                                12,
                                                              ),
                                                        ),
                                                        child: Text(
                                                          _statusLabel(
                                                            task.status,
                                                          ),
                                                          style: TextStyle(
                                                            fontSize: 11,
                                                            fontWeight:
                                                                FontWeight.w600,
                                                            color: statusColor,
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
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                  ),
                ],
              ),
        bottomNavigationBar: AppBottomNavigationBar(
          currentIndex: 0,
          onTap: (index) {
            Navigator.of(context).pushAndRemoveUntil(
              MaterialPageRoute(
                builder: (_) =>
                    DashboardScreen(initialIndex: index.clamp(0, 4)),
              ),
              (route) => false,
            );
          },
        ),
        floatingActionButton:
            _loggedInStaffId != null && _loggedInStaffId!.isNotEmpty
            ? SizedBox(
                height: 40,
                child: FloatingActionButton.extended(
                  foregroundColor: Colors.white,
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) =>
                            AddTaskScreen(staffId: _loggedInStaffId!),
                      ),
                    ).then((_) => _fetchTasks());
                  },
                  label: const Text(
                    'Add Task',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  icon: const Icon(Icons.add, size: 18),
                  backgroundColor: AppColors.primary,
                ),
              )
            : null,
      ),
    );
  }
}
