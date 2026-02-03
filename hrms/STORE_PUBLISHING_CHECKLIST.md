# Play Store & App Store – Publishing Checklist

This checklist helps you publish your HRMS app (including **camera**, **location**, **selfie**, and **face detection**) on **Google Play** and **Apple App Store**. These features **are allowed** when you implement them correctly and disclose them properly.

**For full Google Play compliance (Privacy Policy, Data Safety, permissions, SDKs, security):** see ** [GOOGLE_PLAY_COMPLIANCE.md](../../GOOGLE_PLAY_COMPLIANCE.md)** in the repo root for step-by-step changes, before/after, and a final approval checklist.

---

## ✅ What’s allowed

| Feature | Play Store | App Store |
|--------|------------|-----------|
| **Camera** (selfie for attendance) | ✅ Allowed | ✅ Allowed |
| **Face detection** (on-device, e.g. ML Kit) | ✅ Allowed | ✅ Allowed |
| **Precise location** (check-in/check-out) | ✅ Allowed | ✅ Allowed |
| **Foreground location only** (when user taps check-in) | ✅ Allowed; preferred over background | ✅ Allowed |
| **Selfie photos** sent to your backend | ✅ Allowed; must disclose | ✅ Allowed; must disclose |

**Important:**  
- Use **foreground** location only when the user is actively checking in. Avoid **background** location unless you have a clear, policy‑compliant use case.  
- You are **not** using Face ID / device biometrics. Face detection (e.g. “is there a face?”) for attendance validation is fine.  
- Camera and location must have **clear permission strings** and **in-app explanation** when you request them.

---

## Google Play Store

### 1. Permissions

- **CAMERA** – Add to `AndroidManifest.xml` if you use camera (selfie).  
- **ACCESS_FINE_LOCATION** / **ACCESS_COARSE_LOCATION** – You already use these for check-in.  
- Do **not** add broad **READ_MEDIA_IMAGES** / **READ_MEDIA_VIDEO** if you only capture selfies (no gallery access).

### 2. Data Safety form (required)

Complete the **Data safety** form in Play Console (**App content** → **Data safety**). Declare:

| Data type | Collect? | Purpose | Notes |
|-----------|----------|---------|--------|
| **Photos** | Yes | App functionality | Selfies for attendance |
| **Precise location** | Yes | App functionality | Check-in/out location |
| **Name, Email, User IDs** | Yes | Account management, app functionality | Login, profile |
| **Address** (if you use reverse geocoding) | Yes, if stored/shared | App functionality | Optional depending on use |

- **Encryption in transit:** Yes, if you use HTTPS for API calls.  
- **Data deletion:** Provide a way for users to request deletion (e.g. in-app, email, or support form), or say you don’t if that’s accurate.

Match the form to what your app **actually** does. Inaccurate declarations can lead to rejections or enforcement.

### 3. Privacy policy

- **Required.** Add a **privacy policy** URL in Play Console (store listing / app content).  
- It must clearly describe:
  - What data you collect (e.g. selfies, location, account data).
  - Why (attendance, verification, app functionality).
  - How you store and protect it.
  - Where users can request deletion or ask questions.

### 4. Sensitive permissions / APIs

- If Play Console prompts for **Permissions and APIs that access sensitive information**, declare **Camera** and **Location** and the **use case** (attendance check-in, selfie verification).  
- Use only the permissions you need; avoid extra sensitive APIs.

### 5. No policy violations

- No deceptive behavior (e.g. hidden data collection).  
- No misrepresentation of features or permissions.  
- Comply with [User Data](https://support.google.com/googleplay/android-developer/answer/10144311) and [Permissions](https://support.google.com/googleplay/android-developer/answer/9888170) policies.

---

## Apple App Store

### 1. Usage descriptions (Info.plist)

- **NSCameraUsageDescription** – e.g. *“Camera access is needed to take your selfie for attendance check-in.”*  
- **NSLocationWhenInUseUsageDescription** – e.g. *“Location is used to verify your check-in and check-out location for attendance.”*  
- **NSLocationAlwaysAndWhenInUseUsageDescription** – Only if you use “always” location; otherwise skip.

### 2. App Privacy (App Store Connect)

- In **App Store Connect** → **App Privacy**, declare:
  - **Data types collected:** e.g. Photos (selfies), Precise Location, Name, Email, User ID.  
  - **Purposes:** e.g. App Functionality, Account Management.  
  - **Linked to identity:** Yes, for account-related data.  
  - **Used for tracking:** Typically No, unless you use tracking for ads/analytics.

Match this to your real data practices.

### 3. Privacy policy

- **Required.** Provide a **privacy policy** URL in App Store Connect.  
- Same content as for Play Store is fine, as long as it accurately covers iOS app behavior.

### 4. App Review Guidelines

- **Guideline 5.1.1 (Privacy):** Privacy policy, clear data collection, and consent where needed.  
- **Guideline 2.1 (App completeness):** App works as described; no placeholder or broken features.  
- **Guideline 5.1.2 (Data use):** Use data only as disclosed; no hidden collection.

### 5. Face detection / camera

- Using the **camera** for selfie capture and **on-device face detection** (e.g. ML Kit) is allowed.  
- You must **not** use the camera without the user’s knowledge. Your selfie flow is user‑initiated, which is fine.

---

## Pre‑publish checklist

### Both stores

- [ ] **Privacy policy** published and URL set in each store’s console.  
- [ ] **Data practices** (Data Safety / App Privacy) match what the app does.  
- [ ] **Camera** and **location** requested only when needed, with clear prompts and usage descriptions.

### Google Play (see [GOOGLE_PLAY_COMPLIANCE.md](../../GOOGLE_PLAY_COMPLIANCE.md) for full list)

- [ ] **Privacy policy** URL set in Play Console → App content → Privacy policy.  
- [ ] **Data Safety** form completed (Photos, Location, Name/Email/IDs; encryption; deletion).  
- [ ] **CAMERA** and **Location** declared and justified if Play asks (attendance selfie; check-in/out place).  
- [ ] **No** unnecessary sensitive permissions (e.g. no READ_MEDIA_IMAGES if you only use camera).  
- [ ] **In-app** explanation on attendance/selfie screen (camera + location).  
- [ ] **HTTPS** for production API; **usesCleartextTraffic=false** in release Android manifest.  
- [ ] **Privacy Policy** link in app (e.g. Settings) opening your policy URL.

### App Store

- [ ] **NSCameraUsageDescription** and **NSLocationWhenInUseUsageDescription** in `Info.plist`.  
- [ ] **App Privacy** form filled in App Store Connect.  
- [ ] **Privacy policy** URL configured.

### App behavior

- [ ] **HTTPS** for all API calls (including selfie upload).  
- [ ] **Foreground-only** location for check-in (no background unless justified).  
- [ ] **User‑initiated** selfie capture; no secret camera use.

---

## Summary

**Camera, location, selfies, and face detection are allowed** on both Play Store and App Store when you:

1. Use them for **clear, legitimate features** (e.g. attendance verification).  
2. Request only **needed permissions** and explain them clearly.  
3. **Disclose** collection in Data Safety (Play) and App Privacy (App Store).  
4. Publish a **privacy policy** that accurately describes your practices.  
5. **Encrypt** data in transit and offer a **deletion mechanism** where appropriate.

Keep your declarations accurate and update them whenever your data practices change.
