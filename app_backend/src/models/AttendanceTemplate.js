const mongoose = require('mongoose');

const attendanceTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    // strict: false allows other fields to exist in DB without definition
}, { timestamps: true, strict: false });

module.exports = mongoose.model('AttendanceTemplate', attendanceTemplateSchema);
