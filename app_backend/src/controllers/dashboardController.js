const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Staff = require('../models/Staff');
const Loan = require('../models/Loan');
const Payroll = require('../models/Payroll');

const Company = require('../models/Company');
const HolidayTemplate = require('../models/HolidayTemplate');

// @desc    Get Dashboard Stats for generic use (kept for compatibility)
const getDashboardStats = async (req, res) => {
    try {
        const staffId = req.staff?._id || req.user?._id;
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

        const todayAttendance = await Attendance.findOne({
            $or: [{ employeeId: staffId }, { user: staffId }],
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        const pendingLeaves = await Leave.countDocuments({
            employeeId: staffId,
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
                name: req.user.name || req.staff?.name || 'User',
                role: req.user.role || 'Employee'
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Employee Dashboard Stats
// @route   GET /api/dashboard/employee
const getEmployeeDashboardStats = async (req, res) => {
    try {
        if (!req.staff) {
            return res.status(404).json({ success: false, message: 'Staff record not found' });
        }

        const staffId = req.staff._id;
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 1-12

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        // 1. Staff Info
        const staff = await Staff.findById(staffId).select('name employeeId designation department joiningDate businessId holidayTemplateId');

        // 2. Attendance Metrics
        const attendanceToday = await Attendance.findOne({
            $or: [{ employeeId: staffId }, { user: staffId }],
            date: { $gte: startOfToday, $lte: endOfToday }
        });

        const monthAttendance = await Attendance.find({
            $or: [{ employeeId: staffId }, { user: staffId }],
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        // Calculate Present Days
        const presentDays = monthAttendance.filter(a =>
            ['Present', 'Approved', 'Half Day', 'Pending'].includes(a.status)
        ).length;

        // Fetch Business settings for week-offs
        const company = await Company.findById(staff.businessId);
        const businessSettings = company?.settings?.business || {};
        const weeklyOffPattern = businessSettings.weeklyOffPattern || 'standard';
        const weeklyHolidays = businessSettings.weeklyHolidays || [{ day: 0, name: 'Sunday' }];

        // Fetch holidays
        const holidayTemplate = await HolidayTemplate.findOne({
            businessId: staff.businessId,
            isActive: true
        });

        let holidays = [];
        if (holidayTemplate) {
            holidays = (holidayTemplate.holidays || []).filter(h => {
                const d = new Date(h.date);
                return d.getFullYear() == year && (d.getMonth() + 1) == month;
            });
        }

        // Calculate Working Days in Month since JoiningDate up to today
        let totalWorkingDays = 0;
        const joiningDate = staff.joiningDate ? new Date(staff.joiningDate) : null;
        if (joiningDate) {
            joiningDate.setHours(0, 0, 0, 0); // Normalize to midnight local time
        }

        const lastDayToCount = now.getDate(); // Stop at today for the current month

        for (let d = 1; d <= lastDayToCount; d++) {
            const date = new Date(year, month - 1, d);
            date.setHours(0, 0, 0, 0); // Normalize to midnight local time

            // Check if day is on or after joining date
            if (joiningDate && date < joiningDate) {
                continue; // Skip days before joining
            }

            const dayOfWeek = date.getDay();
            let isWeekOff = false;

            if (weeklyOffPattern === 'oddEvenSaturday') {
                if (dayOfWeek === 0) {
                    isWeekOff = true;
                } else if (dayOfWeek === 6) {
                    if (d % 2 === 0) {
                        isWeekOff = true;
                    }
                }
            } else {
                isWeekOff = weeklyHolidays.some(h => h.day === dayOfWeek);
            }

            if (!isWeekOff) {
                const isHoliday = holidays.some(h => {
                    const hd = new Date(h.date);
                    return hd.getDate() === d;
                });

                if (!isHoliday) {
                    totalWorkingDays++;
                }
            }
        }

        // 3. Leave Metrics
        const pendingLeavesCount = await Leave.countDocuments({
            employeeId: staffId,
            status: 'Pending'
        });

        const approvedLeavesThisMonth = await Leave.countDocuments({
            employeeId: staffId,
            status: 'Approved',
            startDate: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const recentLeaves = await Leave.find({ employeeId: staffId })
            .sort({ createdAt: -1 })
            .limit(5);

        // 4. Loan Metrics
        const pendingLoans = await Loan.countDocuments({
            employeeId: staffId,
            status: 'Pending'
        });

        const activeLoans = await Loan.countDocuments({
            employeeId: staffId,
            status: 'Active'
        });

        // 5. Payroll info
        const payroll = await Payroll.findOne({
            employeeId: staffId,
            month: now.getMonth() + 1,
            year: now.getFullYear()
        });

        res.json({
            success: true,
            data: {
                staff: staff ? {
                    name: staff.name,
                    employeeId: staff.employeeId,
                    designation: staff.designation,
                    department: staff.department
                } : null,
                stats: {
                    pendingLeaves: pendingLeavesCount,
                    approvedLeavesThisMonth: approvedLeavesThisMonth,
                    pendingLoans: pendingLoans,
                    activeLoans: activeLoans,
                    attendanceToday: attendanceToday ? {
                        status: attendanceToday.status,
                        punchIn: attendanceToday.punchIn,
                        punchOut: attendanceToday.punchOut
                    } : null,
                    attendanceSummary: {
                        totalDays: totalWorkingDays,
                        presentDays: presentDays,
                        absentDays: Math.max(0, totalWorkingDays - presentDays)
                    },
                    currentMonthSalary: payroll ? (payroll.netSalary || 0) : 0,
                    payrollStatus: payroll ? (payroll.status || 'Pending') : 'Pending'
                },
                recentLeaves: recentLeaves,
                upcomingTasks: []
            }
        });

    } catch (error) {
        console.error('[Dashboard Controller Error]', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = { getDashboardStats, getEmployeeDashboardStats };