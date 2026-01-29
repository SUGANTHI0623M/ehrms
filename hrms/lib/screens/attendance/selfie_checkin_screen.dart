import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import '../../config/app_colors.dart';
import '../../services/attendance_service.dart';
import '../../utils/snackbar_utils.dart';

class SelfieCheckInScreen extends StatefulWidget {
  final Map<String, dynamic>? template;
  const SelfieCheckInScreen({super.key, this.template});

  @override
  State<SelfieCheckInScreen> createState() => _SelfieCheckInScreenState();
}

class _SelfieCheckInScreenState extends State<SelfieCheckInScreen> {
  final AttendanceService _attendanceService = AttendanceService();
  final ImagePicker _picker = ImagePicker();

  File? _imageFile;
  String? _address;
  String? _area;
  String? _city;
  String? _pincode;
  Position? _position;

  bool _isLoading = false;
  bool _isLocationLoading = true;

  // Attendance State
  Map<String, dynamic>? _attendanceData;
  Map<String, dynamic>? _branchData; // New branch data for 'Assigned Office'
  bool _isCheckedIn = false;
  bool _isCompleted = false; // Punched out already

  DateTime _selectedDate = DateTime.now();
  bool _isToday = true;

  @override
  void initState() {
    super.initState();
    _fetchAttendanceStatus();
    final bool requireGeolocation =
        widget.template?['requireGeolocation'] ?? true;
    if (requireGeolocation) {
      _determinePosition();
    } else {
      setState(() => _isLocationLoading = false);
    }
  }

  Future<void> _fetchAttendanceStatus([DateTime? date]) async {
    DateTime targetDate = date ?? DateTime.now();
    String formattedDate = targetDate.toIso8601String().split('T')[0];

    // Check if we are viewing today
    final now = DateTime.now();
    final todayStr = now.toIso8601String().split('T')[0];
    setState(() {
      _isToday = formattedDate == todayStr;
      _selectedDate = targetDate;
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
        _attendanceData = data;
        _branchData = branch;
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
      });
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
      debugPrint('Error getting location: $e');
      _address = 'Location found (Address unavailable)';
    } finally {
      if (mounted) setState(() => _isLocationLoading = false);
    }
  }

  Future<void> _takeSelfie() async {
    final XFile? photo = await _picker.pickImage(
      source: ImageSource.camera,
      preferredCameraDevice: CameraDevice.front,
      imageQuality: 25, // Compress more to speed up upload
      maxWidth: 600,
    );

    if (photo != null) {
      setState(() {
        _imageFile = File(photo.path);
      });
    }
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
              Icon(
                Icons.warning_amber_rounded,
                color: Colors.orange,
                size: 28,
              ),
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

    Map<String, dynamic> result;

    if (_isCheckedIn) {
      // Check Out
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
      // Check In
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
        // If action was successful and allowed, proceed silently (no warnings shown)
        // Warnings are only generated when action is blocked, which would result in error response
        SnackBarUtils.showSnackBar(
          context,
          _isCheckedIn
              ? 'Checked Out Successfully!'
              : 'Checked In Successfully!',
          backgroundColor: AppColors.success,
        );

        Navigator.pop(context, true); // Return success
      } else {
        // Show error if the request failed (e.g., blocked by backend due to late entry/early exit not allowed)
        SnackBarUtils.showSnackBar(
          context,
          result['message'] ?? 'Action failed',
          isError: true,
        );
      }
    }
  }

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
      appBar: AppBar(
        title: const Text('Smart Attendance'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await _fetchAttendanceStatus();
          if (widget.template?['requireGeolocation'] ?? true) {
            await _determinePosition();
          }
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          // Handle small screens
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
              // Date Display removed as per request (Today only)

              // Branch Info Card
              if (_branchData != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 24),
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

              // Selfie Preview Area
              if (widget.template?['requireSelfie'] ?? true) ...[
                GestureDetector(
                  onTap: _isCompleted ? null : _takeSelfie,
                  child: Container(
                    height: 350,
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.grey[300]!),
                      image: _imageFile != null
                          ? DecorationImage(
                              image: FileImage(_imageFile!),
                              fit: BoxFit.cover,
                            )
                          : null,
                    ),
                    child: _imageFile == null
                        ? Column(
                            mainAxisAlignment: MainAxisAlignment.center,
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
                                            color: AppColors.textSecondary,
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
                                      if (_city != null || _pincode != null)
                                        Padding(
                                          padding: const EdgeInsets.only(
                                            top: 4.0,
                                          ),
                                          child: Text(
                                            '${_city ?? ''} - ${_pincode ?? ''}',
                                            style: const TextStyle(
                                              fontSize: 13,
                                              color: AppColors.textSecondary,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.refresh, color: AppColors.primary),
                        onPressed: _determinePosition,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),
              ],

              // Submit Button
              ElevatedButton(
                onPressed: (_isCompleted || _isLoading)
                    ? null
                    : _submitAttendance,
                style: ElevatedButton.styleFrom(
                  backgroundColor: buttonColor,
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
                          Icon(_isCheckedIn ? Icons.logout : Icons.login),
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
        ),
        ),
      ),
    );
  }
}
