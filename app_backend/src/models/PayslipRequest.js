const mongoose = require('mongoose');

const payslipRequestSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    month: { type: String, required: true }, // e.g., "January"
    year: { type: Number, required: true }, // e.g., 2026
    reason: { type: String },
    status: { type: String, enum: ['Pending', 'Generated', 'Rejected'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('PayslipRequest', payslipRequestSchema);
