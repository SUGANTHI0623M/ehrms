const mongoose = require('./mongoose');

const MONITORING_COLLECTIONS = [
    'monitoringversions',
    'monitoringdevices',
    'monitoringlogs',
    'monitoringscores',
    'monitoringscreenshots',
    'monitoringsettings',
    'monitoringdailysummaries',
    'monitoringstaffs',
    'monitoringattendancecache'
];

const ensureMonitoringCollections = async () => {
    const conn = mongoose.connection;
    const existing = await conn.db.listCollections().toArray();
    const names = new Set(existing.map(c => c.name));
    for (const name of MONITORING_COLLECTIONS) {
        if (!names.has(name)) {
            await conn.db.createCollection(name);
            console.log(`[Monitoring DB] Created collection: ${name}`);
        }
    }
};

let listenersAttached = false;

const connectDB = async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            return;
        }
        const poolSize = parseInt(process.env.MONGODB_POOL_SIZE, 10) || 50;
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 60000,
            connectTimeoutMS: 60000,
            socketTimeoutMS: 45000,
            maxPoolSize: poolSize
        });
        if (!listenersAttached) {
            listenersAttached = true;
            mongoose.connection.on('error', (err) => console.error('[Monitoring DB] Connection error:', err.message));
            mongoose.connection.on('disconnected', () => console.warn('[Monitoring DB] Disconnected'));
        }
        console.log(`[Monitoring DB] MongoDB Connected: ${conn.connection.host}`);

        await ensureMonitoringCollections();
    } catch (error) {
        console.error(`[Monitoring DB] Connection Error: ${error.message}`);
        throw error;
    }
};

module.exports = connectDB;
