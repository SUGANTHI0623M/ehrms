const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Staff = require('../models/Staff');
const Company = require('../models/Company');
const LeaveTemplate = require('../models/LeaveTemplate');

// Half-day leave session times (server time): Session 1 = 10:00 AM – 3:00 PM, Session 2 = 2:00 PM – 7:00 PM
const SESSION_1_START_HOUR = 10;
const SESSION_1_START_MINUTE = 0;
const SESSION_1_END_HOUR = 15; // 3:00 PM
const SESSION_1_END_MINUTE = 0;
const SESSION_2_START_HOUR = 14; // 2:00 PM
const SESSION_2_START_MINUTE = 0;
const SESSION_2_END_HOUR = 19; // 7:00 PM
const SESSION_2_END_MINUTE = 0;

/**
 * Get user-facing message for half-day session (for check-in/check-out block)
 */
const getHalfDaySessionMessage = (session) => {
    if (session === '1') return 'Half-day leave (Session 1: 10:00 AM – 3:00 PM)';
    if (session === '2') return 'Half-day leave (Session 2: 2:00 PM – 7:00 PM)';
    return 'Half-day leave';
};

/**
 * Check if current time falls within the leave session window.
 * Full-day leave: always in session (whole day).
 * Half-day Session 1: 10:00 AM – 3:00 PM; Session 2: 2:00 PM – 7:00 PM.
 * @param {Object} leave - Approved leave with leaveType and session
 * @param {Date} now - Current server time
 * @returns {boolean}
 */
const isCurrentlyInLeaveSession = (leave, now) => {
    if (!leave || !/^approved$/i.test(leave.status)) return false;
    if (leave.leaveType !== 'Half Day') return true; // Full-day: block entire day
    const session = leave.session;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    if (session === '1') {
        const start = SESSION_1_START_HOUR * 60 + SESSION_1_START_MINUTE; // 10:00 AM
        const end = SESSION_1_END_HOUR * 60 + SESSION_1_END_MINUTE; // 15:00 (3:00 PM)
        return currentMinutes >= start && currentMinutes < end;
    }
    if (session === '2') {
        const start = SESSION_2_START_HOUR * 60 + SESSION_2_START_MINUTE; // 14:00 (2:00 PM)
        const end = SESSION_2_END_HOUR * 60 + SESSION_2_END_MINUTE; // 19:00 (7:00 PM)
        return currentMinutes >= start && currentMinutes < end;
    }
    return false;
};

/**
 * Get leave message for UI: session-based for half-day, generic for full-day.
 * When half-day and outside session: "Check-in allowed".
 */
const getLeaveMessageForUI = (leave, now) => {
    if (!leave) return null;
    if (leave.leaveType === 'Half Day') {
        const inSession = isCurrentlyInLeaveSession(leave, now);
        const sessionMsg = getHalfDaySessionMessage(leave.session);
        return inSession ? sessionMsg : `${sessionMsg}. Check-in allowed.`;
    }
    return 'Your leave request is approved. Enjoy your leave.';
};

/**
 * Check if check-in is allowed given an approved Half Day leave and current server time.
 * Session 1 leave (10:00 AM - 3:00 PM): block check-in during Session 1, allow after 3:00 PM.
 * Session 2 leave (2:00 PM - 7:00 PM): allow check-in before 2:00 PM, block during Session 2.
 * @param {Object} leave - Approved leave with leaveType 'Half Day' and session '1' or '2'
 * @param {Date} now - Current server time
 * @returns {{ allowed: boolean, message?: string }}
 */
