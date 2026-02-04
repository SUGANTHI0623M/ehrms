const mongoose = require('mongoose');

// Single location point for live tracking (stored in locationHistory).
const locationPointSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const taskSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true },
  taskTitle: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['assigned', 'pending', 'scheduled', 'in_progress', 'completed', 'reopened'], default: 'assigned' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  expectedCompletionDate: { type: Date, required: true },
  completedDate: { type: Date },
  startTime: { type: Date },
  startLocation: { lat: { type: Number }, lng: { type: Number } },
  // Step-based progress (Next Steps: reached location, photo, form, OTP).
  progressSteps: {
    reachedLocation: { type: Boolean, default: false },
    photoProof: { type: Boolean, default: false },
    formFilled: { type: Boolean, default: false },
    otpVerified: { type: Boolean, default: false },
  },
  // Last N location updates for live tracking (battery-friendly: app sends every 10–15 sec).
  locationHistory: {
    type: [locationPointSchema],
    default: [],
    validate: [arrayLimit, 'locationHistory max 500 points'],
  },
  isOtpRequired: { type: Boolean, default: false },
  isGeoFenceRequired: { type: Boolean, default: false },
  isPhotoRequired: { type: Boolean, default: false },
  isFormRequired: { type: Boolean, default: false },
});

function arrayLimit(val) {
  return val.length <= 500;
}

module.exports = mongoose.model('Task', taskSchema);