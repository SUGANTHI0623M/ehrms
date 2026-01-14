// Backend/src/controllers/dashboardController.js
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');

// @desc    Get Dashboard Stats
// @route   GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user._id;
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        // 1. Check today's attendance
        const todayAttendance = await Attendance.findOne({
            employeeId: userId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        // 2. Check pending leaves
        const pendingLeaves = await Leave.countDocuments({
            employeeId: userId,
            status: 'Pending'
        });

        res.json({
            attendance: todayAttendance ? {
                status: todayAttendance.status,
                punchIn: todayAttendance.punchIn,
                punchOut: todayAttendance.punchOut,
                workHours: todayAttendance.workHours
            } : null,
            leaves: {
                pending: pendingLeaves
            },
            user: {
                name: req.user.name,
                role: req.user.role
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { getDashboardStats };