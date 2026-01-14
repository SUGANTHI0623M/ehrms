require('dotenv').config(); // Load from .env in CWD (Backend/)
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/db');

const createTempUser = async () => {
    try {
        console.log("Connecting to DB...");
        await connectDB();
        console.log("Connected.");

        const email = 'askeva@gmail.com';
        const password = 'ae123';

        // Check if user exists
        console.log("Checking for existing user...");
        let user = await User.findOne({ email });

        if (user) {
            console.log('User already exists. Updating password...');
            user.password = password; // Will be hashed by pre-save
            user.name = "Askeva User"; // Update name to be sure
            user.role = "Admin";
            user.isActive = true;
            await user.save();
            console.log('User updated successfully.');
        } else {
            console.log('Creating new user...');
            try {
                user = await User.create({
                    name: 'Askeva User',
                    email: email,
                    password: password,
                    role: 'Admin',
                    isActive: true
                });
                console.log('User created successfully.');
            } catch (createError) {
                console.error("Create User Failed MSG:", createError.message);
            }
        }

    } catch (error) {
        console.error('Script Error:', error);
    } finally {
        console.log("Closing connection...");
        await mongoose.connection.close();
        process.exit();
    }
};

createTempUser();
