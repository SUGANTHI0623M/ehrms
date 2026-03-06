const mongoose = require('mongoose');

// Screenshot metadata after Cloudinary upload
// Cloudinary folder: tenantId/employeeId/YYYY/MM/DD
// Signed URLs only - no public direct access
const screenshotSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    employeeId: { type: String, required: true },
    deviceId: { type: String, required: true },
    timestamp: { type: Date, required: true },
    cloudinaryPublicId: { type: String, required: true },
    cloudinaryUrl: { type: String },
    secureUrl: { type: String },
    width: { type: Number },
    height: { type: Number },
    size: { type: Number }
}, { timestamps: true });

screenshotSchema.index({ tenantId: 1, timestamp: -1 });
screenshotSchema.index({ tenantId: 1, employeeId: 1, timestamp: -1 });

module.exports = mongoose.model('Screenshot', screenshotSchema);
