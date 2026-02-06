import 'package:hrms/models/customer.dart';

DateTime? _parseDate(dynamic value) {
  if (value == null) return null;
  if (value is String) return DateTime.tryParse(value);
  if (value is Map<dynamic, dynamic>) {
    final dateStr = value[r'$date'];
    if (dateStr != null) return DateTime.tryParse(dateStr.toString());
  }
  return null;
}

List<T> _parseList<T>(dynamic json, T Function(Map<String, dynamic>) fromJson) {
  if (json == null || json is! List) return [];
  final list = <T>[];
  for (final item in json) {
    if (item is Map<String, dynamic>) {
      try {
        list.add(fromJson(item));
      } catch (_) {}
    }
  }
  return list;
}

class TaskLocation {
  final double lat;
  final double lng;
  final String? address;
  final String? fullAddress;
  final String? pincode;

  const TaskLocation({
    required this.lat,
    required this.lng,
    this.address,
    this.fullAddress,
    this.pincode,
  });

  String? get displayAddress => address ?? fullAddress;

  factory TaskLocation.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const TaskLocation(lat: 0, lng: 0);
    return TaskLocation(
      lat: (json['lat'] as num?)?.toDouble() ?? 0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0,
      address: json['address'] as String?,
      fullAddress: json['fullAddress'] as String?,
      pincode: json['pincode'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'lat': lat,
    'lng': lng,
    if (address != null) 'address': address,
    if (fullAddress != null) 'fullAddress': fullAddress,
    if (pincode != null) 'pincode': pincode,
  };
}

class TaskExitRecord {
  final double lat;
  final double lng;
  final String? address;
  final String? fullAddress;
  final String? pincode;
  final String exitReason;
  final DateTime? exitedAt;

  const TaskExitRecord({
    required this.lat,
    required this.lng,
    this.address,
    this.fullAddress,
    this.pincode,
    required this.exitReason,
    this.exitedAt,
  });

  factory TaskExitRecord.fromJson(Map<String, dynamic>? json) {
    if (json == null)
      return const TaskExitRecord(lat: 0, lng: 0, exitReason: '');
    return TaskExitRecord(
      lat: (json['lat'] as num?)?.toDouble() ?? 0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0,
      address: (json['address'] ?? json['fullAddress']) as String?,
      fullAddress: json['fullAddress'] as String?,
      pincode: json['pincode'] as String?,
      exitReason: (json['exitReason'] as String?) ?? '',
      exitedAt: Task._dateFromJson(json['exitedAt']),
    );
  }
}

class TaskRestartRecord {
  final double lat;
  final double lng;
  final String? address;
  final String? fullAddress;
  final String? pincode;
  final DateTime? resumedAt;

  const TaskRestartRecord({
    required this.lat,
    required this.lng,
    this.address,
    this.fullAddress,
    this.pincode,
    this.resumedAt,
  });

  factory TaskRestartRecord.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const TaskRestartRecord(lat: 0, lng: 0);
    return TaskRestartRecord(
      lat: (json['lat'] as num?)?.toDouble() ?? 0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0,
      address: (json['address'] ?? json['fullAddress']) as String?,
      fullAddress: json['fullAddress'] as String?,
      pincode: json['pincode'] as String?,
      resumedAt: _parseDate(json['resumedAt']),
    );
  }
}

class TaskDestinationRecord {
  final double lat;
  final double lng;
  final String? address;
  final DateTime? changedAt;

  const TaskDestinationRecord({
    required this.lat,
    required this.lng,
    this.address,
    this.changedAt,
  });

  factory TaskDestinationRecord.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const TaskDestinationRecord(lat: 0, lng: 0);
    return TaskDestinationRecord(
      lat: (json['lat'] as num?)?.toDouble() ?? 0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0,
      address: json['address'] as String?,
      changedAt: _parseDate(json['changedAt']),
    );
  }
}

