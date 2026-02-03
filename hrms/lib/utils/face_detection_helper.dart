import 'dart:io';

import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

/// Result of face detection on an image.
class FaceDetectionResult {
  final bool valid;
  final int faceCount;
  final String? message;

  const FaceDetectionResult({
    required this.valid,
    required this.faceCount,
    this.message,
  });
}

/// Helper for on-device face detection using ML Kit.
/// Use [detectFromFile] to validate that an image contains exactly one face.
class FaceDetectionHelper {
  static FaceDetector? _detector;

  static FaceDetector get _getDetector {
    _detector ??= FaceDetector(
      options: FaceDetectorOptions(
        performanceMode: FaceDetectorMode.fast,
        minFaceSize: 0.15,
        enableLandmarks: false,
        enableContours: false,
        enableClassification: false,
        enableTracking: false,
      ),
    );
    return _detector!;
  }

  /// Detects faces in [file]. Returns [FaceDetectionResult].
  /// [valid] is true only when exactly one face is found.
  static Future<FaceDetectionResult> detectFromFile(File file) async {
    if (!file.existsSync()) {
      return const FaceDetectionResult(
        valid: false,
        faceCount: 0,
        message: 'Image file not found',
      );
    }

    try {
      final inputImage = InputImage.fromFile(file);
      final faces = await _getDetector.processImage(inputImage);

      if (faces.isEmpty) {
        return const FaceDetectionResult(
          valid: false,
          faceCount: 0,
          message: 'No face detected. Please ensure your face is clearly visible.',
        );
      }

      if (faces.length > 1) {
        return FaceDetectionResult(
          valid: false,
          faceCount: faces.length,
          message: 'Multiple faces detected. Please take a selfie with only your face in frame.',
        );
      }

      return const FaceDetectionResult(
        valid: true,
        faceCount: 1,
      );
    } catch (e) {
      return FaceDetectionResult(
        valid: false,
        faceCount: 0,
        message: 'Face detection failed. Please try again.',
      );
    }
  }

  /// Release the detector when done (e.g. app lifecycle).
  /// Optional; detector is reused otherwise.
  static Future<void> close() async {
    await _detector?.close();
    _detector = null;
  }
}
