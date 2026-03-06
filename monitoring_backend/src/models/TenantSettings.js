const mongoose = require('mongoose');

// Per-tenant monitoring config (retention, screenshot frequency, etc.)
// If not set, defaults are used
const tenantSettingsSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, unique: true },
    activityRetentionDays: { type: Number, default: 90 },
    screenshotRetentionDays: { type: Number, default: 30 },
    screenshotFrequencyMinutes: { type: Number, default: 5 },
    keystrokeWeight: { type: Number, default: 0.1 },
    mouseWeight: { type: Number, default: 0.5 },
    idleWeight: { type: Number, default: -0.02 }
}, { timestamps: true });

tenantSettingsSchema.index({ tenantId: 1 });

module.exports = mongoose.model('TenantSettings', tenantSettingsSchema);
