require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const connectDB = require('../config/db');
const User = require('../models/User');

const testLogin = async () => {
    try {
        // Connect to database
        await connectDB();
        console.log('Connected to database');

        const email = 'test1@gmail.com';
        const password = '#India123';

        // Find user (without password select first)
        let user = await User.findOne({ email });
        
        if (!user) {
            console.log('❌ User not found with email:', email);
            process.exit(1);
        }

        console.log('✅ User found!');
        console.log('User ID:', user._id);
        console.log('Email:', user.email);
        console.log('Name:', user.name);
        console.log('Role:', user.role);
        console.log('Is Active:', user.isActive);

        // Get user with password to test
        const userWithPassword = await User.findOne({ email }).select('+password');
        
        if (!userWithPassword || !userWithPassword.password) {
            console.log('\n❌ Password field not found or empty');
            process.exit(1);
        }

        console.log('\n=== Testing Password Match ===');
        console.log('Input Password:', password);
        console.log('Password Hash Exists:', userWithPassword.password ? 'Yes' : 'No');
        console.log('Password Hash Length:', userWithPassword.password?.length || 0);

        // Test password matching
        const passwordMatch = await userWithPassword.matchPassword(password);
        
        console.log('Password Match Result:', passwordMatch ? '✅ CORRECT' : '❌ INCORRECT');
        
        if (passwordMatch) {
            console.log('\n✅ Login should work! Password is correct.');
            console.log('\nIf login still fails, check:');
            console.log('1. Is the user active?', user.isActive);
            console.log('2. Is the email exactly matching?', user.email === email.toLowerCase());
            console.log('3. Check the login endpoint logs for more details');
        } else {
            console.log('\n❌ Password does not match!');
            console.log('The password hash might be incorrect.');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
};

testLogin();
