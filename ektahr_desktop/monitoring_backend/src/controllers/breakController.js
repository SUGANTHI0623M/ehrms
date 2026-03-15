const path = require('path');
const Break = require('../models/Break');
const Device = require('../models/Device');
const MonitoringSettings = require('../models/MonitoringSettings');
const Staff = require(path.join(__dirname, '../../../../app_backend/src/models/Staff'));

const SOURCE_SOFTWARE = 'software';
const SOURCE_WEB = 'web';
const SOURCE_APP = 'app';

/** GET /break/limit-check - Check if user can start another break today. Returns { canStart, todayCount, allowedBreaksPerDay, message }. */
exports.checkLimit = async (req, res) => {
    try {
        const device = req.device;
        if (!device?.employeeID || !device?.tenantId) {
            return res.status(401).json({ message: 'Device context missing' });
        }
        const monSettings = await MonitoringSettings.findOne({ businessId: device.tenantId }).lean();
        const allowedBreaksPerDay = monSettings?.breakSettings?.allowedBreaksPerDay ?? 2;
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(startOfToday);
        endOfToday.setDate(endOfToday.getDate() + 1);
        const todayCount = await Break.countDocuments({
            employeeID: device.employeeID,
            tenantId: device.tenantId,
            startTime: { $gte: startOfToday, $lt: endOfToday }
        });
        const canStart = todayCount < allowedBreaksPerDay;
        const message = canStart ? null : `You can take only ${allowedBreaksPerDay} break(s) per day.`;
        res.status(200).json({ canStart, todayCount, allowedBreaksPerDay, message });
    } catch (error) {
        console.error('[Break] checkLimit error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

/** POST /break/start - Insert break document when user starts tea break. (Use /pause/start and /meeting/start for pause and meeting.) */
exports.startBreak = async (req, res) => {
    try {
        const { startTime, source } = req.body;
        const device = req.device;
        if (!device?.employeeID || !device?.deviceId || !device?.tenantId) {
            return res.status(401).json({ message: 'Device context missing' });
        }
        if (!startTime) {
            return res.status(400).json({ message: 'startTime required' });
        }
        const monSettings = await MonitoringSettings.findOne({ businessId: device.tenantId }).lean();
        const allowedBreaksPerDay = monSettings?.breakSettings?.allowedBreaksPerDay ?? 2;
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(startOfToday);
        endOfToday.setDate(endOfToday.getDate() + 1);
        const todayCount = await Break.countDocuments({
            employeeID: device.employeeID,
            tenantId: device.tenantId,
            startTime: { $gte: startOfToday, $lt: endOfToday }
        });
        if (todayCount >= allowedBreaksPerDay) {
            return res.status(403).json({
                success: false,
                message: `You can take only ${allowedBreaksPerDay} break(s) per day.`
            });
        }
        const normalizedSource = [SOURCE_SOFTWARE, SOURCE_WEB, SOURCE_APP].includes(source) ? source : SOURCE_SOFTWARE;
        const doc = await Break.create({
            employeeID: device.employeeID,
            deviceId: device.deviceId,
            tenantId: device.tenantId,
            startTime: new Date(startTime),
            source: normalizedSource
        });
        await Device.updateOne({ deviceId: device.deviceId }, { $set: { status: 'break', lastSeenAt: new Date() } });
        await Staff.updateOne({ _id: device.employeeID }, { $set: { monitoringStatus: 'break' } });
        console.log('[Break] Started', { breakId: doc._id, employeeID: device.employeeID, source: normalizedSource });
        res.status(201).json({ success: true, breakId: doc._id.toString() });
    } catch (error) {
        console.error('[Break] startBreak error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

/** PATCH /break/:id - Update break document when user ends break. */
exports.endBreak = async (req, res) => {
    try {
        const { id } = req.params;
        const { endTime, totalSeconds } = req.body;
        const device = req.device;
        if (!device?.employeeID || !device?.deviceId || !device?.tenantId) {
            return res.status(401).json({ message: 'Device context missing' });
        }
        if (!id || !endTime || typeof totalSeconds !== 'number') {
            return res.status(400).json({ message: 'id, endTime, totalSeconds required' });
        }
        const doc = await Break.findOneAndUpdate(
            { _id: id, deviceId: device.deviceId },
            { $set: { endTime: new Date(endTime), totalSeconds } },
            { new: true }
        );
        if (!doc) {
            return res.status(404).json({ message: 'Break not found or not owned by this device' });
        }
        await Device.updateOne({ deviceId: device.deviceId }, { $set: { status: 'active', lastSeenAt: new Date() } });
        await Staff.updateOne({ _id: device.employeeID }, { $set: { monitoringStatus: 'active' } });
        let alert = null;
        const monSettings = await MonitoringSettings.findOne({ businessId: device.tenantId }).lean();
        const breakExceededEnabled = monSettings?.alerts?.breakExceededAlert !== false;
        const maxDurationMinutes = monSettings?.breakSettings?.maxBreakDurationMinutes ?? 15;
        const maxDurationSeconds = maxDurationMinutes * 60;

        if (breakExceededEnabled && totalSeconds > maxDurationSeconds) {
            const exceededMinutes = Math.round((totalSeconds - maxDurationSeconds) / 60);
            alert = {
                type: 'break_exceeded',
                message: `Break duration exceeded the allowed ${maxDurationMinutes} minutes by ${exceededMinutes} minutes.`,
                exceededMinutes,
                maxBreakDurationMinutes: maxDurationMinutes
            };
        }

        console.log('[Break] Ended', { breakId: doc._id, employeeID: device.employeeID, totalSeconds, alert: alert?.type });
        res.status(200).json({ success: true, breakId: doc._id.toString(), alert });
    } catch (error) {
        console.error('[Break] endBreak error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
