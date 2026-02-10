# iOS Setup Guide – HRMS App

Use this guide to build and run the HRMS Flutter app on **iOS** (iPhone/iPad). You need a **Mac** with Xcode for building and running on device/simulator.

---

## 1. Prerequisites

- **Mac** with macOS (required for iOS build)
- **Xcode** from the Mac App Store (latest stable)
- **Xcode Command Line Tools**: `xcode-select --install` if not already installed
- **CocoaPods**: `sudo gem install cocoapods` (or `brew install cocoapods`)
- **Flutter** installed and on your PATH
- **Apple Developer account** (free for simulator; paid for physical device and App Store)

---

## 2. What’s Already Done in the Project

These are already configured in the repo:

- **Info.plist**
  - `NSCameraUsageDescription` – selfie / camera
  - `NSLocationWhenInUseUsageDescription` – location for attendance
  - `NSLocationAlwaysAndWhenInUseUsageDescription` & `NSLocationAlwaysUsageDescription` – background location for live tracking
  - `NSMotionUsageDescription` – motion for activity (walk/drive/stop)
  - `UIBackgroundModes` → `location` – background location updates

- **AppDelegate.swift**
  - Google Maps API key (`GMSServices.provideAPIKey`)
  - `BackgroundLocationTrackerPlugin.setPluginRegistrantCallback` for background location

- **Dart**
  - Activity recognition is **Android-only**; on iOS the app uses GPS only (no code change needed).
  - Background location uses `IOSConfig` in `main.dart` (e.g. `activityType: ActivityType.FITNESS`, `restartAfterKill: true`).

---

## 3. One-Time Setup on Your Mac

### 3.1 Clone / open project and get dependencies

```bash
cd /path/to/hrms_geo/hrms
flutter pub get
```

### 3.2 iOS CocoaPods

```bash
cd ios
pod install
cd ..
```

If Flutter hasn’t created `ios/Podfile` yet, run once from the **hrms** directory:

```bash
flutter build ios
```

Then run `pod install` again in `ios/` if needed.

### 3.3 Minimum iOS version and ML Kit (Face Detection)

- **google_mlkit_face_detection** needs **iOS 15.5+** and **no armv7** (64-bit only).
- In **Xcode**: open `ios/Runner.xcworkspace` (not `.xcodeproj`).
  - Select **Runner** → **General** → **Minimum Deployments**: set to **15.5** (or higher).
- In **Podfile** (after it exists in `ios/`), set platform and optional post_install:

  ```ruby
  platform :ios, '15.5'

  # In post_install, you can add (optional, for ML Kit):
  # installer.pods_project.targets.each do |target|
  #   target.build_configurations.each do |config|
  #     config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.5'
  #     config.build_settings['EXCLUDED_ARCHS[sdk=*]'] = 'armv7'
  #   end
  # end
  ```

  Then run `pod install` again in `ios/`.

### 3.4 Google Maps API key on iOS

- The same key as Android is set in **AppDelegate.swift**.
- In [Google Cloud Console](https://console.cloud.google.com/), enable **Maps SDK for iOS** for that key and restrict by iOS bundle ID if you use restrictions (e.g. `com.yourcompany.hrms`).

### 3.5 Signing (physical device / App Store)

- In Xcode: select **Runner** → **Signing & Capabilities**.
- Choose your **Team** (Apple ID or org).
- Set **Bundle Identifier** (e.g. `com.yourcompany.hrms`).
- For first run on device: connect iPhone, select it as run target, then **Run**.

---

## 4. Build and Run

- **Simulator**
  ```bash
  flutter run
  ```
  Pick an iOS simulator when prompted, or:
  ```bash
  flutter run -d "iPhone 16"
  ```

- **Physical device**
  - Connect the iPhone, unlock it, accept “Trust this computer” if asked.
  - In Xcode, select your device as the run target and set signing as above.
  ```bash
  flutter run
  ```
  Or in Xcode: open `ios/Runner.xcworkspace` and press Run.

---

## 5. Optional: Run from Windows

- You **cannot** build or run the iOS app on Windows.
- You can:
  - Edit Dart and iOS config (Info.plist, AppDelegate, Podfile) on Windows.
  - Build and run iOS only on a Mac (e.g. copy project to Mac or use CI like Codemagic / GitHub Actions with a Mac runner).

---

## 6. Summary Checklist

- [ ] Mac with Xcode and CocoaPods
- [ ] `flutter pub get` and `cd ios && pod install`
- [ ] Minimum iOS version set to 15.5 (Xcode + optionally Podfile)
- [ ] Google Maps SDK for iOS enabled for your API key
- [ ] Signing & Capabilities set in Xcode for device/App Store
- [ ] Run with `flutter run` or from Xcode on `Runner.xcworkspace`

No Dart code changes are required for iOS; activity recognition is Android-only and the app already uses GPS and background location on iOS.
