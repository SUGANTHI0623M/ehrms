const Attendance = require('../models/Attendance');
const Staff = require('../models/Staff');
const User = require('../models/User'); // Import if needed
const AttendanceTemplate = require('../models/AttendanceTemplate'); // Register model
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper to calculate distance
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Helper function to get shift timing from Company settings based on shiftName
function getShiftFromCompanySettings(company, shiftName) {
    if (!company || !company.settings || !company.settings.attendance || !company.settings.attendance.shifts) {
        return null;
    }
    
    const shifts = company.settings.attendance.shifts;
    if (!Array.isArray(shifts) || shifts.length === 0) {
        return null;
    }
    
    // Find shift matching the shiftName (case-insensitive)
    const matchedShift = shifts.find(shift => {
        const shiftNameLower = (shift.name || '').toLowerCase();
        const staffShiftNameLower = (shiftName || '').toLowerCase();
        return shiftNameLower === staffShiftNameLower;
    });
    
    if (!matchedShift) {
        return null;
    }
    
    // Extract grace time
    let gracePeriodMinutes = 0;
    if (matchedShift.graceTime) {
        if (matchedShift.graceTime.unit === 'hours') {
            gracePeriodMinutes = (matchedShift.graceTime.value || 0) * 60;
        } else {
            gracePeriodMinutes = matchedShift.graceTime.value || 0;
        }
    }
    
    return {
        startTime: matchedShift.startTime || "09:30",
        endTime: matchedShift.endTime || "18:30",
        gracePeriodMinutes: gracePeriodMinutes
    };
}

function normalizeTemplate(templateDoc) {
    if (!templateDoc) return {};
    let t = templateDoc.toObject ? templateDoc.toObject() : templateDoc;
    // Flatten settings if nested
    if (t.settings) {
        t = { ...t, ...t.settings };
    }
    return {
        ...t,
        requireSelfie: t.requireSelfie !== false,
        requireGeolocation: t.requireGeolocation !== false,
        allowAttendanceOnHolidays: t.allowAttendanceOnHolidays === true,
        allowAttendanceOnWeeklyOff: t.allowAttendanceOnWeeklyOff === true,
        // Respect template settings - default to true if not specified
        allowLateEntry: t.allowLateEntry !== false && t.lateEntryAllowed !== false,
        allowEarlyExit: t.allowEarlyExit !== false && t.earlyExitAllowed !== false,
        allowOvertime: t.allowOvertime !== false && t.overtimeAllowed !== false,
    };
}

const uploadToCloudinary = async (base64String) => {
    try {
        if (!base64String) return null;
        let uploadStr = base64String;
        if (!base64String.startsWith('data:image')) {
            uploadStr = 'data:image/jpeg;base64,' + base64String;
        }

        const uploadResponse = await cloudinary.uploader.upload(uploadStr, {
            folder: 'attendance_selfies',
            resource_type: 'image'
        });
        return uploadResponse.secure_url;
    } catch (error) {
        console.error('Cloudinary Upload Error:', error.message);
        return null; // Should we fail? For now, allow check-in but log error
    }
};

// Helper function to calculate salary structure
function calculateSalaryStructure(salary) {
    if (!salary) return null;
    
    const basicSalary = salary.basicSalary || 0;
    const dearnessAllowance = salary.dearnessAllowance || (basicSalary > 0 ? basicSalary * 0.5 : 0);
    const houseRentAllowance = salary.houseRentAllowance || (basicSalary > 0 ? basicSalary * 0.2 : 0);
    const specialAllowance = salary.specialAllowance || 0;
    const employerPFRate = salary.employerPFRate || 0;
    const employerESIRate = salary.employerESIRate || 0;
    const employeePFRate = salary.employeePFRate || 0;
    const employeeESIRate = salary.employeeESIRate || 0;

    const grossFixedSalary = basicSalary + dearnessAllowance + houseRentAllowance + specialAllowance;
    const employerPF = employerPFRate > 0 ? (basicSalary * employerPFRate / 100) : 0;
    const employerESI = employerESIRate > 0 ? (grossFixedSalary * employerESIRate / 100) : 0;
    const grossSalary = grossFixedSalary + employerPF + employerESI;
    
    const employeePF = employeePFRate > 0 ? (basicSalary * employeePFRate / 100) : 0;
    const employeeESI = employeeESIRate > 0 ? (grossSalary * employeeESIRate / 100) : 0;
    const netMonthlySalary = grossSalary - employeePF - employeeESI;

    return {
        monthly: {
            grossSalary,
            netMonthlySalary
        }
    };
}

// Helper function to calculate working days for a month
function calculateWorkingDays(year, month, holidays, weeklyOffPattern, weeklyHolidays) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;
    
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const dayOfWeek = date.getDay();
        let isWeekOff = false;
        
        if (weeklyOffPattern === 'oddEvenSaturday') {
            if (dayOfWeek === 0) isWeekOff = true;
            else if (dayOfWeek === 6 && d % 2 === 0) isWeekOff = true;
        } else {
            isWeekOff = weeklyHolidays.some(h => h.day === dayOfWeek);
        }
        
        if (!isWeekOff) {
            const isHoliday = holidays.some(h => {
                const hd = new Date(h.date);
                return hd.getDate() === d && hd.getMonth() === month && hd.getFullYear() === year;
            });
            if (!isHoliday) {
                workingDays++;
            }
        }
    }
    
    return workingDays || 30; // Fallback to 30 if calculation fails
}

// Helper function to calculate shift hours
function calculateShiftHours(startTime, endTime) {
    const [startHours, startMins] = startTime.split(':').map(Number);
    const [endHours, endMins] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMins;
    const endTotalMinutes = endHours * 60 + endMins;
    
    let diffMinutes = endTotalMinutes - startTotalMinutes;
    if (diffMinutes < 0) {
        diffMinutes += 24 * 60; // Handle overnight shifts
    }
    
    return diffMinutes / 60; // Convert to hours
}

