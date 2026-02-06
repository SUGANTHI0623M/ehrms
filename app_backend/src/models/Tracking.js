const mongoose = require('mongoose');

/**
 * Tracking collection – stores every GPS point (every 15 sec) from mobile app.
 * Admin fetches this data for live tracking view and history.
 */
const trackingSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  staffName: { type: String },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  batteryPercent: { type: Number },
  movementType: { type: String }, // drive | walk | stop
  destinationLat: { type: Number },
  destinationLng: { type: Number },
  address: { type: String }, // Reverse-geocoded from lat/lng
  fullAddress: { type: String },
  city: { type: String },
  area: { type: String },
  pincode: { type: String },
  // Exit ride
  exitStatus: { type: String }, // "exited"
  // Arrived
  status: { type: String }, // "arrived"
  time: { type: Date },
  exitReason: { type: String },
  exitedAt: { type: Date },
}, { timestamps: true });

trackingSchema.index({ staffId: 1, timestamp: -1 });
trackingSchema.index({ taskId: 1, timestamp: -1 });
trackingSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Tracking', trackingSchema);
