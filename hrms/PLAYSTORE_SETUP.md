# Google Play Store – Setup & Publish

Use this guide to build and publish your HRMS app on the **Google Play Store**.

---

## 1. Prerequisites

- **Flutter** installed and `flutter doctor` passing (especially Android).
- **Google Play Developer account** ([play.google.com/console](https://play.google.com/console)) – one-time $25 registration.
- **App identity**: Application ID is `io.askeva.ehrms` (already set in the project).

---

## 2. Create your upload keystore (one-time)

Play Store requires a **signed** app. Use an **upload keystore** (Play App Signing will manage the final app signing key).

From your project root (e.g. `hrms`), run:

```bash
cd hrms/android
keytool -genkey -v -keystore upload-keystore.jks -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

- **Keystore password** and **key password**: choose strong passwords and **store them safely** (e.g. password manager).
- **Alias**: use `upload` (or match the alias in `key.properties`).
- **CN/OU/etc.**: can be your name or company; they appear in certificate details only.

**Important:**  
- **Back up** `upload-keystore.jks` and the passwords. If you lose them, you cannot update the app under the same application ID.  
- **Do not commit** the keystore or `key.properties` to git (they are already in `.gitignore`).

---

## 3. Configure signing in the project

1. In `hrms/android/`, copy the example properties file:

   ```bash
   copy key.properties.example key.properties
   ```
   (On macOS/Linux: `cp key.properties.example key.properties`.)

2. Edit `key.properties` and set **your** values:

   ```properties
   storePassword=your_keystore_password
   keyPassword=your_key_password
   keyAlias=upload
   storeFile=upload-keystore.jks
   ```

   `storeFile` is relative to `hrms/android/`. If the keystore is elsewhere, use a path relative to `android/` or an absolute path (avoid committing absolute paths if they contain your username).

3. Ensure `upload-keystore.jks` is in `hrms/android/` (or update `storeFile` accordingly).

After this, **release** builds will be signed with your upload key (see `android/app/build.gradle.kts`).

---

## 4. Version for Play Store

Version is set in **pubspec.yaml**:

```yaml
version: 1.0.1+1   # 1.0.1 = versionName (user-facing), 1 = versionCode (integer, must increase each upload)
```

- **versionName** (e.g. `1.0.1`): shown to users.
- **versionCode** (e.g. `1`): internal integer; **must be greater** than the last uploaded version for the same app.

Before each new upload, bump at least the build number, e.g. `1.0.1+2`, `1.0.2+3`.

---

## 5. Build the App Bundle (AAB)

Play Store expects an **Android App Bundle** (`.aab`), not an APK.

From the **Flutter project root** (`hrms/hrms/`):

```bash
flutter clean
flutter pub get
flutter build appbundle --release
```

Output:

- `build/app/outputs/bundle/release/app-release.aab`

Use this file in Play Console to create or update your release.

---

## 6. Play Console – First-time setup

1. **Create app**  
   Play Console → Create app → Fill name, default language, app/game, free/paid.

2. **Store listing**  
   - Short & full description, screenshots, feature graphic, app icon.  
   - Ensure **Privacy policy** URL is set (required).

3. **App content**  
   - **Privacy policy**: required; use a URL that describes your data collection (camera, location, account data).  
   - **Data safety**: declare what data you collect (e.g. photos, precise location, name/email) and why (app functionality, account management).  
   - **Ads**: if you don’t show ads, select “No.”  
   - **Content rating**: complete the questionnaire.  
   - **Target audience**: age groups.  
   - **News app / COVID-19 / etc.**: answer as applicable.

4. **Release**  
   - Create a **Production** (or Internal/Closed testing) release.  
   - Upload `app-release.aab`.  
   - Add release name (e.g. “1.0.1 (1)”) and release notes.

5. **Publishing**  
   - Resolve any warnings (e.g. permissions, Data safety, policy).  
   - Submit for review.  
   - After approval, the app will be available (or go live when you choose, depending on release type).

---

## 7. Permissions & compliance (summary)

Your app already declares in `AndroidManifest.xml`:

- `INTERNET`
- `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`
- `CAMERA`

In Play Console:

- **Data safety**: declare collection of **photos** (selfies), **precise location**, **name/email/user IDs**, and any other data you collect.  
- **Sensitive permissions**: if asked, justify **Camera** and **Location** (e.g. attendance check-in, selfie verification).  
- **Privacy policy**: must describe these uses and how users can request deletion.

For a full checklist (privacy, HTTPS, in-app explanations), see **STORE_PUBLISHING_CHECKLIST.md**.

---

## 8. Checklist before upload

- [ ] Upload keystore created and backed up; passwords stored safely.
- [ ] `key.properties` created from `key.properties.example` and filled (not committed).
- [ ] `flutter build appbundle --release` succeeds and uses release signing (no debug).
- [ ] `version` in `pubspec.yaml` has a **versionCode** higher than any previously uploaded version.
- [ ] Privacy policy URL set in Play Console and Data safety form completed.
- [ ] Store listing (description, graphics, icon) and content rating completed.

---

## 9. Updating the app later

1. Bump version in `pubspec.yaml` (e.g. `1.0.2+2`).
2. Run: `flutter build appbundle --release`.
3. In Play Console, create a new release and upload the new `app-release.aab`.
4. Submit for review.

You’re set up for Play Store. For store policy and compliance details, use **STORE_PUBLISHING_CHECKLIST.md** and any **GOOGLE_PLAY_COMPLIANCE** doc in the repo.
