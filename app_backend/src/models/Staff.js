const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
    employeeId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    designation: { type: String },
    department: { type: String },
    shiftName: { type: String },
    attendanceTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceTemplate' },
    leaveTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveTemplate' },
    holidayTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'HolidayTemplate' },
    status: { type: String, default: 'Active' },
    joiningDate: { type: Date, default: Date.now },
    avatar: { type: String },
    gender: { type: String },
    maritalStatus: { type: String },
    dob: { type: Date },
    bloodGroup: { type: String },
    address: {
        line1: String,
        city: String,
        state: String,
    },
    // Employment IDs (direct fields, not nested)
    uan: { type: String },
    pan: { type: String },
    aadhaar: { type: String },
    pfNumber: { type: String },
    esiNumber: { type: String },

    // Bank Details
    bankDetails: {
        bankName: String,
        accountNumber: String,
        ifscCode: String,
        accountHolderName: String,
        upiId: String,
    },

    // Reference to candidate for education, experience, and documents
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },

    salary: {
        // Fixed Salary Components (Monthly)
        basicSalary: Number,
        dearnessAllowance: Number,
        houseRentAllowance: Number,
        specialAllowance: Number,

        // Employer Contribution Rates (%)
        employerPFRate: Number,
        employerESIRate: Number,

        // Variable Pay Rate (%)
        incentiveRate: Number,

        // Benefits Rates and Fixed Values
        gratuityRate: Number,
        statutoryBonusRate: Number,
        medicalInsuranceAmount: Number,

        // Allowances
        mobileAllowance: Number,
        mobileAllowanceType: {
            type: String,
            enum: ['monthly', 'yearly'],
            default: 'monthly'
        },

        // Employee Deduction Rates (%)
        employeePFRate: Number,
        employeeESIRate: Number
    }
}, { timestamps: true });

const bcrypt = require('bcrypt');

staffSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

staffSchema.methods.matchPassword = async function (enteredPassword) {
    if (!enteredPassword || !this.password) {
        return false;
    }
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Staff', staffSchema);
