const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');

/**
 * Build audience filter for announcements.
 * Web schema: audienceType "all" (or not "specific") → everyone; "specific" → staffId must be in targetStaffIds.
 * Legacy schema: assignedTo empty/missing → everyone; else staffId must be in assignedTo.
 */
function audienceFilter(staffId) {
    const id = staffId && mongoose.Types.ObjectId.isValid(staffId) ? staffId : null;
    return {
        $or: [
            // Web: audienceType is "all" or missing
            { audienceType: { $exists: false } },
            { audienceType: null },
            { audienceType: 'all' },
            { audienceType: { $ne: 'specific' } },
            // Web: audienceType "specific" and this staff is in targetStaffIds
            ...(id ? [{ audienceType: 'specific', targetStaffIds: id }] : []),
            // Legacy: assignedTo empty or missing
            { assignedTo: { $exists: false } },
            { assignedTo: null },
            { assignedTo: [] },
            { assignedTo: { $size: 0 } },
            // Legacy: this staff in assignedTo
            ...(id ? [{ assignedTo: id }] : []),
        ],
    };
}

/** Status: accept both web "published" and legacy "Active". */
const statusFilter = { $in: ['published', 'Active'] };

/**
 * Date filter: published/effective and not expired.
 * Web: publishDate <= now; expiryDate missing or >= startOfToday.
 * Legacy: effectiveDate <= now; endDate missing or >= startOfToday.
 */
function dateFilter(now, startOfToday, useEndOfToday = false) {
    const upper = useEndOfToday ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999) : now;
    return {
        $and: [
            { $or: [{ publishDate: { $exists: true, $lte: upper } }, { effectiveDate: { $exists: true, $lte: upper } }] },
            {
                $or: [
                    { expiryDate: null },
                    { expiryDate: { $exists: false } },
                    { expiryDate: { $gte: startOfToday } },
                ],
            },
            {
                $or: [
                    { endDate: null },
                    { endDate: { $exists: false } },
                    { endDate: { $gte: startOfToday } },
                ],
            },
        ],
    };
}

/**
 * Get all announcements for the logged-in employee.
 * - All employees: assignedTo missing, null, or empty → show to everyone in business.
 * - Specific employees: assignedTo contains this staff's _id → show only to those staff.
 */
const getAnnouncementsForEmployee = async (req, res) => {
    try {
        if (!req.staff) {
            console.log('[Announcements] for-employee: no req.staff');
            return res.status(404).json({ success: false, message: 'Staff record not found' });
        }
        const staffId = req.staff._id;
        const businessId = req.staff.businessId;
        const staffName = req.staff.name || '—';
        const employeeId = req.staff.employeeId || '—';
        console.log('[Announcements] for-employee: staffId=%s, businessId=%s, name=%s, employeeId=%s', staffId, businessId, staffName, employeeId);

        if (!businessId) {
            console.log('[Announcements] for-employee: no businessId, returning []');
            return res.json({ success: true, data: [] });
        }

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

        const announcements = await Announcement.find({
            businessId,
            status: statusFilter,
            $and: [dateFilter(now, startOfToday), audienceFilter(staffId)],
        })
            .sort({ publishDate: -1, effectiveDate: -1, createdAt: -1 })
            .lean();

        const totalForBusiness = await Announcement.countDocuments({ businessId, status: statusFilter });
        console.log('[Announcements] for-employee: found %d for this employee (total Active for business: %d), titles=%s', announcements.length, totalForBusiness, announcements.map(a => a.title).join(', ') || '(none)');

        res.json({ success: true, data: announcements });
    } catch (error) {
        console.error('[Announcement Controller]', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

/**
 * Get today's announcements for the logged-in employee (effective date is today or in the past, still active).
 */
const getTodayAnnouncementsForEmployee = async (req, res) => {
    try {
        if (!req.staff) {
            console.log('[Announcements] today: no req.staff');
            return res.json({ success: true, data: [] });
        }
        const staffId = req.staff._id;
        const businessId = req.staff.businessId;
        if (!businessId) {
            console.log('[Announcements] today: no businessId');
            return res.json({ success: true, data: [] });
        }

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

        const announcements = await Announcement.find({
            businessId,
            status: statusFilter,
            $and: [dateFilter(now, startOfToday, true), audienceFilter(staffId)],
        })
            .sort({ publishDate: -1, effectiveDate: -1, createdAt: -1 })
            .limit(20)
            .lean();

        console.log('[Announcements] today: staffId=%s, count=%d', staffId, announcements.length);

        res.json({ success: true, data: announcements });
    } catch (error) {
        console.error('[Announcement Controller] getToday', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = { getAnnouncementsForEmployee, getTodayAnnouncementsForEmployee };
