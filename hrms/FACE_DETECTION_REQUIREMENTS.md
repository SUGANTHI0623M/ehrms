# Face Detection for Selfie Camera – Requirements

This document lists what you need to integrate **face detection** into the HRMS selfie check-in flow (`SelfieCheckInScreen`).

---

## 1. Dependencies (pubspec.yaml)

Add these packages:

| Package | Purpose | Version |
|--------|---------|---------|
| `google_mlkit_face_detection` | On-device face detRection (ML Kit) | `^0.13.1` |
| `camera` | Live camera preview (for **live** face detection) | `^0.11.0` |

You already have:
- `image_picker` – can keep for **simple** flow (capture → detect on image).
- `permission_handler` – for camera permission.

**Choose one approach:**

- **Simple:** Keep `image_picker` only. After user takes selfie, run ML Kit on the picked image. Reject if no face or multiple faces. No new packages except `google_mlkit_face_detection`.
- **Live preview:** Use `camera` + `google_mlkit_face_detection`. Show front-camera preview, run face detection on frames, guide user (“Position your face”), enable Capture only when exactly one face is detected. Better UX, more code.

---

## 2. Android

### 2.1 Permissions

Add to `android/app/src/main/AndroidManifest.xml` inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.front" android:required="false" />
```

### 2.2 SDK versions

- **minSdk:** Must be **≥ 21** (ML Kit requirement).  
  In `android/app/build.gradle.kts`, ensure `minSdk` is at least 21. If you use `flutter.minSdkVersion`, override if needed:

  ```kotlin
  defaultConfig {
      minSdk = 21  // or maxOf(21, flutter.minSdkVersion)
      // ...
  }
  ```

- **compileSdk / targetSdk:** ML Kit suggests 35. Your project may already use Flutter defaults; ensure they’re compatible.

---

## 3. iOS

### 3.1 Camera usage description

Add to `ios/Runner/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera access is needed to take your selfie for attendance check-in.</string>
```

### 3.2 ML Kit requirements

- **Minimum iOS version:** 15.5 or newer.
- **Excluded architectures:** Exclude `armv7` (ML Kit is 64‑bit only).

**Podfile** (`ios/Podfile`):

- Set `platform :ios, '15.5'` (or higher).
- In `post_install`:
  - Set `EXCLUDED_ARCHS[sdk=*] = "armv7"` for relevant targets.
  - Set `IPHONEOS_DEPLOYMENT_TARGET` to `15.5` (or your chosen minimum).

See [google_mlkit_face_detection](https://pub.dev/packages/google_mlkit_face_detection) README for the exact Podfile snippet.

### 3.3 Xcode

- **Building Settings → Excluded Architectures → Any SDK:** add `armv7`.

---

## 4. Permissions at runtime

- **Camera:** Request before opening camera or starting live preview. Use `permission_handler` (already in project) or the `camera` plugin’s own handling.
- **Location:** Already handled in `SelfieCheckInScreen` for check-in. No change needed for face detection.

---

## 5. Where to integrate

- **Screen:** `lib/screens/attendance/selfie_checkin_screen.dart`.
- **Current flow:** User taps “Tap to take selfie” → `image_picker` (front camera) → **face detection** runs → if exactly one face, image is kept and user can Check-in/Check-out; otherwise retake. Selfie is then uploaded as base64 with the attendance API.
- **Other image upload points:** See **[IMAGE_UPLOAD_PLACES.md](IMAGE_UPLOAD_PLACES.md)** for all places (selfie, profile photo, onboarding docs, request proof). Face detection is implemented only for selfie check-in.
- **With face detection:**
  - **Simple:** After `_takeSelfie()`, run face detection on `_imageFile`. If `faces.isEmpty` or `faces.length > 1`, show error (“Ensure exactly one face is visible”) and clear/retake. Else, keep current submit logic.
  - **Live:** Replace the “tap to take selfie” UI with a camera preview screen. Run face detection on camera frames (throttled, e.g. every 150–200 ms). When exactly one face is detected and optionally “well positioned,” enable a Capture button. On capture, take a picture from the camera controller, then use the same submit logic as now (base64 selfie to backend).

---

## 6. ML Kit usage (high level)

1. Create `InputImage`:
   - From file: `InputImage.fromFilePath(path)` after capture.
   - From bytes: `InputImage.fromBytes(...)` when using live camera frames (use `InputImageMetadata` for rotation, etc.).
2. Create `FaceDetector` with `FaceDetectorOptions` (e.g. `minFaceSize`, `performanceMode: FaceDetectorPerformanceMode.fast` for live).
3. `final faces = await faceDetector.processImage(inputImage);`
4. Use `faces.length` and optionally `face.boundingBox` / `headEulerAngle*` for “face too small” or “face not frontal.”
5. Call `faceDetector.close()` when done (e.g. `dispose`).

---

## 7. Performance tips (especially for live detection)

- Use **fast** performance mode.
- **Throttle** detection (e.g. process every 150–200 ms), not every frame.
- Use **modest resolution** (e.g. 640×480 or similar) for the stream you pass to ML Kit.
- ML Kit works best when faces are at least ~100×100 px in the input image.

---

## 8. Backend

- No change required. You keep sending the same selfie (e.g. base64) for check-in/check-out. Face detection only validates the selfie on the **device** before submit.

---

## 9. Summary checklist

- [ ] Add `google_mlkit_face_detection` (and `camera` if using live preview).
- [ ] Android: `CAMERA` permission, `minSdk >= 21`.
- [ ] iOS: `NSCameraUsageDescription`, iOS ≥ 15.5, Podfile + exclude `armv7`.
- [ ] Request camera permission at runtime before selfie flow.
- [ ] Integrate detection in `SelfieCheckInScreen` (either post-capture only or live preview + capture).
- [ ] Handle “no face” / “multiple faces” (and optionally “face too small” / “not frontal”) with clear user messaging.

---

## 10. Store publishing (Play Store & App Store)

**Face detection, camera, location, and selfies are allowed** on both stores when you disclose them correctly and follow policy.

See **[STORE_PUBLISHING_CHECKLIST.md](STORE_PUBLISHING_CHECKLIST.md)** for:

- What’s allowed on Play Store and App Store
- Data Safety (Play) and App Privacy (App Store) disclosure
- Privacy policy, permissions, and a pre-publish checklist

---

## 11. Optional next steps

- **Liveness:** Use `headEulerAngleX/Y/Z` to prompt “turn head slightly” etc. (simple liveness).
- **Face matching:** If you add stored profile photos, use a separate face recognition / embedding step (server-side or on-device); that’s beyond basic face detection.
