const mongoose = require('./mongoose');

const MONITORING_COLLECTIONS = [
    'monitoringdevices',
    'monitoringlogs',
    'monitoringscores',
    'monitoringscreenshots',
    'monitoringsettings'
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

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 60000,
            connectTimeoutMS: 60000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10
        });
        mongoose.connection.on('error', (err) => console.error('[Monitoring DB] Connection error:', err.message));
        mongoose.connection.on('disconnected', () => console.warn('[Monitoring DB] Disconnected'));
        console.log(`[Monitoring DB] MongoDB Connected: ${conn.connection.host}`);

        await ensureMonitoringCollections();
    } catch (error) {
        console.error(`[Monitoring DB] Connection Error: ${error.message}`);
        throw error;
    }
};

module.exports = connectDB;
