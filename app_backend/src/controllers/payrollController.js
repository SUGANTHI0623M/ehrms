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
            const attendanceStats = await calculateAttendanceStats(staffId, currentMonth, currentYear);
            
            // CORRECT METHOD: Calculate prorated values based on attendance
            const workingDays = attendanceStats.workingDays || 0;
            const presentDays = attendanceStats.presentDays || 0;
            const prorationFactor = workingDays > 0 ? presentDays / workingDays : 1;
            
            // Get fine amount from attendance records
            const Attendance = require('../models/Attendance');
            const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
            const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
            const attendanceRecords = await Attendance.find({
                $or: [
                    { employeeId: staffId },
                    { user: staffId }
                ],
                date: { $gte: startOfMonth, $lte: endOfMonth }
            });
            const totalFineAmount = attendanceRecords.reduce((sum, record) => {
                return sum + (record.fineAmount || 0);
            }, 0);
            
            // Get staff salary structure for correct proration
            let thisMonthGross = 0;
            let thisMonthNet = 0;
            
            const staffForProration = await Staff.findById(staffId);
            if (staffForProration && staffForProration.salary) {
                const s = staffForProration.salary;
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
                thisMonthGross = proratedGrossFixed + proratedEmployerPF + proratedEmployerESI;
                
                // STEP 4: Recalculate Employee Deductions on PRORATED gross
                const proratedEmployeePF = (s.employeePFRate || 0) / 100 * proratedBasicSalary;
                const proratedEmployeeESI = (s.employeeESIRate || 0) / 100 * thisMonthGross;
                const proratedDeductions = proratedEmployeePF + proratedEmployeeESI;
                
                // STEP 5: Calculate Prorated Net Salary (fines are NOT prorated)
                thisMonthNet = thisMonthGross - proratedDeductions - totalFineAmount;
            } else {
                // Fallback to simple proration if salary structure not available
                thisMonthGross = payroll.grossSalary * prorationFactor;
                thisMonthNet = (payroll.netPay * prorationFactor) - totalFineAmount;
            }

            // Calculate CTC from payroll components if available, otherwise estimate
            const earnings = payroll.components.filter(c => c.type === 'earning');
            const annualGrossSalary = payroll.grossSalary * 12;
            
            // Try to calculate benefits from staff salary if available
            let annualBenefits = 0;
            if (staffForProration && staffForProration.salary) {
                const s = staffForProration.salary;
                const basicSalary = s.basicSalary || 0;
                const annualGratuity = (s.gratuityRate || 0) / 100 * (basicSalary * 12);
                const annualStatutoryBonus = (s.statutoryBonusRate || 0) / 100 * (basicSalary * 12);
                const medicalInsuranceAmount = s.medicalInsuranceAmount || 0;
                annualBenefits = annualGratuity + annualStatutoryBonus + medicalInsuranceAmount;
            }
            
            const totalCTC = annualGrossSalary + annualBenefits;

            return res.json({
                success: true,
                data: {
                    month: currentMonth,
                    year: currentYear,
                    isProcessed: true,
                    stats: {
                        grossSalary: payroll.grossSalary,
                        netSalary: payroll.netPay,
                        thisMonthGross: thisMonthGross,
                        thisMonthNet: thisMonthNet,
                        deductions: payroll.deductions,
                        attendance: attendanceStats,
                        earnings: earnings,
                        deductionComponents: [
                            ...payroll.components.filter(c => c.type === 'deduction'),
                            ...(totalFineAmount > 0 ? [{ name: 'Late Login Fine', amount: totalFineAmount }] : [])
                        ],
                        ctc: totalCTC,
                        annualGrossSalary: annualGrossSalary,
                        annualBenefits: annualBenefits
                    }
                }
            });
        }

        // 2. If no payroll, calculate estimated (Pro-rata)
        const staff = await Staff.findById(staffId).select('+salary');
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

        // Calculate salary structure
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
        
        // CORRECT METHOD: Calculate prorated values based on attendance
        const workingDays = attendanceStats.workingDays || 0;
        const presentDays = attendanceStats.presentDays || 0;
        const prorationFactor = workingDays > 0 ? presentDays / workingDays : 0;
        
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
        const thisMonthGross = proratedGrossFixed + proratedEmployerPF + proratedEmployerESI;
        
        // Get fine amount from attendance records
        const Attendance = require('../models/Attendance');
        const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
        const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
        const attendanceRecords = await Attendance.find({
            $or: [
                { employeeId: staffId },
                { user: staffId }
            ],
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });
        const totalFineAmount = attendanceRecords.reduce((sum, record) => {
            return sum + (record.fineAmount || 0);
        }, 0);
        
        // STEP 4: Recalculate Employee Deductions on PRORATED gross
        const proratedEmployeePF = (s.employeePFRate || 0) / 100 * proratedBasicSalary;
        const proratedEmployeeESI = (s.employeeESIRate || 0) / 100 * thisMonthGross;
        const proratedDeductions = proratedEmployeePF + proratedEmployeeESI;
        
        // STEP 5: Calculate Prorated Net Salary (fines are NOT prorated)
        const thisMonthNet = thisMonthGross - proratedDeductions - totalFineAmount;
        
        // Calculate Annual Benefits for CTC
        const annualGrossSalary = grossSalary * 12;
        const annualGratuity = (s.gratuityRate || 0) / 100 * (basicSalary * 12);
        const annualStatutoryBonus = (s.statutoryBonusRate || 0) / 100 * (basicSalary * 12);
        const medicalInsuranceAmount = s.medicalInsuranceAmount || 0;
        const totalAnnualBenefits = annualGratuity + annualStatutoryBonus + medicalInsuranceAmount;
        
        // Annual Incentive
        const annualIncentive = (s.incentiveRate || 0) / 100 * annualGrossSalary;
        
        // Mobile Allowance (Annual)
        const mobileAllowance = s.mobileAllowance || 0;
        const annualMobileAllowance = s.mobileAllowanceType === 'yearly' ? mobileAllowance : (mobileAllowance * 12);
        
        // Total CTC = Annual Gross + Incentive + Benefits + Allowances
        const totalCTC = annualGrossSalary + annualIncentive + totalAnnualBenefits + annualMobileAllowance;

        res.json({
            success: true,
            data: {
                month: currentMonth,
                year: currentYear,
                isProcessed: false,
                stats: {
                    grossSalary: grossSalary,
                    netSalary: netSalary,
                    thisMonthGross: thisMonthGross,
                    thisMonthNet: thisMonthNet,
                    deductions: totalDeductions,
                    attendance: attendanceStats,
                    earnings: [
                        { name: 'Basic Salary', amount: basicSalary },
                        { name: 'DA', amount: dearnessAllowance },
                        { name: 'HRA', amount: houseRentAllowance },
                        { name: 'Employer PF', amount: employerPF },
                        { name: 'Employer ESI', amount: employerESI }
                    ],
                    deductionComponents: [
                        { name: 'Employee PF', amount: employeePF },
                        { name: 'Employee ESI', amount: employeeESI },
                        ...(totalFineAmount > 0 ? [{ name: 'Late Login Fine', amount: totalFineAmount }] : [])
                    ],
                    ctc: totalCTC,
                    annualGrossSalary: annualGrossSalary,
                    annualBenefits: totalAnnualBenefits
                }
            }
        });

    } catch (error) {
        console.error('getPayrollStats Error:', error);
        console.error('getPayrollStats Error Stack:', error.stack);
        res.status(500).json({ success: false, error: { message: error.message || 'Internal server error' } });
    }
};

