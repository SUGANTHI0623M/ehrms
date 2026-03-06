import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import '../../config/app_colors.dart';
import '../../config/constants.dart';
import '../../utils/error_message_utils.dart';
import '../../utils/snackbar_utils.dart';
import '../../widgets/bottom_navigation_bar.dart';
import '../../services/attendance_service.dart';
import '../../services/attendance_template_store.dart';
import '../../services/auth_service.dart';
import '../../services/presence_tracking_service.dart';
import '../../bloc/attendance/attendance_bloc.dart';
import '../../utils/face_detection_helper.dart';
import 'home_dashboard_screen.dart';
import '../attendance/attendance_screen.dart';
import '../attendance/selfie_camera_screen.dart';
import '../holidays/holidays_screen.dart';
import '../requests/my_requests_screen.dart';
import '../salary/salary_overview_screen.dart';

class DashboardScreen extends StatefulWidget {
  /// 0=Dashboard, 1=Requests, 2=Salary, 3=Holidays, 4=Attendance, 5 maps to 4 (Attendance).
  final int? initialIndex;
  const DashboardScreen({super.key, this.initialIndex});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late int _currentIndex;
  int _requestsSubTabIndex = 0;
  int _attendanceSubTabIndex = 0;
  bool _isSubmittingFromFingerprint = false;

  final AttendanceService _attendanceService = AttendanceService();
  final AuthService _authService = AuthService();

  @override
  void initState() {
    super.initState();
    _currentIndex = _normalizeTabIndex((widget.initialIndex ?? 0));
    PresenceTrackingService().startTracking();
  }

  int _normalizeTabIndex(int index) {
    if (index == 5) return 4;
    return index.clamp(0, 4);
  }

  void _onDrawerNavigateToIndex(int index) {
    final normalized = _normalizeTabIndex(index);
    if (index >= 0 && (index <= 4 || index == 5)) {
      setState(() => _currentIndex = normalized);
    }
  }

  void _onDashboardNavigate(int index, {int subTabIndex = 0}) {
    final normalized = _normalizeTabIndex(index);
    if (index < 0 || index > 5) return;
    if (!mounted) return;
    setState(() {
      _currentIndex = normalized;
      if (index == 1) _requestsSubTabIndex = subTabIndex;
      if (normalized == 4) _attendanceSubTabIndex = subTabIndex;
    });
  }

