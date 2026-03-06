const jwt = require('jsonwebtoken');
const Device = require('../models/Device');

// Device JWT contains: { deviceId, employeeId, tenantId }
const protectDevice = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            const device = await Device.findOne({ deviceId: decoded.deviceId }).lean();
            if (!device) {
                return res.status(401).json({ message: 'Device not registered' });
            }
            if (!device.isActive) {
                return res.status(401).json({ message: 'Device inactive' });
            }
            req.device = device;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired, refresh required' });
            }
            return res.status(401).json({ message: 'Not authorized' });
        }
    } else {
        return res.status(401).json({ message: 'No token provided' });
    }
};

module.exports = { protectDevice };