enum TaskStatus {
  onlineReady,
  assigned,
  approved,
  pending,
  scheduled,
  inProgress,
  arrived,
  exited,
  completed,
  rejected,
  cancelled,
  reopened,
}

class Task {
  final String? id;
  final String taskId;
  final String taskTitle;
  final String description;
  final String assignedTo;
  final String? customerId;
  final Customer? customer;
  final DateTime expectedCompletionDate;
  final DateTime? completedDate;
  final DateTime? assignedDate;
  final TaskStatus status;
  final bool isOtpRequired;
  final bool isGeoFenceRequired;
  final bool isPhotoRequired;
  final bool isFormRequired;

  /// From customFields.otpVerified when present (e.g. after OTP verification).
  final bool? isOtpVerified;

  /// From customFields.otpVerifiedAt when present.
  final DateTime? otpVerifiedAt;

  /// From progressSteps.photoProof when present.
  final bool? photoProof;

  /// URL of uploaded photo proof.
  final String? photoProofUrl;

  /// When photo proof was uploaded.
  final DateTime? photoProofUploadedAt;

  /// Company/workflow settings (read-only). Default false if not provided by API.
  final bool requireApprovalOnComplete;
  final bool autoApprove;

  final TaskLocation? sourceLocation;
  final TaskLocation? destinationLocation;

  /// Exit history – each exit is a separate record.
  final List<TaskExitRecord> tasksExit;

  /// Restart history – when task resumed after exit.
  final List<TaskRestartRecord> tasksRestarted;

  /// Destination change history.
  final List<TaskDestinationRecord> destinations;

  /// Trip completion details (stored when staff arrives).
  final double? tripDistanceKm;
  final int? tripDurationSeconds;
  final DateTime? arrivalTime;

  /// Start time (when task was started).
  final DateTime? startTime;

  /// Photo proof address (where photo was taken).
  final String? photoProofAddress;

  /// OTP verified address.
  final String? otpVerifiedAddress;

  Task({
    this.id,
    required this.taskId,
    required this.taskTitle,
    required this.description,
    required this.assignedTo,
    this.customerId,
    this.customer,
    required this.expectedCompletionDate,
    this.completedDate,
    this.assignedDate,
    required this.status,
    this.isOtpRequired = false,
    this.isGeoFenceRequired = false,
    this.isPhotoRequired = false,
    this.isFormRequired = false,
    this.isOtpVerified,
    this.otpVerifiedAt,
    this.photoProof,
    this.photoProofUrl,
    this.photoProofUploadedAt,
    this.requireApprovalOnComplete = false,
    this.autoApprove = false,
    this.sourceLocation,
    this.destinationLocation,
    this.tasksExit = const [],
    this.tasksRestarted = const [],
    this.destinations = const [],
    this.tripDistanceKm,
    this.tripDurationSeconds,
    this.arrivalTime,
    this.startTime,
    this.photoProofAddress,
    this.otpVerifiedAddress,
  });

