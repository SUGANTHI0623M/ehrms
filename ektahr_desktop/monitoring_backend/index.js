require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./src/config/db');

const deviceRoutes = require('./src/routes/deviceRoutes');
const activityRoutes = require('./src/routes/activityRoutes');
const breakRoutes = require('./src/routes/breakRoutes');
const pauseRoutes = require('./src/routes/pauseRoutes');
const meetingRoutes = require('./src/routes/meetingRoutes');
const summaryRoutes = require('./src/routes/summaryRoutes');
const debugRoutes = require('./src/routes/debugRoutes');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

app.use('/api/device', (req, res, next) => {
    const ts = new Date().toISOString();
    console.log(`[${ts}] [Monitoring API] ${req.method} ${req.path}`, req.method === 'POST' && req.body && Object.keys(req.body).length ? req.body : '(no body)');
    next();
});

app.use('/api/device', deviceRoutes);
app.use('/api/activity', (req, res, next) => {
    const ts = new Date().toISOString();
    const meta = req.body?.metadata;
    const type = meta?.type || 'unknown';
    console.log(`[${ts}] [Monitoring API] ${req.method} ${req.path} type=${type}`, meta ? { type: meta.type, deviceId: meta.deviceId?.substring?.(0, 12) + '...', tenantId: meta.tenantId } : '(no metadata)');
    if (type === 'screenshot') console.log(`[${ts}] [Monitoring API] SCREENSHOT RECEIVED - will process`);
    next();
});
app.use('/api/activity', activityRoutes);
app.use('/api/break', breakRoutes);
app.use('/api/pause', pauseRoutes);
app.use('/api/meeting', meetingRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/debug', debugRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/api/debug', async (req, res) => {
    const useRedis = process.env.USE_REDIS === 'true' || process.env.USE_REDIS === '1';
    if (!useRedis) {
        return res.json({ useRedis: false, rsaSet: !!process.env.RSA_PRIVATE_KEY, hint: 'API processes uploads inline. No Redis or Worker needed.' });
    }
    try {
        const Bull = require('bull');
        const q = new Bull(process.env.REDIS_QUEUE_NAME || 'monitoring_processing_queue', process.env.REDIS_URL || 'redis://localhost:6379');
        const [waiting, active, completed, failed] = await Promise.all([q.getWaitingCount(), q.getActiveCount(), q.getCompletedCount(), q.getFailedCount()]);
        await q.close();
        res.json({ queue: { waiting, active, completed, failed }, rsaSet: !!process.env.RSA_PRIVATE_KEY, hint: 'Worker must be running (npm run worker) and RSA_PRIVATE_KEY set for data to reach MongoDB.' });
    } catch (e) {
        res.status(500).json({ error: e.message, hint: 'Is Redis running? Leave USE_REDIS unset to run without Redis.' });
    }
});

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Not found' });
});

const PORT = process.env.PORT || 9002;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const QUEUE_NAME = process.env.REDIS_QUEUE_NAME || 'monitoring_processing_queue';
const USE_REDIS = process.env.USE_REDIS === 'true' || process.env.USE_REDIS === '1';

const start = async () => {
    try {
        await connectDB();
        // Run attendance check cron separately (every 3 sec) - does not block requests
        const { runAttendanceCheck } = require('./src/cron/attendanceCheckCron');
        const ATTENDANCE_CRON_INTERVAL_MS = 3 * 1000; // 3 sec
        setInterval(() => runAttendanceCheck().catch((e) => console.error('[AttendanceCheckCron]', e?.message || e)), ATTENDANCE_CRON_INTERVAL_MS);
        setTimeout(() => runAttendanceCheck().catch((e) => console.error('[AttendanceCheckCron] init', e?.message || e)), 3000); // First run after 3s
        console.log('[Monitoring API] Attendance check cron scheduled (every 3 sec)');
        if (!USE_REDIS) {
            console.log('[Monitoring API] No Redis (default). Processing uploads inline. No Worker needed.');
            app.listen(PORT, () => console.log(`[Monitoring API] Running on port ${PORT}`));
            return;
        }
        const Bull = require('bull');
        const redisQueue = new Bull(QUEUE_NAME, REDIS_URL);
        await Promise.race([
            redisQueue.client.ping(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
        ]);
        await redisQueue.close();
        console.log('[Monitoring API] Redis: OK');
        app.listen(PORT, () => console.log(`[Monitoring API] Running on port ${PORT}`));
    } catch (err) {
        if (err.message === 'timeout' || err.code === 'ECONNREFUSED' || (err.message && err.message.includes('Redis'))) {
            console.error('[Monitoring API] Redis not reachable at', REDIS_URL, '- leave USE_REDIS unset to run without Redis.');
            app.listen(PORT, () => console.log(`[Monitoring API] Running on port ${PORT} (Redis not connected)`));
        } else {
            console.error('Failed to start:', err.message);
            process.exit(1);
        }
    }
};

start();
