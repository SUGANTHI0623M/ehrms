/**
 * TaskDetails – full task details (no location history; that's in trackings collection).
 * All extended fields: source, destination, progressSteps, arrived, photoProof, OTP, etc.
 * Upserted whenever a task is created/updated/arrived/verified/photo/end.
 */
const mongoose = require('mongoose');

const taskDetailsSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true },
  taskTitle: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, default: 'assigned' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  expectedCompletionDate: { type: Date },
  completedDate: { type: Date },
  startTime: { type: Date },
  started: { type: Date },
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
  destinations: { type: Array, default: [] },
  tripDistanceKm: { type: Number },
  tripDurationSeconds: { type: Number },
  arrivalTime: { type: Date },
  arrived: { type: Date },
  arrivedLatitude: { type: Number },
  arrivedLongitude: { type: Number },
  arrivedFullAddress: { type: String },
  arrivedPincode: { type: String },
  arrivedDate: { type: Date },
  arrivedTime: { type: String },
  sourceFullAddress: { type: String },
  photoProofUrl: { type: String },
  photoProofUploadedAt: { type: Date },
  photoProofDescription: { type: String },
  photoProofLat: { type: Number },
  photoProofLng: { type: Number },
  photoProofAddress: { type: String },
  otpCode: { type: String },
  otpSentAt: { type: Date },
  otpVerifiedAt: { type: Date },
  otpVerifiedLat: { type: Number },
  otpVerifiedLng: { type: Number },
  otpVerifiedAddress: { type: String },
  progressSteps: {
    reachedLocation: { type: Boolean, default: false },
    photoProof: { type: Boolean, default: false },
    formFilled: { type: Boolean, default: false },
    otpVerified: { type: Boolean, default: false },
  },
  // isOtpRequired, isGeoFenceRequired, isPhotoRequired, isFormRequired come from TaskSettings only – not stored here
  tasks_exit: { type: Array, default: [] },
  tasks_restarted: { type: Array, default: [] },
  approvedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  rejectedAt: { type: Date },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  completedAt: { type: Date },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  rideStartedAt: { type: Date },
  rideStartLocation: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String },
    pincode: { type: String },
    recordedAt: { type: Date },
  },
  arrivalLocation: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String },
    pincode: { type: String },
    recordedAt: { type: Date },
  },
}, { timestamps: true, strict: false });

// Upsert by taskId
taskDetailsSchema.index({ taskId: 1 }, { unique: true });

module.exports = mongoose.model('TaskDetails', taskDetailsSchema);