// Helper function to calculate fine for late arrival
function calculateLateFine(punchInTime, attendanceDate, shiftStartTime, gracePeriodMinutes, dailySalary, shiftHours) {
    console.log(`[calculateLateFine] Input: punchInTime=${punchInTime}, shiftStartTime=${shiftStartTime}, gracePeriodMinutes=${gracePeriodMinutes}, dailySalary=${dailySalary}, shiftHours=${shiftHours}`);
    
    const [shiftHours_val, shiftMins] = shiftStartTime.split(':').map(Number);
    const shiftStart = new Date(attendanceDate);
    shiftStart.setHours(shiftHours_val, shiftMins, 0, 0);
    
    const graceTimeEnd = new Date(shiftStart);
    graceTimeEnd.setMinutes(graceTimeEnd.getMinutes() + gracePeriodMinutes);
    
    console.log(`[calculateLateFine] Shift Start: ${shiftStart.toISOString()}, Grace Time End: ${graceTimeEnd.toISOString()}, Punch In: ${punchInTime.toISOString()}`);
    
    // If punch-in is before or within grace time, no fine
    if (punchInTime <= graceTimeEnd) {
        console.log(`[calculateLateFine] Punch-in is within grace time. No fine.`);
        return { lateMinutes: 0, fineAmount: 0 };
    }
    
    // Calculate late minutes from shift start time (not grace end)
    const lateMinutes = Math.max(0, Math.round((punchInTime.getTime() - shiftStart.getTime()) / (1000 * 60)));
    console.log(`[calculateLateFine] Late Minutes: ${lateMinutes}`);
    
    if (lateMinutes <= 0 || !dailySalary || !shiftHours) {
        console.log(`[calculateLateFine] Skipping fine calculation - lateMinutes: ${lateMinutes}, dailySalary: ${dailySalary}, shiftHours: ${shiftHours}`);
        return { lateMinutes, fineAmount: 0 };
    }
    
    // Calculate fine: Hourly Rate × (Late Minutes / 60)
    // Hourly Rate = Daily Salary / Shift Hours
    const hourlyRate = dailySalary / shiftHours;
    const fineAmount = Math.round((hourlyRate * (lateMinutes / 60)) * 100) / 100;
    
    console.log(`[calculateLateFine] Hourly Rate: ${hourlyRate}, Fine Amount: ${fineAmount}`);
    
    return { lateMinutes, fineAmount };
}

// Helper function to calculate fine for early exit
function calculateEarlyFine(punchOutTime, attendanceDate, shiftEndTime, dailySalary, shiftHours) {
    const [endHours, endMins] = shiftEndTime.split(':').map(Number);
    const shiftEnd = new Date(attendanceDate);
    shiftEnd.setHours(endHours, endMins, 0, 0);
    
    // If punch-out is after or equal to shift end time, no fine
    if (punchOutTime >= shiftEnd) {
        return { earlyMinutes: 0, fineAmount: 0 };
    }
    
    // Calculate early minutes (time before shift end time)
    const earlyMinutes = Math.max(0, Math.round((shiftEnd.getTime() - punchOutTime.getTime()) / (1000 * 60)));
    
    if (earlyMinutes <= 0 || !dailySalary || !shiftHours) {
        return { earlyMinutes, fineAmount: 0 };
    }
    
    // Calculate fine: Hourly Rate × (Early Minutes / 60)
    const hourlyRate = dailySalary / shiftHours;
    const fineAmount = Math.round((hourlyRate * (earlyMinutes / 60)) * 100) / 100;
    
    return { earlyMinutes, fineAmount };
}

