const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    leaveType: {
        type: String,
        enum: ['Sick', 'Casual', 'Earned', 'Unpaid', 'Maternity', 'Paternity', 'Other'],
        required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true, min: 0.5 },
    reason: { type: String, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
        default: 'Pending'
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
}, { timestamps: true });

leaveSchema.index({ employeeId: 1 });
leaveSchema.index({ status: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });
leaveSchema.index({ businessId: 1 });

// Post-save hook to mark attendance as "Present" when leave is approved
leaveSchema.post('save', async function(doc) {
    // Only process if status is "Approved" and this is a new approval (not just an update)
    if (doc.status === 'Approved' && doc.approvedAt) {
        try {
            const { markAttendanceForApprovedLeave } = require('../utils/leaveAttendanceHelper');
            await markAttendanceForApprovedLeave(doc);
        } catch (error) {
            console.error('[Leave Model] Error marking attendance in post-save hook:', error);
            // Don't throw error to prevent save failure
        }
    }
});

// Post-update hook for findOneAndUpdate operations
leaveSchema.post('findOneAndUpdate', async function(doc) {
    if (doc && doc.status === 'Approved' && doc.approvedAt) {
        try {
            const { markAttendanceForApprovedLeave } = require('../utils/leaveAttendanceHelper');
            await markAttendanceForApprovedLeave(doc);
        } catch (error) {
            console.error('[Leave Model] Error marking attendance in post-update hook:', error);
        }
    }
});

module.exports = mongoose.model('Leave', leaveSchema);