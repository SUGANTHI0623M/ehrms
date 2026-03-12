const mongoose = require('../config/mongoose');

const monitoringDailySummarySchema = new mongoose.Schema({
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    date: { type: Date, required: true },

    totalTrackedMinutes: { type: Number, default: 0 },
    activeMinutes: { type: Number, default: 0 },
    idleMinutes: { type: Number, default: 0 },

    activityTotals: {
        keystrokes: { type: Number, default: 0 },
        mouseClicks: { type: Number, default: 0 },
        scrollCount: { type: Number, default: 0 }
    },

    productivityScore: { type: Number, default: 0 },

    timeBreakdown: {
        productiveMinutes: { type: Number, default: 0 },
        neutralMinutes: { type: Number, default: 0 },
        unproductiveMinutes: { type: Number, default: 0 }
    },

    screenshotsCaptured: { type: Number, default: 0 }
}, { timestamps: true, collection: 'monitoringdailysummaries' });

monitoringDailySummarySchema.index({ businessId: 1, employeeId: 1, date: -1 }, { unique: true });
monitoringDailySummarySchema.index({ businessId: 1, date: -1 });

module.exports = mongoose.model('MonitoringDailySummary', monitoringDailySummarySchema);
