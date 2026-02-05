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
// If shiftName is not provided, returns the first shift from the array
function getShiftFromCompanySettings(company, shiftName = null) {
    if (!company || !company.settings || !company.settings.attendance || !company.settings.attendance.shifts) {
        return null;
    }
    
    const shifts = company.settings.attendance.shifts;
    if (!Array.isArray(shifts) || shifts.length === 0) {
        return null;
    }
    
    // Find shift matching the shiftName (case-insensitive), or use first shift if shiftName is not provided
    let matchedShift = null;
    if (shiftName) {
        matchedShift = shifts.find(shift => {
            const shiftNameLower = (shift.name || '').toLowerCase();
            const staffShiftNameLower = (shiftName || '').toLowerCase();
            return shiftNameLower === staffShiftNameLower;
        });
    }
    
    // If no match found and shiftName was provided, return null
    // If shiftName was not provided, use first shift
    if (!matchedShift) {
        if (shiftName) {
            return null; // Shift name specified but not found
        }
        matchedShift = shifts[0]; // Use first shift as default
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
    const [shiftHours_val, shiftMins] = shiftStartTime.split(':').map(Number);
    const shiftStart = new Date(attendanceDate);
    shiftStart.setHours(shiftHours_val, shiftMins, 0, 0);
    
    const graceTimeEnd = new Date(shiftStart);
    graceTimeEnd.setMinutes(graceTimeEnd.getMinutes() + gracePeriodMinutes);
    
    // If punch-in is before or within grace time, no fine
    if (punchInTime <= graceTimeEnd) {
        return { lateMinutes: 0, fineAmount: 0 };
    }
    
    // Calculate late minutes from shift start time (not grace end)
    const lateMinutes = Math.max(0, Math.round((punchInTime.getTime() - shiftStart.getTime()) / (1000 * 60)));
    
    if (lateMinutes <= 0 || !dailySalary || !shiftHours) {
        return { lateMinutes, fineAmount: 0 };
    }
    
    // Calculate fine: Hourly Rate × (Late Minutes / 60)
    // Hourly Rate = Daily Salary / Shift Hours
    const hourlyRate = dailySalary / shiftHours;
    const fineAmount = Math.round((hourlyRate * (lateMinutes / 60)) * 100) / 100;
    
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
// @param {Object} leave - Optional approved leave (for Half Day session-aware calculation)
async function calculateCombinedFine(punchInTime, punchOutTime, attendanceDate, template, staff, company, leave = null) {
    try {
        // Check if Half Day leave and get session
        const isHalfDay = leave && String(leave.leaveType || '').trim().toLowerCase() === 'half day';
        const session = isHalfDay ? String(leave.session || '').trim() : null;
        
        // Get shift timings from DB (use Company settings if available, else template)
        const { getShiftTimings } = require('../utils/leaveAttendanceHelper');
        const dbShiftTimings = getShiftTimings(company, staff);
        const dbShiftStartTime = dbShiftTimings.startTime;
        const dbShiftEndTime = dbShiftTimings.endTime;
        const dbGracePeriodMinutes = dbShiftTimings.gracePeriodMinutes || 0;
        
        // Get shift timings (session-aware for Half Day, regular shift otherwise)
        let shiftStartTime, shiftEndTime, shiftHours;
        if (isHalfDay && (session === '1' || session === '2')) {
            const { getWorkingSessionTimings } = require('../utils/leaveAttendanceHelper');
            // Calculate working session from DB shift times
            const sessionTimings = getWorkingSessionTimings(session, dbShiftStartTime, dbShiftEndTime);
            if (sessionTimings) {
                shiftStartTime = sessionTimings.startTime;
                shiftEndTime = sessionTimings.endTime;
                shiftHours = calculateShiftHours(shiftStartTime, shiftEndTime); // 5 hours for half-day session
            } else {
                // Fallback to regular shift from DB
                shiftStartTime = dbShiftStartTime;
                shiftEndTime = dbShiftEndTime;
                shiftHours = calculateShiftHours(shiftStartTime, shiftEndTime);
            }
        } else {
            // Full-day: use DB shift times
            shiftStartTime = dbShiftStartTime;
            shiftEndTime = dbShiftEndTime;
            shiftHours = calculateShiftHours(shiftStartTime, shiftEndTime);
        }
        
        // Use grace period from company settings if available, otherwise from template
        const gracePeriodMinutes = dbGracePeriodMinutes || template.gracePeriodMinutes || 0;
        
        // Calculate daily salary
        let dailySalary = null;
        if (staff.salary) {
            const salaryStructure = calculateSalaryStructure(staff.salary);
            if (salaryStructure) {
                const monthlyGrossSalary = salaryStructure.monthly.grossSalary || 0;
                
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
                
                // Get weekly off pattern
                const businessSettings = company?.settings?.business || {};
                const weeklyOffPattern = businessSettings.weeklyOffPattern || 'standard';
                const weeklyHolidays = businessSettings.weeklyHolidays || [{ day: 0, name: 'Sunday' }];
                
                // Calculate working days
                const workingDays = calculateWorkingDays(attendanceYear, attendanceMonth, monthHolidays, weeklyOffPattern, weeklyHolidays);
                
                // Calculate daily salary
                if (workingDays > 0) {
                    dailySalary = monthlyGrossSalary / workingDays;
                }
            }
        }
        
        if (!dailySalary || dailySalary <= 0) {
            return { lateMinutes: 0, earlyMinutes: 0, fineHours: 0, fineAmount: 0 };
        }
        
        // Calculate late fine (session-aware for Half Day)
        let lateFine;
        if (isHalfDay && (session === '1' || session === '2')) {
            const { calculateHalfDayLateFine } = require('../utils/leaveAttendanceHelper');
            lateFine = calculateHalfDayLateFine(punchInTime, attendanceDate, session, gracePeriodMinutes, dailySalary, shiftHours, dbShiftStartTime, dbShiftEndTime);
        } else {
            lateFine = calculateLateFine(punchInTime, attendanceDate, shiftStartTime, gracePeriodMinutes, dailySalary, shiftHours);
        }
        
        // Calculate early fine if punch-out exists (session-aware for Half Day)
        let earlyFine = { earlyMinutes: 0, fineAmount: 0 };
        if (punchOutTime) {
            if (isHalfDay && (session === '1' || session === '2')) {
                const { calculateHalfDayEarlyFine } = require('../utils/leaveAttendanceHelper');
                earlyFine = calculateHalfDayEarlyFine(punchOutTime, attendanceDate, session, dailySalary, shiftHours, dbShiftStartTime, dbShiftEndTime);
            } else {
                earlyFine = calculateEarlyFine(punchOutTime, attendanceDate, shiftEndTime, dailySalary, shiftHours);
            }
        }
        
        // Combine fines
        const fineHours = lateFine.lateMinutes + earlyFine.earlyMinutes; // Total in minutes
        const fineAmount = lateFine.fineAmount + earlyFine.fineAmount;
        
        return {
            lateMinutes: lateFine.lateMinutes,
            earlyMinutes: earlyFine.earlyMinutes,
            fineHours: fineHours,
            fineAmount: fineAmount
        };
    } catch (error) {
        console.error('[Fine Calculation Error]', error);
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
    // Create Date object for start/end of day in UTC to ensure MongoDB ISODate format
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const day = now.getUTCDate();
    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

    try {
        // Re-fetch staff with populated branch and template
        const staff = await Staff.findById(staffId).populate('branchId').populate('attendanceTemplateId');
        const template = normalizeTemplate(staff.attendanceTemplateId);

        // PRIORITY 1: Check if On Approved Leave (highest priority - blocks all other rules)
        const Leave = require('../models/Leave');
        const { canCheckInWithHalfDayLeave } = require('../utils/leaveAttendanceHelper');
        const activeLeave = await Leave.findOne({
            employeeId: staffId,
            status: { $regex: /^approved$/i },
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay }
        });
        if (activeLeave) {
            if (activeLeave.leaveType === 'Half Day') {
                const checkInResult = canCheckInWithHalfDayLeave(activeLeave, now);
                if (!checkInResult.allowed) {
                    return res.status(403).json({ message: checkInResult.message || 'Half-day leave approved. Check-in not allowed at this time.' });
                }
            } else {
                return res.status(403).json({ message: 'You are on leave today. Enjoy your leave.' });
            }
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
        // PRIORITY: Get shift timing from Company settings (matches shiftName if available, otherwise first shift)
        // Fallback to AttendanceTemplate if shift not found in Company settings
        let shiftTiming = null;
        if (company) {
            shiftTiming = getShiftFromCompanySettings(company, staff.shiftName || null);
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

        // Half Day: if record exists for today and day is Half Day (approved leave or status), update existing instead of blocking
        const isHalfDayLeave = activeLeave && String(activeLeave.leaveType || '').trim().toLowerCase() === 'half day';
        const isHalfDayStatus = existing && String(existing.status || '').trim().toLowerCase() === 'half day';
        const isHalfDayDay = isHalfDayLeave || isHalfDayStatus;

        if (existing && isHalfDayDay) {
            // Update existing Half Day record with punchIn (do not create new, do not return "Already checked in")
            let selfieUrl = null;
            if (selfie && template.requireSelfie !== false) {
                selfieUrl = await uploadToCloudinary(selfie);
            }
            const fineShiftStartTime = shiftTiming?.startTime || template.shiftStartTime || '09:30';
            const fineShiftEndTime = shiftTiming?.endTime || template.shiftEndTime || '18:30';
            const fineGracePeriod = shiftTiming?.gracePeriodMinutes ?? template.gracePeriodMinutes ?? 0;
            const fineTemplate = {
                ...template,
                shiftStartTime: fineShiftStartTime,
                shiftEndTime: fineShiftEndTime,
                gracePeriodMinutes: fineGracePeriod
            };
            let fineResult = { lateMinutes: 0, earlyMinutes: 0, fineHours: 0, fineAmount: 0 };
            if (lateMinutes > 0) {
                fineResult = await calculateCombinedFine(now, null, startOfDay, fineTemplate, staff, company, activeLeave);
            }
            existing.punchIn = now;
            
            // Update location using Mongoose set() method for nested paths to avoid validation issues
            // This ensures punchOut is not touched if it doesn't exist
            existing.set('location.latitude', userLat);
            existing.set('location.longitude', userLng);
            existing.set('location.address', address || '');
            existing.set('location.area', area || '');
            existing.set('location.city', city || '');
            existing.set('location.pincode', pincode || '');
            
            // Update punchIn nested object
            existing.set('location.punchIn.latitude', userLat);
            existing.set('location.punchIn.longitude', userLng);
            existing.set('location.punchIn.address', address || '');
            existing.set('location.punchIn.area', area || '');
            existing.set('location.punchIn.city', city || '');
            existing.set('location.punchIn.pincode', pincode || '');
            
            // punchOut is NOT set - Mongoose will preserve existing value or leave it undefined
            // This avoids the "Cast to Object failed" error
            
            existing.punchInSelfie = selfieUrl;
            existing.punchInIpAddress = req.ip || req.connection.remoteAddress;
            existing.ipAddress = req.ip || req.connection.remoteAddress;
            existing.lateMinutes = fineResult.lateMinutes;
            existing.earlyMinutes = fineResult.earlyMinutes ?? 0;
            existing.fineHours = fineResult.fineHours ?? 0;
            existing.fineAmount = fineResult.fineAmount ?? 0;
            existing.workHours = 0;
            await existing.save();
            const response = existing.toObject ? existing.toObject() : existing;
            if (warnings.length > 0) response.warnings = warnings;
            return res.status(200).json(response);
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
        
        // Create a fine template object with shift timings
        const fineTemplate = {
            ...template,
            shiftStartTime: fineShiftStartTime,
            shiftEndTime: fineShiftEndTime,
            gracePeriodMinutes: fineGracePeriod
        };
        
        let fineResult = { lateMinutes: 0, earlyMinutes: 0, fineHours: 0, fineAmount: 0 };
        if (lateMinutes > 0) {
            fineResult = await calculateCombinedFine(now, null, startOfDay, fineTemplate, staff, company, activeLeave);
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

    // Create Date object for start/end of day in UTC to ensure MongoDB ISODate format
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const day = now.getUTCDate();
    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

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

    // Half Day: allow updating punchOut even if already set (update existing record)
    const isHalfDayStatus = attendance && String(attendance.status || '').trim().toLowerCase() === 'half day';
    if (attendance.punchOut && !isHalfDayStatus) {
        return res.status(400).json({ message: 'Already checked out today' });
    }

    // PRIORITY 1: Check if On Approved Leave (highest priority - blocks all other rules)
    const Leave = require('../models/Leave');
    const { canCheckOutWithHalfDayLeave } = require('../utils/leaveAttendanceHelper');
    // Create Date object for start/end of day in UTC to ensure MongoDB ISODate format
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const day = now.getUTCDate();
    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
    const activeLeave = await Leave.findOne({
        employeeId: staff._id,
        status: { $regex: /^approved$/i },
        startDate: { $lte: endOfDay },
        endDate: { $gte: startOfDay }
    });
    if (activeLeave) {
        if (activeLeave.leaveType === 'Half Day') {
            const checkOutResult = canCheckOutWithHalfDayLeave(activeLeave, now);
            if (!checkOutResult.allowed) {
                return res.status(403).json({ message: checkOutResult.message || 'Half-day leave (Session 2). Check-out not allowed.' });
            }
        } else {
            return res.status(403).json({ message: 'Your leave request is approved for today. Enjoy your leave.' });
        }
    }

    // Check Early Exit - Always allow, but add warning if not allowed in settings
    // PRIORITY: Get shift timing from Company settings (matches shiftName if available, otherwise first shift)
    // Fallback to AttendanceTemplate if shift not found in Company settings
    const Company = require('../models/Company');
    const company = await Company.findById(staff.businessId);
    let shiftTiming = null;
    if (company) {
        shiftTiming = getShiftFromCompanySettings(company, staff.shiftName || null);
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
                message: `You are ${earlyMinutes} minute(s) early. Shift end time: ${shiftEndStr}`,
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
    
    // For Half Day: use session-aware fine calculation
    // If activeLeave exists, use it; otherwise construct from attendance if status is Half Day
    let leaveForFine = activeLeave;
    if (!leaveForFine && isHalfDayStatus && attendance.session) {
        leaveForFine = {
            leaveType: 'Half Day',
            session: attendance.session,
            status: 'Approved'
        };
    }
    
    const fineResult = await calculateCombinedFine(
        attendance.punchIn,
        now,
        attendance.date,
        fineTemplate,
        staff,
        company,
        leaveForFine
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
                // components: YYYY, MM-1, DD - create UTC date
                queryDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
            } else {
                queryDate = new Date(req.query.date);
            }
        }

        // Create Date object for start/end of day in UTC to ensure MongoDB ISODate format
        const year = queryDate.getUTCFullYear();
        const month = queryDate.getUTCMonth();
        const day = queryDate.getUTCDate();
        const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

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
            status: { $regex: /^approved$/i },
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay }
        });
        
        const now = new Date();
        const isToday = queryDate.getFullYear() === now.getFullYear() &&
            queryDate.getMonth() === now.getMonth() &&
            queryDate.getDate() === now.getDate();

        const { isCurrentlyInLeaveSession, getLeaveMessageForUI, canCheckInWithHalfDayLeave, canCheckOutWithHalfDayLeave, getHalfDaySessionMessage } = require('../utils/leaveAttendanceHelper');

        // If approved leave exists, it overrides any existing attendance status
        if (activeLeave) {
            const leaveStatus = activeLeave.leaveType === 'Half Day' ? 'Half Day' : 'On Leave';
            if (attendance) {
                attendance.status = leaveStatus;
            } else {
                attendance = {
                    status: leaveStatus,
                    date: startOfDay,
                    employeeId: req.staff._id
                };
            }
        }

        // Session-based: isOnLeave = true only when full-day leave OR half-day and current time inside leave session
        const isOnLeave = activeLeave
            ? (activeLeave.leaveType !== 'Half Day' ? true : (isToday ? isCurrentlyInLeaveSession(activeLeave, now) : true))
            : (attendance && attendance.status === 'On Leave');
        const leaveMessage = activeLeave && isToday ? getLeaveMessageForUI(activeLeave, now) : null;

        // Half-day leave: session-based check-in/check-out allowed flags (for today only)
        let halfDayLeave = null;
        let checkInAllowed = true;
        let checkOutAllowed = true;
        if (activeLeave && activeLeave.leaveType === 'Half Day') {
            halfDayLeave = {
                session: activeLeave.session || null,
                message: getHalfDaySessionMessage(activeLeave.session)
            };
            if (isToday) {
                const checkInResult = canCheckInWithHalfDayLeave(activeLeave, now);
                const checkOutResult = canCheckOutWithHalfDayLeave(activeLeave, now);
                checkInAllowed = checkInResult.allowed;
                checkOutAllowed = checkOutResult.allowed;
            }
        } else if (activeLeave && isToday) {
            checkInAllowed = false;
            checkOutAllowed = false;
        }

        const finalTemplate = staff?.attendanceTemplateId ? normalizeTemplate(staff.attendanceTemplateId) : {};
        
        // Merge shift timings from company settings into template
        const { getShiftTimings } = require('../utils/leaveAttendanceHelper');
        const dbShiftTimings = getShiftTimings(company, staff);
        if (dbShiftTimings.startTime) {
            finalTemplate.shiftStartTime = dbShiftTimings.startTime;
        }
        if (dbShiftTimings.endTime) {
            finalTemplate.shiftEndTime = dbShiftTimings.endTime;
        }
        if (dbShiftTimings.gracePeriodMinutes !== undefined) {
            finalTemplate.gracePeriodMinutes = dbShiftTimings.gracePeriodMinutes;
        }
        
        let holidayInfo = null;
        let isWeeklyOff = false;
        const HolidayTemplate = require('../models/HolidayTemplate');
        const holidayTemplate = await HolidayTemplate.findOne({ businessId: req.staff.businessId, isActive: true });
        if (holidayTemplate && holidayTemplate.holidays && holidayTemplate.holidays.length > 0) {
            const dayMatch = holidayTemplate.holidays.find(h => {
                const d = new Date(h.date);
                return d.getFullYear() === queryDate.getFullYear() && d.getMonth() === queryDate.getMonth() && d.getDate() === queryDate.getDate();
            });
            if (dayMatch) holidayInfo = dayMatch;
        }
        const businessSettings = company?.settings?.business || {};
        const weeklyOffPattern = businessSettings.weeklyOffPattern || 'standard';
        const weeklyHolidays = businessSettings.weeklyHolidays || [{ day: 0, name: 'Sunday' }];
        const dayOfWeek = queryDate.getDay();
        if (weeklyOffPattern === 'oddEvenSaturday') {
            if (dayOfWeek === 0) isWeeklyOff = true;
            else if (dayOfWeek === 6 && queryDate.getDate() % 2 === 0) isWeeklyOff = true;
        } else {
            isWeeklyOff = weeklyHolidays.some(h => h.day === dayOfWeek);
        }

        res.json({
            data: attendance,
            branch: branchInfo,
            template: finalTemplate,
            isOnLeave: isOnLeave,
            leaveMessage: leaveMessage || (isOnLeave ? 'Your leave request is approved. Enjoy your leave.' : null),
            leaveInfo: activeLeave,
            halfDayLeave,
            checkInAllowed,
            checkOutAllowed,
            isHoliday: !!holidayInfo,
            holidayInfo: holidayInfo,
            isWeeklyOff: isWeeklyOff
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Helper: enrich attendance record with half-day leave details from Leaves collection
const enrichWithLeaveDetails = async (attendanceList, staffId) => {
    const Leave = require('../models/Leave');
    const enriched = [];
    for (const doc of attendanceList) {
        const plain = doc.toObject ? doc.toObject() : { ...doc };
        const isHalfDay = (plain.status === 'Half Day' || (plain.leaveType && String(plain.leaveType).toLowerCase() === 'half day'));
        if (isHalfDay && plain.date) {
            const attDate = new Date(plain.date);
            // Create Date object for start/end of day in UTC to ensure MongoDB ISODate format
            const year = attDate.getUTCFullYear();
            const month = attDate.getUTCMonth();
            const day = attDate.getUTCDate();
            const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
            const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
            const leave = await Leave.findOne({
                employeeId: plain.employeeId || staffId,
                leaveType: 'Half Day',
                status: { $regex: /^approved$/i },
                startDate: { $lte: endOfDay },
                endDate: { $gte: startOfDay }
            }).populate('approvedBy', 'name email').lean();
            if (leave) {
                plain.leaveDetails = {
                    session: leave.session || null,
                    leaveType: leave.leaveType,
                    startDate: leave.startDate,
                    endDate: leave.endDate,
                    status: leave.status,
                    reason: leave.reason,
                    approvedAt: leave.approvedAt || null,
                    approvedBy: leave.approvedBy ? { name: leave.approvedBy.name || null, email: leave.approvedBy.email || null } : null
                };
            }
        }
        enriched.push(plain);
    }
    return enriched;
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
        const data = await enrichWithLeaveDetails(attendance, req.staff._id);

        res.json({
            data,
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
        const attendanceRaw = await Attendance.find({
            $or: [
                { employeeId: req.staff._id },
                { user: req.staff._id }
            ],
            date: { $gte: startOfMonth, $lte: endOfMonth }
        }).sort({ date: 1 });

        const attendance = await enrichWithLeaveDetails(attendanceRaw, req.staff._id);

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

        // Fetch leaves for the month
        const Leave = require('../models/Leave');
        const leaves = await Leave.find({
            employeeId: req.staff._id,
            status: { $regex: /^approved$/i },
            $or: [
                { startDate: { $gte: startOfMonth, $lte: endOfMonth } },
                { endDate: { $gte: startOfMonth, $lte: endOfMonth } },
                { startDate: { $lte: startOfMonth }, endDate: { $gte: endOfMonth } }
            ]
        });

        const leaveDateSet = new Set();
        leaves.forEach(leave => {
            let curr = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            while (curr <= end) {
                if (curr >= startOfMonth && curr <= endOfMonth) {
                    leaveDateSet.add(formatDateString(curr));
                }
                curr.setDate(curr.getDate() + 1);
            }
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
        const leaveDates = Array.from(leaveDateSet);

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

            // PRIORITY 1: Check if it's a leave day (Approved leave overrides everything)
            if (leaveDateSet.has(dateStr)) {
                // If there's an attendance record, we might want to override its status in the response
                // But leaveDates is already being populated and returned.
                // We should ensure this date is NOT in presentDates or absentDates.
                continue;
            }

            // Check if attendance exists - attendance takes precedence over week off/holiday (but not over leave)
            if (attendanceDateSet.has(dateStr)) {
                // Find the attendance record to get status
                const attRecord = attendance.find(a => {
                    const attDateStr = formatDateString(a.date);
                    return attDateStr === dateStr;
                });
                // Only treat as present when status is Present or Approved (not Pending, Absent, Rejected)
                if (attRecord) {
                    const status = (attRecord.status || '').trim().toLowerCase();
                    if (status === 'present' || status === 'approved') {
                        presentDates.push(dateStr);
                    }
                }
                // If attendance exists, skip further checks (attendance overrides week off/holiday)
                continue;
            }

            // Check if it's a holiday (only if no attendance and not on leave)
            const isHoliday = holidayDateSet.has(dateStr);
            if (isHoliday) {
                holidayDates.push(dateStr);
                continue;
            }

            // Check if it's a week off (only if no attendance, holiday or leave)
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
                weekOffDates: filteredWeekOffDates,
                absentDates,
                presentDates,
                holidayDates,
                leaveDates,
                settings: {
                    weeklyOffPattern,
                    weeklyHolidays
                },
                stats: {
                    workingDays,
                    holidaysCount,
                    weekOffs,
                    presentDays: (() => {
                        const leaveRecords = leaves.filter(l => l.isHalfDay === true || (l.leaveType || '').trim().toLowerCase() === 'half day');
                        const leaveDateSetHalf = new Set();
                        leaveRecords.forEach(leave => {
                            let curr = new Date(leave.startDate);
                            const end = new Date(leave.endDate);
                            while (curr <= end) {
                                if (curr >= startOfMonth && curr <= endOfMonth) {
                                    leaveDateSetHalf.add(formatDateString(curr));
                                }
                                curr.setDate(curr.getDate() + 1);
                            }
                        });

                        const dateMap = {};
                        attendance.forEach(a => {
                            const d = formatDateString(a.date);
                            const status = (a.status || '').trim().toLowerCase();
                            const leaveType = (a.leaveType || '').trim().toLowerCase();
                            dateMap[d] = { attendanceStatus: status, attendanceLeaveType: leaveType };
                        });
                        leaveDateSetHalf.forEach(d => {
                            if (!dateMap[d]) dateMap[d] = {};
                            dateMap[d].hasHalfDayLeave = true;
                        });

                        return Object.values(dateMap).reduce((sum, data) => {
                            const status = data.attendanceStatus || '';
                            const attLeaveType = data.attendanceLeaveType || '';
                            const isHalfDay = status === 'half day' || attLeaveType === 'half day' || data.hasHalfDayLeave === true;
                            if (isHalfDay) return sum + 0.5;
                            if (status === 'present' || status === 'approved') return sum + 1;
                            return sum;
                        }, 0);
                    })(),
                    absentDays: Math.max(0, workingDays - (() => {
                        const leaveRecords = leaves.filter(l => l.isHalfDay === true || (l.leaveType || '').trim().toLowerCase() === 'half day');
                        const leaveDateSetHalf = new Set();
                        leaveRecords.forEach(leave => {
                            let curr = new Date(leave.startDate);
                            const end = new Date(leave.endDate);
                            while (curr <= end) {
                                if (curr >= startOfMonth && curr <= endOfMonth) {
                                    leaveDateSetHalf.add(formatDateString(curr));
                                }
                                curr.setDate(curr.getDate() + 1);
                            }
                        });

                        const dateMap = {};
                        attendance.forEach(a => {
                            const d = formatDateString(a.date);
                            const status = (a.status || '').trim().toLowerCase();
                            const leaveType = (a.leaveType || '').trim().toLowerCase();
                            dateMap[d] = { attendanceStatus: status, attendanceLeaveType: leaveType };
                        });
                        leaveDateSetHalf.forEach(d => {
                            if (!dateMap[d]) dateMap[d] = {};
                            dateMap[d].hasHalfDayLeave = true;
                        });

                        return Object.values(dateMap).reduce((sum, data) => {
                            const status = data.attendanceStatus || '';
                            const attLeaveType = data.attendanceLeaveType || '';
                            const isHalfDay = status === 'half day' || attLeaveType === 'half day' || data.hasHalfDayLeave === true;
                            if (isHalfDay) return sum + 0.5;
                            if (status === 'present' || status === 'approved') return sum + 1;
                            return sum;
                        }, 0);
                    })())
                }
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { checkIn, checkOut, getTodayAttendance, getAttendanceHistory, getMonthAttendance };
