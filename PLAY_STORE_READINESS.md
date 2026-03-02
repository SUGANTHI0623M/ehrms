# Play Store readiness – full app check

This document summarizes what was reviewed and what you must do so your HRMS app is less likely to be rejected.

---

## What was fixed in the app

### 1. Background location – in-app disclosure (required by Play)

- **Issue:** Google Play requires a **prominent in-app disclosure** before requesting background location (“Allow all the time”). Your app used background location for live task tracking but did not show this disclosure.
- **Fix:** Added a dialog in `LocationService.initLocationService()` that:
  - Explains that location is used for live task tracking when the app is in the background.
  - States that data is sent only to your HRMS server and not shared with third parties for advertising.
  - Shows **Continue** / **Not now**; on Continue, requests `Permission.locationAlways`.
- **Where:** `hrms/lib/services/geo/location_service.dart`. `LiveTrackingScreen` now passes `context` so the dialog can be shown when the user starts live tracking.

**You still must:**

- In Play Console → **Policy** → **App content** → **Permissions and APIs** (or the **Permissions declaration** form): declare that the app uses **background location** and that it is **core to the app** (live task tracking). Submit any required form and, if asked, provide a short **video** showing: (1) the in-app disclosure, (2) the system “Allow all the time” prompt, (3) live tracking working (e.g. map updating when app is in background).

---

## Android manifest and build

### Permissions

- **Declared and justified:** INTERNET, ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, ACCESS_BACKGROUND_LOCATION, FOREGROUND_SERVICE, FOREGROUND_SERVICE_LOCATION, ACTIVITY_RECOGNITION, POST_NOTIFICATIONS, CAMERA. All match app behavior (API, live tracking, notifications, selfie).
- **Not declared:** No SMS, call log, or contacts – good.

### Security / config

- **usesCleartextTraffic="false"** – good for production.
- **Google Maps API key** in `AndroidManifest.xml` and `constants.dart`: ensure the key is **restricted** in Google Cloud Console (e.g. by package name `io.askeva.ektahr` and your signing key SHA-1). Do not rely on an unrestricted key in production.
- **Activity recognition:** The plugin’s `ActivityRecognizedService` is `android:exported="true"`. This may be required for the job scheduler; only change if the plugin docs say so.

### SDK and build

- **targetSdk / compileSdk:** Taken from Flutter (`flutter.targetSdkVersion`). Ensure your Flutter version is recent enough that targetSdk is at least **34** (current Play requirement for new apps/updates).
- **minSdk:** 21 (ML Kit requirement) – fine.
- **Signing:** Release uses `key.properties` when present – ensure `key.properties` is not committed (it’s in `.gitignore`) and that you have a valid upload key for Play.
- **64-bit:** Flutter builds include 64-bit by default; no `abiFilters` found that would drop arm64-v8a.

---

## Policy and declarations (Play Console)

Complete these in **App content** and **Store settings**; incomplete items often cause rejection.

1. **Content rating** – Submit the questionnaire; choose the category that fits (e.g. Business/Utilities) and answer honestly (e.g. location sharing: Yes).
2. **Target audience and content** – Set target age to **18+** and declare any sensitive content (e.g. salary/pay information).
3. **Privacy policy** – URL is set in the app; ensure the policy covers: identity (email, name), precise location, photos, device/identifiers (FCM), and how data is used and stored.
4. **Ads declaration** – App has **no ads**; select “No, my app does not contain ads.”
5. **Data safety** – Declare all collected data (email, name, precise location, photos, app activity, device IDs, financial info if you show salary). For each: collected/shared, required/optional, purpose. In-app disclosure for background location is now in place; Data safety must still be filled accurately.
6. **Background location** – Use the **Permissions declaration** (or equivalent) to declare background location for **core functionality** (live task tracking) and, if requested, upload a short video as above.
7. **App category** – **Business** is appropriate.

Use `PLAY_STORE_PUBLISH_CHECKLIST.md` for step-by-step answers.

---

## Code and runtime

- **Debug in release:** Only minimal `debugPrint` in error paths; no sensitive data in logs. No `print()` or assert in hot paths that could crash release.
- **HTTPS:** Production `baseUrl` is `https://ehrms.askeva.net/api`; cleartext is disabled in the manifest.
- **No ad SDKs** in `pubspec.yaml` – matches “no ads” declaration.

---

## Pre-submission checklist

- [ ] In-app disclosure for background location is shown when starting live tracking (implemented).
- [ ] Play Console: Permissions declaration form submitted for background location; video uploaded if required.
- [ ] Play Console: Content rating, Target audience, Privacy policy, Ads declaration, Data safety, App category all completed and saved.
- [ ] Google Maps API key restricted by package name and SHA-1 (no unrestricted key in production).
- [ ] Release build signed with Play upload key (`key.properties` present and not committed).
- [ ] Flutter targetSdk is at least 34 (check with your Flutter version).
- [ ] Test on a real device: grant “Allow all the time” after the new disclosure and confirm live tracking continues when the app is in the background.

---

## Common rejection reasons (avoided or addressed)

| Risk | Status |
|------|--------|
| Background location without in-app disclosure | Fixed: disclosure dialog added before requesting “Allow all the time”. |
| Background location not declared in Play Console | You must complete Permissions declaration and video if asked. |
| Sensitive permissions (SMS, call log) without justification | Not used. |
| Privacy policy missing or incomplete | URL set; ensure policy text covers all collected data. |
| Data safety incomplete | You must fill every section accurately. |
| targetSdk too low | Rely on Flutter’s; verify ≥ 34. |
| Unrestricted API keys | Ensure Maps key is restricted. |
| Ads in app but “no ads” declared | No ads in app; declare “no ads”. |

Following this and the publish checklist should significantly reduce the chance of rejection. If you get a specific rejection reason, address that in the next submission and, if needed, add a reply in the Play Console rejection section.