const canCheckInWithHalfDayLeave = (leave, now) => {
    if (!leave || leave.leaveType !== 'Half Day') return { allowed: true };
    const session = leave.session;
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentMinutes = hour * 60 + minute;
    if (session === '1') {
        // Session 1 leave: block during Session 1 (10:00 AM - 3:00 PM), allow after 3:00 PM
        const session1EndMinutes = SESSION_1_END_HOUR * 60 + SESSION_1_END_MINUTE; // 15:00 (3:00 PM)
        if (currentMinutes < session1EndMinutes) {
            return { allowed: false, message: getHalfDaySessionMessage('1') };
        }
        return { allowed: true };
    }
    if (session === '2') {
        // Session 2 leave: allow before Session 2 starts (before 2:00 PM), block during Session 2 (2:00 PM - 7:00 PM)
        const session2StartMinutes = SESSION_2_START_HOUR * 60 + SESSION_2_START_MINUTE; // 14:00 (2:00 PM)
        if (currentMinutes >= session2StartMinutes) {
            return { allowed: false, message: getHalfDaySessionMessage('2') };
        }
        return { allowed: true };
    }
    return { allowed: true };
};

/**
 * Check if check-out is allowed given an approved Half Day leave and current server time.
 *
 * IMPORTANT (Session 2 UX requirement):
 * - For Session 2 Half Day leave, checkout must NEVER be blocked. Employees can always check out
 *   once they have checked in, regardless of leave window.
 *
 * Session 1 leave: we still block check-out during Session 1 (10:00 AM - 3:00 PM) so that users
 * cannot mark checkout while they are on leave in the first half.
 *
 * @param {Object} leave - Approved leave with leaveType 'Half Day' and session '1' or '2'
 * @param {Date} now - Current server time
 * @returns {{ allowed: boolean, message?: string }}
 */
const canCheckOutWithHalfDayLeave = (leave, now) => {
    if (!leave || leave.leaveType !== 'Half Day') return { allowed: true };
    const session = (leave.session || '').trim();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentMinutes = hour * 60 + minute;

    if (session === '1') {
        // Session 1 leave: block check-out during Session 1 (10:00 AM - 3:00 PM)
        const session1StartMinutes = SESSION_1_START_HOUR * 60 + SESSION_1_START_MINUTE; // 10:00 AM
        const session1EndMinutes = SESSION_1_END_HOUR * 60 + SESSION_1_END_MINUTE; // 15:00 (3:00 PM)
        if (currentMinutes >= session1StartMinutes && currentMinutes < session1EndMinutes) {
            return { allowed: false, message: getHalfDaySessionMessage('1') };
        }
    }

    if (session === '2') {
        // Session 2 leave: NEVER block check-out (UX requirement)
        return { allowed: true };
    }

    return { allowed: true };
};

/**
 * Get shift timings from company settings
 * @param {Object} company - Company document
 * @param {Object} staff - Staff document (optional, for staff-specific shift)
 * @returns {Object} - { startTime, endTime, gracePeriodMinutes } in HH:mm format
 */
const getShiftTimings = (company, staff = null) => {
    // Default shift timings
    let startTime = '09:30';
    let endTime = '18:30';
    let gracePeriodMinutes = 0;

    // Check company settings for shifts
    if (company && company.settings && company.settings.attendance && company.settings.attendance.shifts) {
        const shifts = company.settings.attendance.shifts;
        if (Array.isArray(shifts) && shifts.length > 0) {
            // Use first shift as default (or match staff's shiftName if provided)
            const shift = staff && staff.shiftName
                ? shifts.find(s => s.name === staff.shiftName) || shifts[0]
                : shifts[0];
            
            if (shift.startTime) startTime = shift.startTime;
            if (shift.endTime) endTime = shift.endTime;
            
            // Extract grace time from shift.graceTime.value and shift.graceTime.unit
            if (shift.graceTime) {
                if (shift.graceTime.unit === 'hours') {
                    gracePeriodMinutes = (shift.graceTime.value || 0) * 60;
                } else {
                    gracePeriodMinutes = shift.graceTime.value || 0;
                }
            }
        }
    }

    return { startTime, endTime, gracePeriodMinutes };
};

/**
 * Calculate work hours from shift timings
 * @param {String} startTime - Shift start time in HH:mm format
 * @param {String} endTime - Shift end time in HH:mm format
 * @returns {Number} - Work hours (in hours, e.g., 8.5 for 8 hours 30 minutes)
 */
