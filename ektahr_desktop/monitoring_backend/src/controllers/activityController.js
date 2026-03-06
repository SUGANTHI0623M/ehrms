const Bull = require('bull');

const QUEUE_NAME = process.env.REDIS_QUEUE_NAME || 'monitoring_processing_queue';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
// Default: no Redis. Set USE_REDIS=true to use Redis queue + Worker.
const USE_REDIS = process.env.USE_REDIS === 'true' || process.env.USE_REDIS === '1';

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

        console.log('[Activity upload] Received', { type, deviceId, tenantId });

        if (!USE_REDIS) {
            const activityProcessor = require('../services/activityProcessor');
            try {
                const result = await activityProcessor.processPayload({ encryptedKey, encryptedPayload, metadata: { deviceId, tenantId, type, timestamp } });
                console.log('[Activity upload] Processed inline (no Redis)', { type: result.type, employeeId: result.employeeId, tenantId: result.tenantId });
                return res.status(200).json({ success: true });
            } catch (err) {
                console.error('[Activity upload] Inline processing failed', { message: err.message, stack: err.stack });
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
                const result = await activityProcessor.processPayload(req.body);
                console.log('[Activity upload] Processed inline (Redis fallback)', { type: result.type, employeeId: result.employeeId });
                return res.status(200).json({ success: true });
            } catch (fallbackErr) {
                console.error('[Activity upload] Inline fallback failed', fallbackErr.message);
                return res.status(500).json({ success: false, message: fallbackErr.message });
            }
        }
        console.error('[Activity upload] Queue add failed', { message: error.message, code: error.code });
        res.status(500).json({ success: false, message: error.message });
    }
};
