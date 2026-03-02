part of 'attendance_bloc.dart';

/// States for attendance. BLoC emits these; UI renders accordingly.
abstract class AttendanceState extends Equatable {
  const AttendanceState();
  @override
  List<Object?> get props => [];
}

class AttendanceInitial extends AttendanceState {}

class AttendanceLoadInProgress extends AttendanceState {}

/// Status for a date loaded (branch, flags, isCheckedIn, isCompleted, etc.).
class AttendanceStatusLoaded extends AttendanceState {
  final Map<String, dynamic>? branchData;
  final bool checkInAllowed;
  final bool checkOutAllowed;
  final String? halfDayLeaveMessage;

  /// "First Half Day" | "Second Half Day" from halfDayLeave, for snackbar messages.
  final String? halfDayType;
  final bool isCheckedIn;
  final bool isCompleted;
  final bool isToday;
  /// Punch-in time (when isCheckedIn) for working hours and "Checked in at" display.
  final DateTime? punchInTime;
  const AttendanceStatusLoaded({
    this.branchData,
    this.checkInAllowed = true,
    this.checkOutAllowed = true,
    this.halfDayLeaveMessage,
    this.halfDayType,
    this.isCheckedIn = false,
    this.isCompleted = false,
    this.isToday = true,
    this.punchInTime,
  });
  @override
  List<Object?> get props => [
    branchData,
    checkInAllowed,
    checkOutAllowed,
    halfDayLeaveMessage,
    halfDayType,
    isCheckedIn,
    isCompleted,
    isToday,
    punchInTime,
  ];
}

class AttendanceCheckInSuccess extends AttendanceState {}

class AttendanceCheckOutSuccess extends AttendanceState {}

class AttendanceFailure extends AttendanceState {
  final String message;
  const AttendanceFailure({required this.message});
  @override
  List<Object?> get props => [message];
}
