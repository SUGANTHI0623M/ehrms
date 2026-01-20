const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true }, // Contact email
    phone: { type: String },
    address: {
        street: String,
        city: String,
        state: String,
        zip: String,
        country: String
    },
    logo: { type: String }, // URL to logo
    website: { type: String },
    isActive: { type: Boolean, default: true },
    subscription: {
        plan: { type: String, enum: ['Free', 'Basic', 'Premium', 'Enterprise'], default: 'Free' },
        startDate: { type: Date },
        endDate: { type: Date },
        status: { type: String, enum: ['Active', 'Expired', 'Cancelled'], default: 'Active' }
    },
    settings: {
        business: {
            weeklyHolidays: [{
                day: { type: Number, min: 0, max: 6 },
                name: String
            }],
            weeklyOffPattern: {
                type: String,
                enum: ['standard', 'oddEvenSaturday'],
                default: 'standard'
            },
            allowAttendanceOnWeeklyOff: {
                type: Boolean,
                default: false
            }
        },
        attendance: {
            automationRules: {
                allowAttendanceOnWeeklyOff: {
                    type: Boolean,
                    default: false
                }
            }
        }
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
