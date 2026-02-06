const mongoose = require('mongoose');

/**
 * Tasks collection – minimal fields only.
 * Full task details (source, destination, progressSteps, arrived, photoProof, OTP, etc.)
 * are stored in task_details collection.
 * Location history is in trackings collection.
 */
const taskSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true },
  taskTitle: { type: String, required: true },
  description: { type: String, default: '' },
  status: {
    type: String,
    enum: ['assigned', 'approved', 'staffapproved', 'pending', 'scheduled', 'in_progress', 'arrived', 'exited', 'completed', 'rejected', 'reopened', 'waiting_for_approval'],
    default: 'assigned',
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  assignedDate: { type: Date },
  expectedCompletionDate: { type: Date, required: true },
  earliestCompletionDate: { type: Date },
  latestCompletionDate: { type: Date },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
}, { timestamps: true, strict: true });

module.exports = mongoose.model('Task', taskSchema);