const calculateWorkHoursFromShift = (startTime, endTime) => {
    try {
        const [startHours, startMins] = startTime.split(':').map(Number);
        const [endHours, endMins] = endTime.split(':').map(Number);
        
        const startMinutes = startHours * 60 + startMins;
        const endMinutes = endHours * 60 + endMins;
        const diffMinutes = endMinutes - startMinutes;
        
        return diffMinutes / 60.0; // Convert to hours
    } catch (error) {
        console.error('[LeaveAttendanceHelper] Error calculating work hours:', error);
        return 8.0; // Default 8 hours
    }
};

/**
 * Mark attendance as "Present" for all dates covered by an approved leave
 * This is called when a leave is approved
 * Checks leaveTemplate to ensure leave is valid and within limits
 * @param {Object} leave - The approved leave document
 */
const markAttendanceForApprovedLeave = async (leave) => {
    try {
        if (!leave || !/^approved$/i.test(leave.status)) {
            return;
        }

        const { employeeId, startDate, endDate, businessId, leaveType, days } = leave;
        
        // Fetch staff with leaveTemplateId populated
        const staff = await Staff.findById(employeeId).populate('leaveTemplateId');
        if (!staff) {
            console.error(`[LeaveAttendanceHelper] Staff not found: ${employeeId}`);
            return;
        }

        // Check if staff has a leaveTemplateId
        if (!staff.leaveTemplateId) {
            console.log(`[LeaveAttendanceHelper] Staff ${employeeId} has no leaveTemplateId, skipping attendance marking`);
            return;
        }

        // Get leaveTemplate
        const leaveTemplate = await LeaveTemplate.findById(staff.leaveTemplateId);
        if (!leaveTemplate) {
            console.error(`[LeaveAttendanceHelper] LeaveTemplate not found: ${staff.leaveTemplateId}`);
            return;
        }

        const isHalfDay = (leaveType || '').trim().toLowerCase() === 'half day';
        let leaveConfig = null;

        if (!leaveTemplate.leaveTypes || !Array.isArray(leaveTemplate.leaveTypes)) {
            if (!isHalfDay) {
                console.log(`[LeaveAttendanceHelper] LeaveTemplate has no leaveTypes array`);
                return;
            }
        } else {
            leaveConfig = leaveTemplate.leaveTypes.find(
                t => t.type && t.type.toLowerCase() === leaveType.toLowerCase()
            );
            if (!leaveConfig && !isHalfDay) {
                console.log(`[LeaveAttendanceHelper] LeaveType "${leaveType}" not found in template`);
                return;
            }
        }

        // Check if user has already exceeded their leave limit (including pending leaves)
        const leaveDate = new Date(startDate);
        // Use the calculateAvailableLeaves function defined in this file
        const leaveInfo = await calculateAvailableLeaves(staff, leaveType, leaveDate);
        
        // Check if there are pending leaves that would exceed the limit
        // We need to check if current approved + pending leaves exceed the limit
        // Handle both "Casual" and "Casual Leave" formats
        const leaveTypeLower = leaveType.toLowerCase().trim();
        const isCasual = leaveTypeLower === 'casual' || leaveTypeLower.startsWith('casual');
        const targetYear = leaveDate.getFullYear();
        const targetMonth = leaveDate.getMonth();
        const rangeStart = isCasual
            ? new Date(targetYear, targetMonth, 1)
            : new Date(targetYear, 0, 1);
        const rangeEnd = isCasual
            ? new Date(targetYear, targetMonth + 1, 0, 23, 59, 59)
            : new Date(targetYear, 11, 31, 23, 59, 59);

        // Get all pending leaves of this type in the period
        const pendingLeaves = await Leave.find({
            employeeId: employeeId,
            _id: { $ne: leave._id }, // Exclude current leave
            leaveType: { $regex: new RegExp(`^${leaveType}$`, 'i') },
            status: 'Pending',
            $or: [
                { startDate: { $gte: rangeStart, $lte: rangeEnd } },
                { endDate: { $gte: rangeStart, $lte: rangeEnd } },
                { startDate: { $lte: rangeStart }, endDate: { $gte: rangeEnd } }
            ]
        });

        const pendingDays = pendingLeaves.reduce((sum, l) => sum + l.days, 0);
        
        // If total (used + current + pending) exceeds limit, don't mark as present (skip for Half Day if no limit)
        if (!isHalfDay && leaveInfo.totalAvailable !== null && (leaveInfo.used + days + pendingDays) > leaveInfo.totalAvailable) {
            console.log(`[LeaveAttendanceHelper] Leave limit would be exceeded. Used: ${leaveInfo.used}, Current: ${days}, Pending: ${pendingDays}, Total Available: ${leaveInfo.totalAvailable}`);
            return;
        }

        // Get company for shift timings
        const company = await Company.findById(businessId);
        const { startTime, endTime } = getShiftTimings(company, staff);
        const workHours = calculateWorkHoursFromShift(startTime, endTime);

        // Generate all dates between startDate and endDate (inclusive) using UTC calendar day
        const dates = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
        const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
        let currentUtc = startUtc;
        const oneDayMs = 24 * 60 * 60 * 1000;
        while (currentUtc <= endUtc) {
            dates.push(new Date(currentUtc));
            currentUtc += oneDayMs;
        }

        // Mark attendance for each calendar day; use local midnight so it matches check-in (attendance controller uses local date)
        for (const date of dates) {
            const y = date.getUTCFullYear(), m = date.getUTCMonth(), d = date.getUTCDate();
            const startOfDay = new Date(y, m, d, 0, 0, 0, 0);
            const endOfDay = new Date(y, m, d, 23, 59, 59, 999);

            // Create punch in/out times based on shift timings
            const [startHours, startMins] = startTime.split(':').map(Number);
            const [endHours, endMins] = endTime.split(':').map(Number);
            
            const punchIn = new Date(startOfDay.getTime() + (startHours * 60 + startMins) * 60 * 1000);
            const punchOut = new Date(startOfDay.getTime() + (endHours * 60 + endMins) * 60 * 1000);

            let attendance = await Attendance.findOne({
                employeeId: employeeId,
                date: { $gte: startOfDay, $lte: endOfDay }
            });

            const isHalfDayLeave = leave.leaveType === 'Half Day';
            const sessionRemarks = isHalfDayLeave
                ? (leave.session === '1' ? 'Half-day leave (Session 1) approved' : 'Half-day leave (Session 2) approved')
                : 'On Leave (approved)';

            if (attendance) {
                // Update existing attendance record
                attendance.status = isHalfDayLeave ? 'Half Day' : 'On Leave';
                attendance.leaveType = leave.leaveType;
                attendance.session = isHalfDayLeave ? (leave.session || null) : null;
                attendance.remarks = (attendance.remarks || '').trim() ? (attendance.remarks + ' ' + sessionRemarks) : sessionRemarks;
                // Full-day leave: no check-in/check-out
                if (!isHalfDayLeave) {
                    attendance.punchIn = undefined;
                    attendance.punchOut = undefined;
                    attendance.workHours = 0;
                }
                attendance.approvedBy = leave.approvedBy;
                attendance.approvedAt = leave.approvedAt || new Date();
                await attendance.save();
            } else {
                await Attendance.create({
                    employeeId: employeeId,
                    user: employeeId,
                    date: startOfDay,
                    status: isHalfDayLeave ? 'Half Day' : 'On Leave',
                    leaveType: leave.leaveType,
                    session: isHalfDayLeave ? (leave.session || null) : null,
                    approvedBy: leave.approvedBy,
                    approvedAt: leave.approvedAt || new Date(),
                    businessId: businessId,
                    workHours: isHalfDayLeave ? undefined : 0,
                    remarks: sessionRemarks
                });
            }
        }

        console.log(`[LeaveAttendanceHelper] Marked attendance as On Leave for ${dates.length} days for leave ${leave._id}`);
    } catch (error) {
        console.error('[LeaveAttendanceHelper] Error marking attendance for approved leave:', error);
        throw error;
    }
};

