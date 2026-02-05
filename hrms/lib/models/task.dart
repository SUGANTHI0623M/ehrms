import 'package:hrms/models/customer.dart';

class TaskLocation {
  final double lat;
  final double lng;
  final String? address;

  const TaskLocation({required this.lat, required this.lng, this.address});

  factory TaskLocation.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const TaskLocation(lat: 0, lng: 0);
    return TaskLocation(
      lat: (json['lat'] as num?)?.toDouble() ?? 0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0,
      address: json['address'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'lat': lat,
    'lng': lng,
    if (address != null) 'address': address,
  };
}

enum TaskStatus {
  onlineReady,
  assigned,
  approved,
  pending,
  scheduled,
  inProgress,
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

  /// Company/workflow settings (read-only). Default false if not provided by API.
  final bool requireApprovalOnComplete;
  final bool autoApprove;

  final TaskLocation? sourceLocation;
  final TaskLocation? destinationLocation;

  /// Trip completion details (stored when staff arrives).
  final double? tripDistanceKm;
  final int? tripDurationSeconds;
  final DateTime? arrivalTime;

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
    this.requireApprovalOnComplete = false,
    this.autoApprove = false,
    this.sourceLocation,
    this.destinationLocation,
    this.tripDistanceKm,
    this.tripDurationSeconds,
    this.arrivalTime,
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
      isOtpVerified: json['customFields'] != null
          ? (json['customFields']['otpVerified'] as bool?)
          : (json['progressSteps'] != null
                ? (json['progressSteps']['otpVerified'] as bool?)
                : null),
      otpVerifiedAt: json['customFields'] != null
          ? _dateFromJson(json['customFields']['otpVerifiedAt'])
          : null,
      photoProof: json['progressSteps'] != null
          ? (json['progressSteps']['photoProof'] as bool?)
          : null,
      photoProofUrl: json['photoProofUrl'] as String?,
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
      tripDistanceKm: (json['tripDistanceKm'] as num?)?.toDouble(),
      tripDurationSeconds: json['tripDurationSeconds'] as int?,
      arrivalTime: _dateFromJson(json['arrivalTime']),
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
    bool? requireApprovalOnComplete,
    bool? autoApprove,
    TaskLocation? sourceLocation,
    TaskLocation? destinationLocation,
    double? tripDistanceKm,
    int? tripDurationSeconds,
    DateTime? arrivalTime,
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
      requireApprovalOnComplete:
          requireApprovalOnComplete ?? this.requireApprovalOnComplete,
      autoApprove: autoApprove ?? this.autoApprove,
      sourceLocation: sourceLocation ?? this.sourceLocation,
      destinationLocation: destinationLocation ?? this.destinationLocation,
      tripDistanceKm: tripDistanceKm ?? this.tripDistanceKm,
      tripDurationSeconds: tripDurationSeconds ?? this.tripDurationSeconds,
      arrivalTime: arrivalTime ?? this.arrivalTime,
    );
  }
}
