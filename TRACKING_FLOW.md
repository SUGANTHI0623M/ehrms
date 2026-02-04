# Start Task & Live Tracking – Flow and APIs

## Overview

Uber-style flow: **Start Task** (with map, distance/ETA) → **Live Tracking** (full map + bottom sheet with Next Steps) → **End Task**.

---

## 1. Start Task – Location Handling

- **Start location**: Set automatically from staff’s current GPS when they tap “Start Task” on Task Details.
- **Destination**: Defaults to customer address (from `customers`); shown on map and used for route/distance.
- **Before start**: Task Details screen shows live Google Map, distance (Directions API or straight-line), ETA, and “Start Task” / “Cancel”.
- **On “Start Task”**: Backend is called to set task `status: 'in_progress'`, `startTime`, `startLocation`; app opens **Live Tracking** with pickup = current position, dropoff = destination.

*(Places autocomplete and drag-to-change destination can be added later on Task Details.)*

---

## 2. Map & Navigation UI

- **Flutter**: `GoogleMap` full-screen with:
  - Staff marker (blue/teardrop), destination marker (red), pickup (green).
  - Route polyline built from location updates (staff → destination).
  - Auto-follow staff position via `animateCamera` on location updates.
- **Live Tracking** uses green primary theme (app bar, progress, Next Steps accent).

---

## 3. Live Tracking – Backend Sync

- **Location updates**: App sends current lat/lng to backend every **15 seconds** (configurable) to limit battery use.
- **Endpoint**: `POST /api/tasks/:id/location`  
  Body: `{ "lat": number, "lng": number, "timestamp": "ISO8601" }`  
  Backend appends to task’s `locationHistory` (capped at 500 points).
- **Auth**: All tracking endpoints use `protect` middleware.

---

## 4. Task Progress (Next Steps)

- **UI**: Bottom sheet on Live Tracking shows:
  - Trip progress bar and travel info (Total distance, Driving time, Arrival time).
  - **Next Steps** card (green left border):
    - Reached location (tappable to mark done)
    - Take photo proof
    - Fill required form
    - Get OTP from customer
  - **Continue to Form** (enabled only after “Reached location” is completed).
  - **End Task** button.
- **Backend**:  
  `PATCH /api/tasks/:id/steps`  
  Body: `{ "reachedLocation"?: boolean, "photoProof"?: boolean, "formFilled"?: boolean, "otpVerified"?: boolean }`  
  Updates `task.progressSteps` in MongoDB.

---

## 5. End Task

- **App**: User taps “End Task” → calls backend then navigates to **End Task** screen → “Back to Task List”.
- **Backend**: `POST /api/tasks/:id/end`  
  Sets `status: 'completed'`, `completedDate: new Date()`.

---

## 6. Backend Summary

| Method | Path | Auth | Purpose |
|--------|------|------|--------|
| GET | `/api/tasks` | - | List tasks |
| GET | `/api/tasks/staff/:staffId` | - | Tasks for staff |
| GET | `/api/tasks/:id` | - | Task by id |
| PATCH | `/api/tasks/:id` | - | Update task (status, startTime, startLocation) |
| POST | `/api/tasks/:id/location` | Yes | Append live location |
| PATCH | `/api/tasks/:id/steps` | Yes | Update progress steps |
| POST | `/api/tasks/:id/end` | Yes | Complete task |

**MongoDB (Task)**  
- `progressSteps`: `{ reachedLocation, photoProof, formFilled, otpVerified }`  
- `locationHistory`: array of `{ lat, lng, timestamp }` (max 500).

---

## 7. UX Notes

- Green primary used for Live Tracking (app bar, progress, step completion).
- Blue used for primary actions (e.g. “Continue to Form”) to match existing app.
- Bottom sheet has rounded top, soft shadow; steps show clear done/pending state.
- “Continue” is enabled only when the current step (e.g. Reached location) is completed.
