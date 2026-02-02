import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/app_colors.dart';
import '../../services/attendance_service.dart';
import '../../services/auth_service.dart';
import '../../utils/face_detection_helper.dart';
import '../../utils/snackbar_utils.dart';

class SelfieCheckInScreen extends StatefulWidget {
  final Map<String, dynamic>? template;
  final bool? isCheckedIn;
  final bool? isCompleted;

  const SelfieCheckInScreen({
    super.key,
    this.template,
    this.isCheckedIn,
    this.isCompleted,
  });

  @override
  State<SelfieCheckInScreen> createState() => _SelfieCheckInScreenState();
}

const String _kAttendancePermissionDialogShown =
    'attendance_permission_dialog_shown';

class _SelfieCheckInScreenState extends State<SelfieCheckInScreen> {
  final AttendanceService _attendanceService = AttendanceService();
  final AuthService _authService = AuthService();

  File? _imageFile;
  String? _address;
  String? _area;
  String? _city;
  String? _pincode;
  Position? _position;

  bool _isLoading = false;
  bool _isLocationLoading = true;
  bool _isDetectingFace = false;

  // Attendance State
  Map<String, dynamic>? _branchData; // New branch data for 'Assigned Office'
  bool _isCheckedIn = false;
  bool _isCompleted = false; // Punched out already
  bool _isStatusLoading = true;

  // Half-day leave: check-in/check-out allowed by session (from backend)
  bool _checkInAllowed = true;
  bool _checkOutAllowed = true;
  String? _halfDayLeaveMessage;

  bool _isToday = true;

