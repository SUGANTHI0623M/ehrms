// Full ride history: exits, restarts, destination changes – fetched from task_details.
import 'package:flutter/material.dart';
import 'package:hrms/config/app_colors.dart';
import 'package:hrms/models/task.dart';
import 'package:hrms/services/task_service.dart';
import 'package:hrms/utils/date_display_util.dart';
import 'package:url_launcher/url_launcher.dart';

class TaskHistoryScreen extends StatefulWidget {
  final Task task;

  const TaskHistoryScreen({super.key, required this.task});

  @override
  State<TaskHistoryScreen> createState() => _TaskHistoryScreenState();
}

class _TaskHistoryScreenState extends State<TaskHistoryScreen> {
  Task? _task;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchTaskDetails();
  }

  Future<void> _fetchTaskDetails() async {
    if (widget.task.id == null || widget.task.id!.isEmpty) {
      setState(() {
        _task = widget.task;
        _loading = false;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final t = await TaskService().getTaskById(widget.task.id!);
      if (mounted) {
        setState(() {
          _task = t;
          _loading = false;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _task = widget.task;
          _loading = false;
          _error = e.toString();
        });
      }
    }
  }

  Task get _displayTask => _task ?? widget.task;

  @override
  Widget build(BuildContext context) {
    final exits = _displayTask.tasksExit;
    final restarts = _displayTask.tasksRestarted;
    final destinations = _displayTask.destinations;
    final hasTimeline =
        _displayTask.startTime != null ||
        _displayTask.arrivalTime != null ||
        _displayTask.photoProofUploadedAt != null ||
        _displayTask.otpVerifiedAt != null ||
        exits.isNotEmpty ||
        restarts.isNotEmpty ||
        destinations.isNotEmpty ||
        _displayTask.completedDate != null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Full Ride History'),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loading ? null : _fetchTaskDetails,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchTaskDetails,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Text(
                          'Using cached data. $_error',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.orange.shade800,
                          ),
                        ),
                      ),
                    if (hasTimeline) ...[
                      if (_displayTask.startTime != null) ...[
                        _sectionTitle(
                          'Started',
                          Icons.play_circle_filled_rounded,
                          Colors.green,
                        ),
                        const SizedBox(height: 8),
                        _timelineTile(
                          icon: Icons.play_circle_filled_rounded,
                          color: Colors.green,
                          label: 'Task started',
                          time: _displayTask.startTime!,
                          address:
                              _displayTask.sourceLocation?.address ??
                              _displayTask.sourceLocation?.fullAddress,
                          lat: _displayTask.sourceLocation?.lat,
                          lng: _displayTask.sourceLocation?.lng,
                        ),
                        const SizedBox(height: 24),
                      ],
                      if (_displayTask.arrivalTime != null) ...[
                        _sectionTitle(
                          'Arrived',
                          Icons.location_on_rounded,
                          Colors.pink,
                        ),
                        const SizedBox(height: 8),
                        _timelineTile(
                          icon: Icons.location_on_rounded,
                          color: Colors.pink,
                          label: 'Arrived at destination',
                          time: _displayTask.arrivalTime!,
                          address: null,
                          lat: null,
                          lng: null,
                        ),
                        const SizedBox(height: 24),
                      ],
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
                          'Resumed (Restarted)',
                          Icons.replay_rounded,
                          Colors.green,
                        ),
                        const SizedBox(height: 8),
                        ...restarts.asMap().entries.map(
                          (e) => _restartTile(e.value, e.key + 1),
                        ),
                        const SizedBox(height: 24),
                      ],
                      if (_displayTask.photoProofUploadedAt != null) ...[
                        _sectionTitle(
                          'Photo Proof',
                          Icons.photo_camera_rounded,
                          Colors.purple,
                        ),
                        const SizedBox(height: 8),
                        _photoProofTile(
                          time: _displayTask.photoProofUploadedAt!,
                          address: _displayTask.photoProofAddress,
                          photoUrl: _displayTask.photoProofUrl,
                        ),
                        const SizedBox(height: 24),
                      ],
                      if (_displayTask.otpVerifiedAt != null) ...[
                        _sectionTitle(
                          'OTP Verified',
                          Icons.pin_rounded,
                          Colors.indigo,
                        ),
                        const SizedBox(height: 8),
                        _timelineTile(
                          icon: Icons.pin_rounded,
                          color: Colors.indigo,
                          label: 'OTP verified',
                          time: _displayTask.otpVerifiedAt!,
                          address: _displayTask.otpVerifiedAddress,
                          lat: null,
                          lng: null,
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
                        const SizedBox(height: 24),
                      ],
                      if (_displayTask.completedDate != null) ...[
                        _sectionTitle(
                          'Completed',
                          Icons.check_circle_rounded,
                          AppColors.primary,
                        ),
                        const SizedBox(height: 8),
                        _timelineTile(
                          icon: Icons.check_circle_rounded,
                          color: AppColors.primary,
                          label: 'Task completed',
                          time: _displayTask.completedDate!,
                          address: null,
                          lat: null,
                          lng: null,
                        ),
                      ],
                    ] else
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
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
                                style: TextStyle(
                                  fontSize: 16,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Exits, restarts, arrival, photo proof, OTP verification, and destination changes will appear here.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey.shade500,
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
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _photoProofTile({
    required DateTime time,
    String? address,
    String? photoUrl,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.purple.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.photo_camera_rounded,
              size: 26,
              color: Colors.purple,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Photo proof uploaded',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.black,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  DateDisplayUtil.formatTimeline(time),
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
                if (address != null && address.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    address,
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                if (photoUrl != null && photoUrl.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: () async {
                      final uri = Uri.tryParse(photoUrl);
                      if (uri != null && await canLaunchUrl(uri)) {
                        await launchUrl(
                          uri,
                          mode: LaunchMode.externalApplication,
                        );
                      }
                    },
                    child: Text(
                      photoUrl,
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.blue.shade700,
                        decoration: TextDecoration.underline,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _timelineTile({
    required IconData icon,
    required Color color,
    required String label,
    required DateTime time,
    String? address,
    double? lat,
    double? lng,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 26, color: color),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.black,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  DateDisplayUtil.formatTimeline(time),
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
                if (address != null && address.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    address,
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                if (lat != null && lng != null)
                  Text(
                    '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text(
              '$label:',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade700,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 13, color: Colors.black),
            ),
          ),
        ],
      ),
    );
  }

  Widget _exitTile(TaskExitRecord e, int index) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.orange.shade50,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.exit_to_app_rounded,
              size: 26,
              color: Colors.orange.shade700,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Exit #$index',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.black,
                  ),
                ),
                const SizedBox(height: 10),
                if (e.exitedAt != null)
                  _detailRow(
                    'Date & Time',
                    DateDisplayUtil.formatDateTime(e.exitedAt!),
                  ),
                _detailRow(
                  'Reason',
                  e.exitReason.isNotEmpty ? e.exitReason : '—',
                ),
                if (e.address != null && e.address!.isNotEmpty)
                  _detailRow('Location', e.address!),
                if (e.pincode != null && e.pincode!.isNotEmpty)
                  _detailRow('Pincode', e.pincode!),
                if (e.lat != 0 || e.lng != 0)
                  _detailRow(
                    'Coordinates',
                    '${e.lat.toStringAsFixed(5)}, ${e.lng.toStringAsFixed(5)}',
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _restartTile(TaskRestartRecord r, int index) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.replay_rounded,
              size: 26,
              color: Colors.green.shade700,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Resumed #$index',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.black,
                  ),
                ),
                const SizedBox(height: 10),
                if (r.resumedAt != null)
                  _detailRow(
                    'Date & Time',
                    DateDisplayUtil.formatDateTime(r.resumedAt!),
                  ),
                if (r.address != null && r.address!.isNotEmpty)
                  _detailRow('Location', r.address!),
                if (r.pincode != null && r.pincode!.isNotEmpty)
                  _detailRow('Pincode', r.pincode!),
                if (r.lat != 0 || r.lng != 0)
                  _detailRow(
                    'Coordinates',
                    '${r.lat.toStringAsFixed(5)}, ${r.lng.toStringAsFixed(5)}',
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _destinationTile(TaskDestinationRecord d, int index) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.edit_location_rounded,
              size: 26,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Destination change #$index',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.black,
                  ),
                ),
                const SizedBox(height: 10),
                if (d.changedAt != null)
                  _detailRow(
                    'Date & Time',
                    DateDisplayUtil.formatDateTime(d.changedAt!),
                  ),
                if (d.address != null && d.address!.isNotEmpty)
                  _detailRow('Location', d.address!),
                _detailRow(
                  'Coordinates',
                  '${d.lat.toStringAsFixed(5)}, ${d.lng.toStringAsFixed(5)}',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
