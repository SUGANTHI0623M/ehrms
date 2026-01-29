
//dashboard logics
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

        // Calculate Present Days - Only count days with status 'Present'
        const presentDays = monthAttendance.filter(a =>
            a.status === 'Present'
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

        // Calculate fine amount from attendance records
        const totalFineAmount = monthAttendance.reduce((sum, record) => {
            return sum + (record.fineAmount || 0);
        }, 0);

        let currentMonthSalary = 0;
        let payrollStatus = 'Pending';

        // Use the same calculation logic from payrollController
        // Note: We use totalWorkingDays and presentDays calculated above (till today, not full month)
        if (payroll) {
            // CORRECT METHOD: If payroll exists, recalculate using correct proration method
            const prorationFactor = totalWorkingDays > 0 ? presentDays / totalWorkingDays : 1;
            
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
            
            // CORRECT METHOD: Calculate prorated values based on attendance till present
            // Use totalWorkingDays and presentDays calculated above (till today)
            const prorationFactor = totalWorkingDays > 0 ? presentDays / totalWorkingDays : 0;
            
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
                        presentDays: presentDays,
                        absentDays: Math.max(0, totalWorkingDays - presentDays)
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