// Backend/src/models/Attendance.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For legacy unique index compatibility
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    date: { type: String, required: true }, // Changed to String for YYYY-MM-DD consistency
    punchIn: { type: Date },
    punchOut: { type: Date },
    status: { type: String, enum: ['Present', 'Absent', 'Leave', 'Late', 'Late Check-in', 'Late Check-out', 'Late Check-in & Late Check-out', 'Low Work Hours'], default: 'Present' },
    workHours: { type: Number, default: 0 },
    location: {
        punchIn: {
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
    punchInSelfie: { type: String }, // Base64 string or URL
    punchOutSelfie: { type: String }  // Base64 string or URL
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);