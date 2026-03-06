import 'dart:async';
import 'dart:io';
import 'package:camerawesome/camerawesome_plugin.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import '../../config/app_colors.dart';

/// Sentinel returned when camera init fails; caller should use image_picker fallback.
const Object useImagePickerFallback = Object();

/// In-app selfie camera: live preview, location with refresh, no camera switch, Cancel + blue capture.
/// Returns [File] on capture, null if cancelled, or [useImagePickerFallback] if init failed.
class SelfieCameraScreen extends StatefulWidget {
  final String? locationText;
  final Future<String?> Function()? onRefreshLocation;

  const SelfieCameraScreen({
    super.key,
    this.locationText,
    this.onRefreshLocation,
  });

  static Future<Object?> captureSelfie(
    BuildContext context, {
    String? location,
    Future<String?> Function()? onRefreshLocation,
  }) async {
    final result = await Navigator.of(context).push<Object?>(
      MaterialPageRoute(
        builder: (context) => SelfieCameraScreen(
          locationText: location,
          onRefreshLocation: onRefreshLocation,
        ),
      ),
    );
    return result;
  }

  @override
  State<SelfieCameraScreen> createState() => _SelfieCameraScreenState();
}

class _SelfieCameraScreenState extends State<SelfieCameraScreen> {
  static const Duration _initTimeout = Duration(seconds: 12);
  Timer? _timeoutTimer;
  bool _showTimeoutOverlay = false;
  String? _locationText;
  bool _isRefreshingLocation = false;

  @override
  void initState() {
    super.initState();
    _locationText = widget.locationText;
    _timeoutTimer = Timer(_initTimeout, () {
      // Don't show timeout overlay for now; code kept for future use (Retry / Use system camera).
      // if (mounted) setState(() => _showTimeoutOverlay = true);
    });
  }

  Future<void> _refreshLocation() async {
    final callback = widget.onRefreshLocation;
    if (callback == null || _isRefreshingLocation) return;
    setState(() => _isRefreshingLocation = true);
    try {
      final updated = await callback();
      if (mounted && updated != null) setState(() => _locationText = updated);
    } finally {
      if (mounted) setState(() => _isRefreshingLocation = false);
    }
  }

  @override
  void dispose() {
    _timeoutTimer?.cancel();
    super.dispose();
  }

  void _useSystemCamera() {
    Navigator.of(context).pop(useImagePickerFallback);
  }

  void _retry() {
    setState(() => _showTimeoutOverlay = false);
    _timeoutTimer?.cancel();
    _timeoutTimer = Timer(_initTimeout, () {
      if (mounted) setState(() => _showTimeoutOverlay = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text('Mark Attendance', style: TextStyle(color: Colors.white)),
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          CameraAwesomeBuilder.awesome(
            topActionsBuilder: (_) => const SizedBox.shrink(),
            bottomActionsBuilder: (state) => _buildBottomActions(context, state),
            progressIndicator: const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(color: Colors.orange),
                  SizedBox(height: 16),
                  Text(
                    'Opening camera…',
                    style: TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                ],
              ),
            ),
            saveConfig: SaveConfig.photo(
              pathBuilder: (sensors) async {
                final dir = await getTemporaryDirectory();
                final path =
                    '${dir.path}/selfie_${DateTime.now().millisecondsSinceEpoch}.jpg';
                return SingleCaptureRequest(path, sensors.first);
              },
              mirrorFrontCamera: true,
            ),
            sensorConfig: SensorConfig.single(
              sensor: Sensor.position(SensorPosition.front),
              aspectRatio: CameraAspectRatios.ratio_4_3,
            ),
            previewFit: CameraPreviewFit.cover,
            availableFilters: const [],
            onMediaCaptureEvent: (MediaCapture event) {
              if (event.status == MediaCaptureStatus.success &&
                  event.isPicture &&
                  !event.isVideo) {
                event.captureRequest.when(
                  single: (single) {
                    final path = single.file?.path;
                    if (path != null && context.mounted) {
                      Navigator.of(context).pop(File(path));
                    }
                  },
                  multiple: (_) {},
                );
              }
            },
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 100,
            child: _buildLocationBar(),
          ),
          if (_showTimeoutOverlay) _buildTimeoutOverlay(),
        ],
      ),
    );
  }

  Widget _buildLocationBar() {
    final text = _locationText ?? '';
    final hasRefresh = widget.onRefreshLocation != null;
    return Row(
      children: [
        const Icon(Icons.location_on, color: Colors.white70, size: 18),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text.isEmpty ? 'Getting location…' : text,
            style: const TextStyle(color: Colors.white, fontSize: 12),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        if (hasRefresh)
          IconButton(
            icon: _isRefreshingLocation
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white70),
                  )
                : const Icon(Icons.refresh, color: Colors.white70, size: 22),
            onPressed: _isRefreshingLocation ? null : _refreshLocation,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
          ),
      ],
    );
  }

  Widget _buildBottomActions(BuildContext context, CameraState state) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel', style: TextStyle(color: Colors.white)),
          ),
          state.when(
            onPhotoMode: (PhotoCameraState photoState) => GestureDetector(
              onTap: () => photoState.takePhoto(),
              child: Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.secondary,
                  border: Border.all(color: Colors.white, width: 3),
                ),
              ),
            ),
            onPreparingCamera: (_) => const SizedBox(width: 72, height: 72),
            onVideoMode: (_) => const SizedBox(width: 72, height: 72),
            onVideoRecordingMode: (_) => const SizedBox(width: 72, height: 72),
            onPreviewMode: (_) => const SizedBox(width: 72, height: 72),
            onAnalysisOnlyMode: (_) => const SizedBox(width: 72, height: 72),
          ),
          const SizedBox(width: 48),
        ],
      ),
    );
  }

  Widget _buildTimeoutOverlay() {
    return Material(
      color: Colors.black87,
      child: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.camera_alt_outlined, size: 48, color: Colors.white54),
                const SizedBox(height: 16),
                const Text(
                  'Camera is taking too long',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'You can use your device camera instead to take the selfie.',
                  style: TextStyle(color: Colors.white70, fontSize: 14),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    TextButton(
                      onPressed: _retry,
                      child: const Text('Retry'),
                    ),
                    const SizedBox(width: 16),
                    FilledButton(
                      onPressed: _useSystemCamera,
                      child: const Text('Use system camera'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
