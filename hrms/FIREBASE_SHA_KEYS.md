# Firebase – Add SHA keys and download google-services.json

Use these SHA fingerprints in the Firebase Console so you can download the correct **google-services.json** for your Android app (`io.askeva.ehrms`).

## Debug keystore (development / `flutter run`)

| Type   | Fingerprint |
|--------|--------------|
| **SHA-1**   | `3C:1A:06:F5:84:ED:13:09:4B:D5:FB:CA:2B:F4:0F:C3:0C:97:12:D1` |
| **SHA-256** | `A2:31:91:D5:41:4E:2B:DD:62:6B:50:53:D8:95:F7:3A:6D:2B:8B:E8:5E:15:7D:BE:4B:EF:1C:75:A3:18:EC:B7` |

## Steps in Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/) and select your project.
2. Go to **Project settings** (gear icon).
3. Under **Your apps**, select your **Android** app with package name `io.askeva.ehrms` (or add an Android app with this package name).
4. In the app’s section, click **Add fingerprint**.
5. Add **SHA-1**:  
   `3C:1A:06:F5:84:ED:13:09:4B:D5:FB:CA:2B:F4:0F:C3:0C:97:12:D1`
6. Click **Add fingerprint** again and add **SHA-256**:  
   `A2:31:91:D5:41:4E:2B:DD:62:6B:50:53:D8:95:F7:3A:6D:2B:8B:E8:5E:15:7D:BE:4B:EF:1C:75:A3:18:EC:B7`
7. Download the new **google-services.json** (button in that same app card).
8. Replace the file in your project:  
   `hrms/android/app/src/google-services.json`

## Release keystore (Play Store / release builds)

When you have a **release** keystore (e.g. for signing the app bundle), get its SHA-1 and SHA-256 and add them in Firebase as well:

```powershell
keytool -list -v -keystore "C:\path\to\your\release.keystore" -alias your_alias
```

Then add those SHA-1 and SHA-256 fingerprints in Firebase the same way, and download **google-services.json** again if needed (the file usually includes all added fingerprints).

---

*Generated from your debug keystore at `%USERPROFILE%\.android\debug.keystore`.*
