# Google Play Store – App Content & Store Settings Checklist

Use this when filling out **App content** and **Store settings** in Play Console for your HRMS app.

---

## 1. Content rating

**Action:** Submit new questionnaire.

- In Play Console: **Policy** → **App content** → **Content rating** → **Start questionnaire** (or **Submit new questionnaire**).
- Choose **Utilities, Productivity, Communication, or Other** (or **Business** if listed).
- Answer the questionnaire. For an HRMS/employee app (attendance, tasks, salary, leave, no social/chat violence):
  - **Violence:** No (or minimal, depending on your content).
  - **Sexual content:** No.
  - **Bad language:** No.
  - **Controlled substances (drugs, alcohol, tobacco):** No.
  - **Gambling:** No.
  - **User-generated content:** Answer based on whether users can post content (e.g. chat, comments). If only internal HR data, typically **No** or **Limited**.
  - **Share location:** **Yes** (app uses location for attendance/geo tasks).
  - **Unrestricted web access:** **No** (unless you open arbitrary URLs in-app).
- Save and submit. You’ll get a rating (e.g. Everyone, Teen, Mature). For “Target age 18+” you may need to align this in **Target audience** (see below).

---

## 2. Target audience and content

**Action:** Update so that **Target age is 18 and older**.

- Go to **App content** → **Target audience and content**.
- Set **Target age group** to **18 and older** (or the range that includes 18+).
- If asked about **target audience**, choose options that reflect **employees / workforce / business users**.
- Confirm or add any **content that may be sensitive** (e.g. financial/salary info). Declare salary/pay information if the app shows it.
- Save.

---

## 3. Privacy policy

**Action:** Verify only (you already have a URL).

- **App content** → **Privacy policy**.
- Ensure the URL is exactly:  
  `https://doc-hosting.flycricket.io/aehrms-privacy-policy/3c65b556-5dcd-4a0d-900e-d2a4801acea0/privacy`
- The policy should clearly cover:
  - What data you collect (email, name, location, photos, device/identifiers, FCM).
  - Why (account, attendance, tasks, notifications).
  - Where it’s stored and who has access.
  - User rights (access, deletion, etc.).
  - Contact for privacy questions.

If anything above is missing, update the policy on the host and keep the same URL.

---

## 4. Ads declaration

**Action:** Update ads declaration.

Your app **does not use any ad SDK** (no AdMob, etc. in `pubspec.yaml`).

- **App content** → **Ads declaration**.
- Select **No, my app does not contain ads** (or equivalent).
- Save.

---

## 5. Data safety

**Action:** Complete Data safety questionnaire.

Declare what you **collect** and **share**, and for what purpose. Based on your app:

| Data type | Collected? | Shared with third parties? | Purpose (typical) |
|-----------|------------|----------------------------|--------------------|
| **Email address** | Yes | No (or only your backend) | Account, login |
| **Name** | Yes | No | Account, profile |
| **Precise location** | Yes | No | Attendance, geo tasks, tracking |
| **Photos** | Yes | No | Selfie check-in, task photo proof |
| **App activity** (e.g. task/attendance actions) | Yes | No | App functionality |
| **Device or other IDs** (e.g. FCM token) | Yes | No (or Firebase) | Push notifications |
| **Financial info** (salary/payslips in-app) | Yes | No | Salary feature |

**Steps in Play Console:**

- **App content** → **Data safety** → **Start** or **Edit**.
- For each **data type** you collect:
  - **Is this data collected or shared?** → Collected (and Shared only if you send it to third parties; Firebase as “processor” is often not “shared” in the strict sense—follow Play’s guidance).
  - **Is this data required or optional?** → Required for core features (login, location, photos for check-in/proof).
  - **Why is this data collected?** Choose: App functionality, Account management, Analytics (only if you use analytics), etc.
- If you use **encryption in transit**: Yes (HTTPS).
- **Data deletion:** Declare that users can request deletion (e.g. via email/support or account deletion). Add a way if you don’t have one.

Answer every question; incomplete forms block publishing.

---

## 6. Store settings – App category

**Action:** Confirm category.

- **Store settings** → **App category**.
- **Primary category:** **Business** (already set) is correct for an HRMS/employee app.
- If there’s a **secondary category**, you can leave it or choose something like **Productivity**.
- Save.

---

## Quick checklist

- [ ] **Content rating** – Questionnaire submitted; rating received.
- [ ] **Target audience and content** – Set to 18+; audience and sensitive content declared.
- [ ] **Privacy policy** – URL set and policy covers all collected data.
- [ ] **Ads declaration** – Set to “No ads.”
- [ ] **Data safety** – All collected data types declared; purpose and required/optional stated.
- [ ] **App category** – Business (and secondary if needed) selected.

After all items are green in Play Console, you can proceed to release (e.g. production track or staged rollout).
