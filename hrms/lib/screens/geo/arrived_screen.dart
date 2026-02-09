// Arrived screen – trip summary, "You've Arrived!", Within Geo-Fence, Next Steps.
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:hrms/config/app_colors.dart';
import 'package:hrms/models/task.dart';
import 'package:hrms/screens/geo/exit_ride_bottom_sheet.dart';
import 'package:hrms/screens/geo/form_fill_screen.dart';
import 'package:hrms/screens/geo/otp_verification_screen.dart';
import 'package:hrms/screens/geo/photo_proof_screen.dart';
import 'package:hrms/screens/geo/task_completed_screen.dart';
import 'package:hrms/screens/geo/task_history_screen.dart';
import 'package:hrms/services/auth_service.dart';
import 'package:hrms/services/task_service.dart';
import 'package:hrms/services/presence_tracking_service.dart';
import 'package:hrms/utils/date_display_util.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ArrivedScreen extends StatefulWidget {
  final String? taskMongoId;
  final String taskId;
  final Task? task;
  final Duration totalDuration;
  final double totalDistanceKm;
  final bool isWithinGeofence;
  final DateTime arrivalTime;

  /// Source (pickup) location - lat, lng, address.
  final double? sourceLat;
  final double? sourceLng;
  final String? sourceAddress;

  /// Destination (dropoff) location - lat, lng, address.
  final double? destLat;
  final double? destLng;
  final String? destAddress;

  /// Optional: driving duration/distance if available from tracking.
  final Duration? drivingDuration;
  final double? drivingDistanceKm;
  final Duration? walkingDuration;
  final double? walkingDistanceKm;

  const ArrivedScreen({
    super.key,
    this.taskMongoId,
    required this.taskId,
    this.task,
    required this.totalDuration,
    required this.totalDistanceKm,
    required this.isWithinGeofence,
    required this.arrivalTime,
    this.sourceLat,
    this.sourceLng,
    this.sourceAddress,
    this.destLat,
    this.destLng,
    this.destAddress,
    this.drivingDuration,
    this.drivingDistanceKm,
    this.walkingDuration,
    this.walkingDistanceKm,
  });

  @override
  State<ArrivedScreen> createState() => _ArrivedScreenState();
}

class _ArrivedScreenState extends State<ArrivedScreen> {
  Task? _task;
  bool _photoProofDone = false;
  bool _storedOtpRequired = false;
  bool _submittingExit = false;
  bool _submittingComplete = false;
  List<Map<String, dynamic>> _assignedTemplates = [];
  List<Map<String, dynamic>> _formResponsesForTask = [];
  String? _staffId;
  bool _formLoading = false;

  Task? get task => _task;

  /// Form is required when staff has assigned templates. Shown only when > 0.
  bool get _hasFormAssigned => _assignedTemplates.isNotEmpty;

  /// All assigned forms filled for this task.
  bool get _formFilled {
    if (_assignedTemplates.isEmpty) return true; // N/A
    if (_formResponsesForTask.isEmpty) return false;
    final filledTemplateIds = _formResponsesForTask
        .map((r) => _templateIdFromResponse(r))
        .where((id) => id != null && id.isNotEmpty)
        .toSet();
    return _assignedTemplates.every((t) {
      final id = (t['_id'] ?? t['id'])?.toString();
      return id != null && filledTemplateIds.contains(id);
    });
  }

  static String? _templateIdFromResponse(Map<String, dynamic> r) {
    final tid = r['templateId'];
    if (tid is String) return tid;
    if (tid is Map) return (tid['_id'] ?? tid['id'])?.toString();
    return null;
  }

  /// First template that still needs to be filled.
  Map<String, dynamic>? get _firstUnfilledTemplate {
    if (_assignedTemplates.isEmpty) return null;
    final filledIds = _formResponsesForTask
        .map(_templateIdFromResponse)
        .where((id) => id != null && id.isNotEmpty)
        .toSet();
    for (final t in _assignedTemplates) {
      final id = (t['_id'] ?? t['id'])?.toString();
      if (id != null && !filledIds.contains(id)) return t;
    }
    return null;
  }

