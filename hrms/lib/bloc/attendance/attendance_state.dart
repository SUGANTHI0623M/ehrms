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
  final bool isCheckedIn;
  final bool isCompleted;
  final bool isToday;
  const AttendanceStatusLoaded({
    this.branchData,
    this.checkInAllowed = true,
    this.checkOutAllowed = true,
    this.halfDayLeaveMessage,
    this.isCheckedIn = false,
    this.isCompleted = false,
    this.isToday = true,
  });
  @override
  List<Object?> get props => [
        branchData,
        checkInAllowed,
        checkOutAllowed,
        halfDayLeaveMessage,
        isCheckedIn,
        isCompleted,
        isToday,
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
