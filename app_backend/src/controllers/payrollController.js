const Payroll = require('../models/Payroll');
const Staff = require('../models/Staff');
const Attendance = require('../models/Attendance');
const mongoose = require('mongoose');

// @desc    Get Payrolls (Payslips)
// @route   GET /api/payrolls
// @access  Private
const getPayrolls = async (req, res) => {
    try {
        const { month, year, status, search, page = 1, limit = 10 } = req.query;
        const query = {};

        // Scope to current employee if logged in as staff
        if (req.staff) {
            query.employeeId = req.staff._id;
        } else if (req.user && req.user.role === 'Employee') {
            const staff = await Staff.findOne({ userId: req.user._id });
            if (staff) query.employeeId = staff._id;
            else return res.json({ success: true, data: { payrolls: [], pagination: { page, limit, total: 0, pages: 0 } } });
        }

        // Filters
        if (month) query.month = Number(month);
        if (year) query.year = Number(year);
        if (status && status !== 'all') query.status = status;

        const skip = (Number(page) - 1) * Number(limit);

        const payrolls = await Payroll.find(query)
            .populate('employeeId', 'name employeeId designation department')
            .sort({ year: -1, month: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Payroll.countDocuments(query);

        res.json({
            success: true,
            data: {
                payrolls,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            }
        });

    } catch (error) {
        console.error('getPayrolls Error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

// @desc    Get Payroll By ID
// @route   GET /api/payrolls/:id
// @access  Private
const getPayrollById = async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id)
            .populate('employeeId', 'name employeeId designation department');

        if (!payroll) {
            return res.status(404).json({ success: false, error: { message: 'Payroll not found' } });
        }

        // Security check: ensure staff can only see their own
        if (req.staff && payroll.employeeId && payroll.employeeId._id.toString() !== req.staff._id.toString()) {
            return res.status(403).json({ success: false, error: { message: 'Not authorized to view this payslip' } });
        }

        res.json({
            success: true,
            data: { payroll }
        });
    } catch (error) {
        console.error('getPayrollById Error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

// @desc    Get Payroll Stats (For Dashboard/Overview)
// @route   GET /api/payrolls/stats
// @access  Private
const getPayrollStats = async (req, res) => {
    try {
        const { month, year } = req.query;
        const currentMonth = month ? Number(month) : new Date().getMonth() + 1;
        const currentYear = year ? Number(year) : new Date().getFullYear();

        let staffId;
        if (req.staff) {
            staffId = req.staff._id;
        } else if (req.user && req.user.role === 'Employee') {
            const staff = await Staff.findOne({ userId: req.user._id });
            if (staff) staffId = staff._id;
        }

        if (!staffId) {
            return res.status(400).json({ success: false, error: { message: 'Staff context required' } });
        }

        // 1. Try to find existing payroll
        const payroll = await Payroll.findOne({
            employeeId: staffId,
            month: currentMonth,
            year: currentYear
        });

        if (payroll) {
            // If exists, return processed stats
            // Need to fetch basic attendance counts if not in payroll (Payroll model doesn't store day counts usually, but let's see)
            // We'll calculate attendance stats on the fly even if payroll exists to show "Working Days" etc.

            const attendanceStats = await calculateAttendanceStats(staffId, currentMonth, currentYear);

            return res.json({
                success: true,
                data: {
                    month: currentMonth,
                    year: currentYear,
                    isProcessed: true,
                    stats: {
                        grossSalary: payroll.grossSalary,
                        netSalary: payroll.netPay,
                        deductions: payroll.deductions,
                        attendance: attendanceStats,
                        earnings: payroll.components.filter(c => c.type === 'earning'),
                        deductionComponents: payroll.components.filter(c => c.type === 'deduction'),
                        ctc: (payroll.grossSalary * 12) // Estimating CTC
                    }
                }
            });
        }

        // 2. If no payroll, calculate estimated (Pro-rata)
        const staff = await Staff.findById(staffId);
        if (!staff || !staff.salary) {
            return res.json({
                success: true,
                data: {
                    month: currentMonth,
                    year: currentYear,
                    isProcessed: false,
                    message: "Salary details not found",
                    stats: null
                }
            });
        }

        const attendanceStats = await calculateAttendanceStats(staffId, currentMonth, currentYear);
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

        // Simple Pro-rata Calculation
        // Assuming Basic + Allowances = Fixed Monthly Gross
        const s = staff.salary;
        const fixedMonthlyGross = (s.basicSalary || 0) + (s.dearnessAllowance || 0) + (s.houseRentAllowance || 0) + (s.specialAllowance || 0) + (s.mobileAllowance || 0);

        // This Month Gross (Pro-rated based on present days?)
        // If 22 working days and 4 present:
        // Let's assume Paid Days = Present + Paid Leaves + Holidays + Weekends
        // For now, simpler: Pro-rated = (FixedGross / DaysInMonth) * (Present + Holidays + Weekends)
        // Or if strictly attendance based:

        // We'll return the Fixed Monthly Gross as "Monthly Gross"
        // And a pro-rated value as "This Month Gross"

        // Mocking deductions
        const epf = (s.employerPFRate || 12) / 100 * (s.basicSalary || 0);
        const esi = (s.employerESIRate || 0.75) / 100 * fixedMonthlyGross;
        const totalDeductions = epf + esi;

        res.json({
            success: true,
            data: {
                month: currentMonth,
                year: currentYear,
                isProcessed: false,
                stats: {
                    grossSalary: fixedMonthlyGross,
                    netSalary: fixedMonthlyGross - totalDeductions,
                    deductions: totalDeductions,
                    attendance: attendanceStats,
                    earnings: [
                        { name: 'Basic Salary', amount: s.basicSalary || 0 },
                        { name: 'DA', amount: s.dearnessAllowance || 0 },
                        { name: 'HRA', amount: s.houseRentAllowance || 0 },
                        { name: 'Special Allowance', amount: s.specialAllowance || 0 }
                    ],
                    deductionComponents: [
                        { name: 'PF', amount: epf },
                        { name: 'ESI', amount: esi }
                    ],
                    ctc: fixedMonthlyGross * 12 // Simplified
                }
            }
        });

    } catch (error) {
        console.error('getPayrollStats Error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

const calculateAttendanceStats = async (employeeId, month, year) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const attendanceRecords = await Attendance.find({
        employeeId: employeeId,
        date: { $gte: startDate, $lte: endDate }
    });

    // Count days
    // This is a simplified calculation. Real-world needs holiday calendar etc.
    const daysInMonth = endDate.getDate();
    let weekends = 0;
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const day = date.getDay();
        if (day === 0 || day === 6) weekends++; // Sat/Sun
    }

    // Mocking Holidays count (should come from Holiday model)
    const holidays = 0;
    const workingDays = daysInMonth - weekends - holidays;

    const presentDays = attendanceRecords.filter(a => a.status === 'Present' || a.status === 'Half Day').length;
    const absentDays = workingDays - presentDays; // Simplified

    return {
        workingDays,
        presentDays,
        absentDays,
        holidays,
        attendancePercentage: (presentDays / workingDays) * 100
    };
};

const createPayroll = async (req, res) => {
    // Basic implementation
    res.status(501).json({ message: 'Not implemented yet' });
};

const exportPayroll = async (req, res) => {
    res.json({ success: true, message: "Export functionality" });
};

const generatePayroll = async (req, res) => {
    res.json({ success: true, message: "Generate functionality" });
};

const bulkGeneratePayroll = async (req, res) => {
    res.json({ success: true, message: "Bulk Generate functionality" });
};

const generatePayslip = async (req, res) => {
    res.json({ success: true, message: "Generate Payslip functionality" });
};

const markPayrollAsPaid = async (req, res) => {
    res.json({ success: true, message: "Mark Paid functionality" });
};

const updatePayroll = async (req, res) => {
    res.json({ success: true, message: "Update functionality" });
};

const processPayroll = async (req, res) => {
    res.json({ success: true, message: "Process functionality" });
};

module.exports = {
    getPayrolls,
    getPayrollById,
    getPayrollStats,
    createPayroll,
    exportPayroll,
    generatePayroll,
    bulkGeneratePayroll,
    generatePayslip,
    markPayrollAsPaid,
    updatePayroll,
    processPayroll
};
