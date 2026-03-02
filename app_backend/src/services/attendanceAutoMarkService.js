/**
 * Attendance Auto-Mark Service
 * Marks "Not Marked" attendance as "Absent" for past days. Creates absent records for missing employees.
 * Excludes Sundays and holidays.
 */
const Attendance = require('../models/Attendance');
const HolidayTemplate = require('../models/HolidayTemplate');
const Staff = require('../models/Staff');
const mongoose = require('mongoose');

function isSunday(date) {
    return date.getDay() === 0;
}

async function isHoliday(date, businessId) {
    if (!businessId) return false;
    try {
        const template = await HolidayTemplate.findOne({
            businessId,
            isActive: true,
        }).lean();
        if (!template || !template.holidays || !Array.isArray(template.holidays)) return false;
        const dateStr = date.toISOString().split('T')[0];
        return template.holidays.some((h) => {
            const hDate = new Date(h.date);
            hDate.setHours(0, 0, 0, 0);
            return hDate.toISOString().split('T')[0] === dateStr;
        });
    } catch (e) {
        console.error('[AttendanceAutoMark] isHoliday error:', e.message);
        return false;
    }
}

async function autoMarkPastAttendance() {
    let updatedCount = 0;
    let skippedCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    try {
        const notMarkedRecords = await Attendance.find({
            status: 'Not Marked',
            date: { $gte: startOfMonth, $lt: today },
        })
            .populate('employeeId', 'businessId')
            .lean();

        for (const record of notMarkedRecords) {
            const recordDate = new Date(record.date);
            recordDate.setHours(0, 0, 0, 0);
            if (isSunday(recordDate)) {
                skippedCount++;
                continue;
            }
            let businessId = record.businessId;
            if (!businessId && record.employeeId && record.employeeId.businessId) {
                businessId = record.employeeId.businessId;
            }
            if (businessId && (await isHoliday(recordDate, businessId))) {
                skippedCount++;
                continue;
            }
            const res = await Attendance.updateOne(
                { _id: record._id },
                { $set: { status: 'Absent', remarks: 'Auto-marked as Absent - no punch in/out recorded' } }
            );
            if (res.modifiedCount > 0) updatedCount++;
        }

        const daysToProcess = [];
        let curr = new Date(startOfMonth);
        while (curr < today) {
            daysToProcess.push(new Date(curr));
            curr.setDate(curr.getDate() + 1);
        }

        const allActiveStaff = await Staff.find({ status: 'Active' })
            .select('_id businessId joiningDate')
            .lean();

        const byBusiness = new Map();
        for (const emp of allActiveStaff) {
            const bid = (emp.businessId && emp.businessId.toString()) || 'unknown';
            if (!byBusiness.has(bid)) byBusiness.set(bid, []);
            byBusiness.get(bid).push(emp);
        }

        for (const processDate of daysToProcess) {
            if (isSunday(processDate)) {
                skippedCount++;
                continue;
            }
            const dateStart = new Date(processDate);
            dateStart.setHours(0, 0, 0, 0);
            const dateEnd = new Date(processDate);
            dateEnd.setHours(23, 59, 59, 999);

            for (const [businessIdStr, employees] of byBusiness.entries()) {
                const businessId = businessIdStr !== 'unknown' && mongoose.Types.ObjectId.isValid(businessIdStr)
                    ? new mongoose.Types.ObjectId(businessIdStr)
                    : null;
                if (businessId && (await isHoliday(processDate, businessId))) {
                    skippedCount += employees.length;
                    continue;
                }
                const eligible = employees.filter((emp) => {
                    if (!emp.joiningDate) return true;
                    const jd = new Date(emp.joiningDate);
                    jd.setHours(0, 0, 0, 0);
                    return jd <= processDate;
                });
                if (eligible.length === 0) continue;

                const ids = eligible.map((e) => e._id);
                const existing = await Attendance.find({
                    employeeId: { $in: ids },
                    date: { $gte: dateStart, $lte: dateEnd },
                })
                    .select('employeeId')
                    .lean();
                const existingIds = new Set(existing.map((a) => (a.employeeId && a.employeeId.toString()) || String(a.employeeId)));
                const missing = eligible.filter((e) => !existingIds.has(e._id.toString()));

                if (missing.length > 0) {
                    const batch = missing.map((emp) => ({
                        employeeId: emp._id,
                        date: dateStart,
                        status: 'Absent',
                        remarks: `Auto-marked as Absent - no punch in/out recorded for ${processDate.toISOString().split('T')[0]}`,
                        businessId: emp.businessId || undefined,
                    }));
                    try {
                        await Attendance.insertMany(batch, { ordered: false });
                        updatedCount += batch.length;
                    } catch (err) {
                        if (err.code === 11000) {
                            const inserted = batch.length - (err.writeErrors?.length || 0);
                            updatedCount += Math.max(0, inserted);
                        } else throw err;
                    }
                }
            }
        }

        if (updatedCount > 0 || skippedCount > 0) {
            console.log('[AttendanceAutoMark] Completed: updated=', updatedCount, 'skipped=', skippedCount);
        }
        return { updatedCount, skippedCount };
    } catch (e) {
        console.error('[AttendanceAutoMark] Error:', e.message);
        return { updatedCount, skippedCount };
    }
}

module.exports = { autoMarkPastAttendance };
