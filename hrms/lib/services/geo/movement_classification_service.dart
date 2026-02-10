import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart' as gl;
import 'package:activity_recognition_flutter/activity_recognition_flutter.dart';

/// Single location sample for rolling window. Accuracy in meters.
class _LocationSample {
  final double lat;
  final double lng;
  final DateTime time;
  final double accuracyM;

  _LocationSample(this.lat, this.lng, this.time, this.accuracyM);
}

/// Movement types sent to backend. Exact values only: drive | walk | stop.
const String kMovementDrive = 'drive';
const String kMovementWalk = 'walk';
const String kMovementStop = 'stop';

/// Accuracy above which we ignore GPS points (meters).
const double kMaxAccuracyM = 40.0;

/// Rolling window size for speed calculation (3–5 points).
const int kLocationWindowSize = 5;

/// Minimum confidence for activity recognition (%). Accept only if >= 70.
const int kMinActivityConfidence = 70;

/// Speed thresholds per spec (km/h). Hysteresis applied in logic.
/// stop ≤ 1 km/h; walk 1–6 km/h; drive ≥ 10 km/h; 6–10 keep previous.
const double kSpeedStopMaxKmh = 1.0;
const double kSpeedWalkEnterKmh = 2.0;
const double kSpeedWalkExitKmh = 1.0;
const double kSpeedWalkMaxKmh = 6.0;
const double kSpeedDriveEnterKmh = 10.0;
const double kSpeedDriveExitKmh = 6.0;

/// Consecutive readings required: stop needs 2 low-speed; activity needs 2 same type.
const int kConsecutiveStopRequired = 2;
const int kConsecutiveActivityRequired = 2;

/// Large jump: if last segment (current minus previous point) has speed >= this, consider drive.
const double kLargeJumpDriveMinKmh = 10.0;

/// Classifies movement (drive / walk / stop) using:
/// - Android: Activity Recognition (IN_VEHICLE→drive, ON_FOOT/WALKING→walk, STILL→stop)
///   with confidence ≥70% and 2 consecutive same type.
/// - GPS: rolling window 3–5 points, accuracy ≤40m, speed = distance/time.
/// - Final: update only when activity and GPS classification agree (or GPS-only on iOS).
/// - Hysteresis to prevent flapping.
class MovementClassificationService {
  static final MovementClassificationService _instance =
      MovementClassificationService._internal();
  factory MovementClassificationService() => _instance;

  MovementClassificationService._internal();

  final List<_LocationSample> _locationWindow = [];
  static const int _maxSamples = kLocationWindowSize;

  /// Activity: only accept if confidence >= 70% and same type for 2 consecutive.
  ActivityType? _lastActivityType;
  int _lastActivityConsecutive = 0;

  /// Current output state (hysteresis).
  String _currentMovementType = kMovementStop;
  int _consecutiveLowSpeedCount = 0;

  /// Last known activity-based suggestion (for agreement check). Null = no valid activity.
  String? _activitySuggestedMovement;

  bool _activityAvailable = false;
  StreamSubscription<ActivityEvent>? _activitySubscription;

  /// Initialize and optionally start activity recognition (Android). Call from foreground.
  Future<void> start() async {
    _locationWindow.clear();
    _lastActivityType = null;
    _lastActivityConsecutive = 0;
    _currentMovementType = kMovementStop;
    _consecutiveLowSpeedCount = 0;
    _activitySuggestedMovement = null;

    if (defaultTargetPlatform == TargetPlatform.android) {
      try {
        final available = await ActivityRecognition().isAvailable();
        if (available) {
          _activityAvailable = true;
          _activitySubscription = ActivityRecognition()
              .activityStream(runForegroundService: false)
              .listen(_onActivityEvent);
        }
      } catch (e) {
        debugPrint('[MovementClass] Activity recognition error: $e');
      }
    }
  }

