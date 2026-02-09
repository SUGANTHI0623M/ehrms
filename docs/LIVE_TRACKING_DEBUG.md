# Live Tracking - Why It May Not Work When App Is Closed/Background

## Important: Android limitation

| Scenario | Tracking works? |
|----------|-----------------|
| App in foreground | Yes |
| App in background (minimized) | Yes – foreground service keeps process alive |
| App force-killed (swiped away) | **No** – Android kills the process. This is a platform limitation. |

## How It Works

1. **Start ride**: User enters `LiveTrackingScreen` → `LocationService.initLocationService()` → `BackgroundLocationTrackerManager.startTracking()` starts native foreground service
2. **Persist state**: `LiveTrackingService.startTracking()` saves taskId, token, baseUrl to SharedPreferences
3. **Foreground**: 15-second timer sends tracking via `_sendLocationToDb()`
4. **Background/closed**: Native service gets GPS → spawns Dart background isolate → runs `backgroundCallback()` in main.dart → `LiveTrackingService.sendTrackingFromBackground()` POSTs to `/tracking/store`

## Why It May Not Work

### 1. **Background callback never invoked**
- **Cause**: Native foreground service not running or killed by OS
- **Fix**: Ensure user stays on LiveTrackingScreen long enough for `startTracking()` to run before minimizing
- **Android**: Disable battery optimization for the app (Settings → Battery → App → HRMS → Don't optimize)
- **Log**: `[LiveTracking:BG] Background callback isolate started` – if you never see this when app is backgrounded, the callback isn't running

### 2. **"Skipped: live tracking not active"**
- **Cause**: `LiveTrackingService.startTracking()` was never called or `stopTracking()` was called
- **Fix**: Ensure `taskMongoId` is set when opening LiveTrackingScreen (from My Tasks with a proper task)
- **Log**: `[LiveTracking:BG] Skipped: live tracking not active`

### 3. **"Skipped: no token"**
- **Cause**: User token not persisted at start; auth flow may store token under different key
- **Fix**: Ensure user is logged in and token is in SharedPreferences under key `token`
- **Log**: `[LiveTrackingService] WARNING: no token in prefs` at start

### 4. **"Skipped: no taskMongoId"**
- **Cause**: Task opened without MongoDB id (e.g. from dashboard restore with incomplete data)
- **Fix**: Always pass `taskMongoId` when navigating to LiveTrackingScreen

### 5. **`distanceFilterMeters` (was 40, now null)**
- **Previously**: 40m filter = no updates when stationary.
- **Now**: `null` = time-based updates every 5s even when stationary (critical for background).

### 6. **Android 10+ permissions**
- `FOREGROUND_SERVICE_LOCATION` added to manifest (required for API 29+)
- User must grant "Allow all the time" for location when prompted

### 7. **Network**
- When app is killed, background isolate needs network to POST
- Ensure device has connectivity (Wi‑Fi or mobile data)

### 8. **Black screen when exiting ride**
- **Cause**: PiP (Picture-in-Picture) mode leaves the activity in a small window. When we `Navigator.pop()` during or after PiP, the route transition can show black.
- **Fix**: Cancel PiP (`cancelOnLeavePiP`) and add a short delay (150ms) before popping, so the activity settles before the route change.

## How to Test

1. **Run app**: `flutter run`
2. **Start a ride**: My Tasks → Start Ride → LiveTrackingScreen
3. **Check logs** (while in foreground):
   - `[LiveTracking] Timer started: taskMongoId=...`
   - `[LiveTrackingService] Started: taskMongoId=... tokenPresent=true`
   - `[LiveTracking] LocationService: starting BackgroundLocationTrackerManager`
4. **Minimize app** (home button) – **do NOT swipe away** (force kill stops tracking on Android)
5. Wait or move (with `distanceFilterMeters: null`, updates every ~5s even when stationary)
6. **View logs**:
   - Android: `adb logcat | grep -E "LiveTracking|LiveTrackingService|flutter"`
   - Or Android Studio Logcat filtered by "LiveTracking"
7. **Expected when working**:
   - `[LiveTracking:BG] Background callback isolate started`
   - `[LiveTracking:BG] Location received: lat=... lon=...`
   - `[LiveTracking:BG] POST ... taskId=...`
   - `[LiveTracking:BG] Sent OK: status=201`
