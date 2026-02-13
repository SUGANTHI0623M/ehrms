//dashboard logics
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Staff = require('../models/Staff');
const Loan = require('../models/Loan');
const Payroll = require('../models/Payroll');
const Company = require('../models/Company');
const HolidayTemplate = require('../models/HolidayTemplate');
const { calculateAttendanceStats } = require('./payrollController');

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
        console.log(`[getEmployeeDashboardStats] API called for staff: ${req.staff?._id}`);
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
        const staff = await Staff.findById(staffId).select('name employeeId designation department joiningDate businessId holidayTemplateId salary');

        // 2. Attendance Metrics
        const attendanceToday = await Attendance.findOne({
            $or: [{ employeeId: staffId }, { user: staffId }],
            date: { $gte: startOfToday, $lte: endOfToday }
        });

        const monthAttendance = await Attendance.find({
            $or: [{ employeeId: staffId }, { user: staffId }],
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        // Use same attendance stats as payslip and salary overview (single source of truth)
        const attendanceStats = await calculateAttendanceStats(staffId, month, year);
        const totalWorkingDays = attendanceStats.workingDays || 0;
        const thisMonthWorkingDays = attendanceStats.workingDaysFullMonth ?? totalWorkingDays;
        const presentDays = attendanceStats.presentDays || 0;
        const absentDays = attendanceStats.absentDays ?? Math.max(0, totalWorkingDays - presentDays);

        console.log(`[getEmployeeDashboardStats] attendanceStats (same as payslip/salary): thisMonthWD=${thisMonthWorkingDays}, workingDaysTillToday=${totalWorkingDays}, presentDays=${presentDays}, absentDays=${absentDays}`);

        // 3. Leave Metrics
        const pendingLeavesCount = await Leave.countDocuments({
            employeeId: staffId,
            status: { $regex: /^pending$/i }
        });

        const approvedLeavesThisMonth = await Leave.countDocuments({
            employeeId: staffId,
            status: { $regex: /^approved$/i },
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

        const activeLoansList = await Loan.find({
            employeeId: staffId,
            status: 'Active'
        }).select('loanType amount purpose emi remainingAmount startDate endDate createdAt').sort({ createdAt: -1 });

        const activeLoans = activeLoansList.length;

        // 5. Payroll info - Use same calculation logic as salary module (till present)
        const payroll = await Payroll.findOne({
            employeeId: staffId,
            month: now.getMonth() + 1,
            year: now.getFullYear()
        });

        console.log(`[getEmployeeDashboardStats] payroll exists: ${!!payroll}, staff.salary exists: ${!!(staff?.salary)}`);
        if (staff?.salary) {
            console.log(`[getEmployeeDashboardStats] staff.salary.basicSalary: ${staff.salary.basicSalary}`);
        }

        // Fine amount from Present, Approved, or Half Day (late login fine applies to half day too)
        const totalFineAmount = monthAttendance
            .filter(r => {
                const s = (r.status || '').trim().toLowerCase();
                const lt = (r.leaveType || '').trim().toLowerCase();
                return s === 'present' || s === 'approved' || s === 'half day' || lt === 'half day';
            })
            .reduce((sum, record) => sum + (record.fineAmount || 0), 0);

        let currentMonthSalary = 0;
        let payrollStatus = 'Pending';

        // Use the same calculation logic as salary overview & payroll: proration = presentDays / this month WD (1 day salary = net/this month WD)
        if (payroll) {
            const prorationFactor = thisMonthWorkingDays > 0 ? presentDays / thisMonthWorkingDays : 1;
            
            // Get staff salary structure for correct proration
            if (staff && staff.salary) {
                const s = staff.salary;
                const basicSalary = s.basicSalary || 0;
                const dearnessAllowance = s.dearnessAllowance || 0;
                const houseRentAllowance = s.houseRentAllowance || 0;
                const specialAllowance = s.specialAllowance || 0;
                
                // STEP 1: Prorate Gross Fixed Components
                const proratedBasicSalary = basicSalary * prorationFactor;
                const proratedDA = dearnessAllowance * prorationFactor;
                const proratedHRA = houseRentAllowance * prorationFactor;
                const proratedSpecialAllowance = specialAllowance * prorationFactor;
                const proratedGrossFixed = proratedBasicSalary + proratedDA + proratedHRA + proratedSpecialAllowance;
                
                // STEP 2: Recalculate Employer Contributions on PRORATED amounts
                const proratedEmployerPF = (s.employerPFRate || 0) / 100 * proratedBasicSalary;
                const proratedEmployerESI = (s.employerESIRate || 0) / 100 * proratedGrossFixed;
                
                // STEP 3: Calculate Prorated Gross Salary
                const proratedGrossSalary = proratedGrossFixed + proratedEmployerPF + proratedEmployerESI;
                
                // STEP 4: Recalculate Employee Deductions on PRORATED gross
                const proratedEmployeePF = (s.employeePFRate || 0) / 100 * proratedBasicSalary;
                const proratedEmployeeESI = (s.employeeESIRate || 0) / 100 * proratedGrossSalary;
                const proratedDeductions = proratedEmployeePF + proratedEmployeeESI;
                
                // STEP 5: Calculate Prorated Net Salary (fines are NOT prorated)
                currentMonthSalary = proratedGrossSalary - proratedDeductions - totalFineAmount;
            } else {
                // Fallback to simple proration if salary structure not available
                currentMonthSalary = payroll.netPay ? (payroll.netPay * prorationFactor) - totalFineAmount : 0;
            }
            payrollStatus = payroll.status || 'Pending';
        } else if (staff && staff.salary) {
            // Calculate estimated prorated salary using same logic as payrollController
            const s = staff.salary;
            const basicSalary = s.basicSalary || 0;
            const dearnessAllowance = s.dearnessAllowance || 0;
            const houseRentAllowance = s.houseRentAllowance || 0;
            const specialAllowance = s.specialAllowance || 0;
            
            // Gross Fixed Salary (Before Employer Contributions)
            const grossFixedSalary = basicSalary + dearnessAllowance + houseRentAllowance + specialAllowance;
            
            // Employer Contributions (Part of Gross Salary & CTC)
            const employerPF = (s.employerPFRate || 0) / 100 * basicSalary;
            const employerESI = (s.employerESIRate || 0) / 100 * grossFixedSalary;
            
            // Gross Salary (Monthly) = Fixed Gross + Employer Contributions
            const grossSalary = grossFixedSalary + employerPF + employerESI;
            
            // Employee Deductions (NOT part of CTC)
            const employeePF = (s.employeePFRate || 0) / 100 * basicSalary;
            const employeeESI = (s.employeeESIRate || 0) / 100 * grossSalary;
            const totalDeductions = employeePF + employeeESI;
            
            // Net Salary = Gross Salary - Employee Deductions
            const netSalary = grossSalary - totalDeductions;
            
            // Same as salary overview: proration = presentDays / this month working days
            const prorationFactor = thisMonthWorkingDays > 0 ? presentDays / thisMonthWorkingDays : 0;
            
            // STEP 1: Prorate Gross Fixed Components
            const proratedBasicSalary = basicSalary * prorationFactor;
            const proratedDA = dearnessAllowance * prorationFactor;
            const proratedHRA = houseRentAllowance * prorationFactor;
            const proratedSpecialAllowance = specialAllowance * prorationFactor;
            const proratedGrossFixed = proratedBasicSalary + proratedDA + proratedHRA + proratedSpecialAllowance;
            
            // STEP 2: Recalculate Employer Contributions on PRORATED amounts
            const proratedEmployerPF = (s.employerPFRate || 0) / 100 * proratedBasicSalary;
            const proratedEmployerESI = (s.employerESIRate || 0) / 100 * proratedGrossFixed;
            
            // STEP 3: Calculate Prorated Gross Salary
            const proratedGrossSalary = proratedGrossFixed + proratedEmployerPF + proratedEmployerESI;
            
            // STEP 4: Recalculate Employee Deductions on PRORATED gross
            const proratedEmployeePF = (s.employeePFRate || 0) / 100 * proratedBasicSalary;
            const proratedEmployeeESI = (s.employeeESIRate || 0) / 100 * proratedGrossSalary;
            const proratedDeductions = proratedEmployeePF + proratedEmployeeESI;
            
            // STEP 5: Calculate Prorated Net Salary (fines are NOT prorated)
            currentMonthSalary = proratedGrossSalary - proratedDeductions - totalFineAmount;
        }

        const prorationFactor = thisMonthWorkingDays > 0 ? presentDays / thisMonthWorkingDays : 0;
        console.log(`[getEmployeeDashboardStats] prorationFactor: ${prorationFactor} (presentDays=${presentDays} / thisMonthWD=${thisMonthWorkingDays}, same as salary overview)`);
        console.log(`[getEmployeeDashboardStats] currentMonthSalary: ${currentMonthSalary}`);
        console.log(`[getEmployeeDashboardStats] ========================================`);

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
                    activeLoansList: activeLoansList,
                    attendanceToday: attendanceToday ? {
                        status: attendanceToday.status,
                        punchIn: attendanceToday.punchIn,
                        punchOut: attendanceToday.punchOut
                    } : null,
                    attendanceSummary: {
                        totalDays: totalWorkingDays,
                        thisMonthWorkingDays: thisMonthWorkingDays,
                        presentDays: presentDays,
                        absentDays: absentDays,
                        halfDayPaidLeaveCount: attendanceStats.halfDayPaidLeaveCount ?? 0,
                        leaveDays: attendanceStats.leaveDays ?? 0
                    },
                    currentMonthSalary: currentMonthSalary,
                    payrollStatus: payrollStatus
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