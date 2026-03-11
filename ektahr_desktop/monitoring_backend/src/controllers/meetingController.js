const Meeting = require('../models/Meeting');
const Device = require('../models/Device');

const SOURCE_SOFTWARE = 'software';
const SOURCE_WEB = 'web';
const SOURCE_APP = 'app';

/** POST /meeting/start - Insert meeting document. No activity/screenshots tracked until end. */
exports.startMeeting = async (req, res) => {
    try {
        const { startTime, source } = req.body;
        const device = req.device;
        if (!device?.employeeID || !device?.deviceId || !device?.tenantId) {
            return res.status(401).json({ message: 'Device context missing' });
        }
        if (!startTime) {
            return res.status(400).json({ message: 'startTime required' });
        }
        const normalizedSource = [SOURCE_SOFTWARE, SOURCE_WEB, SOURCE_APP].includes(source) ? source : SOURCE_SOFTWARE;
        const doc = await Meeting.create({
            employeeID: device.employeeID,
            deviceId: device.deviceId,
            tenantId: device.tenantId,
            startTime: new Date(startTime),
            source: normalizedSource
        });
        await Device.updateOne({ deviceId: device.deviceId }, { $set: { status: 'meeting', lastSeenAt: new Date() } });
        console.log('[Meeting] Started', { meetingId: doc._id, employeeID: device.employeeID, source: normalizedSource });
        res.status(201).json({ success: true, meetingId: doc._id.toString() });
    } catch (error) {
        console.error('[Meeting] startMeeting error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

/** PATCH /meeting/:id - End meeting. Resumes tracking. */
exports.endMeeting = async (req, res) => {
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
        const doc = await Meeting.findOneAndUpdate(
            { _id: id, deviceId: device.deviceId },
            { $set: { endTime: new Date(endTime), totalSeconds } },
            { new: true }
        );
        if (!doc) {
            return res.status(404).json({ message: 'Meeting not found or not owned by this device' });
        }
        await Device.updateOne({ deviceId: device.deviceId }, { $set: { status: 'active', lastSeenAt: new Date() } });
        console.log('[Meeting] Ended', { meetingId: doc._id, employeeID: device.employeeID, totalSeconds });
        res.status(200).json({ success: true, meetingId: doc._id.toString() });
    } catch (error) {
        console.error('[Meeting] endMeeting error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
