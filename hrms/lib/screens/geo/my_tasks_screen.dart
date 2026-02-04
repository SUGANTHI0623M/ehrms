// hrms/lib/screens/geo/my_tasks_screen.dart
import 'package:flutter/material.dart';
import 'package:hrms/config/app_colors.dart';
import 'package:hrms/models/task.dart';
import 'package:hrms/services/task_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:hrms/services/customer_service.dart'; // Assuming you have a Customer service
import 'package:intl/intl.dart';
import 'package:hrms/screens/geo/select_source_destination_screen.dart';
import 'package:hrms/widgets/app_drawer.dart';
import 'package:hrms/widgets/menu_icon_button.dart';

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

class _MyTasksScreenState extends State<MyTasksScreen> {
  String? _loggedInStaffId;
  List<Task> _tasks = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadLoggedInStaffId();
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
      case TaskStatus.assigned:
        return Colors.green.shade600;
      case TaskStatus.pending:
        return Colors.orange.shade600;
      case TaskStatus.scheduled:
        return Colors.blue.shade600;
      case TaskStatus.reopened:
        return Colors.teal.shade600;
      case TaskStatus.completed:
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
      case TaskStatus.inProgress:
        return 'In Progress';
      case TaskStatus.completed:
        return 'Done';
      case TaskStatus.cancelled:
        return 'Cancelled';
      case TaskStatus.reopened:
        return 'Reopened';
      default:
        return 'Ready';
    }
  }

  Widget _buildRequirementChip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color, width: 0.5),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w500,
        ),
        overflow: TextOverflow.ellipsis,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        leading: const MenuIconButton(),
        title: const Text(
          'My Tasks',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(Icons.notifications_rounded, color: AppColors.primary),
            onPressed: () {
              // Handle notifications
            },
          ),
          IconButton(
            icon: Icon(Icons.person_rounded, color: AppColors.primary),
            onPressed: () {
              // Handle profile
            },
          ),
        ],
      ),
      drawer: AppDrawer(
        currentIndex: widget.dashboardTabIndex ?? 1,
        onNavigateToIndex: widget.onNavigateToIndex,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
          ? Center(child: Text(_errorMessage!))
          : _tasks.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.assignment_turned_in_rounded,
                    size: 100,
                    color: Colors.grey.shade300,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No tasks assigned yet',
                    style: TextStyle(fontSize: 18, color: Colors.grey.shade600),
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: _tasks.length,
              itemBuilder: (context, index) {
                final task = _tasks[index];
                final isCompleted = task.status == TaskStatus.completed;
                final statusColor = _getStatusChipColor(task.status);

                return Card(
                  margin: const EdgeInsets.only(bottom: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(
                      color: isCompleted
                          ? Colors.grey.shade300
                          : statusColor.withOpacity(0.7),
                      width: isCompleted ? 1 : 2,
                    ),
                  ),
                  elevation: 4,
                  shadowColor: Colors.black.withOpacity(0.1),
                  color: isCompleted ? Colors.grey.shade100 : AppColors.surface,
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Opacity(
                      opacity: isCompleted ? 0.7 : 1.0,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Header Section
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  'Task #${task.taskId}',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                    color: Colors.grey.shade700,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 8),
                              _buildRequirementChip(
                                _statusLabel(task.status),
                                statusColor,
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            task.taskTitle,
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: isCompleted
                                  ? Colors.grey.shade700
                                  : AppColors.textPrimary,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const Divider(height: 24, thickness: 0.5),

                          // Customer Info
                          if (task.customer != null) ...[
                            Row(
                              children: [
                                Icon(
                                  Icons.person_rounded,
                                  size: 18,
                                  color: Colors.grey.shade600,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    task.customer!.customerNumber != null &&
                                            task
                                                .customer!
                                                .customerNumber!
                                                .isNotEmpty
                                        ? '${task.customer!.customerName} · ${task.customer!.customerNumber}'
                                        : task.customer!.customerName,
                                    style: TextStyle(
                                      fontSize: 15,
                                      color: Colors.grey.shade800,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                          ],

                          // Destination Section
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.secondary.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.location_on_rounded,
                                  color: AppColors.secondary,
                                  size: 20,
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Destination',
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.secondary,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${task.customer?.address ?? ''}, ${task.customer?.city ?? ''}, ${task.customer?.pincode ?? ''}',
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: AppColors.text.withOpacity(
                                            0.8,
                                          ),
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Date row (single line to avoid overflow)
                          Row(
                            children: [
                              Icon(
                                Icons.calendar_today_rounded,
                                size: 16,
                                color: Colors.grey.shade600,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  DateFormat(
                                    'dd MMM yyyy',
                                  ).format(task.expectedCompletionDate),
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey.shade700,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          // Requirement Tags
                          Wrap(
                            spacing: 8.0,
                            runSpacing: 8.0,
                            children: [
                              if (task.isOtpRequired)
                                _buildRequirementChip(
                                  '✅ OTP Required',
                                  Colors.blue,
                                ),
                              if (task.isGeoFenceRequired)
                                _buildRequirementChip(
                                  '📍 Geo-Fence',
                                  Colors.purple,
                                ),
                              if (task.isPhotoRequired)
                                _buildRequirementChip(
                                  '📷 Photo',
                                  Colors.orange,
                                ),
                              if (task.isFormRequired)
                                _buildRequirementChip('📝 Form', Colors.teal),
                            ],
                          ),
                          const SizedBox(height: 20),

                          // Action Button
                          if (!isCompleted)
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) =>
                                          SelectSourceDestinationScreen(
                                            task: task,
                                          ),
                                    ),
                                  );
                                },
                                icon: const Icon(
                                  Icons.rocket_launch_rounded,
                                  color: Colors.white,
                                ),
                                label: const Text(
                                  'Start Task',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.accent,
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 14,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  elevation: 3,
                                ),
                              ),
                            )
                          else
                            Align(
                              alignment: Alignment.centerRight,
                              child: Text(
                                'Completed on ${task.completedDate != null ? DateFormat('dd MMM yyyy, h:mm a').format(task.completedDate!) : 'N/A'}',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontStyle: FontStyle.italic,
                                  color: Colors.grey.shade500,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
    );
  }
}
