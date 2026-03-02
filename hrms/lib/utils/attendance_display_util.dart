/// Utilities for displaying attendance status with leave type (CL/SL etc.)
class AttendanceDisplayUtil {
  /// Converts leave type name to abbreviation for display.
  /// Input is trimmed and lowercased. CL = Casual Leave, SL = Sick Leave (e.g. "Sick Leave", "sick").
  static String leaveTypeToAbbreviation(String? leaveType) {
    if (leaveType == null || leaveType.isEmpty) return '';
    final normalized = leaveType.trim().toLowerCase();
    if (normalized == 'casual' || normalized.contains('casual')) return 'CL';
    // "Sick Leave", "sick leave", "sick" -> SL
    if (normalized == 'sick' ||
        normalized == 'sick leave' ||
        normalized.contains('sick')) {
      return 'SL';
    }
    if (normalized == 'earned' || normalized.contains('earned')) return 'EL';
    // Fallback: first two letters uppercase (e.g. "Other" -> "OT")
    final trimmed = leaveType.trim();
    if (trimmed.length >= 2) {
      return trimmed.substring(0, 2).toUpperCase();
    }
    return trimmed.toUpperCase();
  }

  /// Returns display string for attendance status.
  /// When status is Present (or Approved) and leaveType is set, appends (CL)/(SL) etc.
  /// For Half Day, appends session when provided (e.g. "Half Day (Session 1)").
  static String formatAttendanceDisplayStatus(
    String? status, [
    String? leaveType,
    String? session,
  ]) {
    final s = status ?? 'Present';
    if (s == 'Half Day' && session != null && session.isNotEmpty) {
      final sessionLabel = session == '1'
          ? 'Session 1'
          : (session == '2' ? 'Session 2' : session);
      return 'Half Day ($sessionLabel)';
    }
    final abbr = leaveTypeToAbbreviation(leaveType);
    if (abbr.isEmpty) return s;
    if (s == 'Present' || s == 'Approved') return 'Present ($abbr)';
    return s;
  }
}
