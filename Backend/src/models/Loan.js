const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    loanType: { type: String, required: true }, // e.g., "Personal"
    amount: { type: Number, required: true },
    tenureMonths: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    emi: { type: Number },
    purpose: { type: String },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Active', 'Closed'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Loan', loanSchema);
