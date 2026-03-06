const mongoose = require('mongoose');

// Productivity score - computed after activity insert
// score = (keystrokes_weight × keystrokes) + (mouse_weight × mouseClicks) - (idle_weight × idleSeconds)
const productivityScoreSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    employeeId: { type: String, required: true },
    activityLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivityLog' },
    timestamp: { type: Date, required: true },
    score: { type: Number, required: true },
    keystrokes: { type: Number, default: 0 },
    mouseClicks: { type: Number, default: 0 },
    idleSeconds: { type: Number, default: 0 }
}, { timestamps: true });

productivityScoreSchema.index({ tenantId: 1, employeeId: 1, timestamp: -1 });
productivityScoreSchema.index({ tenantId: 1, timestamp: -1 });

module.exports = mongoose.model('ProductivityScore', productivityScoreSchema);