/**
 * Revert attendance for a deleted or cancelled leave
 * @param {Object} leave - The leave document
 */
const revertAttendanceForDeletedLeave = async (leave) => {
    try {
        if (!leave) return;

        const { employeeId, startDate, endDate } = leave;
        
        // Generate all dates between startDate and endDate (inclusive) using UTC calendar day
        const dates = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
        const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
        let currentUtc = startUtc;
        const oneDayMs = 24 * 60 * 60 * 1000;
        while (currentUtc <= endUtc) {
            dates.push(new Date(currentUtc));
            currentUtc += oneDayMs;
        }

        for (const date of dates) {
            const y = date.getUTCFullYear(), m = date.getUTCMonth(), d = date.getUTCDate();
            const startOfDay = new Date(y, m, d, 0, 0, 0, 0);
            const endOfDay = new Date(y, m, d, 23, 59, 59, 999);

            const attendance = await Attendance.findOne({
                employeeId: employeeId,
                date: { $gte: startOfDay, $lte: endOfDay }
            });

            if (attendance && (attendance.status === 'On Leave' || attendance.status === 'Half Day')) {
                if (!attendance.punchIn && !attendance.punchOut) {
                     await Attendance.deleteOne({ _id: attendance._id });
                } else {
                    attendance.status = 'Pending';
                    attendance.leaveType = undefined;
                    attendance.session = undefined;
                    attendance.approvedBy = undefined;
                    attendance.approvedAt = undefined;
                    attendance.remarks = (attendance.remarks || '')
                        .replace(/On Leave/i, '')
                        .replace(/\[Half Day - (Session [12]|[12])\]/i, '')
                        .replace(/Half Day - (Session [12]|[12])/i, '')
                        .replace(/Half-day leave \(Session [12]\) approved/gi, '')
                        .replace(/On Leave \(approved\)/gi, '')
                        .trim();
                    await attendance.save();
                }
            }
        }
        console.log(`[LeaveAttendanceHelper] Reverted attendance for ${dates.length} days for leave ${leave._id}`);
    } catch (error) {
        console.error('[LeaveAttendanceHelper] Error reverting attendance for deleted leave:', error);
    }
};

