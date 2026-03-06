const Bull = require('bull');
const { getRedisClient } = require('../config/redis');

const QUEUE_NAME = process.env.REDIS_QUEUE_NAME || 'monitoring_processing_queue';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

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

// POST /api/activity/upload
// Receives encrypted payload - pushes to Redis, never decrypts in API
exports.uploadActivity = async (req, res) => {
    try {
        const { encryptedKey, encryptedPayload, metadata } = req.body;

        if (!encryptedKey || !encryptedPayload || !metadata) {
            return res.status(400).json({
                success: false,
                message: 'encryptedKey, encryptedPayload, metadata are required'
            });
        }

        const { deviceId, tenantId, type, timestamp } = metadata;
        if (!deviceId || !tenantId || !type || !timestamp) {
            return res.status(400).json({
                success: false,
                message: 'metadata must include deviceId, tenantId, type, timestamp'
            });
        }

        const queue = getActivityQueue();
        await queue.add({
            encryptedKey,
            encryptedPayload,
            metadata: { deviceId, tenantId, type, timestamp }
        });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[Activity upload]', error);
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'Queue unavailable, agent should retry'
            });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};
