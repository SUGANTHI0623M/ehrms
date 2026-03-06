const mongoose = require('mongoose');

// Device model - binds desktop agent to employee
// References existing Staff (via employeeId) - tenantId = businessId (Company reference)
const deviceSchema = new mongoose.Schema({
    deviceId: { type: String, required: true, unique: true },
    employeeId: { type: String, required: true }, // Staff.employeeId
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }, // businessId
    machineName: { type: String },
    osVersion: { type: String },
    agentVersion: { type: String },
    lastSeenAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    consentAt: { type: Date }
}, { timestamps: true });

deviceSchema.index({ deviceId: 1 });
deviceSchema.index({ tenantId: 1, deviceId: 1 });
deviceSchema.index({ employeeId: 1, tenantId: 1 });
deviceSchema.index({ lastSeenAt: 1 });

module.exports = mongoose.model('Device', deviceSchema);