/**
 * Calculate available leaves considering carryForward logic
 * @param {Object} staff - Staff document with populated leaveTemplateId
 * @param {String} leaveType - Type of leave (e.g., 'Casual', 'Sick')
 * @param {Date} targetDate - Date for which to calculate available leaves (defaults to current month)
 * @returns {Object} - { baseLimit, carriedForward, totalAvailable, used, balance }
 */
const calculateAvailableLeaves = async (staff, leaveType, targetDate = new Date()) => {
    if (!staff || !staff.leaveTemplateId) {
        return { baseLimit: null, carriedForward: 0, totalAvailable: null, used: 0, balance: 999 };
    }

    const template = staff.leaveTemplateId;
    let baseLimit = null;
    let carryForward = false;

    // Find leave config from template
    if (template.leaveTypes && Array.isArray(template.leaveTypes)) {
        const leaveConfig = template.leaveTypes.find(
            t => t.type && t.type.toLowerCase() === leaveType.toLowerCase()
        );
        if (leaveConfig) {
            baseLimit = leaveConfig.days || leaveConfig.limit || null;
            carryForward = leaveConfig.carryForward === true;
        }
    }

    if (baseLimit === null) {
        return { baseLimit: null, carriedForward: 0, totalAvailable: null, used: 0, balance: 999 };
    }

        // Determine if this is a monthly (Casual) or yearly (Sick) leave
        // Handle both "Casual" and "Casual Leave" formats
        const leaveTypeLower = leaveType.toLowerCase().trim();
        const isCasual = leaveTypeLower === 'casual' || leaveTypeLower.startsWith('casual');
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();

    // Calculate range for current period
    const rangeStart = isCasual
        ? new Date(targetYear, targetMonth, 1)
        : new Date(targetYear, 0, 1);
    const rangeEnd = isCasual
        ? new Date(targetYear, targetMonth + 1, 0, 23, 59, 59)
        : new Date(targetYear, 11, 31, 23, 59, 59);

    // Build a flexible regex that handles:
    // 1. Case-insensitivity
    // 2. Optional "Leave" suffix
    // 3. Leading/trailing whitespace
    const normalizedType = (leaveType || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flexibleRegex = new RegExp(`^\\s*${normalizedType}(\\s+leave)?\\s*$`, 'i');
    
    // Get ALL relevant leaves in current period (Approved and Pending)
    const relevantLeaves = await Leave.find({
        employeeId: staff._id,
        leaveType: { $regex: flexibleRegex },
        status: { $regex: /^(approved|pending)$/i },
        $or: [
            { startDate: { $gte: rangeStart, $lte: rangeEnd } },
            { endDate: { $gte: rangeStart, $lte: rangeEnd } },
            { startDate: { $lte: rangeStart }, endDate: { $gte: rangeEnd } }
        ]
    });

    let approvedDays = 0;
    let pendingDays = 0;

    relevantLeaves.forEach(l => {
        const lStart = new Date(l.startDate);
        const lEnd = new Date(l.endDate);
        
        // Calculate overlap with target period
        const overlapStart = lStart > rangeStart ? lStart : rangeStart;
        const overlapEnd = lEnd < rangeEnd ? lEnd : rangeEnd;
        
        if (overlapEnd >= overlapStart) {
            // Normalize to midnight for accurate day counting
            const oStart = new Date(overlapStart.getFullYear(), overlapStart.getMonth(), overlapStart.getDate());
            const oEnd = new Date(overlapEnd.getFullYear(), overlapEnd.getMonth(), overlapEnd.getDate());
            const diffTime = Math.abs(oEnd - oStart);
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
            
            if (/^approved$/i.test(l.status)) {
                approvedDays += diffDays;
            } else if (/^pending$/i.test(l.status)) {
                pendingDays += diffDays;
            }
        }
    });

    const used = approvedDays;
    const pending = pendingDays;

    // Calculate carried forward leaves if carryForward is enabled
    let carriedForward = 0;
    if (carryForward) {
        // For monthly leaves (Casual), check previous month
        // For yearly leaves (Sick), check previous year
        if (isCasual) {
            // Previous month
            const prevMonth = targetMonth === 0 ? 11 : targetMonth - 1;
            const prevYear = targetMonth === 0 ? targetYear - 1 : targetYear;
            const prevRangeStart = new Date(prevYear, prevMonth, 1);
            const prevRangeEnd = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59);

            const prevMonthLeaves = await Leave.find({
                employeeId: staff._id,
                leaveType: { $regex: flexibleRegex },
                status: { $regex: /^approved$/i },
                $or: [
                    { startDate: { $gte: prevRangeStart, $lte: prevRangeEnd } },
                    { endDate: { $gte: prevRangeStart, $lte: prevRangeEnd } },
                    { startDate: { $lte: prevRangeStart }, endDate: { $gte: prevRangeEnd } }
                ]
            });

            let prevApprovedDays = 0;
            prevMonthLeaves.forEach(l => {
                const lStart = new Date(l.startDate);
                const lEnd = new Date(l.endDate);
                const overlapStart = lStart > prevRangeStart ? lStart : prevRangeStart;
                const overlapEnd = lEnd < prevRangeEnd ? lEnd : prevRangeEnd;
                if (overlapEnd >= overlapStart) {
                    const oStart = new Date(overlapStart.getFullYear(), overlapStart.getMonth(), overlapStart.getDate());
                    const oEnd = new Date(overlapEnd.getFullYear(), overlapEnd.getMonth(), overlapEnd.getDate());
                    prevApprovedDays += Math.round(Math.abs(oEnd - oStart) / (1000 * 60 * 60 * 24)) + 1;
                }
            });
            carriedForward = Math.max(0, baseLimit - prevApprovedDays);
        } else {
            // Previous year
            const prevYear = targetYear - 1;
            const prevRangeStart = new Date(prevYear, 0, 1);
            const prevRangeEnd = new Date(prevYear, 11, 31, 23, 59, 59);

            const prevYearLeaves = await Leave.find({
                employeeId: staff._id,
                leaveType: { $regex: flexibleRegex },
                status: { $regex: /^approved$/i },
                $or: [
                    { startDate: { $gte: prevRangeStart, $lte: prevRangeEnd } },
                    { endDate: { $gte: prevRangeStart, $lte: prevRangeEnd } },
                    { startDate: { $lte: prevRangeStart }, endDate: { $gte: prevRangeEnd } }
                ]
            });

            let prevApprovedDays = 0;
            prevYearLeaves.forEach(l => {
                const lStart = new Date(l.startDate);
                const lEnd = new Date(l.endDate);
                const overlapStart = lStart > prevRangeStart ? lStart : prevRangeStart;
                const overlapEnd = lEnd < prevRangeEnd ? lEnd : prevRangeEnd;
                if (overlapEnd >= overlapStart) {
                    const oStart = new Date(overlapStart.getFullYear(), overlapStart.getMonth(), overlapStart.getDate());
                    const oEnd = new Date(overlapEnd.getFullYear(), overlapEnd.getMonth(), overlapEnd.getDate());
                    prevApprovedDays += Math.round(Math.abs(oEnd - oStart) / (1000 * 60 * 60 * 24)) + 1;
                }
            });
            carriedForward = Math.max(0, baseLimit - prevApprovedDays);
        }
    }

    const totalAvailable = baseLimit + carriedForward;
    // Balance check should consider BOTH approved and pending to prevent over-drafting
    const balance = Math.max(0, totalAvailable - (used + pending));

    return {
        baseLimit,
        carriedForward,
        totalAvailable,
        used, // ONLY approved (this is what "Taken" usually shows)
        pending, // separately returned
        balance,
        isMonthly: isCasual,
        carryForwardEnabled: carryForward
    };
};

