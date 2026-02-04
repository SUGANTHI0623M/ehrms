# Rate Limiting & 429 Handling (HRMS)

## Root causes (1–4) and fixes (5–9) — at a glance

| # | Root cause |
|---|------------|
| **1** | **Excessive requests** — Frequent API calls without delays (loops, auto-refresh, multiple concurrent calls during testing). |
| **2** | **No retry logic** — App doesn’t handle 429 by waiting and retrying, so one burst can trigger more requests and worsen rate limiting. |
| **3** | **Missing throttling** — No delay between requests; `Retry-After` / `X-RateLimit-Reset` from server are not respected. |
| **4** | **Strict backend limits** — Auth/attendance routes had tight limits (e.g. 20/15 min); 429 was returned as plain text without `Retry-After`. |

| # | Fix |
|----|-----|
| **5** | **Dio retry interceptor** — Retry on 429 up to 3 times with exponential backoff (2s, 4s, 6s) and respect `Retry-After` header. |
| **6** | **Single Dio client** — Entire app uses `ApiClient().dio` for all backend calls so retry and timeouts are consistent. |
| **7** | **Throttle / debounce** — `RequestGuard` on buttons (e.g. check-in) to avoid double taps; `Debouncer` for refresh/search. |
| **8** | **Backend 429 handler** — JSON response + `Retry-After`; tuned limits (e.g. auth 40/15min, attendance 120/min); global cap 400/min. |
| **9** | **Don’t call API in `build()`** — Load data in `initState()` or in response to user action; use cache for today/month attendance. |

### Flow (text-based)

```
  Client Request  →  Server checks rate limit
       │
       ├── Exceeded? (429)  →  [Backoff delay 2s/4s/6s or Retry-After]  →  Retry (up to 3×)
       │                              │
       │                              └── Still 429 after 3 retries  →  Show "Too many requests / Server busy"
       │
       └── OK  →  Process & respond (200 + JSON)  →  Success
```

---

## 1) Root causes (Flutter, Node, MongoDB, hosting)

| Layer | Likely cause |
|-------|----------------|
| **Flutter** | Multiple API calls from `build()`, rapid taps, no retry on 429, polling/refresh too frequent, location-driven calls without debounce. |
| **Node.js** | Per-route limits too strict (e.g. auth 20/15min), 429 response as plain text (no `Retry-After`), no global cap. |
| **MongoDB** | Usually not the cause of 429; high write frequency for attendance/location would add load but not directly cause “too many requests”. |
| **Hosting / PM2** | Reverse proxy (Nginx) or gateway in front can add its own rate limits; shared hosting may throttle by IP. |

---

## 2) Fixes applied

- **Flutter (Dio)**  
  - Central `ApiClient` (Dio) with `RetryOnRateLimitInterceptor`: retry on 429 up to 3 times, exponential backoff 2s, 4s, 6s, respects `Retry-After`.  
  - Auth (login, profile, updateProfile) and attendance (check-in, check-out, get today) use this client.

- **Flutter – fewer duplicate calls**  
  - `RequestGuard` (cooldown per action) and `Debouncer` in `lib/utils/request_guard.dart` for taps and refresh.  
  - Do **not** call API in `build()`; use `initState()` / `FutureBuilder` / refresh callbacks.  
  - Attendance service keeps client-side throttle and cache for today/month.

- **Node.js**  
  - `createRateLimitHandler()` in `src/utils/rateLimitHandler.js`: 429 response is JSON and sets `Retry-After` from `req.rateLimit.resetTime` or `windowMs`.  
  - Global API limiter: 400 req/min per IP (skip for `GET /`).  
  - Auth: 40/15min, Attendance: 120/min, Dashboard: 100/min, each with the shared handler.

- **MongoDB**  
  - No change needed for normal check-in/check-out (one write per action). If you add frequent location streaming, batch or throttle writes (e.g. at most one write per N seconds per user).

---

## 3) Request flow (text diagram)

```
  Flutter (Dio)
       │
       ▼
  ┌─────────────────┐
  │ ApiClient       │  (baseURL, timeouts, interceptors)
  │ Retry interceptor│  (on 429: wait 2s/4s/6s or Retry-After, retry up to 3x)
  └────────┬────────┘
           │
           ▼  HTTP GET/POST /api/...
  ┌─────────────────┐
  │ Node (Express)  │
  │ Global limiter  │  400/min per IP → if over: 429 + Retry-After, JSON
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Route limiter   │  e.g. auth 40/15min, attendance 120/min
  │ (auth/attend/…) │  → if over: 429 + Retry-After, JSON
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ protect (JWT)   │  (for protected routes)
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Controller      │  → MongoDB read/write
  └────────┬────────┘
           │
           ▼
  Response 200 + JSON
           │
  If 429 ←────────────┐
           │          │  Flutter: interceptor retries (backoff / Retry-After)
           ▼          │  After 3 failures → show "Too many requests..."
  User sees success   └──────────────────────────────────────────────────────
  or error message
```

---

## 4) Dio interceptor (production-ready)

Implemented in `hrms/lib/services/api_client.dart`:

- Retries **only on 429**, up to **3 times**.
- Backoff: **2s, 4s, 6s**; if server sends **Retry-After**, uses that (capped at 120s).
- Uses the **same Dio instance** for retries so base URL and timeouts are consistent.

---

## 5) Recommended rate limit config (HRMS)

| Scope | Window | Limit | Notes |
|-------|--------|--------|--------|
| Global (all /api) | 1 min | 400 | Per IP; skip `GET /`. |
| Auth | 15 min | 40 | Login, profile, photo, verify-face, password flows. |
| Attendance | 1 min | 120 | Check-in, check-out, today, month, history. |
| Dashboard | 1 min | 100 | Stats, employee dashboard. |
| Others (requests, payroll, etc.) | Optional | e.g. 100/min | Add same handler for JSON + Retry-After. |

All 429 responses use the shared handler: JSON body and `Retry-After` header.

---

## 6) Best practices (avoid 429 in testing and production)

**Flutter**

- Use **one** Dio client (`ApiClient()`) for all API calls that should retry on 429.
- Do **not** call API inside `build()`; load data in `initState()` or in response to user action.
- Use **RequestGuard** on submit buttons (login, check-in, check-out) to avoid double submission.
- Use **Debouncer** for search or “refresh” triggered by user input.
- Avoid polling intervals shorter than 30–60 seconds; prefer pull-to-refresh or event-driven updates.
- Reuse **cached** today/month attendance when available and only force-refresh when needed.

**Node**

- Keep **global** limit (e.g. 400/min) and **per-route** limits (auth, attendance, dashboard).
- Always return **JSON** for 429 and set **Retry-After** so the app can retry sensibly.
- Use **standardHeaders: true** so clients can read rate limit info if needed.

**MongoDB**

- One write per check-in and one per check-out is fine.
- If you add live location tracking, **batch or throttle** writes (e.g. max 1 write per 30–60s per user).

**Testing**

- Use a **single** test user/IP; avoid scripts that fire hundreds of requests in a short time.
- In dev, you can temporarily **raise** limits or skip rate limit for a test IP; do not disable in production.

**Production**

- Monitor 429s in logs; if many users hit limits, consider raising limits or using **user-based** limits (e.g. by `userId` after auth) instead of only IP.
- Ensure **PM2** and **Nginx** (if used) are not applying extra throttling that could double 429s.
