require('dotenv').config();
const mongoose = require('../config/mongoose');
const cloudinary = require('cloudinary').v2;

const connectDB = require('../config/db');
const ActivityLog = require('../models/ActivityLog');
const Screenshot = require('../models/Screenshot');
const TenantSettings = require('../models/TenantSettings');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function runRetention() {
    await connectDB();

    const tenants = await TenantSettings.find().lean();
    const activityRetention = 90;
    const screenshotRetention = 30;

    const now = new Date();
    const activityCutoff = new Date(now);
    activityCutoff.setDate(activityCutoff.getDate() - activityRetention);

    const screenshotCutoff = new Date(now);
    screenshotCutoff.setDate(screenshotCutoff.getDate() - screenshotRetention);

    let activityDeleted = 0;
    let screenshotsDeleted = 0;

    for (const t of tenants) {
        const aid = t.activityRetentionDays ?? activityRetention;
        const sid = t.screenshotRetentionDays ?? screenshotRetention;
        const acut = new Date(now);
        acut.setDate(acut.getDate() - aid);
        const scut = new Date(now);
        scut.setDate(scut.getDate() - sid);

        const ar = await ActivityLog.deleteMany({ tenantId: t.tenantId, timestamp: { $lt: acut } });
        activityDeleted += ar.deletedCount;

        const screenshots = await Screenshot.find({ tenantId: t.tenantId, timestamp: { $lt: scut } }).lean();
        for (const s of screenshots) {
            try {
                await cloudinary.uploader.destroy(s.cloudinaryPublicId);
            } catch (e) {
                console.warn(`[Retention] Failed to delete Cloudinary asset ${s.cloudinaryPublicId}:`, e.message);
            }
        }
        const sr = await Screenshot.deleteMany({ tenantId: t.tenantId, timestamp: { $lt: scut } });
        screenshotsDeleted += sr.deletedCount;
    }

    const defaultCutoff = new Date(now);
    defaultCutoff.setDate(defaultCutoff.getDate() - activityRetention);
    const orphanActivity = await ActivityLog.deleteMany({ timestamp: { $lt: defaultCutoff } });
    activityDeleted += orphanActivity.deletedCount;

    console.log(`[Data Retention] ActivityLogs deleted: ${activityDeleted}, Screenshots deleted: ${screenshotsDeleted}`);
    process.exit(0);
}

runRetention().catch((err) => {
    console.error('[Data Retention] Error:', err);
    process.exit(1);
});