/**
 * Get working session timings for Half Day leave, calculated from shift times.
 * Session 1 leave → employee works Session 2 (last 5 hours of shift)
 * Session 2 leave → employee works Session 1 (first 5 hours of shift)
 * @param {string} session - '1' or '2' (the leave session)
 * @param {string} shiftStartTime - Shift start time from DB (e.g., '10:00')
 * @param {string} shiftEndTime - Shift end time from DB (e.g., '19:00')
 * @returns {{ startTime: string, endTime: string }} - Working session timings in HH:mm format
 */
const getWorkingSessionTimings = (session, shiftStartTime, shiftEndTime) => {
    if (!session || (!shiftStartTime && !shiftEndTime)) return null;
    
    try {
        // Parse shift times
        const [startHours, startMins] = (shiftStartTime || '10:00').split(':').map(Number);
        const [endHours, endMins] = (shiftEndTime || '19:00').split(':').map(Number);
        
        const startTotalMinutes = startHours * 60 + startMins;
        const endTotalMinutes = endHours * 60 + endMins;
        const sessionDurationMinutes = 5 * 60; // 5 hours = 300 minutes
        
        if (session === '1') {
            // Session 1 leave: employee works Session 2 (fixed: 2:00 PM - shift end)
            // Session 2 start is fixed at 14:00 (2:00 PM), end uses shift end from DB
            return {
                startTime: '14:00', // Fixed: 2:00 PM
                endTime: `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}` // Use shift end from DB
            };
        }
        
        if (session === '2') {
            // Session 2 leave: employee works Session 1 (first 5 hours of shift)
            const session1StartHours = startHours;
            const session1StartMins = startMins;
            const session1EndMinutes = startTotalMinutes + sessionDurationMinutes;
            const session1EndHours = Math.floor(session1EndMinutes / 60);
            const session1EndMins = session1EndMinutes % 60;
            
            return {
                startTime: `${session1StartHours.toString().padStart(2, '0')}:${session1StartMins.toString().padStart(2, '0')}`,
                endTime: `${session1EndHours.toString().padStart(2, '0')}:${session1EndMins.toString().padStart(2, '0')}`
            };
        }
        
        return null;
    } catch (error) {
        console.error('[getWorkingSessionTimings] Error calculating from shift times:', error);
        return null;
    }
};

