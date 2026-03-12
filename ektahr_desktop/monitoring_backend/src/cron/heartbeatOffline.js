require('dotenv').config();
const mongoose = require('../config/mongoose');
const connectDB = require('../config/db');
const Device = require('../models/Device');

const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000;

async function markOfflineDevices() {
    await connectDB();

    const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD_MS);
    const result = await Device.updateMany(
        { lastSeenAt: { $lt: cutoff }, isActive: true },
        { isActive: false, status: 'inactive' }
    );

    if (result.modifiedCount > 0) {
        console.log(`[Heartbeat] Marked ${result.modifiedCount} devices offline`);
    }
}

markOfflineDevices()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('[Heartbeat] Error:', err);
        process.exit(1);
    });
