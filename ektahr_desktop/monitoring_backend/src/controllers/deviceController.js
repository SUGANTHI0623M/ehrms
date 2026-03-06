const jwt = require('jsonwebtoken');
const path = require('path');
const mongoose = require('../config/mongoose');

const Device = require('../models/Device');
const TenantSettings = require('../models/TenantSettings');
const appBackendRoot = path.join(__dirname, '../../../../', 'app_backend');
const Staff = require(path.join(appBackendRoot, 'src', 'models', 'Staff'));
const Company = require(path.join(appBackendRoot, 'src', 'models', 'Company'));

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

let serverPrivateKey = null;
let serverPublicKey = null;

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getRsaKeys = () => {
    if (!serverPrivateKey && process.env.RSA_PRIVATE_KEY) {
        const NodeRSA = require('node-rsa');
        const pem = process.env.RSA_PRIVATE_KEY.replace(/\\n/g, '\n');
        serverPrivateKey = new NodeRSA(pem, 'pkcs8', { encryptionScheme: 'pkcs1' });
        serverPublicKey = serverPrivateKey.exportKey('public');
    }
    return { serverPrivateKey, serverPublicKey };
};

exports.registerDevice = async (req, res) => {
    try {
        const { deviceId, employeeId, tenantId, machineName, osVersion, agentVersion, systemIp, systemModel } = req.body;
        console.log('[Device register] Request:', { deviceId, employeeId, tenantId, machineName, osVersion, agentVersion, systemIp, systemModel });

        if (!deviceId || !employeeId || !tenantId) {
            console.log('[Device register] Validation failed: missing deviceId, employeeId or tenantId');
            return res.status(400).json({
                success: false,
                message: 'deviceId, employeeId, tenantId are required'
            });
        }

        const tenantObjId = new mongoose.Types.ObjectId(tenantId);

        // Case-insensitive employeeId match (Staff.employeeId); include status for login check
        const staff = await Staff.findOne({
            employeeId: { $regex: new RegExp(`^${escapeRegex(employeeId)}$`, 'i') },
            businessId: tenantObjId
        }).select('_id employeeId businessId status').lean();

        if (!staff) {
            const staffByEmpId = await Staff.findOne({ employeeId: { $regex: new RegExp(`^${escapeRegex(employeeId)}$`, 'i') } }).select('_id employeeId businessId').lean();
            const companyExists = await Company.findById(tenantObjId).select('_id').lean();
            const staffBizId = staffByEmpId?.businessId?.toString() || null;
            console.log('[Device register] Employee not found:', { employeeId, tenantId, staffExists: !!staffByEmpId, staffBusinessId: staffBizId, tenantExists: !!companyExists });
            let msg = 'Employee not found or tenant mismatch.';
            if (staffByEmpId && staffBizId !== tenantId) {
                msg = `Employee ${staffByEmpId.employeeId} exists but belongs to different tenant. Use Tenant ID: ${staffBizId}`;
            } else if (!staffByEmpId) {
                msg = `Employee ID "${employeeId}" not found in Staff collection.`;
            } else if (!companyExists) {
                msg = `Tenant ID "${tenantId}" not found in Company collection.`;
            }
            return res.status(404).json({ success: false, message: msg });
        }

        // Only staff with status "Active" can log in to the monitoring agent
        const staffStatus = (staff.status || '').trim();
        if (staffStatus.toLowerCase() !== 'active') {
            console.log('[Device register] Login denied: staff status is not Active', { employeeId, status: staffStatus });
            return res.status(403).json({
                success: false,
                message: 'Your account status is InActive.'
            });
        }
        console.log('[Device register] Staff found:', staff._id);

        const DEFAULT_SETTINGS = {
            screenshotFrequencyMinutes: 5,
            activityRetentionDays: 90,
            screenshotRetentionDays: 30,
            keystrokeWeight: 0.1,
            mouseWeight: 0.5,
            idleWeight: -0.02,
            blurRules: []
        };
        let settings;
        try {
            settings = await Promise.race([
                TenantSettings.findOne({ tenantId: tenantObjId }).lean(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('TenantSettings timeout')), 8000))
            ]);
        } catch (err) {
            console.warn('[Device register] TenantSettings lookup failed or timed out, using defaults:', err.message);
            settings = null;
        }
        if (!settings) {
            settings = DEFAULT_SETTINGS;
        }

        const device = await Device.findOneAndUpdate(
            { deviceId },
            {
                $set: {
                    deviceId,
                    employeeID: staff._id,
                    tenantId: tenantObjId,
                    machineName,
                    osVersion,
                    agentVersion,
                    systemIp: systemIp ?? null,
                    systemModel: systemModel ?? null,
                    lastSeenAt: new Date(),
                    isActive: true,
                    status: 'active',
                    consentAt: new Date()
                }
            },
            { upsert: true, returnDocument: 'after' }
        );

        const staffUpdate = await Staff.updateOne(
            { _id: staff._id },
            { $set: { monitoringStatus: 'active' } }
        );
        if (staffUpdate.modifiedCount === 0 && staffUpdate.matchedCount === 1) {
            console.log('[Device register] Staff monitoringStatus already active', { staffId: staff._id });
        } else if (staffUpdate.matchedCount === 0) {
            console.warn('[Device register] Staff not found for monitoringStatus update', { staffId: staff._id });
        } else {
            console.log('[Device register] Staff monitoringStatus set to active', { staffId: staff._id });
        }

        const staffIdHex = staff._id.toString();
        const accessToken = jwt.sign(
            { deviceId, staffId: staffIdHex, tenantId },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        const refreshToken = jwt.sign(
            { deviceId, type: 'refresh' },
            JWT_SECRET,
            { expiresIn: JWT_REFRESH_EXPIRES }
        );

        const { serverPublicKey } = getRsaKeys();

        console.log('[Device register] Success:', { deviceId, staffId: staffIdHex, tenantId, deviceDocId: device._id });

        res.status(200).json({
            success: true,
            staffId: staffIdHex,
            accessToken,
            refreshToken,
            serverPublicKey: serverPublicKey || null,
            screenshotFrequency: settings.screenshotFrequencyMinutes || 5,
            blurRules: settings.blurRules || [],
            monitoringEnabled: true
        });
    } catch (error) {
        console.error('[Device register] Error:', error.message);
        console.error('[Device register] Stack:', error.stack);
        if (error.name === 'BSONError' && error.message.includes('ObjectId')) {
            return res.status(400).json({ success: false, message: 'Invalid tenantId format (must be 24-char hex ObjectId)' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.heartbeat = async (req, res) => {
    try {
        const { deviceId, employeeID } = req.device;

        await Device.updateOne(
            { deviceId },
            { $set: { lastSeenAt: new Date(), isActive: true, status: 'active' } }
        );

        console.log('[Device heartbeat] OK', { deviceId, employeeID });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[Device heartbeat]', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.setInactive = async (req, res) => {
    try {
        const { deviceId, employeeID } = req.device;

        const result = await Device.updateOne(
            { deviceId },
            { isActive: false, status: 'inactive', lastSeenAt: new Date() }
        );

        console.log('[Device set-inactive] OK', { deviceId, employeeID, modified: result.modifiedCount });
        res.status(200).json({ success: true, message: 'Device marked inactive' });
    } catch (error) {
        console.error('[Device set-inactive]', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.setLogout = async (req, res) => {
    try {
        const deviceId = req.device?.deviceId;
        if (!deviceId) return res.status(401).json({ message: 'Device context missing' });
        const device = await Device.findOne({ deviceId }).select('employeeID').lean();
        const result = await Device.updateOne(
            { deviceId },
            { isActive: false, status: 'logout', lastSeenAt: new Date() }
        );
        if (device?.employeeID) {
            await Staff.updateOne({ _id: device.employeeID }, { $set: { monitoringStatus: 'logout' } });
            console.log('[Device set-logout] OK', { deviceId, employeeID: device.employeeID, modified: result.modifiedCount });
        } else {
            console.log('[Device set-logout] OK', { deviceId, modified: result.modifiedCount });
        }
        res.status(200).json({ success: true, message: 'Device marked logout; staff monitoringStatus set false' });
    } catch (error) {
        console.error('[Device set-logout]', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.setExit = async (req, res) => {
    try {
        const deviceId = req.device?.deviceId;
        if (!deviceId) return res.status(401).json({ message: 'Device context missing' });
        const device = await Device.findOne({ deviceId }).select('employeeID').lean();
        const result = await Device.updateOne(
            { deviceId },
            { isActive: false, status: 'exited', lastSeenAt: new Date() }
        );
        if (device?.employeeID) {
            await Staff.updateOne({ _id: device.employeeID }, { $set: { monitoringStatus: 'exited' } });
            console.log('[Device set-exit] OK', { deviceId, employeeID: device.employeeID, modified: result.modifiedCount });
        } else {
            console.log('[Device set-exit] OK', { deviceId, modified: result.modifiedCount });
        }
        res.status(200).json({ success: true, message: 'Device marked exited' });
    } catch (error) {
        console.error('[Device set-exit]', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/** When agent starts with existing session (e.g. after exit), set device and staff back to active so tracking resumes. */
exports.startDevice = async (req, res) => {
    try {
        const deviceId = req.device?.deviceId;
        if (!deviceId) return res.status(401).json({ message: 'Device context missing' });
        const device = await Device.findOne({ deviceId }).select('employeeID').lean();
        const result = await Device.updateOne(
            { deviceId },
            { $set: { lastSeenAt: new Date(), isActive: true, status: 'active' } }
        );
        if (device?.employeeID) {
            await Staff.updateOne({ _id: device.employeeID }, { $set: { monitoringStatus: 'active' } });
            console.log('[Device start] OK – device and staff set active', { deviceId, employeeID: device.employeeID, modified: result.modifiedCount });
        } else {
            console.log('[Device start] OK – device set active', { deviceId, modified: result.modifiedCount });
        }
        res.status(200).json({ success: true, message: 'Device and staff set active' });
    } catch (error) {
        console.error('[Device start]', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