/**
 * Calculate late check-in fine for Half Day session.
 * Session 1 leave: late if check-in after 2:00 PM (Session 2 start)
 * Session 2 leave: late if check-in after 10:00 AM (Session 1 start)
 * Early check-in is allowed (no penalty).
 * @param {Date} punchInTime - Check-in time
 * @param {Date} attendanceDate - Date of attendance
 * @param {string} session - '1' or '2' (the leave session)
 * @param {number} gracePeriodMinutes - Grace period in minutes
 * @param {number} dailySalary - Daily salary amount
 * @param {number} shiftHours - Working hours for the session (5 hours)
 * @param {string} shiftStartTime - Main shift start time from DB (e.g., '10:00')
 * @param {string} shiftEndTime - Main shift end time from DB (e.g., '19:00')
 * @returns {{ lateMinutes: number, fineAmount: number }}
 */
const calculateHalfDayLateFine = (punchInTime, attendanceDate, session, gracePeriodMinutes, dailySalary, shiftHours, shiftStartTime, shiftEndTime) => {
    const timings = getWorkingSessionTimings(session, shiftStartTime, shiftEndTime);
    if (!timings) return { lateMinutes: 0, fineAmount: 0 };
    
    const [startHours, startMins] = timings.startTime.split(':').map(Number);
    const shiftStart = new Date(attendanceDate);
    shiftStart.setHours(startHours, startMins, 0, 0);
    
    const graceTimeEnd = new Date(shiftStart);
    graceTimeEnd.setMinutes(graceTimeEnd.getMinutes() + gracePeriodMinutes);
    
    // If punch-in is before or within grace time, no fine
    if (punchInTime <= graceTimeEnd) {
        return { lateMinutes: 0, fineAmount: 0 };
    }
    
    // Calculate late minutes from shift start time
    const lateMinutes = Math.max(0, Math.round((punchInTime.getTime() - shiftStart.getTime()) / (1000 * 60)));
    
    if (lateMinutes <= 0 || !dailySalary || !shiftHours) {
        return { lateMinutes, fineAmount: 0 };
    }
    
    // Calculate fine: Hourly Rate × (Late Minutes / 60)
    const hourlyRate = dailySalary / shiftHours;
    const fineAmount = Math.round((hourlyRate * (lateMinutes / 60)) * 100) / 100;
    
    return { lateMinutes, fineAmount };
};

