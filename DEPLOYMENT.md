# HRMS Backend – Server Deployment Guide

What to install and configure on your deployment server to run the HRMS API and face verification.

---

## 1. Server requirements

| Item | Version / notes |
|------|------------------|
| **OS** | Linux (Ubuntu 20.04 / 22.04 recommended) or Windows Server |
| **Node.js** | LTS (v18 or v20). Required for the API. |
| **npm** | Comes with Node.js. Used to install backend dependencies. |
| **MongoDB** | Use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (cloud) or install MongoDB on the server. |
| **Python** | 3.8 or 3.9+ (3.10/3.11 recommended). Required only if you use face verification (selfie check-in). |
| **RAM** | 1 GB minimum; 2 GB+ recommended if running face verification (DeepFace). |

---

## 2. Install on the server

### 2.1 Node.js (Ubuntu example)

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node -v   # e.g. v20.x.x
npm -v
```

### 2.2 Python (for face verification)

```bash
# Ubuntu
sudo apt-get update
sudo apt-get install -y python3 python3-venv python3-pip

# Verify
python3 --version   # 3.8 or higher
```

### 2.3 MongoDB

- **Option A – MongoDB Atlas (recommended)**  
  Create a cluster at https://cloud.mongodb.com, get the connection string, and set it in `.env` as `MONGODB_URI`. No MongoDB install on the server.

- **Option B – Install MongoDB on the server**  
  Follow [MongoDB install docs](https://www.mongodb.com/docs/manual/installation/) for your OS. Then set `MONGODB_URI=mongodb://localhost:27017/your-db-name` (or your chosen host/port/db) in `.env`.

---

## 3. Deploy the backend (Node.js API)

### 3.1 Copy project and install dependencies

```bash
# Example: clone or copy app_backend to the server
cd /var/www   # or your chosen path
# Upload/copy the app_backend folder here

cd app_backend
npm install --production
```

### 3.2 Environment variables

Create a `.env` file in `app_backend/` (same folder as `index.js`) with at least:

```env
# Server
PORT=9001
NODE_ENV=production

# Database (MongoDB Atlas or local)
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>

# Auth
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=2d
JWT_REFRESH_EXPIRES_IN=7d

# Frontend (for CORS; use your real app URL)
FRONTEND_URL=https://hrms.askeva.net

# Email (e.g. Gmail SMTP) – used if SendPulse/SendGrid not set
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# SendPulse (recommended on server – sends over HTTPS, no SMTP firewall issues)
# Get client ID/secret from SendPulse dashboard. Verify sender in SendPulse (Settings → Senders).
SENDPULSE_CLIENT_ID=your_client_id
SENDPULSE_CLIENT_SECRET=your_client_secret
SENDPULSE_FROM_EMAIL=dev@askeva.io
SENDPULSE_FROM_NAME=ASKEVA HRMS

# Optional: SendGrid (alternative to SendPulse when SMTP is blocked)
# SENDGRID_API_KEY=SG.xxxx
# Verify a sender in SendGrid dashboard; use that email as EMAIL_FROM

# Cloudinary (image uploads / profile photos)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Add any other variables your app uses (e.g. SendPulse if you use it). Do **not** commit `.env`; keep it only on the server.

### 3.3 Start the API

```bash
cd app_backend
node index.js
# Or: npm start
```

For production, run the process with a process manager (see section 6).

---

## 4. Face verification (Python) – optional

Used for selfie check-in (compare selfie with profile photo). If you don’t use this feature, the API still works; `/api/auth/verify-face` will return a “not available” style response.

### 4.1 Create virtual environment and install dependencies

From the **server**, inside the repo:

```bash
cd app_backend/face_verify
python3 -m venv venv
source venv/bin/activate   # Linux/macOS
# On Windows: venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

The backend expects Python at:

- **Linux/macOS:** `app_backend/face_verify/venv/bin/python`
- **Windows:** `app_backend/face_verify/venv/Scripts/python.exe`

If `venv` is missing, it falls back to system `python3` / `python`.

### 4.2 First run (model download)

The first time `face_verify.py` runs, DeepFace may download model weights (e.g. under `face_verify/.deepface/`). Ensure the process has write access to `app_backend/face_verify/` and enough disk space (~100–200 MB).

### 4.3 Test

