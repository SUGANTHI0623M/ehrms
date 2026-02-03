# Where Images Are Captured & Uploaded

This document lists every place in the HRMS app where users **capture** or **upload** images (or files that can include images), and whether **face detection** applies.

---

## 1. Selfie check-in (attendance) – **face detection enabled**

| Item | Details |
|------|---------|
| **Screen** | **Attendance** → **Smart Attendance** (`SelfieCheckInScreen`) |
| **Flow** | User taps “Tap to take selfie” → front camera opens → user takes photo → **face detection** runs on-device (ML Kit). If exactly one face: image is kept and user can Check In / Check Out. If no face or multiple faces: error shown, user must retake. |
| **Upload** | Selfie is sent as **base64** in the check-in or check-out API request. |
| **Face detection** | Yes. Validates exactly one face before the image can be used for attendance. |

---

## 2. Profile photo

| Item | Details |
|------|---------|
| **Screen** | **Profile** → tap profile picture / edit → **Change photo** |
| **Flow** | User picks image from **gallery** → uploads as profile photo. |
| **Upload** | Image is sent via `AuthService.updateProfilePhoto()` (multipart) to the backend. |
| **Face detection** | No. Optional face check could be added later (e.g. warn if no face). |

---

## 3. Onboarding documents

| Item | Details |
|------|---------|
| **Screen** | **Profile** → **Documents** tab → **Upload** (or **Replace**) per document |
| **Flow** | User picks a **file** (e.g. JPG, PNG, PDF, DOC) via file picker → upload to onboarding API. |
| **Upload** | `OnboardingService.uploadDocument()` sends the file as multipart. |
| **Face detection** | No. These are generic documents (ID, certificates, etc.), not selfies. |

---

## 4. Request proof (e.g. reimbursement, leave)

| Item | Details |
|------|---------|
| **Screen** | **My Requests** → create/edit request → **Proof** / attachment |
| **Flow** | User picks **file(s)** (e.g. receipt, supporting doc) → added as proof. |
| **Upload** | Proof is sent as **base64** (or similar) in the request payload to the backend. |
| **Face detection** | No. Proof documents are not selfies. |

---

## Summary

| Place | Capture / pick | Upload mechanism | Face detection |
|-------|----------------|------------------|----------------|
| **Selfie check-in** | Camera (front) | Base64 in check-in/check-out API | **Yes** |
| **Profile photo** | Gallery | Multipart to profile API | No |
| **Onboarding docs** | File picker | Multipart to onboarding API | No |
| **Request proof** | File picker | Base64 in request API | No |

Only the **selfie check-in** flow uses **face detection**. All other uploads are as-is without face validation.
