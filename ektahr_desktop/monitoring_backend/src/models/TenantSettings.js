const mongoose = require('../config/mongoose');

const tenantSettingsSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, unique: true },
    screenshotFrequencyMinutes: { type: Number, default: 5 },
    activityRetentionDays: { type: Number, default: 90 },
    screenshotRetentionDays: { type: Number, default: 30 },
    keystrokeWeight: { type: Number, default: 0.1 },
    mouseWeight: { type: Number, default: 0.5 },
    idleWeight: { type: Number, default: -0.02 },
    blurRules: [{
        processName: { type: String }
    }]
}, { timestamps: true, collection: 'monitoringsettings' });

module.exports = mongoose.model('TenantSettings', tenantSettingsSchema);