  void _onActivityEvent(ActivityEvent event) {
    if (event.type == ActivityType.unknown || event.type == ActivityType.invalid) {
      _lastActivityType = null;
      _lastActivityConsecutive = 0;
      _activitySuggestedMovement = null;
      return;
    }
    if (event.confidence < kMinActivityConfidence) {
      _lastActivityType = null;
      _lastActivityConsecutive = 0;
      _activitySuggestedMovement = null;
      return;
    }
    if (event.type == _lastActivityType) {
      _lastActivityConsecutive++;
    } else {
      _lastActivityType = event.type;
      _lastActivityConsecutive = 1;
    }
    if (_lastActivityConsecutive >= kConsecutiveActivityRequired) {
      _activitySuggestedMovement = _activityToMovement(event.type);
    } else {
      _activitySuggestedMovement = null;
    }
  }

  static String? _activityToMovement(ActivityType type) {
    switch (type) {
      case ActivityType.inVehicle:
      case ActivityType.onBicycle:
        return kMovementDrive;
      case ActivityType.walking:
      case ActivityType.onFoot:
      case ActivityType.running:
        return kMovementWalk;
      case ActivityType.still:
      case ActivityType.tilting:
        return kMovementStop;
      default:
        return null;
    }
  }

  /// Stop activity stream. Call when leaving live tracking.
  Future<void> stop() async {
    await _activitySubscription?.cancel();
    _activitySubscription = null;
    _activityAvailable = false;
  }

  /// Add a location and get movement type. Ignores point if accuracy > 40m.
  /// [accuracyM] can be null → treated as poor (we still add point but may not use for speed if window has bad accuracy).
  String addLocationAndClassify({
    required double lat,
    required double lng,
    required DateTime time,
    double? accuracyM,
    bool inBackground = false,
  }) {
    final accuracy = accuracyM ?? 999.0;
    if (accuracy > kMaxAccuracyM) {
      return _currentMovementType;
    }

    _locationWindow.add(_LocationSample(lat, lng, time, accuracy));
    if (_locationWindow.length > _maxSamples) {
      _locationWindow.removeAt(0);
    }

    final avgSpeedKmh = _averageSpeedKmh();
    final lastSegmentKmh = _lastSegmentSpeedKmh();
    // Use max of average and last-segment: large jump in distance in short time → consider drive
    final effectiveSpeedKmh = _effectiveSpeedKmh(avgSpeedKmh, lastSegmentKmh);
    if (effectiveSpeedKmh == null) {
      return _currentMovementType;
    }

    final speedClass = _speedToClassification(effectiveSpeedKmh, inBackground: inBackground);
    if (speedClass == null) {
      return _currentMovementType;
    }
    if (!_agreeWithActivity(speedClass)) {
      return _currentMovementType;
    }
    final next = _applyHysteresis(speedClass, effectiveSpeedKmh, inBackground: inBackground);
    _currentMovementType = next;
    return next;
  }

  /// Classify from speed only (for background / iOS). Uses same thresholds and hysteresis.
  /// [lastMovementType] is the previous state for hysteresis.
  static String classifyFromSpeedOnly({
    required double avgSpeedKmh,
    required String lastMovementType,
    bool inBackground = false,
    int consecutiveLowSpeed = 0,
  }) {
    final speedClass = _speedToClassificationStatic(avgSpeedKmh, inBackground: inBackground);
    if (speedClass == null) return lastMovementType;
    return _applyHysteresisStatic(
      speedClass,
      avgSpeedKmh,
      lastMovementType,
      inBackground: inBackground,
      consecutiveLowSpeed: consecutiveLowSpeed,
    );
  }

  double? _averageSpeedKmh() {
    if (_locationWindow.length < 2) return null;
    double totalDistM = 0;
    int n = _locationWindow.length;
    for (int i = 1; i < n; i++) {
      final a = _locationWindow[i - 1];
      final b = _locationWindow[i];
      totalDistM += gl.Geolocator.distanceBetween(a.lat, a.lng, b.lat, b.lng);
    }
    final first = _locationWindow.first;
    final last = _locationWindow.last;
    final secs = last.time.difference(first.time).inMilliseconds / 1000.0;
    if (secs <= 0) return null;
    final speedMps = totalDistM / secs;
    return speedMps * 3.6;
  }

