const mongoose = require('mongoose');

const leaveTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true },
}, { timestamps: true, strict: false });

module.exports = mongoose.model('LeaveTemplate', leaveTemplateSchema);
