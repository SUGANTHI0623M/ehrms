const Bull = require('bull');

const QUEUE_NAME = process.env.REDIS_QUEUE_NAME || 'monitoring_processing_queue';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
// Default: no Redis. Set USE_REDIS=true to use Redis queue + Worker (recommended for 50+ users).
const USE_REDIS = process.env.USE_REDIS === 'true' || process.env.USE_REDIS === '1';
// Max concurrent inline processing when USE_REDIS=false. Prevents crash under load.
const INLINE_CONCURRENCY = Math.min(20, Math.max(5, parseInt(process.env.INLINE_CONCURRENCY, 10) || 8));

/** Simple concurrency limiter: run at most N tasks at a time. */
const inlineQueue = (() => {
    let running = 0;
    const waiters = [];
    const runNext = () => {
        while (running < INLINE_CONCURRENCY && waiters.length > 0) {
            running++;
            const { fn, resolve, reject } = waiters.shift();
            Promise.resolve(fn()).then(resolve, (err) => { reject(err); }).finally(() => { running--; runNext(); });
        }
    };
    return (fn) => new Promise((resolve, reject) => {
        waiters.push({ fn, resolve, reject });
        runNext();
    });
})();

let activityQueue = null;

const getActivityQueue = () => {
    if (!activityQueue) {
        activityQueue = new Bull(QUEUE_NAME, REDIS_URL, {
            defaultJobOptions: {
                attempts: 5,
                backoff: { type: 'exponential', delay: 2000 },
                removeOnComplete: 100
            }
        });
    }
    return activityQueue;
};

exports.uploadActivity = async (req, res) => {
    try {
        const { encryptedKey, encryptedPayload, metadata } = req.body;

        if (!encryptedKey || !encryptedPayload || !metadata) {
            console.warn('[Activity upload] Bad request: missing fields', {
                hasEncryptedKey: !!encryptedKey,
                hasEncryptedPayload: !!encryptedPayload,
                hasMetadata: !!metadata
            });
            return res.status(400).json({
                success: false,
                message: 'encryptedKey, encryptedPayload, metadata are required'
            });
        }

        const { deviceId, tenantId, type, timestamp } = metadata;
        if (!deviceId || !tenantId || !type || !timestamp) {
            console.warn('[Activity upload] Bad request: metadata incomplete', { deviceId: !!deviceId, tenantId: !!tenantId, type, timestamp: !!timestamp });
            return res.status(400).json({
                success: false,
                message: 'metadata must include deviceId, tenantId, type, timestamp'
            });
        }

        console.log('[Activity upload] Received', { type, deviceId: deviceId?.substring?.(0, 12) + '...', tenantId });
        if (type === 'screenshot') {
            console.log('[Activity upload] SCREENSHOT - processing...', { deviceId, tenantId, timestamp });
        }

        if (!USE_REDIS) {
            const activityProcessor = require('../services/activityProcessor');
            const payload = { encryptedKey, encryptedPayload, metadata: { deviceId, tenantId, type, timestamp } };
            try {
                const result = await inlineQueue(() => activityProcessor.processPayload(payload));
                console.log('[Activity upload] Processed inline (no Redis)', { type: result.type, employeeId: result.employeeId, tenantId: result.tenantId });
                if (result.type === 'screenshot') {
                    console.log('[Activity upload] Screenshot saved to monitoringscreenshots', { deviceId, employeeId: result.employeeId, publicId: result.publicId });
                }
                return res.status(200).json({ success: true });
            } catch (err) {
                // "Screenshot too soon" is intentional skip – return 200 so agent removes from queue and activity logs can flow
                const isScreenshotTooSoon = metadata?.type === 'screenshot' && /too soon|too soon/i.test(err.message || '');
                if (isScreenshotTooSoon) {
                    console.log('[Activity upload] Screenshot skipped (too soon) – 200 OK to unblock queue', { deviceId: metadata?.deviceId });
                    return res.status(200).json({ success: true, skipped: true });
                }
                console.error('[Activity upload] Inline processing failed', { message: err.message, deviceId: metadata?.deviceId, type: metadata?.type });
                if (metadata?.type === 'screenshot') console.error('[Activity upload] SCREENSHOT FAILED:', err.message, err.stack);
                return res.status(500).json({ success: false, message: err.message });
            }
        }

        const queue = getActivityQueue();
        console.log('[Activity upload] Adding to Redis...', { type, deviceId });
        const job = await queue.add({
            encryptedKey,
            encryptedPayload,
            metadata: { deviceId, tenantId, type, timestamp }
        });

        console.log('[Activity upload] Queued → monitoring pipeline', { jobId: job.id, type, deviceId, tenantId, timestamp });
        res.status(200).json({ success: true });
    } catch (error) {
        if (USE_REDIS && (error.code === 'ECONNREFUSED' || (error.message && error.message.includes('max retries')))) {
            console.warn('[Activity upload] Redis unavailable, processing inline', { message: error.message });
            try {
                const activityProcessor = require('../services/activityProcessor');
                const result = await inlineQueue(() => activityProcessor.processPayload(req.body));
                console.log('[Activity upload] Processed inline (Redis fallback)', { type: result.type, employeeId: result.employeeId });
                return res.status(200).json({ success: true });
            } catch (fallbackErr) {
                const meta = req.body?.metadata || {};
                const isScreenshotTooSoon = meta?.type === 'screenshot' && /too soon/i.test(fallbackErr.message || '');
                if (isScreenshotTooSoon) {
                    console.log('[Activity upload] Screenshot skipped (too soon) – 200 OK', { deviceId: meta?.deviceId });
                    return res.status(200).json({ success: true, skipped: true });
                }
                console.error('[Activity upload] Inline fallback failed', fallbackErr.message);
                return res.status(500).json({ success: false, message: fallbackErr.message });
            }
        }
        console.error('[Activity upload] Queue add failed', { message: error.message, code: error.code });
        res.status(500).json({ success: false, message: error.message });
    }
};
