/**
 * Single Mongoose instance shared by all monitoring_backend models and app_backend models (Staff, Company).
 * Must use this so Device/TenantSettings use the same connection that db.js connects.
 */
const path = require('path');
const mongoose = require(path.join(__dirname, '../../../../app_backend/node_modules/mongoose'));
module.exports = mongoose;
