const Attendance = require('../models/Attendance');
const Staff = require('../models/Staff');
const User = require('../models/User'); // Import if needed
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
    return deg * (Math.PI / 180)
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

    if (!latitude || !longitude) {
        return res.status(400).json({ message: 'Location is required' });
    }

    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);

    // Date Logic: Store as Date object set to midnight (start of day) - UTC safe approach
    const now = new Date();
    // Create Date object for start/end of day based on current time
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    try {
        // Re-fetch staff to get populate branchId (req.staff might not have it populated)
        // Also ensure businessId is available
        const staff = await Staff.findById(staffId).populate('branchId');

        console.log(`[CheckIn] Processing for Staff: ${staff.name} (${staff._id})`);

        // Geofence Logic
        let activeBranch = null;
        let officeLat, officeLng, officeName, allowedRadiusMeters;
        let isGeofenceEnabled = false;

        if (staff.branchId) {
            activeBranch = staff.branchId;
            officeName = activeBranch.branchName || "Assigned Branch";

            // Handle various Geofence structures
            if (activeBranch.geofence && activeBranch.geofence.enabled === true) {
                isGeofenceEnabled = true;
                officeLat = activeBranch.geofence.latitude;
                officeLng = activeBranch.geofence.longitude;
                allowedRadiusMeters = activeBranch.geofence.radius || 100;
            } else if (activeBranch.latitude && activeBranch.longitude) {
                // Legacy fallback
                isGeofenceEnabled = true; // Assume enabled if coordinates exist in legacy field? Maybe check 'status'
                officeLat = activeBranch.latitude;
                officeLng = activeBranch.longitude;
                allowedRadiusMeters = activeBranch.radius || 100;
            }

            // Fallbacks for missing deep properties
            if (!officeLat && activeBranch.latitude) officeLat = activeBranch.latitude;
            if (!officeLng && activeBranch.longitude) officeLng = activeBranch.longitude;
            if (!allowedRadiusMeters) allowedRadiusMeters = activeBranch.radius || 100;
        }

        // Validate Geofence
        if (isGeofenceEnabled) {
            if (!officeLat || !officeLng) {
                console.warn(`[CheckIn Warning] Geofence enabled for ${officeName} but coordinates missing.`);
                // return res.status(400).json({ message: ... }); // Decide whether to block or allow with warning
            } else {
                const distance = getDistanceFromLatLonInKm(userLat, userLng, officeLat, officeLng);
                const distanceInMeters = distance * 1000;
                console.log(`[CheckIn] Distance Check: ${distanceInMeters.toFixed(1)}m / ${allowedRadiusMeters}m`);

                if (distanceInMeters > allowedRadiusMeters) {
                    return res.status(400).json({
                        message: `Check-in denied. You are ${distanceInMeters.toFixed(0)}m away from ${officeName}. Allowed: ${allowedRadiusMeters}m.`
                    });
                }
            }
        }

        // Check for existing attendance
        const existing = await Attendance.findOne({
            employeeId: staffId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        if (existing) {
            return res.status(400).json({ message: 'Already checked in today' });
        }

        // Status Logic
        let status = 'Pending';
        // Check role - if Employee, set Pending? Or keep Present?
        // Let's stick to "Present" for now unless USER asks for "Pending" flow specifically to avoid confusion.
        // req.user has populated roleId or role string
        // If strict: if (req.user.role === 'Employee') status = 'Pending';

        // Upload Selfie
        let selfieUrl = null;
        if (selfie) {
            selfieUrl = await uploadToCloudinary(selfie);
        }

        // Create Attendance utilizing new Schema
        const locationData = {
            latitude: userLat,
            longitude: userLng,
            address: address || '',
            area: area || '',
            city: city || '',
            pincode: pincode || '',
            punchIn: { // Also save to nested punchIn for data retrievability
                latitude: userLat,
                longitude: userLng,
                address: address || '',
                area: area || '',
                city: city || '',
                pincode: pincode || ''
            }
        };

        const attendance = await Attendance.create({
            employeeId: staffId,
            user: staffId, // Populate legacy field
            businessId: staff.businessId, // Ensure this ID is valid Object ID
            date: startOfDay,
            punchIn: now,
            status: status,
            location: locationData,
            punchInSelfie: selfieUrl,
            ipAddress: req.ip || req.connection.remoteAddress,
            punchInIpAddress: req.ip || req.connection.remoteAddress
        });

        res.status(201).json(attendance);

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
        const staff = await Staff.findById(staffId).populate('branchId');

        // Find today's attendance (Using employeeId)
        const attendance = await Attendance.findOne({
            employeeId: staffId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        if (!attendance) {
            // Fallback check using 'user' field in case it was created by old logic today
            const legacyAttendance = await Attendance.findOne({
                user: staffId,
                date: { $gte: startOfDay, $lte: endOfDay }
            });

            if (!legacyAttendance) {
                return res.status(404).json({ message: 'No check-in record found for today' });
            }
            // Use legacy record
            // But first, let's fix it?
            // legacyAttendance.employeeId = staffId; ...
            // For now just operate on it
            return processCheckOut(legacyAttendance, req, res, staff, now, { latitude, longitude, address, area, city, pincode, selfie });
        }

        return processCheckOut(attendance, req, res, staff, now, { latitude, longitude, address, area, city, pincode, selfie });

    } catch (error) {
        console.error('[CheckOut Error]', error);
        res.status(500).json({ message: error.message });
    }
};

async function processCheckOut(attendance, req, res, staff, now, data) {
    const { latitude, longitude, address, area, city, pincode, selfie } = data;

    if (attendance.punchOut) {
        return res.status(400).json({ message: 'Already checked out today' });
    }

    // Geofencing Check
    if (staff.branchId && latitude && longitude) {
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
    if (selfie) {
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
        // Update root location fields to latest known? Usually CheckIn is "Main" location, but let's just update punchOut obj
    }

    // Calculate Work Hours
    if (attendance.punchIn) {
        const durationMs = now - new Date(attendance.punchIn);
        const hours = durationMs / (1000 * 60 * 60);
        attendance.workHours = parseFloat(hours.toFixed(2));
    }

    await attendance.save();

    res.json(attendance);
}

// @desc    Get Today's Attendance
// @route   GET /api/attendance/today
// @access  Private
const getTodayAttendance = async (req, res) => {
    try {
        if (!req.staff) return res.status(404).json({ message: 'Staff not found' });

        let queryDate = new Date();
        if (req.query.date) {
            queryDate = new Date(req.query.date);
        }

        const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 23, 59, 59, 999);

        // Try find by employeeId
        let attendance = await Attendance.findOne({
            employeeId: req.staff._id,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        // Fallback to find by user ID
        if (!attendance) {
            attendance = await Attendance.findOne({
                user: req.staff._id,
                date: { $gte: startOfDay, $lte: endOfDay }
            });
        }

        // Branch Info
        const staff = await Staff.findById(req.staff._id).populate('branchId');
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

        res.json({ data: attendance, branch: branchInfo });
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
        const now = new Date();
        const isCurrentMonth = parseInt(year) === now.getFullYear() && parseInt(month) === (now.getMonth() + 1);
        const lastDayToCount = isCurrentMonth ? now.getDate() : totalDaysInMonth;

        // If future month
        const isFutureMonth = parseInt(year) > now.getFullYear() ||
            (parseInt(year) === now.getFullYear() && parseInt(month) > (now.getMonth() + 1));

        let workingDays = 0;
        let weekOffs = 0;
        let holidaysCount = 0;
        let weekOffDates = [];

        // Get joining date
        const joiningDate = req.staff.joiningDate ? new Date(req.staff.joiningDate) : null;
        if (joiningDate) {
            joiningDate.setHours(0, 0, 0, 0); // Normalize to start of day
        }

        // Loop for stats (only up to lastDayToCount)
        if (!isFutureMonth) {
            for (let d = 1; d <= lastDayToCount; d++) {
                const date = new Date(year, month - 1, d);
                date.setHours(0, 0, 0, 0);

                // Only count if day is on or after joining date
                if (joiningDate && date < joiningDate) {
                    continue;
                }

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
        }

        // Separate loop for weekOffDates (always for the full month to show in calendar)
        for (let d = 1; d <= totalDaysInMonth; d++) {
            const date = new Date(year, month - 1, d);
            const dayOfWeek = date.getDay();
            let isWeekOff = false;

            if (weeklyOffPattern === 'oddEvenSaturday') {
                if (dayOfWeek === 0) isWeekOff = true;
                else if (dayOfWeek === 6 && d % 2 === 0) isWeekOff = true;
            } else {
                isWeekOff = weeklyHolidays.some(h => h.day === dayOfWeek);
            }

            if (isWeekOff) {
                weekOffDates.push(date.toISOString().split('T')[0]);
            }
        }

        res.json({
            data: {
                attendance,
                holidays,
                weekOffDates,
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