  /// Speed over the last segment (previous point → current). Used so a large jump counts as drive.
  double? _lastSegmentSpeedKmh() {
    if (_locationWindow.length < 2) return null;
    final prev = _locationWindow[_locationWindow.length - 2];
    final cur = _locationWindow[_locationWindow.length - 1];
    final distM = gl.Geolocator.distanceBetween(prev.lat, prev.lng, cur.lat, cur.lng);
    final secs = cur.time.difference(prev.time).inMilliseconds / 1000.0;
    if (secs <= 0) return null;
    return (distM / secs) * 3.6;
  }

  /// Effective speed for classification: max of average and last-segment so large jumps → drive.
  double? _effectiveSpeedKmh(double? avgKmh, double? lastSegmentKmh) {
    if (avgKmh == null && lastSegmentKmh == null) return null;
    if (avgKmh == null) return lastSegmentKmh;
    if (lastSegmentKmh == null) return avgKmh;
    return avgKmh > lastSegmentKmh ? avgKmh : lastSegmentKmh;
  }

  String? _speedToClassification(double speedKmh, {bool inBackground = false}) {
    return _speedToClassificationStatic(speedKmh, inBackground: inBackground);
  }

  /// Speed → classification. 6–10 km/h returns null (caller keeps previous).
  static String? _speedToClassificationStatic(double speedKmh, {bool inBackground = false}) {
    if (speedKmh <= kSpeedStopMaxKmh) return kMovementStop;
    if (speedKmh >= kSpeedDriveEnterKmh) return kMovementDrive;
    if (speedKmh >= kSpeedWalkEnterKmh && speedKmh < kSpeedWalkMaxKmh) return kMovementWalk;
    if (speedKmh >= kSpeedWalkMaxKmh && speedKmh < kSpeedDriveEnterKmh) return null;
    return kMovementStop;
  }

  bool _agreeWithActivity(String speedClass) {
    if (!_activityAvailable || _activitySuggestedMovement == null) {
      return true;
    }
    return speedClass == _activitySuggestedMovement;
  }

  String _applyHysteresis(String speedClass, double speedKmh, {bool inBackground = false}) {
    return _applyHysteresisStatic(
      speedClass,
      speedKmh,
      _currentMovementType,
      inBackground: inBackground,
      consecutiveLowSpeed: _consecutiveLowSpeedCount,
      updateConsecutive: (int n) {
        _consecutiveLowSpeedCount = n;
      },
    );
  }

  static String _applyHysteresisStatic(
    String speedClass,
    double speedKmh,
    String current, {
    bool inBackground = false,
    int consecutiveLowSpeed = 0,
    void Function(int)? updateConsecutive,
  }) {
    if (speedKmh <= kSpeedStopMaxKmh) {
      final nextConsecutive = consecutiveLowSpeed + 1;
      if (updateConsecutive != null) updateConsecutive(nextConsecutive);
      if (nextConsecutive >= kConsecutiveStopRequired) return kMovementStop;
      return current;
    }
    if (updateConsecutive != null) updateConsecutive(0);

    switch (current) {
      case kMovementDrive:
        if (speedKmh <= kSpeedDriveExitKmh) {
          if (speedClass == kMovementWalk) return kMovementWalk;
          if (speedClass == kMovementStop) return kMovementStop;
        }
        return kMovementDrive;
      case kMovementWalk:
        if (speedKmh <= kSpeedWalkExitKmh) return kMovementStop;
        if (speedKmh >= kSpeedDriveEnterKmh && speedClass == kMovementDrive) return kMovementDrive;
        return kMovementWalk;
      case kMovementStop:
      default:
        if (speedKmh >= kSpeedDriveEnterKmh && speedClass == kMovementDrive) return kMovementDrive;
        if (speedKmh >= kSpeedWalkEnterKmh && speedClass == kMovementWalk) return kMovementWalk;
        return kMovementStop;
    }
  }

  String get currentMovementType => _currentMovementType;
  int get consecutiveLowSpeedCount => _consecutiveLowSpeedCount;
}