// Helper function to calculate combined fine (late + early)
async function calculateCombinedFine(punchInTime, punchOutTime, attendanceDate, template, staff, company) {
    try {
        console.log(`[Fine Calculation] Starting for Staff: ${staff.name || staff.email || staff._id}`);
        console.log(`[Fine Calculation] PunchIn: ${punchInTime}, AttendanceDate: ${attendanceDate}`);
        
        // Get shift timings
        const shiftStartTime = template.shiftStartTime || "09:30";
        const shiftEndTime = template.shiftEndTime || "18:30";
        const gracePeriodMinutes = template.gracePeriodMinutes || 0;
        
        console.log(`[Fine Calculation] Shift: ${shiftStartTime} - ${shiftEndTime}, Grace: ${gracePeriodMinutes} min`);
        
        // Calculate shift hours
        const shiftHours = calculateShiftHours(shiftStartTime, shiftEndTime);
        console.log(`[Fine Calculation] Shift Hours: ${shiftHours}`);
        
        // Calculate daily salary
        let dailySalary = null;
        if (staff.salary) {
            console.log(`[Fine Calculation] Staff has salary structure:`, JSON.stringify(staff.salary, null, 2));
            const salaryStructure = calculateSalaryStructure(staff.salary);
            if (salaryStructure) {
                const monthlyGrossSalary = salaryStructure.monthly.grossSalary || 0;
                console.log(`[Fine Calculation] Monthly Gross Salary: ${monthlyGrossSalary}`);
                
                // Get holidays for the month
                const attendanceYear = attendanceDate.getFullYear();
                const attendanceMonth = attendanceDate.getMonth();
                
                let monthHolidays = [];
                if (staff.businessId) {
                    const HolidayTemplate = require('../models/HolidayTemplate');
                    const holidayTemplate = await HolidayTemplate.findOne({
                        businessId: staff.businessId,
                        isActive: true
                    });
                    if (holidayTemplate) {
                        monthHolidays = (holidayTemplate.holidays || []).filter(h => {
                            const holidayDate = new Date(h.date);
                            return holidayDate.getMonth() === attendanceMonth && holidayDate.getFullYear() === attendanceYear;
                        });
                    }
                }
                
                console.log(`[Fine Calculation] Month Holidays: ${monthHolidays.length}`);
                
                // Get weekly off pattern
                const businessSettings = company?.settings?.business || {};
                const weeklyOffPattern = businessSettings.weeklyOffPattern || 'standard';
                const weeklyHolidays = businessSettings.weeklyHolidays || [{ day: 0, name: 'Sunday' }];
                
                console.log(`[Fine Calculation] Weekly Off Pattern: ${weeklyOffPattern}, Weekly Holidays: ${JSON.stringify(weeklyHolidays)}`);
                
                // Calculate working days
                const workingDays = calculateWorkingDays(attendanceYear, attendanceMonth, monthHolidays, weeklyOffPattern, weeklyHolidays);
                console.log(`[Fine Calculation] Working Days: ${workingDays}`);
                
                // Calculate daily salary
                if (workingDays > 0) {
                    dailySalary = monthlyGrossSalary / workingDays;
                    console.log(`[Fine Calculation] Daily Salary: ${dailySalary}`);
                } else {
                    console.error(`[Fine Calculation] ERROR: Working days is 0 or invalid! Cannot calculate daily salary.`);
                }
            } else {
                console.error(`[Fine Calculation] ERROR: Salary structure calculation returned null/undefined`);
            }
        } else {
            console.error(`[Fine Calculation] ERROR: Staff does not have salary structure! staff.salary:`, staff.salary);
        }
        
        if (!dailySalary || dailySalary <= 0) {
            console.error(`[Fine Calculation] ERROR: Daily salary is null/zero. Returning zero fine.`);
            console.error(`[Fine Calculation] Debug - dailySalary: ${dailySalary}, staff.salary exists: ${!!staff.salary}`);
            return { lateMinutes: 0, earlyMinutes: 0, fineHours: 0, fineAmount: 0 };
        }
        
        // Calculate late fine
        console.log(`[Fine Calculation] Calculating late fine...`);
        const lateFine = calculateLateFine(punchInTime, attendanceDate, shiftStartTime, gracePeriodMinutes, dailySalary, shiftHours);
        console.log(`[Fine Calculation] Late Fine Result:`, lateFine);
        
        // Calculate early fine if punch-out exists
        let earlyFine = { earlyMinutes: 0, fineAmount: 0 };
        if (punchOutTime) {
            console.log(`[Fine Calculation] Calculating early fine...`);
            earlyFine = calculateEarlyFine(punchOutTime, attendanceDate, shiftEndTime, dailySalary, shiftHours);
            console.log(`[Fine Calculation] Early Fine Result:`, earlyFine);
        }
        
        // Combine fines
        const fineHours = lateFine.lateMinutes + earlyFine.earlyMinutes; // Total in minutes
        const fineAmount = lateFine.fineAmount + earlyFine.fineAmount;
        
        console.log(`[Fine Calculation] Final Result - Late: ${lateFine.lateMinutes} min, Early: ${earlyFine.earlyMinutes} min, Total Fine: ₹${fineAmount}`);
        
        return {
            lateMinutes: lateFine.lateMinutes,
            earlyMinutes: earlyFine.earlyMinutes,
            fineHours: fineHours,
            fineAmount: fineAmount
        };
    } catch (error) {
        console.error('[Fine Calculation Error]', error);
        console.error('[Fine Calculation Error Stack]', error.stack);
        return { lateMinutes: 0, earlyMinutes: 0, fineHours: 0, fineAmount: 0 };
    }
}

