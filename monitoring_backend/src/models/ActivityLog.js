const mongoose = require('mongoose');

// Activity snapshot - decrypted from agent payload
// Multi-tenant: every document includes tenantId
const activityLogSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    deviceId: { type: String, required: true },
    employeeId: { type: String, required: true },
    timestamp: { type: Date, required: true },
    keystrokes: { type: Number, default: 0 },
    mouseClicks: { type: Number, default: 0 },
    scrollCount: { type: Number, default: 0 },
    activeWindow: {
        processName: String,
        windowTitle: String,
        durationSeconds: Number
    },
    idleSeconds: { type: Number, default: 0 }
}, { timestamps: true });

activityLogSchema.index({ tenantId: 1, timestamp: -1 });
activityLogSchema.index({ tenantId: 1, employeeId: 1, timestamp: -1 });
activityLogSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
