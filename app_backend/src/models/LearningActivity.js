const mongoose = require('mongoose');

const learningActivitySchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    date: { type: Date, required: true },
    totalMinutes: { type: Number, default: 0 },
    lessonsCompleted: { type: Number, default: 0 },
    quizzesAttempted: { type: Number, default: 0 },
    assessmentsAttempted: { type: Number, default: 0 },
    liveSessionsAttended: { type: Number, default: 0 },
    activityScore: { type: Number, default: 0 },
    activityLevel: { type: String, enum: ['none', 'low', 'medium', 'high'] },
    details: [{
        type: { type: String, enum: ['lesson', 'quiz', 'assignment'] },
        title: { type: String },
        score: { type: Number },
    }],
}, { timestamps: true });

learningActivitySchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('LearningActivity', learningActivitySchema);