// @desc    Check In
// @route   POST /api/attendance/checkin
// @access  Private
const checkIn = async (req, res) => {
    const { latitude, longitude, address, area, city, pincode, selfie } = req.body;

    // Use req.staff from middleware
    if (!req.staff) {
        return res.status(404).json({ message: 'Staff record not found for this user' });
    }
    const staffId = req.staff._id;

    if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ message: 'Location coordinates are missing' });
    }

    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);

    // Date Logic: Store as Date object set to midnight (start of day) - UTC safe approach
    const now = new Date();
    // Create Date object for start/end of day based on current time
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    try {
        // Re-fetch staff with populated branch and template
        const staff = await Staff.findById(staffId).populate('branchId').populate('attendanceTemplateId');
        const template = normalizeTemplate(staff.attendanceTemplateId);

        console.log(`[CheckIn] Processing for Staff: ${staff.name} (${staff._id})`);

        // PRIORITY 1: Check if On Approved Leave (highest priority - blocks all other rules)
        // This check must happen FIRST before any other attendance validations
        const Leave = require('../models/Leave');
        const activeLeave = await Leave.findOne({
            employeeId: staffId,
            status: 'Approved',
            startDate: { $lt: endOfDay },
            endDate: { $gt: startOfDay }
        });
        if (activeLeave) {
            return res.status(403).json({ message: 'Today is a Leave Day. Check-in not allowed.' });
        }

        // 2. Check for Holiday
        const HolidayTemplate = require('../models/HolidayTemplate');
        const holidayTemplate = await HolidayTemplate.findOne({
            businessId: staff.businessId,
            isActive: true
        });
        let isHoliday = false;
        if (holidayTemplate) {
            isHoliday = (holidayTemplate.holidays || []).some(h => {
                const hd = new Date(h.date);
                return hd.getDate() === now.getDate() && hd.getMonth() === now.getMonth() && hd.getFullYear() === now.getFullYear();
            });
        }
        if (isHoliday && template.allowAttendanceOnHolidays === false) {
            return res.status(403).json({ message: 'Today is a Holiday. Check-in not allowed.' });
        }

        // 3. Check for Weekly Off
        const Company = require('../models/Company');
        const company = await Company.findById(staff.businessId);
        const businessSettings = company?.settings?.business || {};
        const weeklyOffPattern = businessSettings.weeklyOffPattern || 'standard';
        const weeklyHolidays = businessSettings.weeklyHolidays || [{ day: 0, name: 'Sunday' }];
        const dayOfWeek = now.getDay();
        let isWeeklyOff = false;
        if (weeklyOffPattern === 'oddEvenSaturday') {
            if (dayOfWeek === 0) isWeeklyOff = true;
            else if (dayOfWeek === 6 && now.getDate() % 2 === 0) isWeeklyOff = true;
        } else {
            isWeeklyOff = weeklyHolidays.some(h => h.day === dayOfWeek);
        }
        if (isWeeklyOff && template.allowAttendanceOnWeeklyOff === false) {
            return res.status(403).json({ message: 'Today is a Weekly Off. Check-in not allowed.' });
        }

        // 4. Check Late Entry - Always allow, but add warning if not allowed in settings
        // PRIORITY: Get shift timing from Company settings based on staff's shiftName
        // Fallback to AttendanceTemplate if shift not found in Company settings
        let shiftTiming = null;
        if (company && staff.shiftName) {
            shiftTiming = getShiftFromCompanySettings(company, staff.shiftName);
            console.log(`[CheckIn] Shift from Company settings: ${shiftTiming ? 'Found' : 'Not Found'} for shiftName: ${staff.shiftName}`);
        }
        
        const shiftStartStr = shiftTiming?.startTime || template.shiftStartTime || "09:30";
        const shiftEndStr = shiftTiming?.endTime || template.shiftEndTime || "18:30";
        const gracePeriod = shiftTiming?.gracePeriodMinutes ?? template.gracePeriodMinutes ?? 0;
        
        const [sHours, sMins] = shiftStartStr.split(':').map(Number);

        const shiftStart = new Date(now);
        shiftStart.setHours(sHours, sMins, 0, 0);
        const graceTimeEnd = new Date(shiftStart);
        graceTimeEnd.setMinutes(graceTimeEnd.getMinutes() + gracePeriod);

        const warnings = [];
        let lateMinutes = 0;
        if (now > graceTimeEnd) {
            // User is checking in late (after grace period)
            lateMinutes = Math.floor((now.getTime() - shiftStart.getTime()) / (1000 * 60));
            if (template.allowLateEntry === false) {
                // Add warning but still allow check-in
                warnings.push({
                    type: 'late_entry',
                    message: `Late entry not allowed. You are ${lateMinutes} minute(s) late. Shift start time: ${shiftStartStr}`,
                    minutes: lateMinutes,
                    notAllowed: true
                });
            }
            // If allowed, proceed silently (no warnings)
        }

        // Geofence Logic
        let activeBranch = null;
        let officeLat, officeLng, officeName, allowedRadiusMeters;
        let isGeofenceEnabled = false;

        if (staff.branchId) {
            activeBranch = staff.branchId;
            officeName = activeBranch.branchName || "Assigned Branch";

            if (activeBranch.geofence && activeBranch.geofence.enabled === true) {
                isGeofenceEnabled = true;
                officeLat = activeBranch.geofence.latitude;
                officeLng = activeBranch.geofence.longitude;
                allowedRadiusMeters = activeBranch.geofence.radius || 100;
            } else if (activeBranch.latitude && activeBranch.longitude) {
                isGeofenceEnabled = true;
                officeLat = activeBranch.latitude;
                officeLng = activeBranch.longitude;
                allowedRadiusMeters = activeBranch.radius || 100;
            }
        }

        if (isGeofenceEnabled && template.requireGeolocation !== false) {
            if (!officeLat || !officeLng) {
                console.warn(`[CheckIn Warning] Geofence enabled for ${officeName} but coordinates missing.`);
            } else {
                const distance = getDistanceFromLatLonInKm(userLat, userLng, officeLat, officeLng);
                const distanceInMeters = distance * 1000;
                if (distanceInMeters > allowedRadiusMeters) {
                    return res.status(400).json({
                        message: `Check-in denied. You are ${distanceInMeters.toFixed(0)}m away. Allowed: ${allowedRadiusMeters}m.`
                    });
                }
            }
        }

        // Check for existing attendance - check both employeeId and user fields
        // to find records created from web or app
        let existing = await Attendance.findOne({
            employeeId: staffId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        if (!existing) {
            existing = await Attendance.findOne({
                user: staffId,
                date: { $gte: startOfDay, $lte: endOfDay }
            });
        }

        if (existing) {
            return res.status(400).json({ message: 'Already checked in today' });
        }

        // Upload Selfie
        let selfieUrl = null;
        if (selfie && template.requireSelfie !== false) {
            selfieUrl = await uploadToCloudinary(selfie);
        }

        const locationData = {
            latitude: userLat,
            longitude: userLng,
            address: address || '',
            area: area || '',
            city: city || '',
            pincode: pincode || '',
            punchIn: {
                latitude: userLat,
                longitude: userLng,
                address: address || '',
                area: area || '',
                city: city || '',
                pincode: pincode || ''
            }
        };

        // Calculate fine for late arrival
        // Use shift timing from Company settings if available, otherwise use template
        const fineShiftStartTime = shiftTiming?.startTime || template.shiftStartTime || "09:30";
        const fineShiftEndTime = shiftTiming?.endTime || template.shiftEndTime || "18:30";
        const fineGracePeriod = shiftTiming?.gracePeriodMinutes ?? template.gracePeriodMinutes ?? 0;
        
        console.log(`[CheckIn] Fine Calculation Setup:`);
        console.log(`[CheckIn] Staff: ${staff.name || staff.email || staff._id}, ShiftName: ${staff.shiftName}`);
        console.log(`[CheckIn] Shift Timing from Company: ${shiftTiming ? 'Found' : 'Not Found'}`);
        console.log(`[CheckIn] Fine Shift: ${fineShiftStartTime} - ${fineShiftEndTime}, Grace: ${fineGracePeriod} min`);
        console.log(`[CheckIn] Late Minutes: ${lateMinutes}`);
        console.log(`[CheckIn] Staff Salary Exists: ${!!staff.salary}`);
        if (staff.salary) {
            console.log(`[CheckIn] Staff Salary:`, JSON.stringify(staff.salary, null, 2));
        }
        
        // Create a fine template object with shift timings
        const fineTemplate = {
            ...template,
            shiftStartTime: fineShiftStartTime,
            shiftEndTime: fineShiftEndTime,
            gracePeriodMinutes: fineGracePeriod
        };
        
        let fineResult = { lateMinutes: 0, earlyMinutes: 0, fineHours: 0, fineAmount: 0 };
        if (lateMinutes > 0) {
            console.log(`[CheckIn] Calling calculateCombinedFine because lateMinutes > 0`);
            fineResult = await calculateCombinedFine(now, null, startOfDay, fineTemplate, staff, company);
            console.log(`[CheckIn] Fine Calculation Result:`, fineResult);
        } else {
            console.log(`[CheckIn] Skipping fine calculation because lateMinutes is ${lateMinutes} (not > 0)`);
        }

        // Create initial attendance record.
        // Align core fields with new web backend so that
        // documents created from APP and WEB have the same keys.
        const attendance = await Attendance.create({
            employeeId: staffId,
            user: staffId,
            businessId: staff.businessId,
            date: startOfDay,
            punchIn: now,
            status: (isHoliday || isWeeklyOff) ? 'Present' : 'Pending',
            location: locationData,
            punchInSelfie: selfieUrl,
            ipAddress: req.ip || req.connection.remoteAddress,
            punchInIpAddress: req.ip || req.connection.remoteAddress,
            // Fine calculation fields
            workHours: 0,
            fineHours: fineResult.fineHours,
            lateMinutes: fineResult.lateMinutes,
            earlyMinutes: fineResult.earlyMinutes,
            fineAmount: fineResult.fineAmount
        });

        // Include warnings in response if any
        const response = attendance.toObject ? attendance.toObject() : attendance;
        if (warnings.length > 0) {
            response.warnings = warnings;
        }

        res.status(201).json(response);

    } catch (error) {
        console.error('[CheckIn Error]', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check Out
// @route   PUT /api/attendance/checkout
// @access  Private
const checkOut = async (req, res) => {
    const { latitude, longitude, address, area, city, pincode, selfie } = req.body;

    if (!req.staff) {
        return res.status(404).json({ message: 'Staff record not found' });
    }
    const staffId = req.staff._id;
    const now = new Date();

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    try {
        const staff = await Staff.findById(staffId).populate('branchId').populate('attendanceTemplateId');
        const template = normalizeTemplate(staff.attendanceTemplateId);

        // Find today's attendance
        const attendance = await Attendance.findOne({
            employeeId: staffId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        if (!attendance) {
            const legacyAttendance = await Attendance.findOne({
                user: staffId,
                date: { $gte: startOfDay, $lte: endOfDay }
            });

            if (!legacyAttendance) {
                return res.status(404).json({ message: 'No check-in record found for today' });
            }
            return processCheckOut(legacyAttendance, req, res, staff, now, { latitude, longitude, address, area, city, pincode, selfie }, template);
        }

        return processCheckOut(attendance, req, res, staff, now, { latitude, longitude, address, area, city, pincode, selfie }, template);

    } catch (error) {
        console.error('[CheckOut Error]', error);
        res.status(500).json({ message: error.message });
    }
};

async function processCheckOut(attendance, req, res, staff, now, data, template = {}) {
    const { latitude, longitude, address, area, city, pincode, selfie } = data;

    if (attendance.punchOut) {
        return res.status(400).json({ message: 'Already checked out today' });
    }

    // PRIORITY 1: Check if On Approved Leave (highest priority - blocks all other rules)
    const Leave = require('../models/Leave');
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const activeLeave = await Leave.findOne({
        employeeId: staff._id,
        status: 'Approved',
        startDate: { $lt: endOfDay },
        endDate: { $gt: startOfDay }
    });
    if (activeLeave) {
        return res.status(403).json({ message: 'Today is a Leave Day. Check-out not allowed.' });
    }

    // Check Early Exit - Always allow, but add warning if not allowed in settings
    // PRIORITY: Get shift timing from Company settings based on staff's shiftName
    // Fallback to AttendanceTemplate if shift not found in Company settings
    const Company = require('../models/Company');
    const company = await Company.findById(staff.businessId);
    let shiftTiming = null;
    if (company && staff.shiftName) {
        shiftTiming = getShiftFromCompanySettings(company, staff.shiftName);
        console.log(`[CheckOut] Shift from Company settings: ${shiftTiming ? 'Found' : 'Not Found'} for shiftName: ${staff.shiftName}`);
    }
    
    const shiftEndStr = shiftTiming?.endTime || template.shiftEndTime || "18:30";
    const [eHours, eMins] = shiftEndStr.split(':').map(Number);
    const shiftEnd = new Date(now);
    shiftEnd.setHours(eHours, eMins, 0, 0);

    const warnings = [];
    let earlyMinutes = 0;
    if (now < shiftEnd) {
        // User is checking out early
        earlyMinutes = Math.floor((shiftEnd.getTime() - now.getTime()) / (1000 * 60));
        if (template.allowEarlyExit === false) {
            // Add warning but still allow check-out
            warnings.push({
                type: 'early_checkout',
                message: `Early exit not allowed. You are ${earlyMinutes} minute(s) early. Shift end time: ${shiftEndStr}`,
                minutes: earlyMinutes,
                notAllowed: true
            });
        }
        // If allowed, proceed silently (no warnings)
    }

    // Geofencing Check
    if (staff.branchId && latitude && longitude && template.requireGeolocation !== false) {
        const activeBranch = staff.branchId;
        if (activeBranch.geofence && activeBranch.geofence.enabled === true) {
            const officeLat = activeBranch.geofence.latitude;
            const officeLng = activeBranch.geofence.longitude;
            const allowedRadius = activeBranch.geofence.radius || 100;

            if (officeLat && officeLng) {
                const dist = getDistanceFromLatLonInKm(latitude, longitude, officeLat, officeLng) * 1000;
                if (dist > allowedRadius) {
                    return res.status(400).json({
                        message: `Check-out denied. You are ${dist.toFixed(0)}m away from branch.`
                    });
                }
            }
        }
    }

    // Upload Selfie
    if (selfie && template.requireSelfie !== false) {
        const selfieUrl = await uploadToCloudinary(selfie);
        attendance.punchOutSelfie = selfieUrl;
    }

    // Update Fields
    attendance.punchOut = now;
    attendance.punchOutIpAddress = req.ip || req.connection.remoteAddress;

    if (latitude && longitude) {
        if (!attendance.location) attendance.location = {};
        attendance.location.punchOut = {
            latitude, longitude, address, area, city, pincode
        };
    }

    // Calculate Work Hours (in minutes to match web backend format)
    if (attendance.punchIn) {
        const durationMs = now - new Date(attendance.punchIn);
        const minutes = Math.round(durationMs / (1000 * 60));
        attendance.workHours = minutes;

        // Record Overtime if allowed
        if (template.allowOvertime) {
            // Use shift timing from Company settings if available
            const overtimeShiftEndStr = shiftTiming?.endTime || template.shiftEndTime || "18:30";
            const [eHours, eMins] = overtimeShiftEndStr.split(':').map(Number);
            const shiftEnd = new Date(now);
            shiftEnd.setHours(eHours, eMins, 0, 0);

            if (now > shiftEnd) {
                const otMs = now - shiftEnd;
                attendance.overtime = parseFloat((otMs / (1000 * 60 * 60)).toFixed(2));
            }
        }
    }

    // Recalculate fine with punch-out (includes both late arrival and early exit)
    // Use shift timing from Company settings if available, otherwise use template
    const fineShiftStartTime = shiftTiming?.startTime || template.shiftStartTime || "09:30";
    const fineShiftEndTime = shiftTiming?.endTime || template.shiftEndTime || "18:30";
    const fineGracePeriod = shiftTiming?.gracePeriodMinutes ?? template.gracePeriodMinutes ?? 0;
    
    // Create a fine template object with shift timings
    const fineTemplate = {
        ...template,
        shiftStartTime: fineShiftStartTime,
        shiftEndTime: fineShiftEndTime,
        gracePeriodMinutes: fineGracePeriod
    };
    
    const fineResult = await calculateCombinedFine(
        attendance.punchIn,
        now,
        attendance.date,
        fineTemplate,
        staff,
        company
    );
    
    // Update fine fields
    attendance.lateMinutes = fineResult.lateMinutes;
    attendance.earlyMinutes = fineResult.earlyMinutes;
    attendance.fineHours = fineResult.fineHours; // Total in minutes
    attendance.fineAmount = fineResult.fineAmount;

    await attendance.save();

    // Include warnings in response if any
    const response = attendance.toObject ? attendance.toObject() : attendance;
    if (warnings.length > 0) {
        response.warnings = warnings;
    }

    res.json(response);
}

// @desc    Get Today's Attendance
// @route   GET /api/attendance/today
// @access  Private
const getTodayAttendance = async (req, res) => {
    try {
        if (!req.staff) return res.status(404).json({ message: 'Staff not found' });

        let queryDate = new Date();
        if (req.query.date) {
            const parts = req.query.date.split('-').map(Number);
            if (parts.length === 3) {
                // components: YYYY, MM-1, DD
                queryDate = new Date(parts[0], parts[1] - 1, parts[2]);
            } else {
                queryDate = new Date(req.query.date);
            }
        }

        const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 23, 59, 59, 999);

        // Fetch attendance
        let attendance = await Attendance.findOne({
            employeeId: req.staff._id,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        if (!attendance) {
            attendance = await Attendance.findOne({
                user: req.staff._id,
                date: { $gte: startOfDay, $lte: endOfDay }
            });
        }

        // Fetch Staff with Branch and Template
        const staff = await Staff.findById(req.staff._id)
            .populate('branchId')
            .populate('attendanceTemplateId');

        // Fetch Company to get shift settings
        const Company = require('../models/Company');
        const company = await Company.findById(req.staff.businessId);

        // Branch Info
        let branchInfo = null;
        if (staff.branchId) {
            const b = staff.branchId;
            branchInfo = {
                name: b.branchName || b.name,
                latitude: b.geofence?.latitude || b.latitude,
                longitude: b.geofence?.longitude || b.longitude,
                radius: b.geofence?.radius || b.radius || 100
            };
        }

        // Check for Leave - First check attendance record status, then check approved leave
        const Leave = require('../models/Leave');
        
        // Check if attendance record has status "On Leave"
        const attendanceStatusIsOnLeave = attendance && attendance.status === 'On Leave';
        
        // Check for approved leave from Leave collection
        const activeLeave = await Leave.findOne({
            employeeId: req.staff._id,
            status: 'Approved',
            startDate: { $lt: endOfDay },
            endDate: { $gt: startOfDay }
        });
        
        // Only set isOnLeave to true if:
        // 1. Attendance record has status "On Leave" OR
        // 2. There's an approved leave
        // Do NOT set it to true for pending leaves or when leave is not applied
        const isOnLeave = attendanceStatusIsOnLeave || !!activeLeave;

        // Check for Holiday
        const HolidayTemplate = require('../models/HolidayTemplate');
        const holidayTemplate = await HolidayTemplate.findOne({
            businessId: req.staff.businessId,
            isActive: true
        });

        let holidayInfo = null;
        if (holidayTemplate) {
            holidayInfo = (holidayTemplate.holidays || []).find(h => {
                const hd = new Date(h.date);
                return hd.getDate() === queryDate.getDate() &&
                    hd.getMonth() === queryDate.getMonth() &&
                    hd.getFullYear() === queryDate.getFullYear();
            });
        }

        // Check for Weekly Off (company already fetched above)
        const businessSettings = company?.settings?.business || {};
        const weeklyOffPattern = businessSettings.weeklyOffPattern || 'standard';
        const weeklyHolidays = businessSettings.weeklyHolidays || [{ day: 0, name: 'Sunday' }];

        const dayOfWeek = queryDate.getDay();
        let isWeeklyOff = false;
        if (weeklyOffPattern === 'oddEvenSaturday') {
            if (dayOfWeek === 0) isWeeklyOff = true;
            else if (dayOfWeek === 6 && queryDate.getDate() % 2 === 0) isWeeklyOff = true;
        } else {
            isWeeklyOff = weeklyHolidays.some(h => h.day === dayOfWeek);
        }

        const finalTemplate = normalizeTemplate(staff.attendanceTemplateId);
        
        // PRIORITY: Get shift timing from Company settings based on staff's shiftName
        // Merge shift timings into template for response
        let shiftTiming = null;
        if (company && staff.shiftName) {
            shiftTiming = getShiftFromCompanySettings(company, staff.shiftName);
            console.log(`[getTodayAttendance] Shift from Company settings: ${shiftTiming ? 'Found' : 'Not Found'} for shiftName: ${staff.shiftName}`);
            
            if (shiftTiming) {
                // Override template shift timings with Company shift settings
                finalTemplate.shiftStartTime = shiftTiming.startTime;
                finalTemplate.shiftEndTime = shiftTiming.endTime;
                finalTemplate.gracePeriodMinutes = shiftTiming.gracePeriodMinutes;
            }
        }

        res.json({
            data: attendance,
            branch: branchInfo,
            template: finalTemplate,
            isOnLeave: isOnLeave,
            leaveInfo: activeLeave,
            isHoliday: !!holidayInfo,
            holidayInfo: holidayInfo,
            isWeeklyOff: isWeeklyOff
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Attendance History
const getAttendanceHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = {
            // Query either employeeId OR user field to catch all records
            $or: [
                { employeeId: req.staff._id },
                { user: req.staff._id }
            ]
        };

        if (req.query.date) {
            const d = new Date(req.query.date);
            const start = new Date(d.setHours(0, 0, 0, 0));
            const end = new Date(d.setHours(23, 59, 59, 999));
            query.date = { $gte: start, $lte: end };
        }

        const attendance = await Attendance.find(query)
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Attendance.countDocuments(query);

        res.json({
            data: attendance,
            pagination: {
                page, limit, total, pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error(error); // Log error
        res.status(500).json({ message: 'Server Error' });
    }
};

const getMonthAttendance = async (req, res) => {
    try {
        const { year, month } = req.query;
        if (!year || !month) {
            return res.status(400).json({ message: 'Year and Month are required' });
        }

        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

        // Fetch attendance
        const attendance = await Attendance.find({
            $or: [
                { employeeId: req.staff._id },
                { user: req.staff._id }
            ],
            date: { $gte: startOfMonth, $lte: endOfMonth }
        }).sort({ date: 1 });

        // Fetch holidays
        const HolidayTemplate = require('../models/HolidayTemplate');
        const holidayTemplate = await HolidayTemplate.findOne({
            businessId: req.staff.businessId,
            isActive: true
        });

        let holidays = [];
        if (holidayTemplate) {
            holidays = (holidayTemplate.holidays || []).filter(h => {
                const d = new Date(h.date);
                return d.getFullYear() == year && (d.getMonth() + 1) == month;
            });
        }

        // Fetch Business settings for week-offs
        const Company = require('../models/Company');
        const company = await Company.findById(req.staff.businessId);
        const businessSettings = company?.settings?.business || {};
        const weeklyOffPattern = businessSettings.weeklyOffPattern || 'standard';
        const weeklyHolidays = businessSettings.weeklyHolidays || [{ day: 0, name: 'Sunday' }]; // Default to Sunday if not set

        // Stats calculation
        const totalDaysInMonth = new Date(year, month, 0).getDate();

        let workingDays = 0;
        let weekOffs = 0;
        let holidaysCount = 0;
        let weekOffDates = [];

        // Loop for stats - calculate for entire month (not based on joining date)
        for (let d = 1; d <= totalDaysInMonth; d++) {
            const date = new Date(year, month - 1, d);
            date.setHours(0, 0, 0, 0);

            const dayOfWeek = date.getDay();
            let isWeekOff = false;

            if (weeklyOffPattern === 'oddEvenSaturday') {
                if (dayOfWeek === 0) isWeekOff = true;
                else if (dayOfWeek === 6 && d % 2 === 0) isWeekOff = true;
            } else {
                isWeekOff = weeklyHolidays.some(h => h.day === dayOfWeek);
            }

            if (isWeekOff) {
                weekOffs++;
            } else {
                const isHoliday = holidays.some(h => {
                    const hd = new Date(h.date);
                    return hd.getDate() === d;
                });

                if (isHoliday) holidaysCount++;
                else workingDays++;
            }
        }

        // Separate loop for weekOffDates (always for the full month to show in calendar)
        for (let d = 1; d <= totalDaysInMonth; d++) {
            // Create date in local timezone for day of week calculation
            const date = new Date(year, month - 1, d);
            const dayOfWeek = date.getDay();
            let isWeekOff = false;

            if (weeklyOffPattern === 'oddEvenSaturday') {
                if (dayOfWeek === 0) {
                    isWeekOff = true; // All Sundays are week off
                } else if (dayOfWeek === 6 && d % 2 === 0) {
                    isWeekOff = true; // Even Saturdays are week off
                }
            } else {
                // Standard pattern: Check weeklyHolidays array
                isWeekOff = weeklyHolidays.some(h => h.day === dayOfWeek);
            }

            if (isWeekOff) {
                // Use UTC methods to get consistent date string
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                weekOffDates.push(dateStr);
            }
        }

        // Helper function to format date string consistently (YYYY-MM-DD)
        const formatDateString = (dateObj) => {
            const d = new Date(dateObj);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Create a set of dates that have attendance records
        const attendanceDateSet = new Set();
        attendance.forEach(a => {
            const dateStr = formatDateString(a.date);
            attendanceDateSet.add(dateStr);
        });

        // Create a set of holiday dates
        const holidayDateSet = new Set();
        holidays.forEach(h => {
            const dateStr = formatDateString(h.date);
            holidayDateSet.add(dateStr);
        });

        // Filter weekOffDates: exclude dates that have attendance records
        // If someone marked attendance on a week off day, it should be treated as a working day
        // BUT: Always include Sundays (day 0) even if they have attendance, as they are always week off
        const filteredWeekOffDates = weekOffDates.filter(dateStr => {
            const hasAttendance = attendanceDateSet.has(dateStr);
            if (hasAttendance) {
                // Check if it's a Sunday - if so, still include it as week off
                // Parse date string to get day of week
                const [y, m, day] = dateStr.split('-').map(Number);
                const date = new Date(y, m - 1, day);
                const dayOfWeek = date.getDay();
                if (dayOfWeek === 0) {
                    console.log(`[getMonthAttendance] Keeping Sunday ${dateStr} as week off despite attendance`);
                    return true; // Always include Sundays
                }
                return false; // Exclude other week offs that have attendance
            }
            return true; // Include week offs without attendance
        });
        

        // Calculate absent dates: working days without attendance records
        const absentDates = [];
        const presentDates = [];
        const holidayDates = [];

        // Today (used to ensure we don't mark future dates as absent)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = formatDateString(today);

        for (let d = 1; d <= totalDaysInMonth; d++) {
            // Create date string directly in YYYY-MM-DD format (avoids timezone issues)
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            // Create date object for day of week calculation (using local time for day calculation)
            const date = new Date(year, month - 1, d);
            const dayOfWeek = date.getDay();

            // Check if attendance exists FIRST - attendance takes precedence over week off/holiday
            if (attendanceDateSet.has(dateStr)) {
                // Find the attendance record to get status
                const attRecord = attendance.find(a => {
                    const attDateStr = formatDateString(a.date);
                    return attDateStr === dateStr;
                });
                if (attRecord) {
                    presentDates.push(dateStr);
                }
                // If attendance exists, skip further checks (attendance overrides week off/holiday)
                continue;
            }

            // Check if it's a holiday (only if no attendance)
            const isHoliday = holidayDateSet.has(dateStr);
            if (isHoliday) {
                holidayDates.push(dateStr);
                continue;
            }

            // Check if it's a week off (only if no attendance and not a holiday)
            let isWeekOff = false;

            if (weeklyOffPattern === 'oddEvenSaturday') {
                if (dayOfWeek === 0) {
                    isWeekOff = true; // All Sundays are week off
                } else if (dayOfWeek === 6 && d % 2 === 0) {
                    isWeekOff = true; // Even Saturdays are week off
                }
            } else {
                isWeekOff = weeklyHolidays.some(h => h.day === dayOfWeek);
            }
            
            // IMPORTANT: Sundays (day 0) are ALWAYS week off, regardless of configuration
            if (dayOfWeek === 0) {
                isWeekOff = true;
            }

            // Skip week offs (only if no attendance record exists)
            if (isWeekOff) {
                continue;
            }

            // If we reach here, it's a working day without attendance = absent
            // BUT: Never mark Sundays as absent
            if (dayOfWeek === 0) {
                continue;
            }

            // Also: Never mark future dates as absent (only up to today)
            if (dateStr > todayStr) {
                continue;
            }
            
            absentDates.push(dateStr);
        }

        res.json({
            data: {
                attendance,
                holidays,
                weekOffDates: filteredWeekOffDates, // Use filtered week off dates (excluding dates with attendance)
                absentDates, // Add absent dates array
                presentDates, // Add present dates array for reference
                holidayDates, // Add holiday dates array for reference
                settings: {
                    weeklyOffPattern,
                    weeklyHolidays
                },
                stats: {
                    workingDays,
                    holidaysCount,
                    weekOffs,
                    presentDays: attendance.filter(a => ['Present', 'Approved', 'Half Day'].includes(a.status)).length,
                    absentDays: Math.max(0, workingDays - attendance.filter(a => ['Present', 'Approved', 'Half Day'].includes(a.status)).length)
                }
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { checkIn, checkOut, getTodayAttendance, getAttendanceHistory, getMonthAttendance };
