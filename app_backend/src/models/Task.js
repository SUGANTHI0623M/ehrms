const mongoose = require('mongoose');

// Single location point for live tracking (stored in locationHistory).
// Every point: taskId (implicit from parent), lat, lng, timestamp, battery.
// NO polyline/Directions API - paths built ONLY from actual GPS coordinates.
const locationPointSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  batteryPercent: { type: Number }, // 0-100, optional
}, { _id: false });

const taskSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true },
  taskTitle: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['assigned', 'approved', 'pending', 'scheduled', 'in_progress', 'completed', 'rejected', 'reopened'], default: 'assigned' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  expectedCompletionDate: { type: Date, required: true },
  completedDate: { type: Date },
  startTime: { type: Date },
  startLocation: { lat: { type: Number }, lng: { type: Number } },
  sourceLocation: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String },
  },
  destinationLocation: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String },
  },
  // Trip completion details (stored when staff arrives).
  tripDistanceKm: { type: Number },
  tripDurationSeconds: { type: Number },
  arrivalTime: { type: Date },
  // Photo proof – URL from Cloudinary after upload.
  photoProofUrl: { type: String },
  photoProofUploadedAt: { type: Date },
  photoProofDescription: { type: String },
  // OTP verification – code sent to customer email, verified by staff.
  otpCode: { type: String },
  otpSentAt: { type: Date },
  otpVerifiedAt: { type: Date },
  // Step-based progress (Next Steps: reached location, photo, form, OTP).
  progressSteps: {
    reachedLocation: { type: Boolean, default: false },
    photoProof: { type: Boolean, default: false },
    formFilled: { type: Boolean, default: false },
    otpVerified: { type: Boolean, default: false },
  },
  // GPS points for live tracking. Grouped by taskId (this task) and date.
  // NO simplification or interpolation - store every point from device.
  locationHistory: {
    type: [locationPointSchema],
    default: [],
    validate: [arrayLimit, 'locationHistory max 2000 points'],
  },
  isOtpRequired: { type: Boolean, default: false },
  isGeoFenceRequired: { type: Boolean, default: false },
  isPhotoRequired: { type: Boolean, default: false },
  isFormRequired: { type: Boolean, default: false },
});

function arrayLimit(val) {
  return val.length <= 2000;
}

module.exports = mongoose.model('Task', taskSchema);