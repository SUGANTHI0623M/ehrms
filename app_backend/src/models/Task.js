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
  status: { type: String, enum: ['assigned', 'approved', 'pending', 'scheduled', 'in_progress', 'arrived', 'exited', 'completed', 'rejected', 'reopened'], default: 'assigned' },
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
    fullAddress: { type: String },
    pincode: { type: String },
  },
  destinationLocation: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String },
    fullAddress: { type: String },
    pincode: { type: String },
  },
  destinationChanged: { type: Boolean, default: false },
  // Destination change history – append only, last item is active
  destinations: {
    type: [{
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String },
      changedAt: { type: Date, default: Date.now },
    }],
    default: [],
  },
  // Trip completion details (stored when staff arrives).
  tripDistanceKm: { type: Number },
  tripDurationSeconds: { type: Number },
  arrivalTime: { type: Date },
  // Arrived-specific fields (stored when Arrived is clicked).
  arrivedLatitude: { type: Number },
  arrivedLongitude: { type: Number },
  arrivedFullAddress: { type: String },
  arrivedPincode: { type: String },
  arrivedDate: { type: Date },
  arrivedTime: { type: String },
  sourceFullAddress: { type: String },
  // Photo proof – URL from Cloudinary after upload.
  photoProofUrl: { type: String },
  photoProofUploadedAt: { type: Date },
  photoProofDescription: { type: String },
  photoProofLat: { type: Number },
  photoProofLng: { type: Number },
  photoProofAddress: { type: String },
  // OTP verification – code sent to customer email, verified by staff.
  otpCode: { type: String },
  otpSentAt: { type: Date },
  otpVerifiedAt: { type: Date },
  otpVerifiedLat: { type: Number },
  otpVerifiedLng: { type: Number },
  otpVerifiedAddress: { type: String },
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
  // Exit history – each exit is a separate record (cumulative)
  tasks_exit: {
    type: [{
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String },
      pincode: { type: String },
      exitReason: { type: String, required: true },
      exitedAt: { type: Date, default: Date.now },
    }],
    default: [],
  },
  // Restart history – when task resumed after exit
  tasks_restarted: {
    type: [{
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String },
      pincode: { type: String },
      resumedAt: { type: Date, default: Date.now },
    }],
    default: [],
  },
});

function arrayLimit(val) {
  return val.length <= 2000;
}

taskSchema.pre('save', async function () {
  if (this.destinationLocation && this.destinationLocation.lat != null && this.destinationLocation.lng != null) {
    if (!this.destinations || this.destinations.length === 0) {
      this.destinations = [{
        lat: this.destinationLocation.lat,
        lng: this.destinationLocation.lng,
        address: this.destinationLocation.address,
        changedAt: new Date(),
      }];
    }
  }
});

module.exports = mongoose.model('Task', taskSchema);