const calculateAttendanceStats = async (employeeId, month, year) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const attendanceRecords = await Attendance.find({
        $or: [
            { employeeId: employeeId },
            { user: employeeId }
        ],
        date: { $gte: startDate, $lte: endDate }
    });

    const staff = await Staff.findById(employeeId).populate('branchId');
    
    // Get business settings for weekly off pattern (same logic as dashboard)
    let weeklyOffPattern = 'standard'; // default
    let weeklyHolidays = [{ day: 0, name: 'Sunday' }]; // Default: Sunday only (same as dashboard)
    
    // Use same logic as dashboard: get from businessId directly
    if (staff && staff.businessId) {
        const Company = require('../models/Company');
        const business = await Company.findById(staff.businessId);
        if (business && business.settings && business.settings.business) {
            weeklyOffPattern = business.settings.business.weeklyOffPattern || 'standard';
            // Dashboard uses: weeklyHolidays = businessSettings.weeklyHolidays || [{ day: 0, name: 'Sunday' }]
            // Keep as array of objects (same as dashboard) - don't map to just numbers
            weeklyHolidays = business.settings.business.weeklyHolidays || [{ day: 0, name: 'Sunday' }];
        }
    }
    
    console.log(`[calculateAttendanceStats] Weekly Off Pattern: ${weeklyOffPattern}`);
    console.log(`[calculateAttendanceStats] Weekly Holidays: ${JSON.stringify(weeklyHolidays)}`);
    
    // Get holiday dates for the month - store as day numbers (1-31) for comparison
    // Use same date parsing logic as dashboard (local time, not UTC)
    const holidayDayNumbers = new Set();
    if (staff && staff.businessId) {
        const holidayTemplate = await require('../models/HolidayTemplate').findOne({
            businessId: staff.businessId,
            isActive: true
        });
        
        if (holidayTemplate && holidayTemplate.holidays) {
            holidayTemplate.holidays.forEach(h => {
                // Handle date properly - use same logic as dashboard
                const d = new Date(h.date);
                const holidayYear = d.getFullYear();
                const holidayMonth = d.getMonth() + 1; // getMonth returns 0-11
                const holidayDay = d.getDate();
                
                // Compare with the requested month/year (same as dashboard logic)
                if (holidayMonth === month && holidayYear === year) {
                    holidayDayNumbers.add(holidayDay); // Store day number (1-31)
                    console.log(`[calculateAttendanceStats] Found holiday: Day ${holidayDay}, Month ${holidayMonth}, Year ${holidayYear}`);
                }
            });
        }
    }
    
    // Count days in month
    const daysInMonth = endDate.getDate();
    let weeklyOffDays = 0; // Days that are weekly off (not holidays)
    let holidays = 0;
    
    // Count weekly off days and holidays in the month
    // Formula: Working days = Total days - Weekly Off Days - Holidays
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const isHoliday = holidayDayNumbers.has(day);
        
        if (isHoliday) {
            // Count as holiday (even if it falls on weekly off day)
            holidays++;
            console.log(`[calculateAttendanceStats] Day ${day} is a holiday (Day of week: ${dayOfWeek})`);
        } else {
            // Check if this day is a weekly off day
            let isWeeklyOff = false;
            
            if (weeklyOffPattern === 'oddEvenSaturday') {
                // oddEvenSaturday pattern: Don't check weeklyHolidays
                // Odd Saturdays (1st, 3rd, 5th, etc.) are WORKING DAYS
                // Even Saturdays (2nd, 4th, 6th, etc.) are WEEKLY OFF
                // All Sundays are WEEKLY OFF
                if (dayOfWeek === 0) {
                    // Sunday - always weekly off
                    isWeeklyOff = true;
                } else if (dayOfWeek === 6) {
                    // Saturday - check if even (weekly off) or odd (working)
                    if (day % 2 === 0) {
                        // Even Saturday - weekly off
                        isWeeklyOff = true;
                        console.log(`[calculateAttendanceStats] Day ${day} is Even Saturday (weekly off)`);
                    } else {
                        // Odd Saturday - working day
                        console.log(`[calculateAttendanceStats] Day ${day} is Odd Saturday (working day)`);
                    }
                }
            } else {
                // Standard pattern: Check weeklyHolidays array (same logic as dashboard)
                // dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday
                // Dashboard uses: isWeekOff = weeklyHolidays.some(h => h.day === dayOfWeek)
                // Keep same logic - weeklyHolidays is array of objects with 'day' property
                if (weeklyHolidays.some(h => h.day === dayOfWeek)) {
                    isWeeklyOff = true;
                }
            }
            
            if (isWeeklyOff) {
                weeklyOffDays++;
            }
        }
    }
    
    // Working days = Total days - Weekly Off Days - Holidays
    // Same calculation as dashboard, but for full month (not just up to today)
    // Example for standard pattern: 31 - 9 (weekly off: Sat, Sun, Mon) - 3 (holidays) = 19
    // Example for oddEvenSaturday: 31 - 6 (even Saturdays + all Sundays) - 3 (holidays) = 22
    const workingDays = daysInMonth - weeklyOffDays - holidays;
    
    // Debug logging
    console.log(`[calculateAttendanceStats] ========== CALCULATION DEBUG ==========`);
    console.log(`[calculateAttendanceStats] Month: ${month}, Year: ${year}`);
    console.log(`[calculateAttendanceStats] Weekly Off Pattern: ${weeklyOffPattern}`);
    console.log(`[calculateAttendanceStats] Weekly Holidays (days of week): ${weeklyHolidays.map(h => h.day).join(', ')}`);
    console.log(`[calculateAttendanceStats] Total days in month: ${daysInMonth}`);
    console.log(`[calculateAttendanceStats] Weekly Off Days (non-holiday): ${weeklyOffDays}`);
    console.log(`[calculateAttendanceStats] Holidays: ${holidays}`);
    console.log(`[calculateAttendanceStats] Holiday day numbers: ${Array.from(holidayDayNumbers).sort((a, b) => a - b).join(', ')}`);
    console.log(`[calculateAttendanceStats] Working days calculation: ${daysInMonth} - ${weeklyOffDays} - ${holidays} = ${workingDays}`);
    console.log(`[calculateAttendanceStats] ======================================`);

    // Calculate Present Days - Include 'Pending' status (same as dashboard)
    const presentDays = attendanceRecords.filter(a => {
        const status = a.status;
        return status === 'Present' || status === 'Approved' || status === 'Half Day' || status === 'Pending';
    }).length;
    
    console.log(`[calculateAttendanceStats] Attendance Records Found: ${attendanceRecords.length}`);
    console.log(`[calculateAttendanceStats] Status breakdown:`, {
        Present: attendanceRecords.filter(a => a.status === 'Present').length,
        Approved: attendanceRecords.filter(a => a.status === 'Approved').length,
        'Half Day': attendanceRecords.filter(a => a.status === 'Half Day').length,
        Pending: attendanceRecords.filter(a => a.status === 'Pending').length,
        Other: attendanceRecords.filter(a => !['Present', 'Approved', 'Half Day', 'Pending'].includes(a.status)).length
    });
    
    // Absent days = Working days - Present days
    const absentDays = Math.max(0, workingDays - presentDays);

    const result = {
        workingDays,
        presentDays,
        absentDays,
        holidays,
        attendancePercentage: workingDays > 0 ? (presentDays / workingDays) * 100 : 0
    };
    
    // Additional debug logging
    console.log(`[calculateAttendanceStats] RETURNING: ${JSON.stringify(result)}`);
    
    return result;
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
    processPayroll,
    calculateAttendanceStats
};
