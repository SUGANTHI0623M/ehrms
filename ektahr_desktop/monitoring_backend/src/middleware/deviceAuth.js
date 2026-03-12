const jwt = require('jsonwebtoken');
const Device = require('../models/Device');

const protectDevice = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            const device = await Device.findOne({ deviceId: decoded.deviceId }).lean();
            if (!device) {
                console.warn('[Auth] Device not registered', { deviceId: decoded.deviceId });
                return res.status(401).json({ message: 'Device not registered' });
            }
            if (!device.isActive) {
                console.warn('[Auth] Device inactive', { deviceId: decoded.deviceId });
                return res.status(401).json({ message: 'Device inactive' });
            }
            if (device.status === 'logout' || device.status === 'exited') {
                console.warn('[Auth] Tracking disabled (logout/exited)', { deviceId: decoded.deviceId, status: device.status });
                return res.status(403).json({ message: 'Tracking disabled. Software not logged in or has exited.' });
            }
            req.device = device;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                console.warn('[Auth] Token expired', { path: req.path });
                return res.status(401).json({ message: 'Token expired, refresh required' });
            }
            console.warn('[Auth] Not authorized', { path: req.path, error: error.message });
            return res.status(401).json({ message: 'Not authorized' });
        }
    } else {
        console.warn('[Auth] No token provided', { path: req.path });
        return res.status(401).json({ message: 'No token provided' });
    }
};

/** Use for set-inactive: verify JWT only, do not require device to be active (so logout/exit can always mark inactive). */
const protectDeviceForLogout = async (req, res, next) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
        return res.status(401).json({ message: 'No token provided' });
    }
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.device = { deviceId: decoded.deviceId, staffId: decoded.staffId };
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        return res.status(401).json({ message: 'Not authorized' });
    }
};

module.exports = { protectDevice, protectDeviceForLogout };
