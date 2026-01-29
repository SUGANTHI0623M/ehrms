require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const connectDB = require('../config/db');
const User = require('../models/User');

const verifyUser = async () => {
    try {
        // Connect to database
        await connectDB();
        console.log('Connected to database');

        // Find user
        const user = await User.findOne({ email: 'test1@gmail.com' }).select('+password');
        
        if (!user) {
            console.log('❌ User not found with email: test1@gmail.com');
            process.exit(1);
        }

        console.log('✅ User found!');
        console.log('User ID:', user._id);
        console.log('Email:', user.email);
        console.log('Name:', user.name);
        console.log('Role:', user.role);
        console.log('Is Active:', user.isActive);
        console.log('Password Hash:', user.password ? 'Set (hashed)' : 'Not set');
        
        // Test password matching
        const testPassword = '#India123';
        const passwordMatch = await user.matchPassword(testPassword);
        
        console.log('\n=== Password Verification ===');
        console.log('Testing password: #India123');
        console.log('Password Match:', passwordMatch ? '✅ CORRECT' : '❌ INCORRECT');
        
        if (!passwordMatch) {
            console.log('\n⚠️  Password does not match!');
            console.log('The password in database might be different.');
            console.log('You may need to reset the password or recreate the user.');
        } else {
            console.log('\n✅ Password is correct! User can login.');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
};

verifyUser();
