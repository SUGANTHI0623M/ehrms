/**
 * Shared processor: decrypt payload and write to MongoDB (monitoringlogs, monitoringscores, monitoringscreenshots).
 * Used by the Worker (Redis jobs) and by the API when Redis is skipped (inline processing).
 */
const mongoose = require('../config/mongoose');
const NodeRSA = require('node-rsa');

const ActivityLog = require('../models/ActivityLog');
const Screenshot = require('../models/Screenshot');
const ProductivityScore = require('../models/ProductivityScore');
const MonitoringSettings = require('../models/MonitoringSettings');
const Device = require('../models/Device');
const cloudinaryService = require('./cloudinaryService');

const CLOUDINARY_RETRIES = 5;

/** Cache: deviceId:tenantId -> { lastInsertedMs, lastCaptureTs } - lastInsertedMs=server time when we inserted, lastCaptureTs=payload timestamp for minutesSincePreviousScreenshot */
const lastScreenshotCache = new Map();

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
    if (!device || !device.isActive) {
        console.warn('[ActivityProcessor] Reject: device missing or inactive', { deviceId, hasDevice: !!device, isActive: device?.isActive });
        throw new Error('Tracking disabled: device inactive.');
    }
    if (device.status === 'logout' || device.status === 'exited' || device.status === 'break' || device.status === 'meeting' || device.status === 'pause') {
        console.warn('[ActivityProcessor] Reject: device status does not allow storage', { deviceId, status: device.status });
        throw new Error('Tracking disabled: status is ' + (device.status || 'unknown') + '. No activity or screenshots are stored.');
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

        const monSettingsForActivity = await MonitoringSettings.findOne({ businessId: tenantObjId }).lean();
        if (monSettingsForActivity?.monitoringEnabled === false) {
            throw new Error('Tracking disabled: monitoringEnabled is false.');
        }
        const at = monSettingsForActivity?.activityTracking ?? {};
        if (at.enabled === false) {
            throw new Error('Tracking disabled: activityTracking.enabled is false.');
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
        const activeWindowRaw = aw ? {
            processName: processNameVal,
            appName: (aw.appName ?? aw.AppName) ?? (processNameVal ? processNameVal.replace(/\.[^.]+$/, '') : null),
            windowTitle: aw.windowTitle ?? aw.WindowTitle ?? null,
            durationSeconds: typeof (aw.durationSeconds ?? aw.DurationSeconds) === 'number' ? (aw.durationSeconds ?? aw.DurationSeconds) : 0
        } : null;

        const logData = {
            tenantId: tenantObjId,
            deviceId: deviceIdVal,
            employeeID: employeeIDObj,
            timestamp: ts,
            idleSeconds: activity.idleSeconds ?? activity.IdleSeconds ?? 0
        };
        if (at.trackKeyboard !== false) logData.keystrokes = activity.keystrokes ?? activity.Keystrokes ?? 0;
        if (at.trackMouseClicks !== false) logData.mouseClicks = activity.mouseClicks ?? activity.MouseClicks ?? 0;
        if (at.trackScroll !== false) logData.scrollCount = activity.scrollCount ?? activity.ScrollCount ?? 0;
        if (at.trackActiveWindow !== false && activeWindowRaw) logData.activeWindow = activeWindowRaw;

        // Fetch last activity for this device to log insert interval (testing syncSettings.activityUploadIntervalSeconds)
        const lastLog = await ActivityLog.findOne(
            { deviceId: deviceIdVal, tenantId: tenantObjId }
        ).sort({ timestamp: -1 }).select('timestamp').lean();
        const prevTs = lastLog?.timestamp ? new Date(lastLog.timestamp) : null;
        const durationSec = prevTs ? Math.round((ts - prevTs) / 1000) : null;

        const log = await ActivityLog.create(logData);
        console.log('[ActivityProcessor] Wrote monitoringlogs', {
            logId: log._id,
            employeeID: employeeIDObj,
            tenantId,
            timestamp: ts.toISOString(),
            ...(durationSec != null && { durationSinceLastInsertSeconds: durationSec })
        });

        const monSettings = await MonitoringSettings.findOne({ businessId: tenantObjId }).lean();
        const psEnabled = monSettings?.productivitySettings?.enabled === true;

        if (psEnabled) {
            const ps = monSettings.productivitySettings;
            const exp = ps.expectedActivityPerMinute ?? { keystrokes: 40, mouseClicks: 20, scrolls: 10 };
            const idleMax = 60; // fixed for productivity score; idle alert uses root idleSettings.idleTimeMinutes
            const weights = ps.weights ?? { activityWeight: 0.7, idleWeight: 0.3 };
            const range = ps.scoreRange ?? { min: 0, max: 100 };

            const keyScore = Math.min(1, (log.keystrokes || 0) / (exp.keystrokes || 1));
            const mouseScore = Math.min(1, (log.mouseClicks || 0) / (exp.mouseClicks || 1));
            const scrollScore = Math.min(1, (log.scrollCount || 0) / (exp.scrolls || 1));
            const activityScore = (keyScore + mouseScore + scrollScore) / 3;
            const idleSeconds = Math.min(idleMax, log.idleSeconds || 0);
            const idleFactor = (idleMax - idleSeconds) / idleMax;
            const score = Math.max(range.min ?? 0, Math.min(range.max ?? 100, (activityScore * weights.activityWeight + idleFactor * weights.idleWeight) * 100));

            const scoreData = {
                tenantId: tenantObjId,
                employeeID: employeeIDObj,
                activityLogId: log._id,
                timestamp: ts,
                score,
                idleSeconds: log.idleSeconds
            };
            if (at.trackKeyboard !== false) scoreData.keystrokes = log.keystrokes ?? 0;
            if (at.trackMouseClicks !== false) scoreData.mouseClicks = log.mouseClicks ?? 0;
            if (at.trackScroll !== false) scoreData.scrollCount = log.scrollCount ?? 0;
            await ProductivityScore.create(scoreData);
            console.log('[ActivityProcessor] Wrote monitoringscores', {
                employeeID: employeeIDObj,
                tenantId,
                ...(durationSec != null && { insertIntervalSeconds: durationSec })
            });
        } else {
            console.log('[ActivityProcessor] Skipped monitoringscores (productivitySettings.enabled is false)', { employeeID: employeeIDObj, tenantId });
        }
        const staffIdHex = employeeIDObj.toString();
        return { type: 'activity', activityLogId: log._id, employeeID: employeeIDObj, employeeId: staffIdHex, tenantId };
    }

    if (type === 'screenshot') {
        console.log('[ActivityProcessor] SCREENSHOT - starting process', { deviceId, tenantId });
        const monSettingsForScreenshot = await MonitoringSettings.findOne({ businessId: tenantObjId }).lean();
        const syncInterval = monSettingsForScreenshot?.syncSettings?.screenshotUploadIntervalMinutes ?? 5;
        console.log('[ActivityProcessor] Screenshot settings OK', { screenshotUploadIntervalMinutes: syncInterval });
        if (monSettingsForScreenshot?.monitoringEnabled === false) {
            throw new Error('Tracking disabled: monitoringEnabled is false.');
        }
        const ssEnabled = monSettingsForScreenshot?.screenshotSettings?.enabled;
        if (ssEnabled === false) {
            console.log('[ActivityProcessor] Screenshot skipped: screenshotSettings.enabled is false', { tenantId });
            throw new Error('Screenshot capture disabled in settings.');
        }
        let data;
        try {
            data = JSON.parse(payload);
        } catch (parseErr) {
            console.error('[ActivityProcessor] Screenshot payload JSON parse failed', { error: parseErr.message, payloadPreview: (payload || '').substring(0, 200) });
            throw parseErr;
        }
        // Support both camelCase and PascalCase (agent may send either)
        const imageB64 = data.imageBase64 ?? data.ImageBase64;
        if (!imageB64 || typeof imageB64 !== 'string') {
            console.error('[ActivityProcessor] Screenshot payload missing imageBase64', { dataKeys: Object.keys(data || {}) });
            throw new Error('Screenshot payload must include imageBase64 (or ImageBase64).');
        }
        const buffer = Buffer.from(imageB64, 'base64');
        // Resolve employeeID (ObjectId): agent sends staffId (hex) in payload or we get from Device
        const deviceIdVal = data.deviceId ?? data.DeviceId ?? deviceId;
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
        const dataTenantId = data.tenantId ?? data.TenantId ?? tenantId;
        const dataTimestamp = data.timestamp ?? data.Timestamp ?? timestamp;
        for (let attempt = 1; attempt <= CLOUDINARY_RETRIES; attempt++) {
            try {
                result = await cloudinaryService.uploadScreenshot(buffer, {
                    tenantId: dataTenantId,
                    employeeId: staffIdHex,
                    timestamp: dataTimestamp
                });
                break;
            } catch (err) {
                console.warn('[ActivityProcessor] Cloudinary upload attempt', attempt, 'failed', { error: err.message, hasCloudinaryConfig: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) });
                if (attempt === CLOUDINARY_RETRIES) throw err;
            }
        }
        const ts = new Date(dataTimestamp);
        const cacheKey = `${deviceIdVal}:${tenantObjId.toString()}`;
        const nowMs = Date.now();
        let cached = lastScreenshotCache.get(cacheKey);
        if (!cached) {
            const lastScreenshot = await Screenshot.findOne(
                { deviceId: deviceIdVal, tenantId: tenantObjId }
            ).sort({ timestamp: -1 }).select('timestamp').lean();
            const lastTs = lastScreenshot?.timestamp ? new Date(lastScreenshot.timestamp) : null;
            if (lastTs) {
                cached = { lastInsertedMs: lastTs.getTime(), lastCaptureTs: lastTs };
            }
        }
        const prevCaptureTs = cached?.lastCaptureTs || null;
        const rawMin = prevCaptureTs ? (ts - prevCaptureTs) / 60000 : null;
        const durationMin = rawMin != null ? Math.max(0, Math.round(rawMin * 10) / 10) : null;

        const minutesSinceLastInsert = cached?.lastInsertedMs != null
            ? (nowMs - cached.lastInsertedMs) / 60000
            : null;
        if (cached?.lastInsertedMs != null && minutesSinceLastInsert != null && minutesSinceLastInsert < syncInterval) {
            console.log('[ActivityProcessor] Screenshot skipped: too soon', {
                minutesSinceLastInsert: Math.round(minutesSinceLastInsert * 10) / 10,
                screenshotUploadIntervalMinutes: syncInterval
            });
            throw new Error(`Screenshot too soon: ${Math.round(minutesSinceLastInsert * 10) / 10}min since last insert (interval=${syncInterval}min). Wait for ${syncInterval}min.`);
        }

        await Screenshot.create({
            tenantId: tenantObjId,
            employeeID: employeeIDObj,
            deviceId: deviceIdVal,
            timestamp: ts,
            cloudinaryPublicId: result.public_id,
            cloudinaryUrl: result.url,
            secureUrl: result.secure_url,
            width: result.width,
            height: result.height,
            size: result.bytes
        });
        lastScreenshotCache.set(cacheKey, { lastInsertedMs: nowMs, lastCaptureTs: ts });
        console.log('[ActivityProcessor] SCREENSHOT INSERTED monitoringscreenshots', {
            employeeID: employeeIDObj,
            tenantId,
            deviceId: data.deviceId ?? deviceIdVal,
            timestamp: ts.toISOString(),
            cloudinaryPublicId: result.public_id,
            ...(durationMin != null && { minutesSincePreviousScreenshot: durationMin })
        });
        return { type: 'screenshot', employeeID: employeeIDObj, employeeId: staffIdHex, tenantId, publicId: result.public_id };
    }

    throw new Error('Unknown type: ' + type);
}

module.exports = { processPayload };
