const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  customerNumber: { type: String, required: true },
  email: { type: String },
  emailId: { type: String }, // Alias used in customers collection
  address: { type: String, required: true },
  city: { type: String, required: true },
  pincode: { type: String, required: true },
});

module.exports = mongoose.model('Customer', customerSchema);