/**
 * Calculate early logout fine for Half Day session.
 * Session 1 leave: early if logout before 7:00 PM (Session 2 end)
 * Session 2 leave: early if logout before 3:00 PM (Session 1 end)
 * Late logout is NOT penalized (allowed).
 * @param {Date} punchOutTime - Check-out time
 * @param {Date} attendanceDate - Date of attendance
 * @param {string} session - '1' or '2' (the leave session)
 * @param {number} dailySalary - Daily salary amount
 * @param {number} shiftHours - Working hours for the session (5 hours)
 * @param {string} shiftStartTime - Main shift start time from DB (e.g., '10:00')
 * @param {string} shiftEndTime - Main shift end time from DB (e.g., '19:00')
 * @returns {{ earlyMinutes: number, fineAmount: number }}
 */
const calculateHalfDayEarlyFine = (punchOutTime, attendanceDate, session, dailySalary, shiftHours, shiftStartTime, shiftEndTime) => {
    const timings = getWorkingSessionTimings(session, shiftStartTime, shiftEndTime);
    if (!timings) return { earlyMinutes: 0, fineAmount: 0 };
    
    const [endHours, endMins] = timings.endTime.split(':').map(Number);
    const shiftEnd = new Date(attendanceDate);
    shiftEnd.setHours(endHours, endMins, 0, 0);
    
    // If punch-out is after or equal to shift end time, no fine (late logout allowed)
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
};

module.exports = {
    markAttendanceForApprovedLeave,
    calculateAvailableLeaves,
    revertAttendanceForDeletedLeave,
    canCheckInWithHalfDayLeave,
    canCheckOutWithHalfDayLeave,
    getHalfDaySessionMessage,
    isCurrentlyInLeaveSession,
    getLeaveMessageForUI,
    getWorkingSessionTimings,
    calculateHalfDayLateFine,
    calculateHalfDayEarlyFine,
    getShiftTimings
};
