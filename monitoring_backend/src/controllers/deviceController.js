const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Device = require('../models/Device');
const TenantSettings = require('../models/TenantSettings');

// Use app_backend Staff model (same DB)
const Staff = require('../../../app_backend/src/models/Staff');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Generate RSA key pair - use NodeRSA for server
// In production, load from env
let serverPrivateKey = null;
let serverPublicKey = null;

const getRsaKeys = () => {
    if (!serverPrivateKey && process.env.RSA_PRIVATE_KEY) {
        const NodeRSA = require('node-rsa');
        serverPrivateKey = new NodeRSA(process.env.RSA_PRIVATE_KEY, 'pkcs8');
        serverPublicKey = serverPrivateKey.exportKey('public');
    }
    return { serverPrivateKey, serverPublicKey };
};

// POST /api/device/register
exports.registerDevice = async (req, res) => {
    try {
        const { deviceId, employeeId, tenantId, machineName, osVersion, agentVersion } = req.body;

        if (!deviceId || !employeeId || !tenantId) {
            return res.status(400).json({
                success: false,
                message: 'deviceId, employeeId, tenantId are required'
            });
        }

        // Verify employee exists
        const staff = await Staff.findOne({
            employeeId,
            businessId: new mongoose.Types.ObjectId(tenantId)
        }).select('_id employeeId businessId').lean();

        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found or tenant mismatch'
            });
        }

        // Get tenant settings
        let settings = await TenantSettings.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
        if (!settings) {
            settings = {
                screenshotFrequencyMinutes: 5,
                activityRetentionDays: 90,
                screenshotRetentionDays: 30,
                keystrokeWeight: 0.1,
                mouseWeight: 0.5,
                idleWeight: -0.02
            };
        }

        // Upsert device
        const device = await Device.findOneAndUpdate(
            { deviceId },
            {
                deviceId,
                employeeId,
                staffId: staff._id,
                tenantId: new mongoose.Types.ObjectId(tenantId),
                machineName,
                osVersion,
                agentVersion,
                lastSeenAt: new Date(),
                isActive: true,
                consentAt: new Date()
            },
            { upsert: true, new: true }
        );

        const accessToken = jwt.sign(
            { deviceId, employeeId, tenantId },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        const refreshToken = jwt.sign(
            { deviceId, type: 'refresh' },
            JWT_SECRET,
            { expiresIn: JWT_REFRESH_EXPIRES }
        );

        const { serverPublicKey } = getRsaKeys();

        res.status(200).json({
            success: true,
            accessToken,
            refreshToken,
            serverPublicKey: serverPublicKey || null,
            screenshotFrequency: settings.screenshotFrequencyMinutes || 5,
            blurRules: [], // Can be extended with per-tenant rules
            monitoringEnabled: true
        });
    } catch (error) {
        console.error('[Device register]', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/device/heartbeat
exports.heartbeat = async (req, res) => {
    try {
        const { deviceId } = req.device;

        await Device.updateOne(
            { deviceId },
            { lastSeenAt: new Date(), isActive: true }
        );

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[Device heartbeat]', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
