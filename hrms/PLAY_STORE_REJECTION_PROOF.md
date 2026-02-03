# Play Store – Rejection-Proof Checklist

Use this checklist so your app **does not get rejected** for permissions, Data Safety, or policy. Everything here matches what your app **actually does**.

---

## ✅ What your app already has (code)

| Item | Status |
|------|--------|
| **INTERNET** | Declared and used for API (HTTPS in production). |
| **ACCESS_FINE_LOCATION** / **ACCESS_COARSE_LOCATION** | Declared; used **only for check-in/out** (foreground). |
| **CAMERA** | Declared; used for **selfie (attendance)** and **profile photo** (camera only, no gallery). |
| **No READ_MEDIA_IMAGES** | Correct – you don’t read from gallery. |
| **No ACCESS_BACKGROUND_LOCATION** | Correct – location only when user taps check-in. |
| **usesCleartextTraffic=false** | Set – no plain HTTP in release. |
| **In-app explanation** | Selfie screen shows “Camera & location” dialog before use. |
| **Privacy Policy link in app** | Settings → Privacy Policy opens your policy URL. |

---

## What you MUST do in Play Console (to avoid rejection)

### 1. Privacy policy (required)

- [ ] Publish your privacy policy at a **public URL** (e.g. `https://ehrms.askeva.io/privacy`).
- [ ] In app: set **`AppConstants.privacyPolicyUrl`** in `lib/config/constants.dart` to that URL (already used in Settings).
- [ ] In Play Console: **App content** → **Privacy policy** → add the **same URL**.

Policy must clearly say:

- You collect **photos** (selfies for attendance), **precise location** (check-in/out), **name, email, user ID** (account).
- **Why**: app functionality, attendance, account management.
- **How** you store/protect data and that you use **HTTPS**.
- **How users can request deletion** (e.g. email or in-app).

---

### 2. Data safety form (required)

In Play Console: **App content** → **Data safety**.

- [ ] **Does your app collect or share user data?** → **Yes**.

Declare **exactly** this (match your app):

| Data type | Collected? | Purpose | Notes |
|-----------|------------|---------|--------|
| **Photos** | Yes | App functionality | Selfies for attendance and profile |
| **Precise location** | Yes | App functionality | Check-in/out location only |
| **Name** | Yes | Account management, app functionality | Login, profile |
| **Email address** | Yes | Account management, app functionality | Login |
| **User IDs** | Yes | Account management, app functionality | Account identifier |

- [ ] **Is this data encrypted in transit?** → **Yes** (HTTPS).
- [ ] **Can users request deletion?** → **Yes** (and say how in your policy).
- [ ] **Is any data used for tracking?** → **No** (unless you actually use tracking – then declare it).

**Do not** declare background location; you only use **foreground** location at check-in.

---

### 3. Permissions and sensitive APIs

If Play Console shows **“Permissions and APIs that access sensitive information”**:

- [ ] Declare **Camera**: use case = **“Attendance selfie and profile photo”**.
- [ ] Declare **Location** (precise): use case = **“Record check-in and check-out location for attendance”**.
- [ ] **Does your app use background location?** → **No**.

---

### 4. Content rating

- [ ] Complete the **questionnaire** (e.g. violence, ads, user-generated content). For a typical HRMS app, answer “No” where you don’t use those features.

---

### 5. Store listing

- [ ] **Short description** and **full description** match app (attendance, HR, selfie check-in, etc.).
- [ ] **Screenshots** and **feature graphic** uploaded.
- [ ] **App icon** set (you already have launcher icons).

---

### 6. No policy violations

- [ ] **No deceptive behavior** – no hidden data collection; permissions and policy match behavior.
- [ ] **No misrepresentation** – don’t claim features you don’t have.
- [ ] **User Data policy** – only collect what you need; disclose it; protect it.

---

## Quick “before submit” check

- [ ] **Privacy policy** URL is live and set in both `constants.dart` and Play Console.
- [ ] **Data safety** form filled with Photos, Precise location, Name, Email, User IDs; encryption and deletion answered.
- [ ] **Camera & location** declared with correct use case; **background location = No**.
- [ ] **Content rating** and **store listing** completed.
- [ ] App uses **HTTPS** only and **Settings → Privacy Policy** opens your policy.

If all boxes are checked and your policy/declarations match the app, you minimize the risk of rejection for permissions and data.

For more detail, see **STORE_PUBLISHING_CHECKLIST.md**.
