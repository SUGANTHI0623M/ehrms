const Attendance = require('../models/Attendance');

// @desc    Check In
// @route   POST /api/attendance/checkin
// @access  Private
const User = require('../models/User');

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// @desc    Check In
// @route   POST /api/attendance/checkin
// @access  Private
const checkIn = async (req, res) => {
    // console.log('CheckIn Request Body:', req.body); // Comment out to reduce clutter
    const { latitude, longitude, address, area, city, pincode, selfie } = req.body;

    if (!latitude || !longitude) {
        return res.status(400).json({ message: 'Location is required' });
    }

    // Server-side date generation
    const now = new Date();
    const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD

    try {
        const user = await User.findById(req.user._id);

        // Populate Branch
        await user.populate('branchId');

        let officeLat, officeLng, officeName;

        if (user.branchId && user.branchId.latitude && user.branchId.longitude) {
            officeLat = user.branchId.latitude;
            officeLng = user.branchId.longitude;
            officeName = user.branchId.name;
        } else if (user.officeLocation && user.officeLocation.latitude) {
            // Fallback to old User.officeLocation if Branch is not set
            officeLat = user.officeLocation.latitude;
            officeLng = user.officeLocation.longitude;
            officeName = "Assigned Office";
        } else {
            // First time setup - if neither exists, set User.officeLocation
            user.officeLocation = { latitude, longitude, address };
            await user.save();
            officeLat = latitude;
            officeLng = longitude;
        }

        if (officeLat && officeLng) {
            // Geofencing Check (300m = 0.3km)
            const distance = getDistanceFromLatLonInKm(
                latitude,
                longitude,
                officeLat,
                officeLng
            );

            if (distance > 0.3) {
                return res.status(400).json({
                    message: `You are ${(distance * 1000).toFixed(0)}m away from ${officeName || 'office'}. Must be within 300m.`
                });
            }
        }

        const existing = await Attendance.findOne({ user: req.user._id, date: dateString });
        if (existing) {
            return res.status(400).json({ message: 'Already checked in today' });
        }

        // Logic: Mark "Late" if after 9:30 AM (server time)
        // You can make this configurable per company/branch later
        let status = 'Present';
        const startOfWork = new Date(now);
        startOfWork.setHours(9, 30, 0, 0); // 9:30 AM

        if (now > startOfWork) status = 'Late Check-in';

        const attendancePayload = {
            user: req.user._id,
            employeeId: req.user._id, // Backwards compatibility for old unique index
            date: dateString,
            punchIn: now,
            location: {
                punchIn: {
                    latitude,
                    longitude,
                    address: address || '',
                    area: area || '',
                    city: city || '',
                    pincode: pincode || ''
                }
            },
            status,
            punchInSelfie: selfie // Save the selfie (Base64)
        };
        // Log payload excluding the long selfie string
        const logPayload = { ...attendancePayload, punchInSelfie: 'Base64 String...' };
        console.log('Creating Attendance [v2]:', logPayload);

        const attendance = await Attendance.create(attendancePayload);

        res.status(201).json(attendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message + ' (v2)' });
    }
};

// @desc    Check Out
// @route   PUT /api/attendance/checkout
// @access  Private
const checkOut = async (req, res) => {
    const { latitude, longitude, address, area, city, pincode, selfie } = req.body;
    const now = new Date();
    const dateString = now.toISOString().split('T')[0];

    try {
        const attendance = await Attendance.findOne({ user: req.user._id, date: dateString });

        if (!attendance) {
            return res.status(404).json({ message: 'No check-in record found for today' });
        }

        if (attendance.punchOut) {
            return res.status(400).json({ message: 'Already checked out today' });
        }

        attendance.punchOut = now;
        if (latitude && longitude) {
            attendance.location.punchOut = {
                latitude,
                longitude,
                address,
                area,
                city,
                pincode
            };
        }

        if (selfie) {
            attendance.punchOutSelfie = selfie;
        }

        // Calculate work hours
        const durationMs = now - new Date(attendance.punchIn);
        const hours = durationMs / (1000 * 60 * 60);
        attendance.workHours = parseFloat(hours.toFixed(2));

        // Logic: Late Check-out & Low Work Hours
        const endOfWork = new Date(now);
        endOfWork.setHours(18, 30, 0, 0); // 6:30 PM

        // If they leave AFTER 6:30 PM, it might be Overtime or just Late Checkout depending on policy. 
        // If they leave BEFORE, it's Early Checkout. 
        // Requirement said "Late Check out" - assuming this means staying late.
        if (now > endOfWork) {
            // Check if already marked Late Check-in
            if (attendance.status === 'Late Check-in') {
                attendance.status = 'Late Check-in & Late Check-out';
            } else {
                attendance.status = 'Late Check-out';
            }
        }

        // Logic: Working hours less than 5
        if (attendance.workHours < 5) {
            attendance.status = 'Low Work Hours'; // Overwrite status or append? 
            // Usually Low Work Hours is a critical status (often treated as half-day/absent).
        }

        await attendance.save();

        res.json(attendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Today's Attendance
// @route   GET /api/attendance/today
// @access  Private
const getTodayAttendance = async (req, res) => {
    let dateString;
    if (req.query.date) {
        dateString = req.query.date;
    } else {
        const now = new Date();
        dateString = now.toISOString().split('T')[0];
    }

    try {
        const attendance = await Attendance.findOne({ user: req.user._id, date: dateString });
        if (!attendance) {
            return res.status(200).json(null);
        }
        // Also return user branch info
        const user = await User.findById(req.user._id).populate('branchId');
        let branchInfo = null;
        if (user && user.branchId) {
            branchInfo = {
                name: user.branchId.name,
                address: user.branchId.address,
                latitude: user.branchId.latitude,
                longitude: user.branchId.longitude
            };
        }

        if (!attendance) {
            return res.status(200).json({ data: null, branch: branchInfo });
        }
        res.json({ data: attendance, branch: branchInfo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Attendance History with Pagination
// @route   GET /api/attendance/history
// @access  Private
const getAttendanceHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const date = req.query.date;

        let query = { user: req.user._id };
        if (date) {
            query.date = date;
        }

        const attendance = await Attendance.find(query)
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Attendance.countDocuments(query);

        res.json({
            data: attendance,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { checkIn, checkOut, getTodayAttendance, getAttendanceHistory };