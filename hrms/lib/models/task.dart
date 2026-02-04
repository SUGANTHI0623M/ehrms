import 'package:hrms/models/customer.dart';

enum TaskStatus {
  onlineReady,
  assigned,
  pending,
  scheduled,
  inProgress,
  completed,
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
  final TaskStatus status;
  final bool isOtpRequired;
  final bool isGeoFenceRequired;
  final bool isPhotoRequired;
  final bool isFormRequired;

  /// From customFields.otpVerified when present (e.g. after OTP verification).
  final bool? isOtpVerified;

  /// From customFields.otpVerifiedAt when present.
  final DateTime? otpVerifiedAt;

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
    required this.status,
    this.isOtpRequired = false,
    this.isGeoFenceRequired = false,
    this.isPhotoRequired = false,
    this.isFormRequired = false,
    this.isOtpVerified,
    this.otpVerifiedAt,
  });

  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: _stringFromId(json['_id']),
      taskId: (json['taskId'] as String?) ?? '',
      taskTitle: (json['taskTitle'] as String?) ?? '',
      description: (json['description'] as String?) ?? '',
      assignedTo: _stringFromId(json['assignedTo']) ?? '',
      customerId: _stringFromId(json['customerId']),
      expectedCompletionDate:
          _dateFromJson(json['expectedCompletionDate']) ?? DateTime.now(),
      completedDate: _dateFromJson(json['completedDate']),
      status: statusFromJson((json['status'] as String?) ?? ''),
      isOtpRequired: json['customFields'] != null
          ? (json['customFields']['otpRequired'] as bool?) ?? false
          : false,
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
          : null,
      otpVerifiedAt: json['customFields'] != null
          ? _dateFromJson(json['customFields']['otpVerifiedAt'])
          : null,
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
    TaskStatus? status,
    bool? isOtpRequired,
    bool? isGeoFenceRequired,
    bool? isPhotoRequired,
    bool? isFormRequired,
    bool? isOtpVerified,
    DateTime? otpVerifiedAt,
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
      status: status ?? this.status,
      isOtpRequired: isOtpRequired ?? this.isOtpRequired,
      isGeoFenceRequired: isGeoFenceRequired ?? this.isGeoFenceRequired,
      isPhotoRequired: isPhotoRequired ?? this.isPhotoRequired,
      isFormRequired: isFormRequired ?? this.isFormRequired,
      isOtpVerified: isOtpVerified ?? this.isOtpVerified,
      otpVerifiedAt: otpVerifiedAt ?? this.otpVerifiedAt,
    );
  }
}
