const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      default: null
    },
    date: {
      type: Date,
      required: true
    },
    punchIn: Date,
    punchOut: Date,
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Half Day', 'On Leave', 'Not Marked', 'Pending', 'Approved', 'Rejected'],
      default: 'Not Marked'
    },
    leaveType: {
      type: String,
      enum: ['Sick Leave', 'Casual Leave', 'Earned Leave', 'Unpaid Leave', 'Half Day', 'Maternity Leave', 'Paternity Leave', 'Other Leave', null],
      default: null
    },
    session: { type: String, enum: ['1', '2', null], default: null },
    halfDaySession: {
      type: String,
      enum: ['First Half Day', 'Second Half Day', null],
      default: null
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    remarks: String,
    workHours: Number,
    overtime: Number,
    /** Total fine duration in MINUTES (late + early). Display as hours by dividing by 60. */
    fineHours: Number,
    lateMinutes: Number,
    earlyMinutes: Number,
    /** Total fine amount in currency (late + early) from payroll fine calculation. */
    fineAmount: Number,
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
      area: String,
      city: String,
      pincode: String,
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
    ipAddress: String,
    punchInIpAddress: String,
    punchOutIpAddress: String,
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business'
    },
    punchInSelfie: String,
    punchOutSelfie: String,
    fcmNotificationSentAt: { type: Date },
    fcmRejectionSentAt: { type: Date },
    fcmStatusChangeSentAt: { type: Date }
  },
  { timestamps: true }
);

attendanceSchema.pre('save', async function () {
  if (this.employeeId && !this.user) {
    this.user = this.employeeId;
  }
  if (this.user && !this.employeeId) {
    this.employeeId = this.user;
  }
});

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ user: 1, date: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ businessId: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