  /// Fetches current position and address. Returns null position on failure.
  Future<({Position? position, String address, String? area, String? city, String? pincode})>
      _getCurrentLocation() async {
    String address = '';
    String? area;
    String? city;
    String? pincode;
    Position? position;
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return (position: null, address: '', area: null, city: null, pincode: null);
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return (position: null, address: '', area: null, city: null, pincode: null);
      }
      position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      final placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );
      if (placemarks.isNotEmpty) {
        final p = placemarks[0];
        area = p.subLocality ?? p.locality ?? p.name;
        city = p.locality ?? p.administrativeArea;
        pincode = p.postalCode;
        final parts = <String>[];
        if (p.name != null && p.name!.isNotEmpty) parts.add(p.name!);
        if (p.street != null && p.street!.isNotEmpty && p.street != p.name) parts.add(p.street!);
        if (p.subLocality != null && p.subLocality!.isNotEmpty) parts.add(p.subLocality!);
        if (p.locality != null && p.locality!.isNotEmpty) parts.add(p.locality!);
        if (p.postalCode != null && p.postalCode!.isNotEmpty) parts.add(p.postalCode!);
        address = parts.join(', ');
      } else {
        address = 'Lat: ${position.latitude}, Lng: ${position.longitude}';
      }
    } catch (_) {
      address = 'Location found (Address unavailable)';
    }
    return (position: position, address: address, area: area, city: city, pincode: pincode);
  }

  Future<void> _submitAttendanceFromFile(
    BuildContext context,
    File file, {
    Position? position,
    String? address,
    String? area,
    String? city,
    String? pincode,
  }) async {
    final result = await FaceDetectionHelper.detectFromFile(file);
    if (!mounted) return;
    if (!result.valid) {
      _isSubmittingFromFingerprint = false;
      Navigator.of(context).pop();
      SnackBarUtils.showSnackBar(
        context,
        result.message ?? 'Please take a selfie with exactly one face visible.',
        isError: true,
      );
      return;
    }

    // Use pre-fetched location if provided; otherwise fetch now
    Position? usePosition = position;
    String useAddress = address ?? '';
    String? useArea = area;
    String? useCity = city;
    String? usePincode = pincode;
    if (usePosition == null && address == null) {
      final loc = await _getCurrentLocation();
      usePosition = loc.position;
      useAddress = loc.address;
      useArea = loc.area;
      useCity = loc.city;
      usePincode = loc.pincode;
    }

    final stored = await AttendanceTemplateStore.loadTemplateDetails();
    final template = stored != null && stored['template'] != null
        ? (stored['template'] is Map<String, dynamic>
            ? stored['template'] as Map<String, dynamic>
            : Map<String, dynamic>.from(stored['template'] as Map))
        : null;
    final requireSelfie = template?['requireSelfie'] ?? true;
    final requireGeolocation = template?['requireGeolocation'] ?? true;
    if (requireGeolocation && usePosition == null) {
      if (mounted) {
        _isSubmittingFromFingerprint = false;
        Navigator.of(context).pop();
        SnackBarUtils.showSnackBar(context, 'Could not get location.', isError: true);
      }
      return;
    }

    final todayRes = await _attendanceService.getTodayAttendance();
    bool isCheckedIn = false;
    if (todayRes['data'] is Map<String, dynamic>) {
      final d = todayRes['data'] as Map<String, dynamic>;
      final punchIn = d['punchIn'];
      final punchOut = d['punchOut'];
      final hasIn = punchIn != null && punchIn.toString().isNotEmpty;
      final hasOut = punchOut != null && punchOut.toString().isNotEmpty;
      isCheckedIn = hasIn && !hasOut;
    }

    List<int> imageBytes = await file.readAsBytes();
    String base64Image = base64Encode(imageBytes);
    final selfiePayload = 'data:image/jpeg;base64,$base64Image';

    if (AppConstants.enableAttendanceFaceMatching &&
        requireSelfie &&
        selfiePayload.isNotEmpty) {
      try {
        final verify = await _authService.verifyFace(selfiePayload);
        if (!mounted) return;
        if (verify['success'] != true || verify['match'] != true) {
          _isSubmittingFromFingerprint = false;
          Navigator.of(context).pop();
          SnackBarUtils.showSnackBar(
            context,
            ErrorMessageUtils.sanitizeForDisplay(
              verify['message']?.toString() ?? 'Face not matching.',
            ),
            isError: true,
          );
          return;
        }
      } catch (_) {
        if (mounted) {
          _isSubmittingFromFingerprint = false;
          Navigator.of(context).pop();
          SnackBarUtils.showSnackBar(context, 'Face verification failed. Please try again.', isError: true);
        }
        return;
      }
    }

    if (!mounted) return;
    final lat = usePosition?.latitude ?? 0.0;
    final lng = usePosition?.longitude ?? 0.0;
    if (isCheckedIn) {
      context.read<AttendanceBloc>().add(
        AttendanceCheckOutRequested(
          lat: lat,
          lng: lng,
          address: useAddress,
          area: useArea,
          city: useCity,
          pincode: usePincode,
          selfie: selfiePayload,
        ),
      );
    } else {
      context.read<AttendanceBloc>().add(
        AttendanceCheckInRequested(
          lat: lat,
          lng: lng,
          address: useAddress,
          area: useArea,
          city: useCity,
          pincode: usePincode,
          selfie: selfiePayload,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = [
      HomeDashboardScreen(
        onNavigate: _onDashboardNavigate,
        embeddedInDashboard: true,
        onNavigateToIndex: _onDrawerNavigateToIndex,
        dashboardTabIndex: _currentIndex,
        isActiveTab: _currentIndex == 0,
      ),
      MyRequestsScreen(
        key: ValueKey('Requests_$_requestsSubTabIndex'),
        initialTabIndex: _requestsSubTabIndex,
        dashboardTabIndex: _currentIndex,
        onNavigateToIndex: _onDrawerNavigateToIndex,
      ),
      SalaryOverviewScreen(
        dashboardTabIndex: _currentIndex,
        onNavigateToIndex: _onDrawerNavigateToIndex,
        isActiveTab: _currentIndex == 2,
      ),
      HolidaysScreen(
        dashboardTabIndex: _currentIndex,
        onNavigateToIndex: _onDrawerNavigateToIndex,
      ),
      AttendanceScreen(
        key: ValueKey('Attendance_$_attendanceSubTabIndex'),
        initialTabIndex: _attendanceSubTabIndex,
        dashboardTabIndex: _currentIndex,
        onNavigateToIndex: _onDrawerNavigateToIndex,
        isActiveTab: _currentIndex == 4,
      ),
    ];

    return BlocListener<AttendanceBloc, AttendanceState>(
      listener: (context, state) async {
        if (state is AttendanceCheckInSuccess) {
          if (_isSubmittingFromFingerprint) {
            _isSubmittingFromFingerprint = false;
            if (mounted) Navigator.of(context).pop();
            if (mounted) {
              SnackBarUtils.showSnackBar(
                context,
                'Checked In Successfully!',
                backgroundColor: AppColors.primary,
              );
            }
            await PresenceTrackingService().setTrackingAllowed();
            PresenceTrackingService().startTracking();
          } else {
            await PresenceTrackingService().setTrackingAllowed();
            PresenceTrackingService().startTracking();
          }
        } else if (state is AttendanceCheckOutSuccess) {
          if (_isSubmittingFromFingerprint) {
            _isSubmittingFromFingerprint = false;
            if (mounted) Navigator.of(context).pop();
            if (mounted) {
              SnackBarUtils.showSnackBar(
                context,
                'Checked Out Successfully!',
                backgroundColor: AppColors.primary,
              );
            }
            await PresenceTrackingService().stopTracking();
          } else {
            await PresenceTrackingService().stopTracking();
          }
        } else if (state is AttendanceFailure && _isSubmittingFromFingerprint) {
          _isSubmittingFromFingerprint = false;
          if (mounted) Navigator.of(context).pop();
          if (mounted) {
            SnackBarUtils.showSnackBar(
              context,
              ErrorMessageUtils.sanitizeForDisplay(state.message),
              isError: true,
            );
          }
        }
      },
      child: PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, result) {
          if (didPop) return;
          if (_currentIndex != 0) {
            setState(() => _currentIndex = 0);
          } else {
            // Dashboard is the root route (pushReplacement from splash/login).
            // Popping would leave empty stack = black screen. Exit app instead.
            SystemNavigator.pop();
          }
        },
        child: Scaffold(
          body: IndexedStack(
            index: _currentIndex.clamp(0, screens.length - 1),
            children: screens,
          ),
          bottomNavigationBar: AppBottomNavigationBar(
            currentIndex: _currentIndex.clamp(0, 5),
            onTap: (index) async {
              if (index == 5) {
                // Get location before opening camera
                showDialog(
                  context: context,
                  barrierDismissible: false,
                  builder: (ctx) => const AlertDialog(
                    content: Row(
                      children: [
                        SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                        SizedBox(width: 16),
                        Text('Getting location…'),
                      ],
                    ),
                  ),
                );
                final location = await _getCurrentLocation();
                if (!mounted) return;
                Navigator.of(context).pop(); // Dismiss "Getting location..."
                final stored = await AttendanceTemplateStore.loadTemplateDetails();
                final template = stored != null && stored['template'] != null
                    ? (stored['template'] is Map<String, dynamic>
                        ? stored['template'] as Map<String, dynamic>
                        : Map<String, dynamic>.from(stored['template'] as Map))
                    : null;
                final requireGeolocation = template?['requireGeolocation'] ?? true;
                if (requireGeolocation && location.position == null) {
                  SnackBarUtils.showSnackBar(
                    context,
                    'Location is required. Please enable location and try again.',
                    isError: true,
                  );
                  return;
                }
                final locationStr = location.address.isNotEmpty
                    ? location.address
                    : (location.area != null
                        ? '${location.area}, ${location.city ?? ''}${location.pincode != null ? ' ${location.pincode}' : ''}'
                        : null);
                final result = await SelfieCameraScreen.captureSelfie(
                  context,
                  location: locationStr,
                  onRefreshLocation: () async {
                    final loc = await _getCurrentLocation();
                    return loc.address.isNotEmpty
                        ? loc.address
                        : (loc.area != null
                            ? '${loc.area}, ${loc.city ?? ''}${loc.pincode != null ? ' ${loc.pincode}' : ''}'
                            : null);
                  },
                );
                if (!mounted) return;
                File? file;
                if (result is File) {
                  file = result;
                } else if (identical(result, useImagePickerFallback)) {
                  SnackBarUtils.showSnackBar(
                    context,
                    'Camera unavailable. Try again from Attendance.',
                    isError: true,
                  );
                  return;
                }
                if (file == null) return; // Cancelled
                _isSubmittingFromFingerprint = true;
                showDialog(
                  context: context,
                  barrierDismissible: false,
                  builder: (ctx) => const AlertDialog(
                    content: Row(
                      children: [
                        SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                        SizedBox(width: 16),
                        Text('Submitting attendance…'),
                      ],
                    ),
                  ),
                );
                await _submitAttendanceFromFile(
                  context,
                  file,
                  position: location.position,
                  address: location.address,
                  area: location.area,
                  city: location.city,
                  pincode: location.pincode,
                );
                return;
              }
              final normalized = _normalizeTabIndex(index);
              setState(() => _currentIndex = normalized);
            },
          ),
        ),
      ),
    );
  }

}
