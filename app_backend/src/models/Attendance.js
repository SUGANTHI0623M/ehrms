const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',
        required: true
    },
    user: { // Keeping 'user' field for backward compatibility/Legacy App support
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff'
    },
    date: {
        type: Date, // Changed to Date as per Web Backend
        required: true
    },
    punchIn: Date,
    punchOut: Date,
    status: {
        type: String,
        enum: ['Present', 'Absent', 'Half Day', 'On Leave', 'Not Marked', 'Pending', 'Approved', 'Rejected'],
        default: 'Not Marked'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    remarks: String,
    workHours: Number,
    overtime: Number,
    fineHours: Number,
    lateMinutes: Number,
    fineAmount: Number,
    location: {
        latitude: Number,
        longitude: Number,
        address: String,
        area: String,
        city: String,
        pincode: String,
        punchIn: {       // Explicit nested structure for punchIn
            latitude: Number,
            longitude: Number,
            address: String,
            area: String,
            city: String,
            pincode: String
        },
        punchOut: {
            latitude: Number,
            longitude: Number,
            address: String,
            area: String,
            city: String,
            pincode: String
        }
    },
    ipAddress: String,
    punchInIpAddress: String,
    punchOutIpAddress: String,
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company' // Use 'Company' if that's the model name, or 'Business'
    },
    // App Specific Fields
    punchInSelfie: String,
    punchOutSelfie: String
}, {
    timestamps: true
});

// Middleware to sync 'user' and 'employeeId'
attendanceSchema.pre('save', async function () {
    if (this.employeeId && !this.user) {
        this.user = this.employeeId;
    }
    if (this.user && !this.employeeId) {
        this.employeeId = this.user;
    }
});

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
// Also index 'user' for legacy queries
attendanceSchema.index({ user: 1, date: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ businessId: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);