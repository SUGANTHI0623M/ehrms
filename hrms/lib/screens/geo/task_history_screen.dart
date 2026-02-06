// Full ride history: exits, restarts, destination changes.
import 'package:flutter/material.dart';
import 'package:hrms/config/app_colors.dart';
import 'package:hrms/models/task.dart';
import 'package:hrms/utils/date_display_util.dart';

class TaskHistoryScreen extends StatelessWidget {
  final Task task;

  const TaskHistoryScreen({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    final exits = task.tasksExit;
    final restarts = task.tasksRestarted;
    final destinations = task.destinations;
    final hasContent =
        exits.isNotEmpty || restarts.isNotEmpty || (destinations.length > 1);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ride History'),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: hasContent
          ? SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (exits.isNotEmpty) ...[
                    _sectionTitle(
                      'Exits',
                      Icons.exit_to_app_rounded,
                      Colors.orange,
                    ),
                    const SizedBox(height: 8),
                    ...exits.asMap().entries.map(
                      (e) => _exitTile(e.value, e.key + 1),
                    ),
                    const SizedBox(height: 24),
                  ],
                  if (restarts.isNotEmpty) ...[
                    _sectionTitle(
                      'Restarts',
                      Icons.play_arrow_rounded,
                      Colors.green,
                    ),
                    const SizedBox(height: 8),
                    ...restarts.asMap().entries.map(
                      (e) => _restartTile(e.value, e.key + 1),
                    ),
                    const SizedBox(height: 24),
                  ],
                  if (destinations.length > 1) ...[
                    _sectionTitle(
                      'Destination Changes',
                      Icons.edit_location_rounded,
                      AppColors.primary,
                    ),
                    const SizedBox(height: 8),
                    ...destinations
                        .asMap()
                        .entries
                        .skip(1)
                        .map((e) => _destinationTile(e.value, e.key + 1)),
                  ],
                ],
              ),
            )
          : Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.history_rounded,
                    size: 64,
                    color: Colors.grey.shade400,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No history yet',
                    style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Exits, restarts, and destination changes will appear here.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _sectionTitle(String title, IconData icon, Color color) {
    return Row(
      children: [
        Icon(icon, size: 22, color: color),
        const SizedBox(width: 8),
        Text(
          title,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _exitTile(TaskExitRecord e, int index) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Exit #$index',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: Colors.orange,
                    ),
                  ),
                ),
                const Spacer(),
                if (e.exitedAt != null)
                  Text(
                    DateDisplayUtil.formatTimeline(e.exitedAt!),
                    style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              e.exitReason,
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            if (e.address != null && e.address!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                e.address!,
                style: TextStyle(fontSize: 10, color: Colors.grey.shade700),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            if (e.pincode != null && e.pincode!.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(
                'Pincode: ${e.pincode}',
                style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
              ),
            ],
            if ((e.lat != 0 || e.lng != 0)) ...[
              const SizedBox(height: 4),
              Text(
                '${e.lat.toStringAsFixed(5)}, ${e.lng.toStringAsFixed(5)}',
                style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _restartTile(TaskRestartRecord r, int index) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Restart #$index',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: Colors.green,
                    ),
                  ),
                ),
                const Spacer(),
                if (r.resumedAt != null)
                  Text(
                    DateDisplayUtil.formatTimeline(r.resumedAt!),
                    style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                  ),
              ],
            ),
            if (r.address != null && r.address!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                r.address!,
                style: TextStyle(fontSize: 10, color: Colors.grey.shade700),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            if (r.pincode != null && r.pincode!.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(
                'Pincode: ${r.pincode}',
                style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
              ),
            ],
            if (r.lat != 0 || r.lng != 0) ...[
              const SizedBox(height: 4),
              Text(
                '${r.lat.toStringAsFixed(5)}, ${r.lng.toStringAsFixed(5)}',
                style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _destinationTile(TaskDestinationRecord d, int index) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Destination #$index',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                  ),
                ),
                const Spacer(),
                if (d.changedAt != null)
                  Text(
                    DateDisplayUtil.formatTimeline(d.changedAt!),
                    style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                  ),
              ],
            ),
            if (d.address != null && d.address!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                d.address!,
                style: TextStyle(fontSize: 10, color: Colors.grey.shade700),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            const SizedBox(height: 4),
            Text(
              '${d.lat.toStringAsFixed(5)}, ${d.lng.toStringAsFixed(5)}',
              style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
            ),
          ],
        ),
      ),
    );
  }
}
