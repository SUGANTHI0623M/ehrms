require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const User = require('../models/User'); // Just in case we need to link
const Branch = require('../models/Branch');
const Company = require('../models/Company');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

const updatePassword = async () => {
    await connectDB();

    const email = 'parvez12@gmail.com';
    const newPassword = 'user123';

    try {
        const staff = await Staff.findOne({ email });

        if (!staff) {
            console.log(`Staff with email ${email} not found.`);
        } else {
            console.log(`Found staff: ${staff.name} (${staff._id})`);

            // Setting password triggers the pre-save hook for hashing
            staff.password = newPassword;
            await staff.save();

            console.log(`Password updated successfully for ${staff.name}`);
        }
    } catch (error) {
        console.error('Error updating password:', error);
    } finally {
        mongoose.connection.close();
    }
};

updatePassword();
