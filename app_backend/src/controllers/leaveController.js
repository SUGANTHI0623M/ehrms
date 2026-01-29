const Leave = require('../models/Leave');
const Staff = require('../models/Staff');
const LeaveTemplate = require('../models/LeaveTemplate');
const mongoose = require('mongoose');
const { markAttendanceForApprovedLeave, calculateAvailableLeaves } = require('../utils/leaveAttendanceHelper');

// Helper for date calculation
const calculateDays = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
};

const getLeaves = async (req, res) => {
    try {
        const currentStaff = req.staff; // From middleware

        const { status, leaveType, page = 1, limit = 10, search, startDate, endDate } = req.query;
        const query = {};

        // Scope to current employee
        if (currentStaff) {
            query.employeeId = currentStaff._id;
        } else {
            return res.json({
                success: true,
                data: { leaves: [], pagination: { total: 0, page, limit, pages: 0 } }
            });
        }

        if (status && status !== 'all' && status !== 'All Status') query.status = status;
        if (leaveType && leaveType !== 'all') query.leaveType = leaveType;

        if (search) {
            query.$or = [
                { leaveType: { $regex: search, $options: 'i' } },
                { reason: { $regex: search, $options: 'i' } }
            ];
        }

        if (startDate || endDate) {
            query.startDate = {};
            if (startDate) query.startDate.$gte = new Date(startDate);
            if (endDate) query.startDate.$lte = new Date(endDate);
        }

        const skip = (Number(page) - 1) * Number(limit);

        const leaves = await Leave.find(query)
            .populate('approvedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Leave.countDocuments(query);

        res.json({
            success: true,
            data: {
                leaves,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

const getLeaveTypes = async (req, res) => {
    try {
        const staffId = req.staff._id;
        const staff = await Staff.findById(staffId).populate('leaveTemplateId');

        const DEFAULT_TYPES = ['Casual', 'Sick', 'Earned', 'Unpaid', 'Maternity', 'Paternity', 'Other'];
        let templateTypes = [];

        if (staff && staff.leaveTemplateId) {
            const template = staff.leaveTemplateId;
            // Support various template structures
            if (template.leaveTypes && Array.isArray(template.leaveTypes)) {
                templateTypes = template.leaveTypes.map(t => ({
                    type: t.type,
                    limit: t.limit || t.days
                }));
            } else if (template.limits) {
                templateTypes = Object.keys(template.limits).map(k => ({
                    type: k,
                    limit: template.limits[k]
                }));
            }
        }

        // Calculate used leaves for each type
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const availableTypes = await Promise.all(DEFAULT_TYPES.map(async (typeName) => {
            const templateType = templateTypes.find(t => t.type.toLowerCase() === typeName.toLowerCase());
            const limit = templateType ? templateType.limit : null;

            if (limit === null) {
                // No restriction for this type
                return {
                    type: typeName,
                    limit: null,
                    used: 0,
                    balance: 999, // Practically unlimited
                    isUnrestricted: true
                };
            }

            // Use calculateAvailableLeaves to handle carryForward logic
            const leaveInfo = await calculateAvailableLeaves(staff, typeName, now);

            return {
                type: typeName,
                limit: leaveInfo.baseLimit,
                carriedForward: leaveInfo.carriedForward,
                totalAvailable: leaveInfo.totalAvailable,
                used: leaveInfo.used,
                balance: leaveInfo.balance,
                isMonthly: leaveInfo.isMonthly,
                carryForwardEnabled: leaveInfo.carryForwardEnabled,
                isUnrestricted: false
            };
        }));

        res.json({
            success: true,
            data: availableTypes
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

const createLeave = async (req, res) => {
    try {
        const { startDate, endDate, leaveType, reason } = req.body;
        const currentStaffId = req.staff._id;

        const staff = await Staff.findById(currentStaffId).populate('leaveTemplateId');

        if (!staff) {
            return res.status(400).json({ success: false, error: { message: 'Staff profile not found' } });
        }

        const days = calculateDays(startDate, endDate);

        let limit = null;

        if (staff.leaveTemplateId) {
            const template = staff.leaveTemplateId;

            // 1. Check leaveTypes array
            if (template.leaveTypes && Array.isArray(template.leaveTypes)) {
                const leaveConfig = template.leaveTypes.find(t => t.type.toLowerCase() === leaveType.toLowerCase());
                if (leaveConfig) limit = leaveConfig.limit || leaveConfig.days;
            }

            // 2. Check limits object
            if (limit === null && template.limits) {
                limit = template.limits[leaveType] || template.limits[leaveType.toLowerCase()];
            }

            // 3. Check individual fields (e.g., casualLimit)
            if (limit === null) {
                const fieldName = leaveType.toLowerCase() + 'Limit';
                limit = template[fieldName];
            }
        }

        // If limit is not null, enforce it. If null, allow without restriction (as per user request)
        if (limit !== null) {
            // Use calculateAvailableLeaves to handle carryForward logic
            const leaveDate = new Date(startDate);
            const leaveInfo = await calculateAvailableLeaves(staff, leaveType, leaveDate);

            if (leaveInfo.totalAvailable !== null && leaveInfo.used + days > leaveInfo.totalAvailable) {
                const rangeType = leaveInfo.isMonthly ? 'month' : 'year';
                const message = leaveInfo.carryForwardEnabled
                    ? `Leave limit exceeded for ${leaveType}. Max ${leaveInfo.totalAvailable} days available (${leaveInfo.baseLimit} base + ${leaveInfo.carriedForward} carried forward) per ${rangeType}.`
                    : `Leave limit exceeded for ${leaveType}. Max ${leaveInfo.baseLimit} days allowed per ${rangeType}.`;

                return res.status(400).json({
                    success: false,
                    error: {
                        message: message,
                        details: {
                            baseLimit: leaveInfo.baseLimit,
                            carriedForward: leaveInfo.carriedForward,
                            totalAvailable: leaveInfo.totalAvailable,
                            used: leaveInfo.used,
                            requested: days,
                            balance: leaveInfo.balance,
                            range: rangeType
                        }
                    }
                });
            }
        }

        const leave = await Leave.create({
            employeeId: staff._id,
            businessId: staff.businessId,
            leaveType,
            startDate,
            endDate,
            days,
            reason
        });

        res.status(201).json({
            success: true,
            data: { leave }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};


// @desc    Approve or Reject Leave
// @route   PATCH /api/requests/leave/:id/approve or /api/requests/leave/:id/reject
// @access  Private (Admin/HR)
const updateLeaveStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;
        const approverId = req.staff?._id || req.user?._id;

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: { message: 'Invalid status. Must be "Approved" or "Rejected"' }
            });
        }

        const leave = await Leave.findById(id);
        if (!leave) {
            return res.status(404).json({
                success: false,
                error: { message: 'Leave not found' }
            });
        }

        // Update leave status
        leave.status = status;
        leave.approvedBy = approverId;
        leave.approvedAt = new Date();
        if (status === 'Rejected' && rejectionReason) {
            leave.rejectionReason = rejectionReason;
        }

        await leave.save();

        // If approved, mark attendance as "Present" for all dates in the leave period
        if (status === 'Approved') {
            try {
                await markAttendanceForApprovedLeave(leave);
            } catch (error) {
                console.error('[updateLeaveStatus] Error marking attendance:', error);
                // Don't fail the request if attendance marking fails, but log it
            }
        }

        res.json({
            success: true,
            data: { leave }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

module.exports = {
    getLeaves,
    getLeaveTypes,
    createLeave,
    updateLeaveStatus
};
