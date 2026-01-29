require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const connectDB = require('../config/db');
const User = require('../models/User');
const Staff = require('../models/Staff');

const checkSuganthiUser = async () => {
    try {
        // Connect to database
        await connectDB();
        console.log('Connected to database');

        const email = 'suganthi0623m@gmail.com';
        const staffId = '6979b095051e4a9b78b843a5';
        const userId = '6979b095051e4a9b78b843a8';

        console.log('\n=== Checking Staff Collection ===');
        // Try by ID
        const staffById = await Staff.findById(staffId);
        if (staffById) {
            console.log('✅ Staff found by ID!');
            console.log('Staff ID:', staffById._id);
            console.log('Email:', staffById.email);
            console.log('Name:', staffById.name);
            console.log('User ID (from Staff):', staffById.userId);
            console.log('Has Password:', staffById.password ? 'Yes' : 'No');
        } else {
            console.log('❌ Staff not found with ID:', staffId);
        }

        // Try by email
        const staff = await Staff.findOne({ email });
        if (staff) {
            console.log('\n✅ Staff found by email!');
            console.log('Staff ID:', staff._id);
            console.log('Email:', staff.email);
            console.log('Name:', staff.name);
            console.log('User ID (from Staff):', staff.userId);
            console.log('Has Password:', staff.password ? 'Yes' : 'No');
            console.log('Employee ID:', staff.employeeId);
        } else {
            console.log('\n❌ Staff not found by email:', email);
        }

        console.log('\n=== Checking User Collection ===');
        // Check by email
        const userByEmail = await User.findOne({ email });
        if (userByEmail) {
            console.log('✅ User found by email!');
            console.log('User ID:', userByEmail._id);
            console.log('Email:', userByEmail.email);
            console.log('Role:', userByEmail.role);
        } else {
            console.log('❌ User not found by email:', email);
        }

        // Check by userId from Staff
        if (staff && staff.userId) {
            const userById = await User.findById(staff.userId);
            if (userById) {
                console.log('\n✅ User found by userId from Staff!');
                console.log('User ID:', userById._id);
                console.log('Email:', userById.email);
                console.log('Role:', userById.role);
                console.log('Name:', userById.name);
                console.log('Has Password:', userById.password ? 'Yes' : 'No');
                
                // Test password if exists
                if (userById.password) {
                    const testPassword = 'password123'; // Common default
                    const passwordMatch = await userById.matchPassword(testPassword);
                    console.log('Password Match (password123):', passwordMatch ? '✅' : '❌');
                }
            } else {
                console.log('\n❌ User not found with userId from Staff:', staff.userId);
            }
        }

        // Check by userId directly
        const userByDirectId = await User.findById(userId);
        if (userByDirectId) {
            console.log('\n✅ User found by direct userId!');
            console.log('User ID:', userByDirectId._id);
            console.log('Email:', userByDirectId.email);
            console.log('Role:', userByDirectId.role);
            console.log('Name:', userByDirectId.name);
        } else {
            console.log('\n❌ User not found with direct userId:', userId);
        }

        console.log('\n=== Summary ===');
        console.log('Login checks:');
        console.log('1. User.findOne({ email }) -', userByEmail ? '✅ Found' : '❌ Not Found');
        console.log('2. Staff.findOne({ email }) -', staff ? '✅ Found' : '❌ Not Found');
        if (staff && staff.userId) {
            const linkedUser = await User.findById(staff.userId);
            console.log('3. User.findById(staff.userId) -', linkedUser ? '✅ Found' : '❌ Not Found');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
};

checkSuganthiUser();
