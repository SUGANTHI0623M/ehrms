// View completed task details with task/customer info and geo track timeline (same style as TaskCompletedScreen).
import 'package:flutter/material.dart';
import 'package:hrms/config/app_colors.dart';
import 'package:hrms/models/task.dart';
import 'package:hrms/screens/geo/my_tasks_screen.dart';
import 'package:intl/intl.dart';

class _TimelineEvent {
  final DateTime time;
  final String title;
  final String subtitle;
  final IconData icon;
  final Color iconColor;

  const _TimelineEvent({
    required this.time,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.iconColor,
  });
}

class CompletedTaskDetailScreen extends StatelessWidget {
  final Task task;

  const CompletedTaskDetailScreen({super.key, required this.task});

  void _goToMyTasks(BuildContext context) {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => const MyTasksScreen()),
      (route) => false,
    );
  }

  List<_TimelineEvent> _buildTimelineEvents() {
    final events = <_TimelineEvent>[];
    final completedAt = task.completedDate ?? DateTime.now();
    final otpVerifiedAt = task.otpVerifiedAt;
    final otpDone = task.isOtpVerified == true;

    // Build events in time order (earliest first)
    if (otpDone &&
        otpVerifiedAt != null &&
        otpVerifiedAt.isBefore(completedAt)) {
      events.add(
        _TimelineEvent(
          time: otpVerifiedAt,
          title: 'OTP Verified',
          subtitle: 'Customer OTP confirmed',
          icon: Icons.verified_user_rounded,
          iconColor: Colors.blue.shade600,
        ),
      );
    }

    events.add(
      _TimelineEvent(
        time: completedAt,
        title: 'Task Completed',
        subtitle: 'Task finished successfully',
        icon: Icons.check_circle_rounded,
        iconColor: AppColors.primary,
      ),
    );

    return events;
  }

  Widget _buildTimeline(BuildContext context) {
    final events = _buildTimelineEvents();
    if (events.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Text(
          'No track details available for this task.',
          style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
        ),
      );
    }
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            for (int i = 0; i < events.length; i++) ...[
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: events[i].iconColor,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: events[i].iconColor.withOpacity(0.4),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
              ),
              if (i < events.length - 1)
                Container(width: 2, height: 56, color: Colors.grey.shade300),
            ],
          ],
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (int i = 0; i < events.length; i++) ...[
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade200),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        events[i].icon,
                        size: 22,
                        color: events[i].iconColor,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              DateFormat('h:mm a').format(events[i].time),
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              events[i].title,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey.shade800,
                              ),
                            ),
                            if (events[i].subtitle.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                events[i].subtitle,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                if (i < events.length - 1) const SizedBox(height: 4),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade800,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final customerName = task.customer?.customerName ?? '—';
    final customerAddress = task.customer != null
        ? '${task.customer!.address}, ${task.customer!.city}, ${task.customer!.pincode}'
        : '—';
    final completedAt = task.completedDate;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        _goToMyTasks(context);
      },
      child: Scaffold(
        backgroundColor: Colors.grey.shade100,
        appBar: AppBar(
          flexibleSpace: Container(
            decoration: BoxDecoration(color: AppColors.primary),
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
            onPressed: () => _goToMyTasks(context),
          ),
          title: const Text(
            'Completed Task Details',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
          centerTitle: true,
          elevation: 0,
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Task details card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.06),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Task #${task.taskId}',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey.shade800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${task.taskTitle} - $customerName',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _detailRow(
                      'Expected by',
                      DateFormat(
                        'dd MMM yyyy',
                      ).format(task.expectedCompletionDate),
                    ),
                    if (completedAt != null) ...[
                      _detailRow(
                        'Completed at',
                        DateFormat('dd MMM yyyy, h:mm a').format(completedAt),
                      ),
                    ],
                    if (task.isOtpRequired)
                      _detailRow(
                        'OTP',
                        task.isOtpVerified == true ? 'Verified' : '—',
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              // Customer / address card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.06),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Customer & Address',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey.shade800,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _detailRow('Customer', customerName),
                    if (task.customer?.customerNumber != null &&
                        task.customer!.customerNumber!.isNotEmpty)
                      _detailRow('Contact', task.customer!.customerNumber!),
                    _detailRow('Address', customerAddress),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              // Track details timeline (same as TaskCompletedScreen)
              Text(
                'Track Details',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey.shade800,
                ),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 20,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.06),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: _buildTimeline(context),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _goToMyTasks(context),
                  icon: const Icon(Icons.list_rounded, size: 22),
                  label: const Text('Return to My Tasks'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
