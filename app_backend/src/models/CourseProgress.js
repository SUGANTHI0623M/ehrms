const mongoose = require('mongoose');

const contentProgressSchema = new mongoose.Schema({
    contentId: { type: mongoose.Schema.Types.Mixed, required: true },
    viewed: { type: Boolean, default: false },
    viewedAt: { type: Date },
}, { _id: false });

const courseProgressSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    status: { type: String, enum: ['Not Started', 'In Progress', 'Completed', 'Failed'], default: 'Not Started' },
    completionPercentage: { type: Number, default: 0 },
    contentProgress: [contentProgressSchema],
    completedLessons: [{ type: String }],
    timeSpent: { type: Number, default: 0 },
    lastAccessedAt: { type: Date },
    assessmentStatus: { type: String, enum: ['Not Started', 'In Progress', 'Passed', 'Failed', 'Requested'], default: 'Not Started' },
    assessmentScore: { type: Number },
    assessmentAttempts: { type: Number, default: 0 },
    isAccessBlocked: { type: Boolean, default: false },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
}, { timestamps: true });

courseProgressSchema.index({ courseId: 1, employeeId: 1 }, { unique: true });

module.exports = mongoose.model('CourseProgress', courseProgressSchema);
