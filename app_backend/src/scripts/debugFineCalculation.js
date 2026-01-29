require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Staff = require('../models/Staff');
const Company = require('../models/Company');
const Attendance = require('../models/Attendance');
const AttendanceTemplate = require('../models/AttendanceTemplate');

const debugFineCalculation = async () => {
    try {
        await connectDB();
        console.log('Connected to database');
        console.log('Database Name:', mongoose.connection.db?.databaseName || 'Unknown');

        const email = 'emp@gmail.com';
        console.log('\n=== Debugging Fine Calculation ===');
        console.log('Email:', email);

        // Find Staff
        const staff = await Staff.findById('697af2968197d6693b628d7c')
            .populate('businessId')
            .populate('attendanceTemplateId');
        
        if (!staff) {
            console.log('❌ Staff not found');
            process.exit(1);
        }

        console.log('\n=== Staff Information ===');
        console.log('Name:', staff.name);
        console.log('Email:', staff.email);
        console.log('Employee ID:', staff.employeeId);
        console.log('Shift Name:', staff.shiftName);
        console.log('Business ID:', staff.businessId?._id || staff.businessId);
        console.log('Attendance Template ID:', staff.attendanceTemplateId?._id || staff.attendanceTemplateId);

        // Check Salary Structure
        console.log('\n=== Salary Structure ===');
        if (staff.salary) {
            console.log('Salary exists:', JSON.stringify(staff.salary, null, 2));
        } else {
            console.log('❌ NO SALARY STRUCTURE FOUND! This is why fine calculation fails.');
        }

        // Check Company Settings
        console.log('\n=== Company Settings ===');
        const company = await Company.findById(staff.businessId);
        if (company) {
            console.log('Company Name:', company.name);
            console.log('Company Settings:', JSON.stringify(company.settings, null, 2));
            
            // Check shifts
            if (company.settings?.attendance?.shifts) {
                console.log('\nShifts in Company:');
                company.settings.attendance.shifts.forEach((shift, idx) => {
                    console.log(`  Shift ${idx + 1}:`, JSON.stringify(shift, null, 2));
                });
                
                // Check if staff's shiftName matches any shift
                if (staff.shiftName) {
                    const matchedShift = company.settings.attendance.shifts.find(s => 
                        s.name.toLowerCase() === staff.shiftName.toLowerCase()
                    );
                    if (matchedShift) {
                        console.log(`\n✅ Found matching shift for "${staff.shiftName}":`, JSON.stringify(matchedShift, null, 2));
                    } else {
                        console.log(`\n❌ No matching shift found for "${staff.shiftName}"`);
                        console.log('Available shifts:', company.settings.attendance.shifts.map(s => s.name).join(', '));
                    }
                } else {
                    console.log('\n❌ Staff does not have shiftName set!');
                }
            } else {
                console.log('❌ No shifts found in company.settings.attendance.shifts');
            }
        } else {
            console.log('❌ Company not found');
        }

        // Check Attendance Template
        console.log('\n=== Attendance Template ===');
        if (staff.attendanceTemplateId) {
            const template = staff.attendanceTemplateId;
            console.log('Template Name:', template.name);
            console.log('Shift Start Time:', template.shiftStartTime);
            console.log('Shift End Time:', template.shiftEndTime);
            console.log('Grace Period Minutes:', template.gracePeriodMinutes);
        } else {
            console.log('❌ No attendance template assigned');
        }

        // Check Latest Attendance Record
        console.log('\n=== Latest Attendance Record ===');
        const latestAttendance = await Attendance.findOne({
            employeeId: staff._id
        }).sort({ createdAt: -1 });

        if (latestAttendance) {
            console.log('Date:', latestAttendance.date);
            console.log('Punch In:', latestAttendance.punchIn);
            console.log('Punch Out:', latestAttendance.punchOut);
            console.log('Status:', latestAttendance.status);
            console.log('Late Minutes:', latestAttendance.lateMinutes);
            console.log('Early Minutes:', latestAttendance.earlyMinutes);
            console.log('Fine Hours:', latestAttendance.fineHours);
            console.log('Fine Amount:', latestAttendance.fineAmount);
            
            // Calculate what the fine should be
            if (latestAttendance.punchIn && staff.salary) {
                console.log('\n=== Manual Fine Calculation Test ===');
                const punchInTime = new Date(latestAttendance.punchIn);
                const attendanceDate = new Date(latestAttendance.date);
                
                // Get shift timing
                let shiftStartTime = "09:30";
                let shiftEndTime = "18:30";
                let gracePeriodMinutes = 0;
                
                if (company?.settings?.attendance?.shifts && staff.shiftName) {
                    const matchedShift = company.settings.attendance.shifts.find(s => 
                        s.name.toLowerCase() === staff.shiftName.toLowerCase()
                    );
                    if (matchedShift) {
                        shiftStartTime = matchedShift.startTime || "09:30";
                        shiftEndTime = matchedShift.endTime || "18:30";
                        if (matchedShift.graceTime) {
                            gracePeriodMinutes = matchedShift.graceTime.unit === 'hours' 
                                ? matchedShift.graceTime.value * 60 
                                : matchedShift.graceTime.value;
                        }
                        console.log(`Using shift from Company: ${shiftStartTime} - ${shiftEndTime}, Grace: ${gracePeriodMinutes} min`);
                    }
                } else if (staff.attendanceTemplateId) {
                    shiftStartTime = staff.attendanceTemplateId.shiftStartTime || "09:30";
                    shiftEndTime = staff.attendanceTemplateId.shiftEndTime || "18:30";
                    gracePeriodMinutes = staff.attendanceTemplateId.gracePeriodMinutes || 0;
                    console.log(`Using shift from Template: ${shiftStartTime} - ${shiftEndTime}, Grace: ${gracePeriodMinutes} min`);
                }
                
                // Calculate shift start with grace
                const [sHours, sMins] = shiftStartTime.split(':').map(Number);
                const shiftStart = new Date(attendanceDate);
                shiftStart.setHours(sHours, sMins, 0, 0);
                const graceTimeEnd = new Date(shiftStart);
                graceTimeEnd.setMinutes(graceTimeEnd.getMinutes() + gracePeriodMinutes);
                
                console.log(`Shift Start: ${shiftStart.toISOString()}`);
                console.log(`Grace Time End: ${graceTimeEnd.toISOString()}`);
                console.log(`Punch In: ${punchInTime.toISOString()}`);
                
                if (punchInTime <= graceTimeEnd) {
                    console.log('✅ Punch-in is WITHIN grace time. No fine should be calculated.');
                } else {
                    const lateMinutes = Math.round((punchInTime.getTime() - shiftStart.getTime()) / (1000 * 60));
                    console.log(`⚠️ Punch-in is AFTER grace time. Late minutes: ${lateMinutes}`);
                    
                    if (staff.salary) {
                        // Calculate daily salary
                        const calculateSalaryStructure = (salary) => {
                            const basicSalary = salary.basicSalary || 0;
                            const dearnessAllowance = salary.dearnessAllowance || (basicSalary > 0 ? basicSalary * 0.5 : 0);
                            const houseRentAllowance = salary.houseRentAllowance || (basicSalary > 0 ? basicSalary * 0.2 : 0);
                            const specialAllowance = salary.specialAllowance || 0;
                            const employerPFRate = salary.employerPFRate || 0;
                            const employerESIRate = salary.employerESIRate || 0;
                            const grossFixedSalary = basicSalary + dearnessAllowance + houseRentAllowance + specialAllowance;
                            const employerPF = employerPFRate > 0 ? (basicSalary * employerPFRate / 100) : 0;
                            const employerESI = employerESIRate > 0 ? (grossFixedSalary * employerESIRate / 100) : 0;
                            const grossSalary = grossFixedSalary + employerPF + employerESI;
                            return { monthly: { grossSalary } };
                        };
                        
                        const salaryStructure = calculateSalaryStructure(staff.salary);
                        const monthlyGrossSalary = salaryStructure.monthly.grossSalary || 0;
                        console.log(`Monthly Gross Salary: ${monthlyGrossSalary}`);
                        
                        // Assume 22 working days for January 2026
                        const workingDays = 22;
                        const dailySalary = monthlyGrossSalary / workingDays;
                        console.log(`Daily Salary: ${dailySalary} (assuming ${workingDays} working days)`);
                        
                        if (dailySalary > 0) {
                            const shiftHours = 9; // 10:00 to 19:00 = 9 hours
                            const hourlyRate = dailySalary / shiftHours;
                            const fineAmount = Math.round((hourlyRate * (lateMinutes / 60)) * 100) / 100;
                            console.log(`Hourly Rate: ${hourlyRate}`);
                            console.log(`Expected Fine Amount: ₹${fineAmount}`);
                        } else {
                            console.log('❌ Daily salary is 0. Cannot calculate fine.');
                        }
                    }
                }
            }
        } else {
            console.log('No attendance records found');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
};

debugFineCalculation();
