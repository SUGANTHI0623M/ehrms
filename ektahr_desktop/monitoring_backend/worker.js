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

const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY, 10) || 8;
queue.process(WORKER_CONCURRENCY, async (job) => {
    await activityProcessor.processPayload(job.data);
});

queue.on('failed', () => {});

const start = async () => {
    try {
        await connectDB();
        try {
            await Promise.race([
                queue.client.ping(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
            ]);
        } catch (e) { /* ignore */ }
    } catch (err) {
        process.exit(1);
    }
};

start();
