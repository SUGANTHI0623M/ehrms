const Break = require('../models/Break');

const SOURCE_SOFTWARE = 'software';
const SOURCE_WEB = 'web';
const SOURCE_APP = 'app';

/** POST /break/start - Insert break document when user starts break. */
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
        const normalizedSource = [SOURCE_SOFTWARE, SOURCE_WEB, SOURCE_APP].includes(source) ? source : SOURCE_SOFTWARE;
        const doc = await Break.create({
            employeeID: device.employeeID,
            deviceId: device.deviceId,
            tenantId: device.tenantId,
            startTime: new Date(startTime),
            source: normalizedSource
        });
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
        console.log('[Break] Ended', { breakId: doc._id, employeeID: device.employeeID, totalSeconds });
        res.status(200).json({ success: true, breakId: doc._id.toString() });
    } catch (error) {
        console.error('[Break] endBreak error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
