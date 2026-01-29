require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Staff = require('../models/Staff');

const checkSuganthiLogin = async () => {
    try {
        // Connect to database
        await connectDB();
        console.log('Connected to database');
        console.log('Database:', process.env.MONGODB_URI || 'Not set');
        console.log('Database Name:', mongoose.connection.db?.databaseName || 'Unknown');

        const email = 'suganthi0623m@gmail.com';

        console.log('\n=== Login Flow Simulation ===');
        console.log('Email:', email);

        // Step 1: Check User collection (as login does - with password field selected)
        console.log('\n[Step 1] Checking User collection...');
        let user = await User.findOne({ email: email.toLowerCase().trim() })
            .select('+password');
        
        if (user) {
            console.log('✅ User found!');
            console.log('  User ID:', user._id);
            console.log('  Email:', user.email);
            console.log('  Role:', user.role);
            console.log('  Name:', user.name);
            console.log('  Is Active:', user.isActive);
            console.log('  Has Password:', user.password ? 'Yes' : 'No');
            
            if (user.password) {
                // Test common passwords
                const testPasswords = ['password123', 'Password123', 'Suganthi@123', 'suganthi123'];
                console.log('\n  Testing passwords:');
                for (const testPwd of testPasswords) {
                    const match = await user.matchPassword(testPwd);
                    console.log(`    ${testPwd}: ${match ? '✅ MATCH' : '❌'}`);
                }
            }
        } else {
            console.log('❌ User not found');
        }

        // Step 2: Check Staff collection (fallback in login - with password field selected)
        console.log('\n[Step 2] Checking Staff collection (fallback)...');
        const staff = await Staff.findOne({ email: email.toLowerCase().trim() })
            .select('+password');
        
        if (staff) {
            console.log('✅ Staff found!');
            console.log('  Staff ID:', staff._id);
            console.log('  Email:', staff.email);
            console.log('  Name:', staff.name);
            console.log('  Employee ID:', staff.employeeId);
            console.log('  User ID:', staff.userId);
            console.log('  Has Password:', staff.password ? 'Yes' : 'No');
            
            if (staff.password) {
                // Test passwords including the actual password
                const testPasswords = ['password123', 'Password123', 'Suganthi@123', 'suganthi123', '#India123'];
                console.log('\n  Testing passwords:');
                for (const testPwd of testPasswords) {
                    const match = await staff.matchPassword(testPwd);
                    console.log(`    ${testPwd}: ${match ? '✅ MATCH' : '❌'}`);
                }
            } else {
                console.log('  ⚠️  Staff has NO password - login will fail if User not found');
            }

            // Check linked User
            if (staff.userId) {
                const linkedUser = await User.findById(staff.userId).select('+password');
                if (linkedUser) {
                    console.log('\n  ✅ Linked User found!');
                    console.log('    User ID:', linkedUser._id);
                    console.log('    Email:', linkedUser.email);
                    console.log('    Has Password:', linkedUser.password ? 'Yes' : 'No');
                    console.log('    Is Active:', linkedUser.isActive);
                    
                    if (linkedUser.password) {
                        // Test common passwords
                        const testPasswords = ['password123', 'Password123', 'Suganthi@123', 'suganthi123', 'Suganthi123'];
                        console.log('\n  Testing linked User passwords:');
                        for (const testPwd of testPasswords) {
                            const match = await linkedUser.matchPassword(testPwd);
                            console.log(`    ${testPwd}: ${match ? '✅ MATCH' : '❌'}`);
                        }
                    }
                } else {
                    console.log('\n  ❌ Linked User not found');
                }
            }
        } else {
            console.log('❌ Staff not found');
        }

        console.log('\n=== Login Flow Result ===');
        if (user && user.password) {
            console.log('✅ Login will check User collection first');
            console.log('  User has password, login will work if password matches');
        } else if (staff && staff.password) {
            console.log('✅ Login will check Staff collection (fallback)');
            console.log('  Staff has password, login will work if password matches');
        } else if (staff && staff.userId) {
            const linkedUser = await User.findById(staff.userId);
            if (linkedUser && linkedUser.password) {
                console.log('✅ Login will work via Staff -> User lookup');
                console.log('  Staff links to User with password');
            } else {
                console.log('❌ Login will FAIL');
                console.log('  Neither User nor Staff has password');
            }
        } else {
            console.log('❌ Login will FAIL');
            console.log('  No User or Staff found with password');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
};

checkSuganthiLogin();
