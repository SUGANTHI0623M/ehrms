/**
 * Shared processor: decrypt payload and write to MongoDB (monitoringlogs, monitoringscores, monitoringscreenshots).
 * Used by the Worker (Redis jobs) and by the API when Redis is skipped (inline processing).
 */
const mongoose = require('../config/mongoose');
const NodeRSA = require('node-rsa');

const ActivityLog = require('../models/ActivityLog');
const Screenshot = require('../models/Screenshot');
const ProductivityScore = require('../models/ProductivityScore');
const TenantSettings = require('../models/TenantSettings');
const Device = require('../models/Device');
const cloudinaryService = require('./cloudinaryService');

const CLOUDINARY_RETRIES = 5;

let serverPrivateKey = null;
function getDecryptor() {
    if (!serverPrivateKey && process.env.RSA_PRIVATE_KEY) {
        const pem = process.env.RSA_PRIVATE_KEY.replace(/\\n/g, '\n');
        serverPrivateKey = new NodeRSA(pem, 'pkcs8', { encryptionScheme: 'pkcs1' });
    }
    return serverPrivateKey;
}

function decryptPayload(encryptedBase64, aesKeyHex) {
    const crypto = require('crypto');
    const key = Buffer.from(aesKeyHex, 'hex');
    const raw = Buffer.from(encryptedBase64, 'base64');
    const iv = raw.subarray(0, 16);
    const cipher = raw.subarray(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([decipher.update(cipher), decipher.final()]).toString('utf8');
}

/**
 * Process one upload (activity or screenshot). Same logic as Worker.
 * @param {{ encryptedKey: string, encryptedPayload: string, metadata: { deviceId, tenantId, type, timestamp } }} jobData
 */
async function processPayload(jobData) {
    const { encryptedKey, encryptedPayload, metadata } = jobData;
    const { deviceId, tenantId, type, timestamp } = metadata;

    const device = await Device.findOne({ deviceId }).select('isActive status').lean();
    if (!device || !device.isActive || device.status === 'logout' || device.status === 'exited') {
        throw new Error('Tracking disabled: device has logged out or exited. No activity or screenshots are stored.');
    }

    if (!/^[a-fA-F0-9]{24}$/.test(tenantId)) {
        throw new Error('Invalid tenantId (must be 24-char hex ObjectId): ' + tenantId);
    }
    const tenantObjId = new mongoose.Types.ObjectId(tenantId);

    let aesKeyHex;
    const decryptor = getDecryptor();
    const rawKeyBuffer = Buffer.from(encryptedKey, 'base64');

    if (decryptor) {
        try {
            const dec = decryptor.decrypt(encryptedKey);
            const buf = Buffer.isBuffer(dec) ? dec : Buffer.from(dec);
            aesKeyHex = buf.toString('hex');
        } catch (e1) {
            try {
                const buf = Buffer.from(encryptedKey, 'base64');
                const dec = decryptor.decrypt(buf);
                const out = Buffer.isBuffer(dec) ? dec : Buffer.from(dec);
                aesKeyHex = out.toString('hex');
            } catch (e2) {
                if (rawKeyBuffer.length === 32) {
                    aesKeyHex = rawKeyBuffer.toString('hex');
                } else {
                    throw new Error('RSA decrypt failed (key may not match registration). Set RSA_PRIVATE_KEY to match the key used at device registration, or leave unset so agent sends raw key.');
                }
            }
        }
    } else {
        if (rawKeyBuffer.length === 32) {
            aesKeyHex = rawKeyBuffer.toString('hex');
        } else if (/^[a-fA-F0-9]{64}$/.test(encryptedKey)) {
            aesKeyHex = encryptedKey;
        } else {
            throw new Error('Missing RSA_PRIVATE_KEY and encryptedKey is not 32-byte base64 or 64-char hex raw key.');
        }
    }

    const payload = decryptPayload(encryptedPayload, aesKeyHex);

    if (type === 'activity') {
        let activity;
        try {
            activity = JSON.parse(payload);
        } catch (e) {
            console.error('[ActivityProcessor] Invalid JSON after decrypt', { payloadPreview: payload.substring(0, 200), error: e.message });
            throw e;
        }
        // Agent sends staffId (Staff._id hex); resolve employeeID (ObjectId) from payload or Device
        const deviceIdVal = activity.deviceId ?? activity.DeviceId ?? deviceId;
        let employeeIDObj = null;
        const staffIdRaw = activity.staffId ?? activity.StaffId ?? activity.employeeId ?? activity.EmployeeId;
        if (staffIdRaw && typeof staffIdRaw === 'string' && /^[a-fA-F0-9]{24}$/.test(staffIdRaw)) {
            employeeIDObj = new mongoose.Types.ObjectId(staffIdRaw);
        }
        if (!employeeIDObj) {
            const deviceDoc = await Device.findOne({ deviceId: deviceIdVal }).select('employeeID').lean();
            employeeIDObj = deviceDoc?.employeeID;
            if (employeeIDObj) console.log('[ActivityProcessor] Resolved employeeID from Device', { deviceId: deviceIdVal, employeeID: employeeIDObj });
        }
        if (!employeeIDObj) throw new Error('Missing staffId (24-char hex) in activity payload and device not found for deviceId: ' + deviceIdVal);

        const tsRaw = activity.timestamp ?? activity.Timestamp ?? timestamp;
        let ts = (typeof tsRaw === 'string' || typeof tsRaw === 'number') ? new Date(tsRaw) : (tsRaw && typeof tsRaw === 'object' && tsRaw.$date ? new Date(tsRaw.$date) : new Date(timestamp));
        if (Number.isNaN(ts.getTime())) {
            ts = new Date(timestamp);
            if (Number.isNaN(ts.getTime())) ts = new Date();
            console.warn('[ActivityProcessor] Invalid timestamp in payload, using fallback', { tsRaw: typeof tsRaw === 'object' ? JSON.stringify(tsRaw) : tsRaw, used: ts.toISOString() });
        }

        const aw = activity.activeWindow ?? activity.ActiveWindow;
        const processNameVal = aw?.processName ?? aw?.ProcessName ?? null;
        const activeWindowNormalized = aw ? {
            processName: processNameVal,
            appName: (aw.appName ?? aw.AppName) ?? (processNameVal ? processNameVal.replace(/\.[^.]+$/, '') : null),
            windowTitle: aw.windowTitle ?? aw.WindowTitle ?? null,
            durationSeconds: typeof (aw.durationSeconds ?? aw.DurationSeconds) === 'number' ? (aw.durationSeconds ?? aw.DurationSeconds) : 0
        } : null;

        const log = await ActivityLog.create({
            tenantId: tenantObjId,
            deviceId: deviceIdVal,
            employeeID: employeeIDObj,
            timestamp: ts,
            keystrokes: activity.keystrokes ?? activity.Keystrokes ?? 0,
            mouseClicks: activity.mouseClicks ?? activity.MouseClicks ?? 0,
            scrollCount: activity.scrollCount ?? activity.ScrollCount ?? 0,
            activeWindow: activeWindowNormalized,
            idleSeconds: activity.idleSeconds ?? activity.IdleSeconds ?? 0
        });
        console.log('[ActivityProcessor] Wrote monitoringlogs', { logId: log._id, employeeID: employeeIDObj, tenantId, timestamp: ts.toISOString() });

        const settings = await TenantSettings.findOne({ tenantId: tenantObjId }).lean();
        const kw = (settings?.keystrokeWeight) ?? 0.1;
        const mw = (settings?.mouseWeight) ?? 0.5;
        const iw = (settings?.idleWeight) ?? -0.02;
        const score = (kw * (log.keystrokes || 0)) + (mw * (log.mouseClicks || 0)) + (iw * (log.idleSeconds || 0));

        await ProductivityScore.create({
            tenantId: tenantObjId,
            employeeID: employeeIDObj,
            activityLogId: log._id,
            timestamp: ts,
            score,
            keystrokes: log.keystrokes,
            mouseClicks: log.mouseClicks,
            idleSeconds: log.idleSeconds
        });
        console.log('[ActivityProcessor] Wrote monitoringscores', { employeeID: employeeIDObj, tenantId });
        const staffIdHex = employeeIDObj.toString();
        return { type: 'activity', activityLogId: log._id, employeeID: employeeIDObj, employeeId: staffIdHex, tenantId };
    }

    if (type === 'screenshot') {
        const data = JSON.parse(payload);
        const buffer = Buffer.from(data.imageBase64, 'base64');
        // Resolve employeeID (ObjectId): agent sends staffId (hex) in payload or we get from Device
        const deviceIdVal = data.deviceId ?? deviceId;
        let employeeIDObj = null;
        const staffIdRaw = data.staffId ?? data.StaffId ?? data.employeeId ?? data.EmployeeId;
        if (staffIdRaw && typeof staffIdRaw === 'string' && /^[a-fA-F0-9]{24}$/.test(staffIdRaw)) {
            employeeIDObj = new mongoose.Types.ObjectId(staffIdRaw);
        }
        if (!employeeIDObj) {
            const deviceDoc = await Device.findOne({ deviceId: deviceIdVal }).select('employeeID').lean();
            employeeIDObj = deviceDoc?.employeeID;
        }
        if (!employeeIDObj) throw new Error('Missing staffId (24-char hex) in screenshot payload and device not found for deviceId: ' + deviceIdVal);

        const staffIdHex = employeeIDObj.toString();
        let result;
        for (let attempt = 1; attempt <= CLOUDINARY_RETRIES; attempt++) {
            try {
                result = await cloudinaryService.uploadScreenshot(buffer, {
                    tenantId: data.tenantId,
                    employeeId: staffIdHex,
                    timestamp: data.timestamp
                });
                break;
            } catch (err) {
                if (attempt === CLOUDINARY_RETRIES) throw err;
            }
        }
        await Screenshot.create({
            tenantId: tenantObjId,
            employeeID: employeeIDObj,
            deviceId: data.deviceId ?? deviceIdVal,
            timestamp: new Date(data.timestamp),
            cloudinaryPublicId: result.public_id,
            cloudinaryUrl: result.url,
            secureUrl: result.secure_url,
            width: result.width,
            height: result.height,
            size: result.bytes
        });
        return { type: 'screenshot', employeeID: employeeIDObj, employeeId: staffIdHex, tenantId, publicId: result.public_id };
    }

    throw new Error('Unknown type: ' + type);
}

module.exports = { processPayload };