  factory Task.fromJson(Map<String, dynamic> json) {
    final customerIdVal = json['customerId'];
    final customer = customerIdVal is Map
        ? Customer.fromJson(Map<String, dynamic>.from(customerIdVal))
        : (json['customer'] is Map
              ? Customer.fromJson(
                  Map<String, dynamic>.from(json['customer'] as Map),
                )
              : null);
    return Task(
      id: _stringFromId(json['_id']),
      taskId: (json['taskId'] as String?) ?? '',
      taskTitle: (json['taskTitle'] as String?) ?? '',
      description: (json['description'] as String?) ?? '',
      assignedTo: _stringFromId(json['assignedTo']) ?? '',
      customerId: _stringFromId(customerIdVal),
      customer: customer,
      expectedCompletionDate:
          _dateFromJson(json['expectedCompletionDate']) ?? DateTime.now(),
      completedDate: _dateFromJson(json['completedDate']),
      assignedDate:
          _dateFromJson(json['assignedDate']) ??
          _dateFromJson(json['createdAt']),
      status: statusFromJson((json['status'] as String?) ?? ''),
      isOtpRequired:
          (json['customFields'] != null
              ? (json['customFields']['otpRequired'] as bool?)
              : null) ??
          (json['isOtpRequired'] as bool?) ??
          false,
      isGeoFenceRequired: json['customFields'] != null
          ? (json['customFields']['geoFenceRequired'] as bool?) ?? false
          : false,
      isPhotoRequired: json['customFields'] != null
          ? (json['customFields']['photoRequired'] as bool?) ?? false
          : false,
      isFormRequired: json['customFields'] != null
          ? (json['customFields']['formRequired'] as bool?) ?? false
          : false,
      isOtpVerified:
          (json['customFields']?['otpVerified'] as bool?) ??
          (json['progressSteps']?['otpVerified'] as bool?),
      otpVerifiedAt: _dateFromJson(
        json['customFields']?['otpVerifiedAt'] ?? json['otpVerifiedAt'],
      ),
      photoProof: json['progressSteps'] != null
          ? (json['progressSteps']['photoProof'] as bool?)
          : null,
      photoProofUrl: json['photoProofUrl'] as String?,
      photoProofUploadedAt: _dateFromJson(json['photoProofUploadedAt']),
      requireApprovalOnComplete:
          (json['requireApprovalOnComplete'] as bool?) ??
          (json['settings'] != null
              ? (json['settings']['requireApprovalOnComplete'] as bool?) ??
                    false
              : false),
      autoApprove:
          (json['autoApprove'] as bool?) ??
          (json['settings'] != null
              ? (json['settings']['autoApprove'] as bool?) ?? false
              : false),
      sourceLocation: json['sourceLocation'] != null
          ? TaskLocation.fromJson(
              json['sourceLocation'] as Map<String, dynamic>,
            )
          : null,
      destinationLocation: json['destinationLocation'] != null
          ? TaskLocation.fromJson(
              json['destinationLocation'] as Map<String, dynamic>,
            )
          : null,
      tasksExit: _parseList(json['tasks_exit'], TaskExitRecord.fromJson),
      tasksRestarted: _parseList(
        json['tasks_restarted'],
        TaskRestartRecord.fromJson,
      ),
      destinations: _parseList(
        json['destinations'],
        TaskDestinationRecord.fromJson,
      ),
      tripDistanceKm: (json['tripDistanceKm'] as num?)?.toDouble(),
      tripDurationSeconds: json['tripDurationSeconds'] as int?,
      arrivalTime: _dateFromJson(json['arrivalTime']),
      startTime: _dateFromJson(json['startTime']),
      photoProofAddress: json['photoProofAddress'] as String?,
      otpVerifiedAddress: json['otpVerifiedAddress'] as String?,
    );
  }

  static String? _stringFromId(dynamic value) {
    if (value == null) return null;
    if (value is String) return value;
    if (value is Map<dynamic, dynamic>) {
      final oid = value[r'$oid'];
      if (oid != null) return oid is String ? oid : oid.toString();
      final id = value['_id'];
      if (id != null) return id is String ? id : id.toString();
    }
    return value.toString();
  }

  static DateTime? _dateFromJson(dynamic value) {
    if (value == null) return null;
    if (value is String) return DateTime.tryParse(value);
    if (value is Map<dynamic, dynamic>) {
      final dateStr = value[r'$date'];
      if (dateStr != null) return DateTime.tryParse(dateStr.toString());
    }
    return null;
  }

  /// Backend expects snake_case: in_progress, not inProgress.
  static String statusToApiString(TaskStatus s) {
    switch (s) {
      case TaskStatus.inProgress:
        return 'in_progress';
      default:
        return s.name;
    }
  }

