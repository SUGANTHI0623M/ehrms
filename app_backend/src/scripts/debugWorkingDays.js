require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Staff = require('../models/Staff');
const Company = require('../models/Company');
const HolidayTemplate = require('../models/HolidayTemplate');

const debugWorkingDays = async () => {
    try {
        console.log("Connecting to DB...");
        await connectDB();
        console.log("Connected.");

        const email = 'stest1@gmail.com';
        const year = 2026;
        const month = 1; // January
        
        // Find staff
        const staff = await Staff.findOne({ email: email });
        if (!staff) {
            console.error(`Staff not found: ${email}`);
            process.exit(1);
        }

        console.log(`\nStaff: ${staff.name} (${staff.email})`);
        console.log(`Business ID: ${staff.businessId}`);

        // Get business settings
        const business = await Company.findById(staff.businessId);
        if (!business) {
            console.error('Business not found');
            process.exit(1);
        }

        const businessSettings = business.settings?.business || {};
        const weeklyOffPattern = businessSettings.weeklyOffPattern || 'standard';
        const weeklyHolidays = businessSettings.weeklyHolidays || [{ day: 0, name: 'Sunday' }];

        console.log(`\nBusiness Settings:`);
        console.log(`  Weekly Off Pattern: ${weeklyOffPattern}`);
        console.log(`  Weekly Holidays: ${JSON.stringify(weeklyHolidays, null, 2)}`);

        // Get holidays
        const holidayTemplate = await HolidayTemplate.findOne({
            businessId: staff.businessId,
            isActive: true
        });

        let holidays = [];
        if (holidayTemplate) {
            holidays = (holidayTemplate.holidays || []).filter(h => {
                const d = new Date(h.date);
                return d.getFullYear() === year && d.getMonth() + 1 === month;
            });
        }

        console.log(`\nHolidays in ${month}/${year}:`);
        holidays.forEach(h => {
            const d = new Date(h.date);
            console.log(`  ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} - ${h.name || 'Holiday'}`);
        });

        // Calculate working days
        const daysInMonth = new Date(year, month, 0).getDate();
        console.log(`\nTotal days in month: ${daysInMonth}`);

        let weeklyOffDays = 0;
        let holidaysCount = 0;
        let workingDays = 0;

        console.log(`\nDay-by-day breakdown:`);
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month - 1, day);
            const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
            
            // Check if holiday
            const isHoliday = holidays.some(h => {
                const hd = new Date(h.date);
                return hd.getDate() === day;
            });

            if (isHoliday) {
                holidaysCount++;
                console.log(`  Day ${day} (${dayName}): HOLIDAY`);
            } else {
                let isWeeklyOff = false;
                let reason = '';

                if (weeklyOffPattern === 'oddEvenSaturday') {
                    if (dayOfWeek === 0) {
                        isWeeklyOff = true;
                        reason = 'Sunday (always off in oddEvenSaturday)';
                    } else if (dayOfWeek === 6) {
                        if (day % 2 === 0) {
                            isWeeklyOff = true;
                            reason = 'Even Saturday (weekly off)';
                        } else {
                            reason = 'Odd Saturday (working day)';
                        }
                    } else {
                        reason = 'Weekday (working day)';
                    }
                } else {
                    // Standard pattern
                    if (weeklyHolidays.some(h => h.day === dayOfWeek)) {
                        isWeeklyOff = true;
                        reason = `Weekly off (${dayName})`;
                    } else {
                        reason = 'Working day';
                    }
                }

                if (isWeeklyOff) {
                    weeklyOffDays++;
                    console.log(`  Day ${day} (${dayName}): WEEKLY OFF - ${reason}`);
                } else {
                    workingDays++;
                    console.log(`  Day ${day} (${dayName}): WORKING - ${reason}`);
                }
            }
        }

        console.log(`\n========== SUMMARY ==========`);
        console.log(`Total days: ${daysInMonth}`);
        console.log(`Weekly off days: ${weeklyOffDays}`);
        console.log(`Holidays: ${holidaysCount}`);
        console.log(`Working days: ${workingDays}`);
        console.log(`Calculation: ${daysInMonth} - ${weeklyOffDays} - ${holidaysCount} = ${workingDays}`);
        console.log(`============================\n`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
};

debugWorkingDays();
