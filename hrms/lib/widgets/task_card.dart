import 'package:flutter/material.dart';
import 'package:hrms/models/task.dart';
import 'package:intl/intl.dart';

class TaskCard extends StatelessWidget {
  final Task task;
  final VoidCallback onStartTask;

  const TaskCard({Key? key, required this.task, required this.onStartTask})
    : super(key: key);

  @override
  Widget build(BuildContext context) {
    Color statusColor;
    String statusText;
    switch (task.status) {
      case TaskStatus.assigned:
        statusColor = Colors.green;
        statusText = 'Assigned';
        break;
      case TaskStatus.pending:
        statusColor = Colors.orange;
        statusText = 'Pending';
        break;
      case TaskStatus.scheduled:
        statusColor = Colors.blue;
        statusText = 'Scheduled';
        break;
      case TaskStatus.completed:
        statusColor = Colors.grey;
        statusText = 'Completed';
        break;
      default:
        statusColor = Colors.grey; // Default color
        statusText = 'Unknown'; // Default text
        break;
    }

    bool isTaskActionable =
        task.status == TaskStatus.assigned || task.status == TaskStatus.pending;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12.0),
        side: isTaskActionable
            ? BorderSide(color: Theme.of(context).primaryColor, width: 2.0)
            : BorderSide.none,
      ),
      elevation: 4.0,
      shadowColor: Colors.black.withOpacity(0.1),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Task #${task.taskId}',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
                Chip(
                  label: Text(
                    statusText,
                    style: TextStyle(color: Colors.white, fontSize: 12),
                  ),
                  backgroundColor: statusColor,
                  padding: EdgeInsets.symmetric(horizontal: 8.0, vertical: 0),
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ],
            ),
            const SizedBox(height: 4.0),
            Text(
              task.taskTitle,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            if (task.customer != null)
              Padding(
                padding: const EdgeInsets.only(top: 4.0),
                child: Text(
                  task.customer!.customerName,
                  style: TextStyle(color: Colors.grey[800]),
                ),
              ),
            if (task.customer?.customerNumber != null &&
                task.customer!.customerNumber!.isNotEmpty)
              Text(
                task.customer!.customerNumber!,
                style: TextStyle(color: Colors.grey[600], fontSize: 12),
              ),
            const SizedBox(height: 16.0),

            // Destination Section
            Container(
              padding: const EdgeInsets.all(12.0),
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.05),
                borderRadius: BorderRadius.circular(8.0),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.location_on,
                    color: Theme.of(context).primaryColor,
                    size: 20,
                  ),
                  const SizedBox(width: 8.0),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Destination',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 12,
                          ),
                        ),
                        if (task.customer != null)
                          Text(
                            '${task.customer!.address}, ${task.customer!.city}, ${task.customer!.pincode}',
                            style: TextStyle(
                              color: Colors.black87,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16.0),

            // Date & Distance Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.calendar_today,
                      color: Colors.grey[500],
                      size: 16,
                    ),
                    const SizedBox(width: 4.0),
                    Text(
                      _formatCompletionDate(
                        task.expectedCompletionDate.toIso8601String(),
                      ),
                      style: TextStyle(color: Colors.grey[700]),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Icon(Icons.alt_route, color: Colors.grey[500], size: 16),
                    const SizedBox(width: 4.0),
                    Text(
                      '-- km away',
                      style: TextStyle(color: Colors.grey[700]),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16.0),

            // Requirement Tags (Chips)
            Wrap(
              spacing: 8.0,
              runSpacing: 4.0,
              children: [
                if (task.isOtpRequired)
                  _buildRequirementChip(
                    'OTP Required',
                    Colors.blue.shade100,
                    Colors.blue.shade800,
                  ),
                if (task.isGeoFenceRequired)
                  _buildRequirementChip(
                    'Geo-Fence',
                    Colors.green.shade100,
                    Colors.green.shade800,
                  ),
                if (task.isPhotoRequired)
                  _buildRequirementChip(
                    'Photo',
                    Colors.purple.shade100,
                    Colors.purple.shade800,
                  ),
                if (task.isFormRequired)
                  _buildRequirementChip(
                    'Form',
                    Colors.orange.shade100,
                    Colors.orange.shade800,
                  ),
              ],
            ),
            if (task.completedDate != null)
              Padding(
                padding: const EdgeInsets.only(top: 16.0),
                child: Text(
                  'Completed on: ${task.completedDate != null ? DateFormat('dd MMM yyyy').format(task.completedDate!) : 'N/A'}',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
              ),
            const SizedBox(height: 16.0),

            // Action Button
            if (isTaskActionable)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: onStartTask,
                  icon: const Icon(Icons.rocket_launch, color: Colors.white),
                  label: const Text(
                    'Start Task',
                    style: TextStyle(fontSize: 16, color: Colors.white),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).primaryColor,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10.0),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 12.0),
                    elevation: 2.0,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildRequirementChip(
    String label,
    Color backgroundColor,
    Color textColor,
  ) {
    return Chip(
      label: Text(label, style: TextStyle(color: textColor, fontSize: 11)),
      backgroundColor: backgroundColor,
      padding: EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }

  String _formatCompletionDate(String dateString) {
    final date = DateTime.parse(dateString);
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = DateTime(now.year, now.month, now.day + 1);

    if (date.year == today.year &&
        date.month == today.month &&
        date.day == today.day) {
      return 'Today, ${DateFormat('h:mm a').format(date)}';
    }
    if (date.year == tomorrow.year &&
        date.month == tomorrow.month &&
        date.day == tomorrow.day) {
      return 'Tomorrow, ${DateFormat('h:mm a').format(date)}';
    }
    return DateFormat('dd MMM yyyy, h:mm a').format(date);
  }
}
