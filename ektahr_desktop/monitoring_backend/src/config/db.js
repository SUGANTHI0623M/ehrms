const mongoose = require('./mongoose');

const MONITORING_COLLECTIONS = [
    'monitoringversions',
    'monitoringdevices',
    'monitoringlogs',
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
            mongoose.connection.on('error', () => {});
            mongoose.connection.on('disconnected', () => {});
        }

        await ensureMonitoringCollections();
    } catch (error) {
        throw error;
    }
};

module.exports = connectDB;