  @override
  void initState() {
    super.initState();
    // Initialize with passed values to avoid flicker while fetching status
    _isCheckedIn = widget.isCheckedIn ?? false;
    _isCompleted = widget.isCompleted ?? false;
    // If we have passed values, we can consider initial status "loaded"
    // to allow immediate action while we refresh in background
    if (widget.isCheckedIn != null || widget.isCompleted != null) {
      _isStatusLoading = false;
    }

    _fetchAttendanceStatus();
    final bool requireGeolocation =
        widget.template?['requireGeolocation'] ?? true;
    if (requireGeolocation) {
      _determinePosition();
    } else {
      setState(() => _isLocationLoading = false);
    }
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => _maybeShowPermissionDialog(),
    );
  }

  Future<void> _maybeShowPermissionDialog() async {
    final requireSelfie = widget.template?['requireSelfie'] ?? true;
    final requireGeolocation = widget.template?['requireGeolocation'] ?? true;
    if (!requireSelfie && !requireGeolocation) return;
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(_kAttendancePermissionDialogShown) == true) return;
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (context) => AlertDialog(
        title: const Text('Camera & location'),
        content: const Text(
          'Camera is used for your attendance selfie; location is used to record your check-in and check-out place.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
    await prefs.setBool(_kAttendancePermissionDialogShown, true);
  }

  Future<void> _fetchAttendanceStatus([DateTime? date]) async {
    DateTime targetDate = date ?? DateTime.now();
    String formattedDate = targetDate.toIso8601String().split('T')[0];

    // Check if we are viewing today
    final now = DateTime.now();
    final todayStr = now.toIso8601String().split('T')[0];
    setState(() {
      _isToday = formattedDate == todayStr;
    });

    // Use getAttendanceByDate if implemented, or fallback
    // Note: You need to implement getAttendanceByDate in service or modify getTodayAttendance
    // For now we will assume getTodayAttendance handles the current day,
    // but we need a new method for historical data.
    // Let's use getAttendanceByDate we just added.

    final result = await _attendanceService.getAttendanceByDate(formattedDate);

    if (result['success'] && mounted) {
      final responseBody =
          result['data']; // This is now { data: ..., branch: ... }

      // Handle the nested structure
      var data = responseBody;
      var branch;
      if (responseBody != null &&
          (responseBody.containsKey('data') ||
              responseBody.containsKey('branch'))) {
        data = responseBody['data'];
        branch = responseBody['branch'];
      }

      setState(() {
        _branchData = branch;
        // Half-day leave: session-based check-in/check-out allowed (from backend)
        _checkInAllowed = responseBody['checkInAllowed'] ?? true;
        _checkOutAllowed = responseBody['checkOutAllowed'] ?? true;
        final halfDay = responseBody['halfDayLeave'];
        _halfDayLeaveMessage = halfDay is Map
            ? halfDay['message'] as String?
            : null;
        // Logic for check-in/out button only applies to TODAY
        if (data != null && _isToday) {
          _isCheckedIn = data['punchIn'] != null && data['punchOut'] == null;
          _isCompleted = data['punchIn'] != null && data['punchOut'] != null;
        } else if (!_isToday) {
          // Viewing past date - disable buttons or separate view
          _isCheckedIn = false;
          _isCompleted = true; // effectively disable actions
        } else {
          // No data for today yet
          _isCheckedIn = false;
          _isCompleted = false;
        }
        _isStatusLoading = false;
      });
    } else {
      if (mounted) {
        setState(() => _isStatusLoading = false);
      }
    }
  }

  Future<void> _determinePosition() async {
    setState(() => _isLocationLoading = true);
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (mounted) {
        SnackBarUtils.showSnackBar(
          context,
          'Location services are disabled.',
          isError: true,
        );
      }

      setState(() => _isLocationLoading = false);
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (mounted) {
          SnackBarUtils.showSnackBar(
            context,
            'Location permissions are denied',
            isError: true,
          );
        }

        setState(() => _isLocationLoading = false);
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      if (mounted) {
        SnackBarUtils.showSnackBar(
          context,
          'Location permissions are permanently denied.',
          isError: true,
        );
      }

      setState(() => _isLocationLoading = false);
      return;
    }

    try {
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      _position = position;

      // Reverse Geocoding
      List<Placemark> placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );

      if (placemarks.isNotEmpty) {
        Placemark place = placemarks[0];
        _area = place.subLocality ?? place.locality ?? place.name;
        _city = place.locality ?? place.administrativeArea;
        _pincode = place.postalCode;

        List<String> parts = [];
        if (place.name != null && place.name!.isNotEmpty) {
          parts.add(place.name!);
        }
        if (place.street != null &&
            place.street!.isNotEmpty &&
            place.street != place.name) {
          parts.add(place.street!);
        }
        if (place.subLocality != null && place.subLocality!.isNotEmpty) {
          parts.add(place.subLocality!);
        }
        if (place.locality != null && place.locality!.isNotEmpty) {
          parts.add(place.locality!);
        }
        if (place.postalCode != null && place.postalCode!.isNotEmpty) {
          parts.add(place.postalCode!);
        }

        _address = parts.join(', ');
      } else {
        _address = 'Lat: ${position.latitude}, Lng: ${position.longitude}';
      }
    } catch (e) {
      _address = 'Location found (Address unavailable)';
    } finally {
      if (mounted) setState(() => _isLocationLoading = false);
    }
  }

  Future<void> _takeSelfie() async {
    var status = await Permission.camera.status;
    if (!status.isGranted) {
      status = await Permission.camera.request();
      if (!mounted) return;
      if (!status.isGranted) {
        SnackBarUtils.showSnackBar(
          context,
          'Camera permission is needed to take a selfie. Please allow in app settings.',
          isError: true,
        );
        return;
      }
    }

    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(
      source: ImageSource.camera,
      preferredCameraDevice: CameraDevice.front,
      imageQuality: 85,
      maxWidth: 1024,
    );

    if (pickedFile == null || !mounted) return;

    final file = File(pickedFile.path);

    setState(() => _isDetectingFace = true);
    final result = await FaceDetectionHelper.detectFromFile(file);
    if (!mounted) return;
    setState(() => _isDetectingFace = false);

    if (!result.valid) {
      SnackBarUtils.showSnackBar(
        context,
        result.message ?? 'Please take a selfie with exactly one face visible.',
        isError: true,
      );
      return;
    }

    setState(() => _imageFile = file);
  }

  Future<void> _showWarningDialog(List<dynamic> warnings) async {
    if (warnings.isEmpty) return;

    // Get the first warning message
    final warning = warnings[0];
    final message = warning['message'] ?? 'Warning';

    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 28),
              const SizedBox(width: 8),
              const Text('Notice'),
            ],
          ),
          content: Text(message),
          actions: <Widget>[
            TextButton(
              child: const Text(
                'OK',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
          ],
        );
      },
    );
  }

  Future<void> _submitAttendance() async {
    final requireSelfie = widget.template?['requireSelfie'] ?? true;
    // Check if geolocation is required (default to true if not specified)
    final bool requireGeolocation =
        widget.template?['requireGeolocation'] ?? true;

    if (requireSelfie && _imageFile == null) {
      SnackBarUtils.showSnackBar(
        context,
        'Please take a selfie first!',
        isError: true,
      );

      return;
    }

    if (requireGeolocation && _position == null) {
      // Re-trigger location if missing and required
      _determinePosition();

      SnackBarUtils.showSnackBar(
        context,
        'Waiting for location...',
        backgroundColor: Colors.orange,
      );

      return;
    }

    setState(() => _isLoading = true);

    // Convert image to Base64
    String? selfiePayload;
    if (_imageFile != null) {
      List<int> imageBytes = await _imageFile!.readAsBytes();
      String base64Image = base64Encode(imageBytes);
      selfiePayload = 'data:image/jpeg;base64,$base64Image';
    }

    // Verify selfie against profile photo when selfie is required
    if (requireSelfie && selfiePayload != null && selfiePayload.isNotEmpty) {
      Map<String, dynamic> verify;
      try {
        verify = await _authService.verifyFace(selfiePayload);
      } catch (_) {
        if (!mounted) return;
        setState(() => _isLoading = false);
        SnackBarUtils.showSnackBar(
          context,
          'Face verification failed. Please try again.',
          isError: true,
        );
        return;
      }
      if (!mounted) return;
      if (!verify['success'] || verify['match'] != true) {
        setState(() => _isLoading = false);
        final msg =
            verify['message']?.toString() ??
            'Face not matching. Please try again.';
        SnackBarUtils.showSnackBar(context, msg, isError: true);
        return;
      }
      SnackBarUtils.showSnackBar(
        context,
        'Photo matched',
        backgroundColor: AppColors.success,
      );
    }

    Map<String, dynamic> result;

    if (_isCheckedIn) {
      result = await _attendanceService.checkOut(
        _position?.latitude ?? 0.0,
        _position?.longitude ?? 0.0,
        _address ?? '',
        area: _area,
        city: _city,
        pincode: _pincode,
        selfie: selfiePayload,
      );
    } else {
      result = await _attendanceService.checkIn(
        _position?.latitude ?? 0.0,
        _position?.longitude ?? 0.0,
        _address ?? '',
        area: _area,
        city: _city,
        pincode: _pincode,
        selfie: selfiePayload,
      );
    }

    if (mounted) {
      setState(() => _isLoading = false);
      if (result['success']) {
        SnackBarUtils.showSnackBar(
          context,
          _isCheckedIn
              ? 'Checked Out Successfully!'
              : 'Checked In Successfully!',
          backgroundColor: AppColors.success,
        );

        Navigator.pop(context, true); // Return success
      } else {
        SnackBarUtils.showSnackBar(
          context,
          result['message'] ?? 'Action failed',
          isError: true,
        );
      }
    }
  }

  bool get _isCheckInDisabled => !_isCheckedIn && !_checkInAllowed;
  bool get _isCheckOutDisabled => _isCheckedIn && !_checkOutAllowed;
  bool get _isButtonDisabled =>
      _isCompleted ||
      _isLoading ||
      _isStatusLoading ||
      _isCheckInDisabled ||
      _isCheckOutDisabled;

  @override
  Widget build(BuildContext context) {
    // Determine button text and state
    String buttonText = 'Check In';
    Color buttonColor = AppColors.primary;
    if (_isCompleted) {
      buttonText = 'Attendance Completed';
      buttonColor = Colors.grey;
    } else if (_isCheckedIn) {
      buttonText = 'Check Out';
      buttonColor = AppColors.error;
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Smart Attendance')),
      body: RefreshIndicator(
        onRefresh: () async {
          await _fetchAttendanceStatus();
          if (widget.template?['requireGeolocation'] ?? true) {
            await _determinePosition();
          }
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final screenHeight = MediaQuery.of(context).size.height;
              final padding = 12.0;
              final selfieCardHeight = (screenHeight * 0.52).clamp(
                400.0,
                600.0,
              );
              return Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: padding,
                  vertical: 16,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Branch Info Card
                    if (_branchData != null)
                      Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: AppColors.primary.withOpacity(0.2),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withOpacity(0.05),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  Icons.business_rounded,
                                  color: AppColors.primary,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Assigned Office',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _branchData!['name'] ?? 'Main Branch',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _branchData!['address'] ?? '',
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 10),

                    // Selfie Preview Area - full-width, large height
                    if (widget.template?['requireSelfie'] ?? true) ...[
                      GestureDetector(
                        onTap: (_isCompleted || _isDetectingFace)
                            ? null
                            : _takeSelfie,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            Container(
                              width: double.infinity,
                              height: selfieCardHeight,
                              decoration: BoxDecoration(
                                color: Colors.grey[200],
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(color: Colors.grey[300]!),
                                image: _imageFile != null
                                    ? DecorationImage(
                                        image: FileImage(_imageFile!),
                                        fit: BoxFit.cover,
                                      )
                                    : null,
                              ),
                              child: _imageFile == null && !_isDetectingFace
                                  ? Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          Icons.camera_alt_rounded,
                                          size: 60,
                                          color: Colors.grey[400],
                                        ),
                                        const SizedBox(height: 10),
                                        Text(
                                          'Tap to take selfie',
                                          style: TextStyle(
                                            color: Colors.grey[600],
                                            fontSize: 16,
                                          ),
                                        ),
                                      ],
                                    )
                                  : null,
                            ),
                            if (_isDetectingFace)
                              Positioned.fill(
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.black45,
                                    borderRadius: BorderRadius.circular(24),
                                  ),
                                  child: Center(
                                    child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const SizedBox(
                                          width: 32,
                                          height: 32,
                                          child: CircularProgressIndicator(
                                            color: Colors.white,
                                            strokeWidth: 2,
                                          ),
                                        ),
                                        const SizedBox(height: 12),
                                        Text(
                                          'Detecting face...',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontSize: 16,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],

                    // Location Info
                    if (widget.template?['requireGeolocation'] ?? true) ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.blue[50],
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.blue[100]!),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.location_on, color: AppColors.primary),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Current Location',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  _isLocationLoading
                                      ? const SizedBox(
                                          height: 15,
                                          width: 15,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                          ),
                                        )
                                      : Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            if (_position != null)
                                              Text(
                                                'Lat: ${_position!.latitude.toStringAsFixed(5)}, Lng: ${_position!.longitude.toStringAsFixed(5)}',
                                                style: TextStyle(
                                                  fontSize: 12,
                                                  color:
                                                      AppColors.textSecondary,
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                            const SizedBox(height: 4),
                                            Text(
                                              _address ?? 'Unknown Location',
                                              style: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                color: AppColors.textPrimary,
                                                fontSize: 14,
                                              ),
                                            ),
                                            if (_city != null ||
                                                _pincode != null)
                                              Padding(
                                                padding: const EdgeInsets.only(
                                                  top: 4.0,
                                                ),
                                                child: Text(
                                                  '${_city ?? ''} - ${_pincode ?? ''}',
                                                  style: const TextStyle(
                                                    fontSize: 13,
                                                    color:
                                                        AppColors.textSecondary,
                                                  ),
                                                ),
                                              ),
                                          ],
                                        ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: Icon(
                                Icons.refresh,
                                color: AppColors.primary,
                              ),
                              onPressed: _determinePosition,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),
                    ],

                    // Half-day leave message when check-in/check-out is blocked
                    if (_halfDayLeaveMessage != null &&
                        (_isCheckInDisabled || _isCheckOutDisabled)) ...[
                      Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.orange.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.orange.shade200),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.info_outline,
                              color: Colors.orange.shade700,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                _halfDayLeaveMessage!,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.orange.shade900,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    // Submit Button
                    if (_isStatusLoading && widget.isCheckedIn == null)
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: CircularProgressIndicator(),
                        ),
                      )
                    else
                      ElevatedButton(
                        onPressed: _isButtonDisabled ? null : _submitAttendance,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _isButtonDisabled
                              ? Colors.grey
                              : buttonColor,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 2,
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 24,
                                width: 24,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                            : Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    _isCheckedIn ? Icons.logout : Icons.login,
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    buttonText,
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                      ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