```bash
cd app_backend/face_verify
source venv/bin/activate
python face_verify.py /path/to/selfie.jpg /path/to/profile.jpg
# Expected stdout: {"match": true|false, "error": null|"..."}
```

---

## 5. Checklist – what must be set on the server

| Step | What to do |
|------|------------|
| 1 | Install **Node.js** (v18 or v20 LTS) and **npm**. |
| 2 | Have **MongoDB** (Atlas or local) and set **MONGODB_URI** in `.env`. |
| 3 | Copy **app_backend** to the server and run **npm install** in `app_backend/`. |
| 4 | Create **.env** in `app_backend/` with **PORT**, **MONGODB_URI**, **JWT_SECRET**, **FRONTEND_URL**, and email/Cloudinary (and any other vars your app uses). |
| 5 | (Optional) Install **Python 3.8+**, create **face_verify/venv**, run **pip install -r requirements.txt** in `face_verify/`. |
| 6 | Start the API (**node index.js** or **npm start**) and, in production, run it under **PM2** or **systemd**. |
| 7 | (Optional) Put **nginx** (or another reverse proxy) in front and use **HTTPS**. |

---

## 6. Production tips

### 6.1 Process manager (PM2)

```bash
sudo npm install -g pm2
cd /path/to/app_backend
pm2 start index.js --name hrms-api
pm2 save
pm2 startup   # enable start on boot
```

### 6.2 Reverse proxy (nginx) and HTTPS

- Point a domain (e.g. `api.yourdomain.com`) to the server.
- Install nginx and a certificate (e.g. Let’s Encrypt with certbot).
- Proxy requests to `http://127.0.0.1:9001` (or your `PORT`). Use HTTPS on the public side.

### 6.3 Firewall

- Open only **80**, **443** (and SSH if needed). Do not expose the Node.js port (e.g. 9001) directly to the internet if nginx is in front.

### 6.4 CORS

- In `app_backend/index.js`, set `allowedOrigins` to your real app URL(s) (e.g. `https://hrms.askeva.net`). Match `FRONTEND_URL` in `.env`.

---

## 7. Summary – install list

**Minimum (API only, no face verification):**

- Node.js (LTS) + npm  
- MongoDB (Atlas or installed)  
- Backend code + `.env`  
- Run: `npm install` → `node index.js`

**Full (API + face verification):**

- Everything above, plus:  
- Python 3.8+  
- `app_backend/face_verify/venv` with `pip install -r requirements.txt`  
- Write access to `face_verify/` for DeepFace model cache  

**Production:**

- PM2 (or systemd) to keep the process running  
- nginx + HTTPS in front of the API  
- Firewall and strong `JWT_SECRET` and DB credentials in `.env`

---

## OTP email: Connection timeout (ETIMEDOUT)

If logs show **`[EmailService] ❌ Failed to send OTP email: Connection timeout`** with **`command: 'CONN'`**, the server cannot reach the SMTP host. Many hosts block outbound SMTP (ports 25, 465, 587).

**Options:**

1. **Use SendPulse (recommended)** – sends over HTTPS, no SMTP port needed:
   - Get client ID and secret from [SendPulse](https://sendpulse.com) dashboard.
   - In SendPulse, verify a sender (Settings → Senders); e.g. `dev@askeva.io`.
   - In `.env` add:
     - `SENDPULSE_CLIENT_ID=your_client_id`
     - `SENDPULSE_CLIENT_SECRET=your_client_secret`
     - `SENDPULSE_FROM_EMAIL=dev@askeva.io`
     - `SENDPULSE_FROM_NAME=ASKEVA HRMS`
   - Restart the backend. OTP emails will be sent via SendPulse.

2. **Use SendGrid** – alternative HTTPS provider:
   - Get an API key from [SendGrid](https://sendgrid.com). Verify a sender.
   - In `.env` add: `SENDGRID_API_KEY=SG.your-key`
   - Run: `npm install @sendgrid/mail`. Restart the backend.

3. **Open outbound SMTP on the server** – ask your host to allow outbound connections to your SMTP host:port (e.g. `smtp.gmail.com:587`).

4. **Increase timeout** – if the network is slow, set in `.env`: `EMAIL_CONNECTION_TIMEOUT=30000`, `EMAIL_SOCKET_TIMEOUT=30000`.
