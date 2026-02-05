# Live Tracking – Admin Web Integration (Step-by-Step)

**For the web team (React app at hrms.askeva.net).**  
The mobile app and API (ehrms.askeva.net) are ready. This doc explains how to connect live tracking to the admin dashboard.

---

## Overview

| Component | Domain |
|-----------|--------|
| **Web (React admin)** | https://hrms.askeva.net |
| **API (backend)** | https://ehrms.askeva.net |

CORS is enabled for `hrms.askeva.net`. The mobile app sends GPS every 15 seconds; the backend broadcasts via Socket.io.

### Local development (192.168.16.x)

| Machine | Use |
|---------|-----|
| **192.168.16.114** | Backend API (port 9001) or Admin web (port 3000) |
| **192.168.16.104** | Admin web (port 3000) or Backend API (port 9001) |

- **Mobile app**: Set `baseUrl` in `hrms/lib/config/constants.dart` to `http://192.168.16.114:9001/api` or `http://192.168.16.104:9001/api` (whichever machine runs the backend).
- **Admin web**: Use `http://192.168.16.114:9001` or `http://192.168.16.104:9001` as `SOCKET_URL` and `API_BASE` (whichever machine runs the backend).

---

## Step-by-Step: Connect Admin to Live Tracking

### Step 1: Install Socket.io Client

In your React project:

```bash
npm install socket.io-client
```

---

### Step 2: Create a Tracking Socket Hook/Service

Create a module that connects to the API and listens for tracking events:

```javascript
// e.g. src/services/trackingSocket.js
import { io } from 'socket.io-client';

// Production
const SOCKET_URL = 'https://ehrms.askeva.net';
// Local dev – use backend machine IP (e.g. 192.168.16.114 or 192.168.16.104)
// const SOCKET_URL = 'http://192.168.16.114:9001';

export function createTrackingSocket() {
  const socket = io(SOCKET_URL, { path: '/socket.io/' });

  socket.on('connect', () => {
    // Join admin room to receive ALL live tracking updates
    socket.emit('admin:join');
  });

  return socket;
}
```

---

### Step 3: Join Admin Room on Page Load

When the admin opens the tracking page (or dashboard):

```javascript
const socket = createTrackingSocket();

socket.on('connect', () => {
  socket.emit('admin:join');  // Receive updates for all tasks
});
```

**Important:** `admin:join` subscribes you to every `tracking:location` event from any task. Use this for an admin “all tasks” view.

---

### Step 4: Subscribe to a Single Task (Optional)

If the admin is viewing one task’s map, also join that task’s room:

```javascript
socket.on('connect', () => {
  socket.emit('admin:join');
  socket.emit('tracking:join', { taskId: taskMongoId });  // MongoDB _id
});
```

`taskId` must be the task’s MongoDB `_id` (e.g. `"507f1f77bcf86cd799439011"`).

---

### Step 5: Listen for Live Location Updates

```javascript
socket.on('tracking:location', (data) => {
  // data: { taskMongoId, latitude, longitude, timestamp, batteryPercent, staffName, movementType }
  console.log('New position:', data.taskMongoId, data.latitude, data.longitude);

  // Update your map:
  // 1. Add point to the path polyline for this task
  // 2. Move the staff marker to (data.latitude, data.longitude)
  // 3. Optionally show battery, movementType, staffName in a popup/tooltip
});
```

---

### Step 6: Load Past Path (Replay)

For completed or in-progress tasks, load the full path from the API:

```javascript
const API_BASE = 'https://ehrms.askeva.net/api';

async function loadTrackingPath(taskMongoId, bearerToken) {
  const res = await fetch(`${API_BASE}/tasks/${taskMongoId}/tracking-path`, {
    headers: { 'Authorization': `Bearer ${bearerToken}` }
  });
  if (!res.ok) throw new Error('Failed to load path');
  const { path, status, staff, customer } = await res.json();
  // path = [{ latitude, longitude, timestamp, batteryPercent }, ...]
  return { path, status, staff, customer };
}
```

Use `path` to draw a polyline on the map and optionally replay it.

---

### Step 7: Build the Admin UI