  static TaskStatus statusFromJson(String status) {
    switch (status.toLowerCase()) {
      case 'assigned':
      case 'assigned tasks':
        return TaskStatus.assigned;
      case 'pending':
      case 'pending tasks':
        return TaskStatus.pending;
      case 'scheduled':
      case 'scheduled tasks':
        return TaskStatus.scheduled;
      case 'in_progress':
      case 'in progress':
        return TaskStatus.inProgress;
      case 'completed':
      case 'completed tasks':
        return TaskStatus.completed;
      case 'arrived':
        return TaskStatus.arrived;
      case 'exited':
        return TaskStatus.exited;
      case 'approved':
        return TaskStatus.approved;
      case 'rejected':
        return TaskStatus.rejected;
      case 'cancelled':
      case 'cancelled tasks':
        return TaskStatus.cancelled;
      case 'reopened':
        return TaskStatus.reopened;
      default:
        return TaskStatus.onlineReady;
    }
  }

  Map<String, dynamic> toJson() => {
    '_id': id,
    'taskId': taskId,
    'taskTitle': taskTitle,
    'description': description,
    'assignedTo': assignedTo,
    'customerId': customerId,
    'expectedCompletionDate': expectedCompletionDate.toIso8601String(),
    'completedDate': completedDate?.toIso8601String(),
    'status': status.name, // Convert enum to string for JSON
    'isOtpRequired': isOtpRequired,
    'isGeoFenceRequired': isGeoFenceRequired,
    'isPhotoRequired': isPhotoRequired,
    'isFormRequired': isFormRequired,
  };

  Task copyWith({
    String? id,
    String? taskId,
    String? taskTitle,
    String? description,
    String? assignedTo,
    String? customerId,
    Customer? customer,
    DateTime? expectedCompletionDate,
    DateTime? completedDate,
    DateTime? assignedDate,
    TaskStatus? status,
    bool? isOtpRequired,
    bool? isGeoFenceRequired,
    bool? isPhotoRequired,
    bool? isFormRequired,
    bool? isOtpVerified,
    DateTime? otpVerifiedAt,
    bool? photoProof,
    String? photoProofUrl,
    DateTime? photoProofUploadedAt,
    bool? requireApprovalOnComplete,
    bool? autoApprove,
    TaskLocation? sourceLocation,
    TaskLocation? destinationLocation,
    List<TaskExitRecord>? tasksExit,
    List<TaskRestartRecord>? tasksRestarted,
    List<TaskDestinationRecord>? destinations,
    double? tripDistanceKm,
    int? tripDurationSeconds,
    DateTime? arrivalTime,
    DateTime? startTime,
    String? photoProofAddress,
    String? otpVerifiedAddress,
  }) {
    return Task(
      id: id ?? this.id,
      taskId: taskId ?? this.taskId,
      taskTitle: taskTitle ?? this.taskTitle,
      description: description ?? this.description,
      assignedTo: assignedTo ?? this.assignedTo,
      customerId: customerId ?? this.customerId,
      customer: customer ?? this.customer,
      expectedCompletionDate:
          expectedCompletionDate ?? this.expectedCompletionDate,
      completedDate: completedDate ?? this.completedDate,
      assignedDate: assignedDate ?? this.assignedDate,
      status: status ?? this.status,
      isOtpRequired: isOtpRequired ?? this.isOtpRequired,
      isGeoFenceRequired: isGeoFenceRequired ?? this.isGeoFenceRequired,
      isPhotoRequired: isPhotoRequired ?? this.isPhotoRequired,
      isFormRequired: isFormRequired ?? this.isFormRequired,
      isOtpVerified: isOtpVerified ?? this.isOtpVerified,
      otpVerifiedAt: otpVerifiedAt ?? this.otpVerifiedAt,
      photoProof: photoProof ?? this.photoProof,
      photoProofUrl: photoProofUrl ?? this.photoProofUrl,
      photoProofUploadedAt: photoProofUploadedAt ?? this.photoProofUploadedAt,
      requireApprovalOnComplete:
          requireApprovalOnComplete ?? this.requireApprovalOnComplete,
      autoApprove: autoApprove ?? this.autoApprove,
      sourceLocation: sourceLocation ?? this.sourceLocation,
      destinationLocation: destinationLocation ?? this.destinationLocation,
      tasksExit: tasksExit ?? this.tasksExit,
      tasksRestarted: tasksRestarted ?? this.tasksRestarted,
      destinations: destinations ?? this.destinations,
      tripDistanceKm: tripDistanceKm ?? this.tripDistanceKm,
      tripDurationSeconds: tripDurationSeconds ?? this.tripDurationSeconds,
      arrivalTime: arrivalTime ?? this.arrivalTime,
      startTime: startTime ?? this.startTime,
      photoProofAddress: photoProofAddress ?? this.photoProofAddress,
      otpVerifiedAddress: otpVerifiedAddress ?? this.otpVerifiedAddress,
    );
  }
}

