const Redis = require('ioredis');

let redisClient = null;

const getRedisClient = () => {
    if (!redisClient) {
        const url = process.env.REDIS_URL || 'redis://localhost:6379';
        redisClient = new Redis(url, {
            maxRetriesPerRequest: null,
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });
        redisClient.on('error', (err) => console.error('[Redis] Error:', err.message));
        redisClient.on('connect', () => console.log('[Redis] Connected'));
    }
    return redisClient;
};

module.exports = { getRedisClient };
