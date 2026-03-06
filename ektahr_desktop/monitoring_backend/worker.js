require('dotenv').config();
const Bull = require('bull');
const connectDB = require('./src/config/db');
const activityProcessor = require('./src/services/activityProcessor');

const QUEUE_NAME = process.env.REDIS_QUEUE_NAME || 'monitoring_processing_queue';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const queue = new Bull(QUEUE_NAME, REDIS_URL, {
    defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100
    }
});

queue.process(async (job) => {
    const { deviceId, tenantId, type } = job.data.metadata;
    console.log('[Worker] Processing job', { jobId: job.id, type, deviceId, tenantId });
    const result = await activityProcessor.processPayload(job.data);
    if (result.type === 'activity') {
        console.log('[Worker] monitoringlogs INSERT OK', { activityLogId: result.activityLogId?.toString(), employeeId: result.employeeId, tenantId: result.tenantId });
    } else {
        console.log('[Worker] Screenshot saved', { employeeId: result.employeeId, tenantId: result.tenantId, publicId: result.publicId });
    }
});

queue.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
});

queue.on('failed', (job, err) => {
    console.error('[Worker] Job failed (no data stored)', { jobId: job?.id, type: job?.data?.metadata?.type, error: err.message });
    if (err.stack) console.error('[Worker] Stack:', err.stack);
});

const start = async () => {
    try {
        await connectDB();
        try {
            await Promise.race([
                queue.client.ping(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
            ]);
            console.log('[Worker] Redis: OK');
        } catch (e) {
            console.error('[Worker] Redis not reachable - jobs will not be processed until Redis is running.');
        }
        const hasRsa = !!process.env.RSA_PRIVATE_KEY;
        console.log('[Worker] Processing queue:', QUEUE_NAME);
        if (!hasRsa) console.warn('[Worker] RSA_PRIVATE_KEY not set - using raw-key fallback (works when server did not send public key; for production set RSA_PRIVATE_KEY in .env).');
    } catch (err) {
        console.error('[Worker] Failed to start:', err.message);
        process.exit(1);
    }
};

start();