/// Timeline event from completion report (DB: tasks + trackings).
class TimelineEvent {
  final String type;
  final String label;
  final DateTime? time;
  final String? address;
  final double? lat;
  final double? lng;
  final String? exitReason;
  final String? movementType;

  const TimelineEvent({
    required this.type,
    required this.label,
    this.time,
    this.address,
    this.lat,
    this.lng,
    this.exitReason,
    this.movementType,
  });

  factory TimelineEvent.fromJson(Map<String, dynamic> json) {
    final timeVal = json['time'];
    DateTime? time;
    if (timeVal != null) {
      if (timeVal is String)
        time = DateTime.tryParse(timeVal);
      else if (timeVal is Map && timeVal[r'$date'] != null) {
        time = DateTime.tryParse(timeVal[r'$date'].toString());
      }
    }
    return TimelineEvent(
      type: (json['type'] as String?) ?? '',
      label: (json['label'] as String?) ?? '',
      time: time,
      address: json['address'] as String?,
      lat: (json['lat'] as num?)?.toDouble(),
      lng: (json['lng'] as num?)?.toDouble(),
      exitReason: json['exitReason'] as String?,
      movementType: json['movementType'] as String?,
    );
  }
}

/// Route point for polyline.
class RoutePoint {
  final double lat;
  final double lng;
  final DateTime? timestamp;
  final String? movementType;
  final String? address;

  const RoutePoint({
    required this.lat,
    required this.lng,
    this.timestamp,
    this.movementType,
    this.address,
  });

  factory RoutePoint.fromJson(Map<String, dynamic> json) {
    final ts = json['timestamp'];
    DateTime? time;
    if (ts != null) {
      if (ts is String)
        time = DateTime.tryParse(ts);
      else if (ts is Map && ts[r'$date'] != null) {
        time = DateTime.tryParse(ts[r'$date'].toString());
      }
    }
    return RoutePoint(
      lat: (json['lat'] as num?)?.toDouble() ?? 0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0,
      timestamp: time,
      movementType: json['movementType'] as String?,
      address: json['address'] as String?,
    );
  }
}

/// Full task completion report from API.
class TaskCompletionReport {
  final Task task;
  final List<TimelineEvent> timeline;
  final List<RoutePoint> routePoints;

  const TaskCompletionReport({
    required this.task,
    required this.timeline,
    required this.routePoints,
  });

  factory TaskCompletionReport.fromJson(Map<String, dynamic> json) {
    final taskJson = json['task'] as Map<String, dynamic>?;
    final task = taskJson != null
        ? Task.fromJson(taskJson)
        : throw Exception('Task required');
    final timelineList = json['timeline'] as List<dynamic>? ?? [];
    final timeline = timelineList
        .map((e) => TimelineEvent.fromJson(e as Map<String, dynamic>))
        .toList();
    final routeList = json['routePoints'] as List<dynamic>? ?? [];
    final routePoints = routeList
        .map((e) => RoutePoint.fromJson(e as Map<String, dynamic>))
        .toList();
    return TaskCompletionReport(
      task: task,
      timeline: timeline,
      routePoints: routePoints,
    );
  }
}
