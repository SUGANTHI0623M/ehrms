# Inter Font – Setup (Using Your assets/fonts)

Your app uses **Google Fonts (Inter)** with **bundled fonts** from **`assets/fonts/`**.

---

## ✅ Files in use

**`pubspec.yaml`** is configured to use these 4 files from **`hrms/assets/fonts/`**:

| File | Weight | Use |
|------|--------|-----|
| **Inter_18pt-Regular.ttf** | 400 | Body text (default) |
| **Inter_18pt-Medium.ttf** | 500 | Medium text |
| **Inter_18pt-SemiBold.ttf** | 600 | Subheadings, buttons |
| **Inter_18pt-Bold.ttf** | 700 | Headings, bold text |

Other files in `assets/fonts/` (e.g. Light, 24pt, 28pt) are not referenced in the theme. You can keep or remove them; only the 4 above are used.

---

## Already configured

- **`pubspec.yaml`** – `assets/fonts/` and the Inter font family point to the 4 files above.
- **`lib/main.dart`** – `GoogleFonts.config.allowRuntimeFetching = false` and `GoogleFonts.interTextTheme()` are set.

Run:

```bash
flutter pub get
flutter run
```

Inter will load from your bundled fonts and work offline.