1. **Map** – Use Leaflet, Mapbox, or Google Maps.
2. **Task list** – List in-progress tasks (from `GET /api/tasks` or your existing API).
3. **Select task** – When admin selects a task:
   - Call `loadTrackingPath(taskMongoId, token)` to draw the path.
   - Emit `tracking:join` with that `taskMongoId` (or rely on `admin:join` for all).
4. **Live updates** – On each `tracking:location`, update the marker and append to the path.

---

## Staff-Based Tracking (Admin at 192.168.16.114)

Admin can track a specific staff by `staffId` instead of by task.

### Step 1: Start tracking via API

```javascript
// POST /api/tracking/start
const res = await fetch(`${API_BASE}/tracking/start`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ staffId: '698431645d46a76820cf973d' })
});
const { success, data } = await res.json();
// { success: true, data: { message: "Tracking started for Boominathan M", staffId, staffName } }
```

### Step 2: Join staff room via Socket.io

```javascript
socket.on('connect', () => {
  socket.emit('admin:track-staff', { staffId: '698431645d46a76820cf973d' });
});
```

### Step 3: Receive live location for that staff

```javascript
socket.on('tracking:location', (data) => {
  if (data.staffId === '698431645d46a76820cf973d') {
    // Update map: move marker to (data.latitude, data.longitude)
  }
});
```

**Note:** Location updates are sent only when the staff has an active task and the mobile app is sending GPS. The payload includes `staffId` for filtering.

---

## Fetch Tracking Data from MongoDB

Admin can fetch stored tracking records (saved every 15 sec) including reverse-geocoded address:

```javascript
// GET /api/tracking?staffId=698431645d46a76820cf973d&limit=100
const res = await fetch(`${API_BASE}/tracking?staffId=${staffId}&limit=100`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { success, data } = await res.json();
// data = [{ taskId, staffId, staffName, latitude, longitude, timestamp, batteryPercent, movementType, address, city, area, pincode }, ...]
```

**Query params:** `staffId`, `taskId`, `from` (ISO date), `to` (ISO date), `limit` (default 500, max 2000).

---

## API Reference

| Method | URL | Auth | Purpose |
|-------|-----|------|---------|
| POST | `https://ehrms.askeva.net/api/tracking/store` | Bearer | Store tracking point (body: `{ taskId, lat, lng, timestamp?, batteryPercent?, movementType? }`). Mobile calls on Start Ride + every 15 sec. |
| GET | `https://ehrms.askeva.net/api/tracking` | Bearer | Fetch tracking records (query: `staffId`, `taskId`, `from`, `to`, `limit`) |
| POST | `https://ehrms.askeva.net/api/tracking/start` | Bearer | Start tracking a staff (body: `{ staffId }`) |
| GET | `https://ehrms.askeva.net/api/tasks/:id/tracking-path` | Bearer | Get full GPS path for replay |

**Tracking collection (MongoDB):** Mobile calls `POST /api/tracking/store` on Start Ride and every 15 sec. Backend stores: `taskId`, `staffId`, `staffName`, `latitude`, `longitude`, `timestamp`, `batteryPercent`, `movementType`, `address`, `city`, `area`, `pincode`. Address is reverse-geocoded from lat/lng. No Socket.io involved.

**Socket events:**
- `admin:join` – receive all tracking updates
- `admin:track-staff` – receive updates for one staff (payload: `{ staffId }`)
- `tracking:join` – receive updates for one task (payload: `{ taskId }`)

**Socket event `tracking:location` payload:**
```json
{
  "taskMongoId": "507f1f77bcf86cd799439011",
  "staffId": "698431645d46a76820cf973d",
  "latitude": 11.123,
  "longitude": 77.456,
  "timestamp": "2025-02-05T10:30:00.000Z",
  "batteryPercent": 85,
  "movementType": "walk",
  "staffName": "John Doe"
}
```
`movementType`: `"drive"` | `"walk"` | `"stop"`

---

## End-to-End Flow

| Step | Who | Action |
|------|-----|--------|
| 1 | Staff | Taps **Start Ride** in mobile app |
| 2 | Mobile | Sends GPS to `POST /api/tasks/:id/location` every 15 sec |
| 3 | Backend | Stores point, broadcasts to `task:${id}` and `admin:tracking` rooms |
| 4 | Admin web | Connects to Socket.io, emits `admin:join` |
| 5 | Admin web | Listens for `tracking:location`, updates map |