  /// OTP requirement: from task API (mergeTaskSettings, matched by staff businessId)
  /// or fallback to stored settings from login. Prefer API value when task is loaded.
  bool get _isOtpRequiredFromSettings =>
      _task?.isOtpRequired ?? widget.task?.isOtpRequired ?? _storedOtpRequired;

  @override
  void initState() {
    super.initState();
    _task = widget.task;
    _photoProofDone = widget.task?.photoProof == true;
    _loadStoredTaskSettings();
    _loadStaffIdAndForms();
    _refreshTask();
  }

  Future<void> _loadStaffIdAndForms() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString('user');
    String? staffId;
    if (userStr != null) {
      try {
        final userData = jsonDecode(userStr) as Map<String, dynamic>?;
        final sid = userData?['staffId'] ?? userData?['_id'] ?? userData?['id'];
        staffId = sid?.toString();
      } catch (_) {}
    }
    staffId ??= (widget.task ?? _task)?.assignedTo;
    if (staffId == null || staffId.isEmpty) return;
    if (mounted) setState(() => _staffId = staffId);
    await _loadFormTemplatesAndResponses(staffId!);
  }

  Future<void> _loadFormTemplatesAndResponses(String staffId) async {
    if (mounted) setState(() => _formLoading = true);
    try {
      final templates = await TaskService().getFormTemplatesForStaff(staffId);
      List<Map<String, dynamic>> responses = [];
      if (widget.taskMongoId != null && widget.taskMongoId!.isNotEmpty) {
        responses = await TaskService().getFormResponsesForTask(
          taskId: widget.taskMongoId!,
          staffId: staffId,
        );
      }
      if (mounted) {
        setState(() {
          _assignedTemplates = templates;
          _formResponsesForTask = responses;
          _formLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _formLoading = false);
    }
  }

  Future<void> _loadStoredTaskSettings() async {
    final otpRequired = await AuthService.isOtpRequiredFromStoredSettings();
    if (mounted) setState(() => _storedOtpRequired = otpRequired);
  }

  bool _canOpenOtpScreen() {
    final mongoId = widget.taskMongoId ?? task?.id;
    return task != null &&
        mongoId != null &&
        mongoId.isNotEmpty &&
        task?.isOtpVerified != true;
  }

  /// Fetches task from API with TaskSettings merged (isOtpRequired from enableOtpVerification).
  Future<void> _refreshTask() async {
    if (widget.taskMongoId == null || widget.taskMongoId!.isEmpty) return;
    try {
      final t = await TaskService().getTaskById(widget.taskMongoId!);
      if (mounted) {
        setState(() {
          _task = t;
          _photoProofDone = t.photoProof == true;
        });
      }
      final staffId = _staffId ?? t.assignedTo;
      if (staffId != null && staffId.isNotEmpty) {
        if (_staffId == null && mounted) setState(() => _staffId = staffId);
        await _loadFormTemplatesAndResponses(staffId);
      }
    } catch (_) {}
  }

  static String _formatDuration(Duration d) {
    if (d.inHours > 0) {
      return '${d.inHours}h ${d.inMinutes.remainder(60)} mins';
    }
    if (d.inMinutes > 0) {
      return '${d.inMinutes} mins ${d.inSeconds.remainder(60)} secs';
    }
    return '${d.inSeconds} secs';
  }

  @override
  Widget build(BuildContext context) {
    final drivingDur = widget.drivingDuration ?? widget.totalDuration;
    final drivingKm = widget.drivingDistanceKm ?? widget.totalDistanceKm;
    final walkingDur = widget.walkingDuration ?? Duration.zero;
    final walkingKm = widget.walkingDistanceKm ?? 0.0;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        await _onExitRide();
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          flexibleSpace: Container(
            decoration: BoxDecoration(color: AppColors.primary),
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
            onPressed: _onExitRide,
          ),
          title: const Text(
            'Arrived',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          centerTitle: true,
          elevation: 0,
          actions: [
            if (task != null)
              IconButton(
                icon: const Icon(Icons.history_rounded, color: Colors.white),
                tooltip: 'Task history',
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => TaskHistoryScreen(task: task!),
                    ),
                  );
                },
              ),
          ],
        ),
        body: SafeArea(
          child: RefreshIndicator(
            onRefresh: _refreshTask,
            color: AppColors.primary,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Task info card – Task Name, ID, Description
                  if ((task ?? widget.task) != null)
                    Builder(
                      builder: (context) {
                        final t = task ?? widget.task!;
                        return Container(
                          padding: const EdgeInsets.all(16),
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.06),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                t.taskTitle,
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.grey.shade800,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'ID: ${t.taskId}',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                              if (t.description.isNotEmpty) ...[
                                const SizedBox(height: 6),
                                Text(
                                  t.description,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey.shade700,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        );
                      },
                    ),
                  // Arrival confirmation card
                  Container(
                    padding: const EdgeInsets.all(24),
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
                      children: [
                        Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.check_rounded,
                            color: Colors.white,
                            size: 40,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          "You've Arrived!",
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey.shade800,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Great job! You reached the customer location.',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade600,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        if (widget.isWithinGeofence) ...[
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.check_circle_rounded,
                                  color: AppColors.primary,
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Within Geo-Fence',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            "You're inside the 500m radius",
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  // Trip details card - all trip info
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
                          'Trip Details',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey.shade800,
                          ),
                        ),
                        const SizedBox(height: 16),
                        _row(
                          'Total Distance',
                          '${widget.totalDistanceKm.toStringAsFixed(2)} km',
                        ),
                        _row(
                          'Time Taken',
                          _formatDuration(widget.totalDuration),
                        ),
                        _row(
                          'Arrival Time',
                          DateDisplayUtil.formatTime(widget.arrivalTime),
                        ),
                        if (drivingKm > 0 || walkingKm > 0) ...[
                          _row(
                            'Driving',
                            drivingKm > 0
                                ? '${_formatDuration(drivingDur)} (${drivingKm.toStringAsFixed(1)} km)'
                                : '—',
                          ),
                          _row(
                            'Walking',
                            walkingKm > 0
                                ? '${_formatDuration(walkingDur)} (${walkingKm.toStringAsFixed(1)} km)'
                                : '—',
                          ),
                        ],
                        const SizedBox(height: 12),
                        const Divider(height: 1),
                        const SizedBox(height: 12),
                        _locationSection(
                          'Source',
                          widget.sourceAddress ?? task?.sourceLocation?.address,
                          widget.sourceLat ?? task?.sourceLocation?.lat,
                          widget.sourceLng ?? task?.sourceLocation?.lng,
                        ),
                        const SizedBox(height: 12),
                        _locationSection(
                          'Destination',
                          widget.destAddress ??
                              task?.destinationLocation?.address,
                          widget.destLat ?? task?.destinationLocation?.lat,
                          widget.destLng ?? task?.destinationLocation?.lng,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  // Next Steps card – all steps, then Continue to Form (→ OTP if required).
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border(
                        left: BorderSide(color: AppColors.primary, width: 4),
                      ),
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
                          'Next Steps',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey.shade800,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Complete these requirements to finish the task:',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        const SizedBox(height: 16),
                        _nextStepRow(
                          icon: Icons.location_on_rounded,
                          label: 'Reached location',
                          done: true,
                        ),
                        _nextStepRow(
                          icon: Icons.camera_alt_rounded,
                          label: 'Take photo proof',
                          done: _photoProofDone,
                          onTap: task != null && widget.taskMongoId != null
                              ? () async {
                                  await Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (ctx) => PhotoProofScreen(
                                        task: task!,
                                        taskMongoId: widget.taskMongoId,
                                        onPhotoUploaded: () => _refreshTask(),
                                      ),
                                    ),
                                  );
                                  await _refreshTask();
                                }
                              : null,
                        ),
                        // OTP step: only when TaskSettings.enableOtpVerification is true
                        if (_isOtpRequiredFromSettings)
                          _nextStepRow(
                            icon: Icons.pin_rounded,
                            label: 'Get OTP from customer',
                            done: (task ?? widget.task)?.isOtpVerified == true,
                            onTap: _canOpenOtpScreen()
                                ? () async {
                                    final mongoId =
                                        widget.taskMongoId ?? task?.id ?? '';
                                    final t = task;
                                    if (t == null || mongoId.isEmpty) return;
                                    final verified = await Navigator.push<bool>(
                                      context,
                                      MaterialPageRoute(
                                        builder: (context) =>
                                            OtpVerificationScreen(
                                              task: t,
                                              taskMongoId: mongoId,
                                              arrivalTime: widget.arrivalTime,
                                              totalDuration:
                                                  widget.totalDuration,
                                              totalDistanceKm:
                                                  widget.totalDistanceKm,
                                              autoSendOtp: true,
                                            ),
                                      ),
                                    );
                                    if (context.mounted) {
                                      if (verified == true) {
                                        setState(() {
                                          _task = _task?.copyWith(
                                            isOtpVerified: true,
                                          );
                                        });
                                      }
                                      await _refreshTask();
                                    }
                                  }
                                : null,
                          ),
                        // Form step: only when form template is assigned to staff
                        if (_hasFormAssigned)
                          _nextStepRow(
                            icon: Icons.description_rounded,
                            label: 'Fill required form',
                            done: _formFilled,
                            onTap:
                                (_staffId != null &&
                                    widget.taskMongoId != null &&
                                    _firstUnfilledTemplate != null)
                                ? () async {
                                    final template = _firstUnfilledTemplate!;
                                    final filled = await Navigator.push<bool>(
                                      context,
                                      MaterialPageRoute(
                                        builder: (ctx) => FormFillScreen(
                                          template: template,
                                          taskMongoId: widget.taskMongoId!,
                                          staffId: _staffId!,
                                          onFormSubmitted: () => _refreshTask(),
                                        ),
                                      ),
                                    );
                                    if (context.mounted && filled == true) {
                                      await _refreshTask();
                                    }
                                  }
                                : null,
                          ),
                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed:
                                !_submittingComplete &&
                                    (!_isOtpRequiredFromSettings ||
                                        (task ?? widget.task)?.isOtpVerified ==
                                            true) &&
                                    (!_hasFormAssigned || _formFilled)
                                ? () async {
                                    if (_submittingComplete) return;
                                    setState(() => _submittingComplete = true);
                                    final t = task ?? widget.task;
                                    final startedAt = widget.arrivalTime
                                        .subtract(widget.totalDuration);
                                    final otpVerified =
                                        (task ?? widget.task)?.isOtpVerified ==
                                        true;
                                    Task? refreshed = task ?? t;
                                    if (widget.taskMongoId != null &&
                                        widget.taskMongoId!.isNotEmpty) {
                                      try {
                                        refreshed = await TaskService().endTask(
                                          widget.taskMongoId!,
                                        );
                                        await PresenceTrackingService()
                                            .resumePresenceTracking();
                                      } catch (e) {
                                        if (mounted) {
                                          setState(
                                              () => _submittingComplete = false);
                                          String msg =
                                              'Failed to complete task';
                                          if (e is DioException &&
                                              e.response?.data != null) {
                                            final d = e.response!.data;
                                            if (d is Map) {
                                              msg =
                                                  (d['message'] ?? d['error'])
                                                      ?.toString() ??
                                                  msg;
                                            }
                                          } else {
                                            msg = '$msg: ${e.toString()}';
                                          }
                                          ScaffoldMessenger.of(
                                            context,
                                          ).showSnackBar(
                                            SnackBar(content: Text(msg)),
                                          );
                                        }
                                        return;
                                      }
                                    }
                                    if (mounted) {
                                      Navigator.of(context).pushReplacement(
                                        MaterialPageRoute(
                                          builder: (context) =>
                                              TaskCompletedScreen(
                                                task: refreshed ?? task ?? t,
                                                taskMongoId: widget.taskMongoId,
                                                taskId: widget.taskId,
                                                startedAt: startedAt,
                                                completedAt: DateTime.now(),
                                                totalDuration:
                                                    widget.totalDuration,
                                                totalDistanceKm:
                                                    widget.totalDistanceKm,
                                                otpVerified: otpVerified,
                                                geoFence:
                                                    widget.isWithinGeofence,
                                                formSubmitted: _formFilled,
                                                photoProof: _photoProofDone,
                                                arrivalTime: widget.arrivalTime,
                                                otpVerifiedAt:
                                                    (refreshed ?? task ?? t)
                                                        ?.otpVerifiedAt,
                                                verifiedOtp: null,
                                              ),
                                        ),
                                      );
                                    }
                                  }
                                : null,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.secondary,
                              foregroundColor: Colors.white,
                              disabledBackgroundColor: Colors.grey.shade300,
                              disabledForegroundColor: Colors.grey.shade600,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            icon: _submittingComplete
                                ? SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(
                                    Icons.check_circle_rounded,
                                    size: 22,
                                  ),
                            label: Text(
                                _submittingComplete ? 'Completing...' : 'Complete Task'),
                          ),
                        ),
                      ],
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

  /// Exit Ride: open bottom sheet with reason form (same as live tracking).
  /// Calls exitRide API with current GPS, then pops.
  Future<void> _onExitRide() async {
    if (_submittingExit) return;
    final result = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const ExitRideBottomSheet(),
    );
    if (result == null || !mounted) return;
    final exitType = result['exitType'] as String?;
    final reason = result['reason']?.trim();
    if (exitType == null ||
        exitType.isEmpty ||
        reason == null ||
        reason.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select exit type and provide a reason'),
        ),
      );
      return;
    }
    final mongoId = widget.taskMongoId ?? task?.id;
    if (mongoId != null && mongoId.isNotEmpty) {
      if (mounted) setState(() => _submittingExit = true);
      try {
        double? lat;
        double? lng;
        try {
          final pos = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.high,
          );
          lat = pos.latitude;
          lng = pos.longitude;
        } catch (_) {
          lat = widget.destLat ?? task?.destinationLocation?.lat;
          lng = widget.destLng ?? task?.destinationLocation?.lng;
        }
        await TaskService().exitRide(
          mongoId,
          reason,
          exitType: exitType,
          lat: lat,
          lng: lng,
        );
        await PresenceTrackingService().resumePresenceTracking();
      } catch (e) {
        if (mounted) {
          setState(() => _submittingExit = false);
          String msg = 'Failed to exit ride';
          if (e is DioException && e.response?.data != null) {
            final data = e.response!.data;
            if (data is Map) {
              msg = (data['message'] ?? data['error'])?.toString() ?? msg;
            } else if (data is String && data.isNotEmpty) {
              msg = data;
            }
          } else {
            msg = '$msg: ${e.toString()}';
          }
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text(msg)));
        }
        return;
      }
      if (mounted) setState(() => _submittingExit = false);
    }
    if (mounted) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).pop();
      });
    }
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
          ),
          Flexible(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade800,
              ),
              textAlign: TextAlign.end,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _locationSection(
    String title,
    String? address,
    double? lat,
    double? lng,
  ) {
    final hasAddress = address != null && address.isNotEmpty;
    final hasCoords = lat != null && lng != null && (lat != 0 || lng != 0);
    if (!hasAddress && !hasCoords) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                title == 'Source'
                    ? Icons.gps_fixed_rounded
                    : Icons.location_on_rounded,
                size: 18,
                color: title == 'Source' ? Colors.green : Colors.red,
              ),
              const SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey.shade800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '—',
            style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
          ),
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              title == 'Source'
                  ? Icons.gps_fixed_rounded
                  : Icons.location_on_rounded,
              size: 18,
              color: title == 'Source' ? Colors.green : Colors.red,
            ),
            const SizedBox(width: 6),
            Text(
              title,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade800,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        if (hasAddress)
          Text(
            address!,
            style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
          ),
        if (hasCoords)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              '${lat!.toStringAsFixed(6)}, ${lng!.toStringAsFixed(6)}',
              style: TextStyle(
                fontSize: 11,
                color: Colors.grey.shade500,
                fontFamily: 'monospace',
              ),
            ),
          ),
      ],
    );
  }

  Widget _nextStepRow({
    required IconData icon,
    required String label,
    required bool done,
    VoidCallback? onTap,
  }) {
    final content = Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: done
            ? AppColors.primary.withOpacity(0.12)
            : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(
            done ? Icons.check_circle_rounded : icon,
            color: done ? AppColors.primary : Colors.grey.shade600,
            size: 22,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: done ? AppColors.primary : Colors.grey.shade800,
              ),
            ),
          ),
          if (onTap != null && !done)
            Icon(Icons.chevron_right_rounded, color: Colors.grey.shade500),
        ],
      ),
    );
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: onTap != null && !done
          ? InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(10),
              child: content,
            )
          : content,
    );
  }
}
