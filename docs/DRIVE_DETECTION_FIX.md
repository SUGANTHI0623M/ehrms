# Drive Detection Fix

## Problem

Between 7:16 PM and 7:40 PM the user was driving a scooty, but the Task Completion Report showed only:
- **7:16 PM** – Stop (Hosur Inner Ring Road)
- **7:40 PM** – Arrived (Alasanatham Rd)

No "Drive" or "Ride" events were recorded during the 24-minute journey, even though the user was clearly moving.

## Root Causes

### 1. **GPS speed often 0 on two-wheelers**

On a scooty, the phone is typically in a pocket or bag. In urban areas or with weak GPS:
- Many devices report `speed = 0` or `null` even when moving
- We rely on **distance-based inference** (distance covered / elapsed time) instead

### 2. **Distance noise floor too high (15 m)**

- Updates are sent every ~5 seconds in background
- At **10 km/h** in 5 seconds: distance ≈ **14 m** → below 15 m → classified as **stop**
- At **12 km/h** in 5 seconds: distance ≈ **17 m** → above 15 m → drive

So slow driving (6–10 km/h) in traffic was consistently classified as stop.

### 3. **Drive threshold too high (6 km/h)**

- Drive threshold was 6 km/h (1.67 m/s)
- Scooty in heavy traffic: often 5–8 km/h
- 5 km/h was classified as "walk" instead of "drive"

## Fixes Applied

| Setting | Before | After | Reason |
|--------|--------|-------|--------|
| `_distanceNoiseFloorM` | 15 m | **12 m** | 8 m caused false "moving" when sitting (GPS drift) |
| `_driveThresholdMps` | 6 km/h | **5 km/h** | Better detection of slow scooty (device speed) |
| `_driveThresholdInferredMps` | (same) | **9 km/h** (2.5 m/s) | Higher when inferring from distance – avoids GPS drift false positives |

## Where Changed

- `hrms/lib/services/geo/live_tracking_service.dart` – background tracking
- `hrms/lib/screens/geo/live_tracking_screen.dart` – foreground tracking

Both use the same thresholds so foreground and background behave consistently.

## Detection Logic (unchanged)

1. Prefer **device speed** (m/s) when available and valid.
2. Use **distance-based inference** when speed is 0 or null:
   - Distance = `Geolocator.distanceBetween(lastSent, current)`
   - Elapsed = time since last sent
   - Inferred speed = distance / elapsed
   - If distance < noise floor → **stop**
   - Else: drive/walk/stop by speed thresholds

## Example After Fix

**Device speed (GPS reports speed):**
- 5 km/h+ → **drive**, 0.5–5 km/h → **walk**, &lt; 0.5 → **stop**

**Distance-based inference (GPS speed 0, e.g. phone in pocket):**
- Distance &lt; 12 m → **stop** (avoids GPS drift when sitting)
- Distance ≥ 12 m: inferred speed = distance / elapsed
  - ≥ 9 km/h (2.5 m/s) → **drive** (e.g. 15 m in 5 s = 3 m/s)
  - 0.5–9 km/h → **walk**
  - &lt; 0.5 → **stop**

## "Moving when sitting" fix (update)

After initial tuning, users reported the app showed "moving" when sitting still. Cause: 8 m distance noise floor was too low – GPS drift (5–15 m) when stationary was classified as movement.

**Adjustments:**
- Distance noise floor: 8 m → **12 m** (typical drift when sitting is &lt; 12 m)
- Inferred drive threshold: **9 km/h** (2.5 m/s) – only classify as drive when inferred speed is clearly above drift range

## Future Improvements (optional)

- Use **activity_recognition_flutter** (IN_VEHICLE / ON_BICYCLE) to override to "drive" when device speed is 0
- Requires persisting last activity in SharedPreferences for background use
