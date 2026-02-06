# Time Mismatch in Tracking History – Root Cause & Fix

## The Problem

- **OTP verified** and **Completed** show correctly at **3:37 PM**
- **Stop, Ride, Walk, Start** show wrongly at **7:01 PM, 7:40 PM, 8:00 PM** instead of **~2:00–3:40 PM**

## Root Cause

Different timeline events come from different sources:

| Event source        | Where it’s set      | When set                 |
|---------------------|---------------------|--------------------------|
| OTP, Completed, Photo | TaskDetails (backend) | Server `new Date()` when API is called |
| Stop, Ride, Walk, Start | Tracking collection   | Timestamp sent by the mobile app      |

Timestamps for **OTP** and **Completed** are correct because the backend uses `new Date()`, which is stored in MongoDB as UTC and displayed correctly in IST.

Timestamps for **tracking** were wrong because:

1. The mobile app sent `DateTime.now().toIso8601String()`.
2. That returns local time in ISO format **without** a timezone, e.g. `"2025-02-06T15:37:00.000"`.
3. The backend parsed this with `new Date("2025-02-06T15:37:00.000")`.
4. In JavaScript, a string without `Z` or offset is treated as the **server’s local timezone**, not the user’s.
5. If the server is in something like UTC+2, `15:37` is stored as `13:37 UTC` instead of the real `10:07 UTC` (3:37 PM IST).
6. The app then converts that stored UTC to IST, so you see times around 7:xx PM instead of 3:xx PM.

So the mismatch is caused by interpreting the mobile’s local time as the server’s local time.

## The Fix (Already Applied)

1. **Flutter** – send UTC explicitly:
   - `DateTime.now().toUtc().toIso8601String()` → e.g. `"2025-02-06T10:07:00.000Z"`
   - All tracking timestamps now include `Z`, so they are unambiguous UTC.

2. **Backend** – `parseTimestamp()`:
   - Uses `parseTimestamp()` so timestamps are parsed consistently.
   - If a string is ISO-like but lacks timezone, it treats it as UTC (append `Z`) to avoid server-timezone misinterpretation.

3. **Flutter parsing** – models:
   - `TimelineEvent` and `RoutePoint` now handle both string and numeric timestamps correctly.

## Existing Data

Records created **before** these changes may still show wrong times, because they were stored with the incorrect interpretation.

**New** records will show correct times after deployment of:
- The Flutter app with the UTC timestamp change
- The backend with `parseTimestamp()`

## Verifying the Fix

1. Deploy the backend changes.
2. Rebuild and redeploy the Flutter app.
3. Run a new task and complete it.
4. Check the Task Completion Report – tracking times should now match IST correctly.
