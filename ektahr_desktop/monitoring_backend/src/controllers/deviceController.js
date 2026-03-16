const jwt = require('jsonwebtoken');
const path = require('path');
const mongoose = require('../config/mongoose');

const Device = require('../models/Device');
const MonitoringVersion = require('../models/MonitoringVersion');
const MonitoringAttendanceCache = require('../models/MonitoringAttendanceCache');
const MonitoringSettings = require('../models/MonitoringSettings');
const appBackendRoot = path.join(__dirname, '../../../../', 'app_backend');
const Staff = require(path.join(appBackendRoot, 'src', 'models', 'Staff'));
const User = require(path.join(appBackendRoot, 'src', 'models', 'User'));
const Company = require(path.join(appBackendRoot, 'src', 'models', 'Company'));
require(path.join(appBackendRoot, 'src', 'models', 'Branch')); // register for Staff.populate('branchId')

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Cache for getSettings: reduce DB hits when agent fetches at startup and after uploads
const SETTINGS_CACHE_TTL_MS = 60 * 1000;
const settingsCache = new Map(); // tenantIdStr -> { data, expiresAt }

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

const buildEmailRegex = (email) => {
    const escaped = String(email).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escaped}$`, 'i');
};

exports.registerDevice = async (req, res) => {
    try {
        const { deviceId, employeeId, tenantId, email, password, machineName, osVersion, agentVersion, systemIp, systemModel } = req.body;
        console.log('[Device register] Request:', { deviceId, employeeId: employeeId ? '***' : null, tenantId: tenantId ? '***' : null, email: email ? '***' : null, machineName, osVersion, agentVersion, systemIp, systemModel });

        let staff;
        let tenantObjId;

        // Mode 1: email + password (email from Staff, password from User)
        if (email && password) {
            if (!deviceId) {
                return res.status(400).json({ success: false, message: 'Please try again. If the problem persists, contact your administrator.' });
            }
            const emailRegex = buildEmailRegex((email || '').trim().toLowerCase());
            const staffDoc = await Staff.findOne({ email: emailRegex }).select('_id employeeId businessId status userId').lean();
            if (!staffDoc) {
                return res.status(401).json({ success: false, message: 'Invalid email or password.' });
            }
            // Validate password against User collection (linked via Staff.userId)
            if (!staffDoc.userId) {
                return res.status(401).json({ success: false, message: 'Invalid email or password.' });
            }
            const user = await User.findById(staffDoc.userId).select('+password');
            if (!user || !user.password) {
                return res.status(401).json({ success: false, message: 'Invalid email or password.' });
            }
            if (user.isActive === false) {
                return res.status(401).json({ success: false, message: 'Your account is inactive. Please contact your administrator.' });
            }
            const passwordMatch = await user.matchPassword(password);
            if (!passwordMatch) {
                return res.status(401).json({ success: false, message: 'Invalid email or password.' });
            }
            staff = { _id: staffDoc._id, employeeId: staffDoc.employeeId, businessId: staffDoc.businessId, status: staffDoc.status };
            tenantObjId = staff.businessId;
            if (!tenantObjId) {
                return res.status(400).json({ success: false, message: 'Your account is not assigned to a company. Please contact your administrator.' });
            }
        }
        // Mode 2: employeeId + tenantId (legacy)
        else if (employeeId && tenantId) {
            if (!deviceId) {
                return res.status(400).json({ success: false, message: 'Please provide all required login details.' });
            }
            tenantObjId = new mongoose.Types.ObjectId(tenantId);
            staff = await Staff.findOne({
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
                    msg = 'Your employee account belongs to a different organization. Please use the correct login.';
                } else if (!staffByEmpId) {
                    msg = 'Employee not found. Please check your credentials and try again.';
                } else if (!companyExists) {
                    msg = 'Organization not found. Please contact your administrator.';
                }
                return res.status(404).json({ success: false, message: msg });
            }
        } else {
            return res.status(400).json({
                success: false,
                message: 'Please enter your email and password to sign in.'
            });
        }

        // Only staff with status "Active" can log in to the monitoring agent
        const staffStatus = (staff.status || '').trim();
        if (staffStatus.toLowerCase() !== 'active') {
            console.log('[Device register] Login denied: staff status is not Active', { staffId: staff._id, status: staffStatus });
            return res.status(403).json({
                success: false,
                message: 'Your account is inactive. Please contact your administrator.'
            });
        }
        console.log('[Device register] Staff found:', staff._id);

        let monSettings = null;
        try {
            monSettings = await MonitoringSettings.findOne({ businessId: tenantObjId }).lean();
        } catch (err) {
            console.warn('[Device register] MonitoringSettings lookup failed:', err?.message);
        }

        const disableIds = monSettings?.staffControl?.disableTrackingForStaffIds ?? [];
        const staffIdStr = staff._id?.toString?.() ?? staff._id;
        const isDisabled = disableIds.some(id => (id?.toString?.() ?? id) === staffIdStr);
        if (isDisabled) {
            console.log('[Device register] Login denied: staff in disableTrackingForStaffIds', { staffId: staffIdStr });
            return res.status(403).json({
                success: false,
                message: 'Monitoring is disabled for your account. Please contact your administrator.'
            });
        }

        // Block login if staff is already logged in on another device (one device per employee)
        const otherActiveDevice = await Device.findOne({
            employeeID: staff._id,
            deviceId: { $ne: deviceId },
            isActive: true
        }).select('deviceId').lean();
        if (otherActiveDevice) {
            console.log('[Device register] Login denied: already logged in on another device', { staffId: staff._id });
            return res.status(403).json({
                success: false,
                message: 'Already logged in on another device. Please log out from the other device first.'
            });
        }

        const existingDevice = await Device.findOne({ deviceId }).select('employeeID').lean();
        if (existingDevice?.employeeID && !existingDevice.employeeID.equals(staff._id)) {
            await Staff.updateOne({ _id: existingDevice.employeeID }, { $set: { monitoringStatus: 'logout' } });
            console.log('[Device register] Previous staff set to logout (device re-used)', { previousStaffId: existingDevice.employeeID });
        }

        await MonitoringAttendanceCache.deleteOne({ deviceId });

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
        const tenantIdStr = tenantObjId.toString();
        const accessToken = jwt.sign(
            { deviceId, staffId: staffIdHex, tenantId: tenantIdStr },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        const refreshToken = jwt.sign(
            { deviceId, type: 'refresh' },
            JWT_SECRET,
            { expiresIn: JWT_REFRESH_EXPIRES }
        );

        const { serverPublicKey } = getRsaKeys();

        console.log('[Device register] Success:', { deviceId, staffId: staffIdHex, tenantId: tenantIdStr, deviceDocId: device._id });

        const sync = monSettings?.syncSettings ?? {};
        const screenshotInterval = sync.screenshotUploadIntervalMinutes ?? 5;
        const activityUploadInterval = sync.activityUploadIntervalSeconds ?? 10;
        const alerts = monSettings?.alerts ?? {};
        const at = monSettings?.activityTracking ?? {};
        const ss = monSettings?.screenshotSettings ?? {};
        const blurInfo = ss?.blurSensitiveInfo ?? {};
        const blurEnabled = blurInfo.enabled !== false;
        const blurRulesRaw = blurInfo.rules ?? [];
        const blurRules = blurEnabled ? blurRulesRaw : [];
        const quality = ['low', 'medium', 'high'].includes(ss?.quality) ? ss.quality : 'medium';
        res.status(200).json({
            success: true,
            staffId: staffIdHex,
            employeeId: staff.employeeId,
            tenantId: tenantIdStr,
            accessToken,
            refreshToken,
            serverPublicKey: serverPublicKey || null,
            screenshotFrequency: screenshotInterval,
            activityUploadIntervalSeconds: activityUploadInterval,
            blurRules,
            screenshotSettings: {
                quality,
                blurSensitiveInfo: { enabled: blurEnabled, rules: blurRules }
            },
            monitoringEnabled: monSettings?.monitoringEnabled !== false,
            activityTracking: {
                enabled: at.enabled !== false,
                trackKeyboard: at.trackKeyboard !== false,
                trackMouseClicks: at.trackMouseClicks !== false,
                trackScroll: at.trackScroll !== false,
                trackActiveWindow: at.trackActiveWindow !== false
            },
            alerts: {
                idleAlert: alerts.idleAlert !== false,
                deviceOfflineAlert: alerts.deviceOfflineAlert !== false,
                breakExceededAlert: alerts.breakExceededAlert !== false
            },
            idleSettings: {
                idleTimeMinutes: monSettings?.idleSettings?.idleTimeMinutes ?? 5
            },
            breakSettings: {
                maxBreakDurationMinutes: monSettings?.breakSettings?.maxBreakDurationMinutes ?? 15,
                allowedBreaksPerDay: monSettings?.breakSettings?.allowedBreaksPerDay ?? 2
            }
        });
    } catch (error) {
        console.error('[Device register] Error:', error.message);
        console.error('[Device register] Stack:', error.stack);
        if (error.name === 'BSONError' && error.message.includes('ObjectId')) {
            return res.status(400).json({ success: false, message: 'Invalid organization ID. Please check your login details.' });
        }
        res.status(500).json({ success: false, message: 'Login failed. Please try again or contact your administrator.' });
    }
};

const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000; // 10 min
const OFFLINE_SWEEP_INTERVAL_MS = 10 * 60 * 1000; // run sweep at most every 10 min
let lastOfflineSweepAt = 0;

async function maybeMarkOfflineDevices() {
    const now = Date.now();
    if (now - lastOfflineSweepAt < OFFLINE_SWEEP_INTERVAL_MS) return;
    lastOfflineSweepAt = now;
    try {
        const cutoff = new Date(now - OFFLINE_THRESHOLD_MS);
        const offlineDevices = await Device.find(
            { lastSeenAt: { $lt: cutoff }, isActive: true }
        ).select('deviceId employeeID').lean();
        if (offlineDevices.length === 0) return;
        const result = await Device.updateMany(
            { lastSeenAt: { $lt: cutoff }, isActive: true },
            { $set: { isActive: false, status: 'inactive' } }
        );
        for (const d of offlineDevices) {
            if (d.employeeID) {
                await Staff.updateOne({ _id: d.employeeID }, { $set: { monitoringStatus: 'inactive' } });
            }
        }
        if (result.modifiedCount > 0) {
            console.log('[Heartbeat] Marked', result.modifiedCount, 'devices offline (no heartbeat)');
        }
    } catch (err) {
        console.error('[Heartbeat] Offline sweep error:', err?.message);
    }
}

exports.heartbeat = async (req, res) => {
    try {
        const { deviceId, employeeID } = req.device;

        await Device.updateOne(
            { deviceId },
            { $set: { lastSeenAt: new Date(), isActive: true, status: 'active' } }
        );

        maybeMarkOfflineDevices().catch(() => {}); // fire-and-forget, don't block response

        console.log('[Device heartbeat] OK', { deviceId, employeeID });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[Device heartbeat]', error);
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again or contact your administrator.' });
    }
};

exports.setInactive = async (req, res) => {
    try {
        const { deviceId, employeeID } = req.device;
        const totalTrackedSeconds = req.body?.totalTrackedSeconds;

        const device = await Device.findOne({ deviceId }).select('employeeID').lean();
        const result = await Device.updateOne(
            { deviceId },
            { $set: { isActive: false, status: 'inactive', lastSeenAt: new Date() } }
        );
        if (device?.employeeID) {
            await Staff.updateOne({ _id: device.employeeID }, { $set: { monitoringStatus: 'inactive' } });
        }

        if (typeof totalTrackedSeconds === 'number' && totalTrackedSeconds >= 0 && deviceId) {
            const now = new Date();
            await MonitoringAttendanceCache.findOneAndUpdate(
                { deviceId },
                { $set: { totalTrackedSecondsAtExit: Math.round(totalTrackedSeconds), totalTrackedSecondsAtExitUpdatedAt: now, lastUpdated: now } },
                { upsert: false }
            );
        }

        console.log('[Device set-inactive] OK', { deviceId, employeeID, modified: result.modifiedCount });
        res.status(200).json({ success: true, message: 'Device marked inactive' });
    } catch (error) {
        console.error('[Device set-inactive]', error);
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again or contact your administrator.' });
    }
};

exports.setLogout = async (req, res) => {
    try {
        const deviceId = req.device?.deviceId;
        if (!deviceId) return res.status(401).json({ message: 'Session expired. Please log in again.' });
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
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again or contact your administrator.' });
    }
};

exports.setExit = async (req, res) => {
    try {
        const deviceId = req.device?.deviceId;
        if (!deviceId) return res.status(401).json({ message: 'Session expired. Please log in again.' });
        const totalTrackedSeconds = req.body?.totalTrackedSeconds;
        const device = await Device.findOne({ deviceId }).select('employeeID tenantId').lean();
        const result = await Device.updateOne(
            { deviceId },
            { $set: { isActive: false, status: 'exited', lastSeenAt: new Date() } }
        );
        if (device?.employeeID) {
            await Staff.updateOne({ _id: device.employeeID }, { $set: { monitoringStatus: 'exited' } });
            console.log('[Device set-exit] OK', { deviceId, employeeID: device.employeeID, modified: result.modifiedCount });
        } else {
            console.log('[Device set-exit] OK', { deviceId, modified: result.modifiedCount });
        }
        if (typeof totalTrackedSeconds === 'number' && totalTrackedSeconds >= 0) {
            const now = new Date();
            await MonitoringAttendanceCache.findOneAndUpdate(
                { deviceId },
                {
                    $set: { totalTrackedSecondsAtExit: Math.round(totalTrackedSeconds), totalTrackedSecondsAtExitUpdatedAt: now, lastUpdated: now },
                    $setOnInsert: { deviceId, employeeID: device?.employeeID, tenantId: device?.tenantId }
                },
                { upsert: true }
            );
        }
        res.status(200).json({ success: true, message: 'Device marked exited' });
    } catch (error) {
        console.error('[Device set-exit]', error);
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again or contact your administrator.' });
    }
};

/** GET /device/settings - Return monitoring settings for agent (alerts, idle, break) based on device's tenantId. Cached per tenant for 60s. */
exports.getSettings = async (req, res) => {
    try {
        const device = req.device;
        const tenantObjId = device?.tenantId;
        if (!tenantObjId) {
            return res.status(401).json({ message: 'Session expired. Please log in again.' });
        }
        const tenantStr = tenantObjId.toString();
        const now = Date.now();
        const cached = settingsCache.get(tenantStr);
        if (cached && cached.expiresAt > now) {
            const deviceDoc = await Device.findOne({ deviceId: device.deviceId }).select('autoupdate').lean();
            const response = { ...cached.data, autoupdate: deviceDoc?.autoupdate === true };
            res.status(200).json(response);
            return;
        }
        let monSettings = null;
        try {
            monSettings = await MonitoringSettings.findOne({ businessId: tenantObjId }).lean();
        } catch (err) {
            console.warn('[Device getSettings] MonitoringSettings lookup failed:', err?.message);
        }
        const alerts = monSettings?.alerts ?? {};
        const at = monSettings?.activityTracking ?? {};
        const deviceDoc = await Device.findOne({ deviceId: device.deviceId }).select('autoupdate').lean();
        const autoupdate = deviceDoc?.autoupdate === true;
        const payload = {
            autoupdate,
            monitoringEnabled: monSettings?.monitoringEnabled !== false,
            activityTracking: {
                enabled: at.enabled !== false,
                trackKeyboard: at.trackKeyboard !== false,
                trackMouseClicks: at.trackMouseClicks !== false,
                trackScroll: at.trackScroll !== false,
                trackActiveWindow: at.trackActiveWindow !== false
            },
            alerts: {
                idleAlert: alerts.idleAlert !== false,
                deviceOfflineAlert: alerts.deviceOfflineAlert !== false,
                breakExceededAlert: alerts.breakExceededAlert !== false
            },
            idleSettings: {
                idleTimeMinutes: monSettings?.idleSettings?.idleTimeMinutes ?? 5
            },
            breakSettings: {
                maxBreakDurationMinutes: monSettings?.breakSettings?.maxBreakDurationMinutes ?? 15,
                allowedBreaksPerDay: monSettings?.breakSettings?.allowedBreaksPerDay ?? 2
            },
            productivitySettings: monSettings?.productivitySettings ?? {
                enabled: true,
                measurementWindowSeconds: 60,
                expectedActivityPerMinute: { keystrokes: 40, mouseClicks: 20, scrolls: 10 },
                weights: { activityWeight: 0.7, idleWeight: 0.3 },
                scoreRange: { min: 0, max: 100 }
            },
            staffControl: {
                disableTrackingForStaffIds: (monSettings?.staffControl?.disableTrackingForStaffIds ?? []).map(id => id?.toString?.() ?? id)
            },
            syncSettings: {
                activityUploadIntervalSeconds: monSettings?.syncSettings?.activityUploadIntervalSeconds ?? 10,
                screenshotUploadIntervalMinutes: monSettings?.syncSettings?.screenshotUploadIntervalMinutes ?? 5,
                retryFailedUploads: monSettings?.syncSettings?.retryFailedUploads !== false
            },
            screenshotSettings: (() => {
                const ss = monSettings?.screenshotSettings ?? {};
                const blurInfo = ss?.blurSensitiveInfo ?? {};
                const blurEnabled = blurInfo.enabled !== false;
                const rules = blurInfo.rules ?? [];
                const quality = ['low', 'medium', 'high'].includes(ss?.quality) ? ss.quality : 'medium';
                return {
                    quality,
                    blurSensitiveInfo: { enabled: blurEnabled, rules: blurEnabled ? rules : [] }
                };
            })()
        };
        settingsCache.set(tenantStr, { data: payload, expiresAt: now + SETTINGS_CACHE_TTL_MS });
        res.status(200).json(payload);

        const sync = monSettings?.syncSettings ?? {};
        console.log('[Device getSettings] OK', {
            deviceId: device?.deviceId,
            tenantId: tenantObjId?.toString(),
            activityUploadIntervalSeconds: sync.activityUploadIntervalSeconds ?? 10,
            screenshotUploadIntervalMinutes: sync.screenshotUploadIntervalMinutes ?? 5
        });
    } catch (error) {
        console.error('[Device getSettings] Error:', error.message);
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again or contact your administrator.' });
    }
};

/** GET /device/profile - Return staff profile for settings panel (name, email, company, branch, status). */
exports.getProfile = async (req, res) => {
    try {
        const device = req.device;
        const employeeID = device?.employeeID;
        if (!employeeID) {
            return res.status(401).json({ message: 'Session expired. Please log in again.' });
        }
        const staff = await Staff.findById(employeeID)
            .populate('businessId', 'name')
            .populate('branchId', 'branchName branchCode')
            .select('name email employeeId status designation department role joiningDate')
            .lean();
        if (!staff) {
            return res.status(404).json({ message: 'Profile not found. Please contact your administrator.' });
        }
        const companyName = staff.businessId?.name ?? '';
        const branch = staff.branchId ? (staff.branchId.branchName || staff.branchId.branchCode || '') : '';
        res.status(200).json({
            name: staff.name ?? '',
            email: staff.email ?? '',
            employeeId: staff.employeeId ?? '',
            status: staff.status ?? 'Active',
            designation: staff.designation ?? '',
            department: staff.department ?? '',
            role: staff.role ?? 'Employee',
            joiningDate: staff.joiningDate ?? null,
            companyName,
            branch
        });
    } catch (error) {
        console.error('[Device getProfile] Error:', error.message);
        res.status(500).json({ message: 'Something went wrong. Please try again or contact your administrator.' });
    }
};

/** When agent starts with existing session (e.g. after exit), set device and staff back to active so tracking resumes. */
exports.startDevice = async (req, res) => {
    try {
        const deviceId = req.device?.deviceId;
        if (!deviceId) return res.status(401).json({ message: 'Session expired. Please log in again.' });
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
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again or contact your administrator.' });
    }
};

/** Start of current day UTC (for day-boundary checks). */
function startOfTodayUTC() {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

/** GET /device/attendance-status - Return attendance-based tracking status.
 *  Track only when staff has checked in for TODAY and not yet checked out.
 *  After 12:00 AM, if staff did not check out the previous day, stop tracking until they check in for the new date.
 */
exports.getAttendanceStatus = async (req, res) => {
    try {
        const deviceId = req.device?.deviceId;
        if (!deviceId) {
            console.log('[attendance-status] 401: no device');
            return res.status(401).json({ message: 'Session expired. Please log in again.' });
        }
        const device = await Device.findOne({ deviceId }).select('isActive status employeeID tenantId').lean();
        const allowedToTrack = device && device.isActive && device.status === 'active';
        if (!allowedToTrack) {
            console.log('[attendance-status] shouldTrack=false: device not allowed', { deviceId, hasDevice: !!device, isActive: device?.isActive, status: device?.status });
            return res.status(200).json({
                shouldTrack: false,
                alertToShow: null,
                alertMessage: null,
                lastCheckIn: null,
                lastCheckOut: null
            });
        }
        let cache = await MonitoringAttendanceCache.findOne({ deviceId }).lean();
        const todayStart = startOfTodayUTC();
        // When cache missing (cron hasn't run yet), upsert from Attendance for today only
        if (!cache && device.employeeID && device.tenantId) {
            try {
                const Attendance = require(path.join(appBackendRoot, 'src', 'models', 'Attendance'));
                const endOfToday = new Date(todayStart);
                endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);
                const att = await Attendance.findOne({
                    $or: [{ employeeId: device.employeeID }, { user: device.employeeID }],
                    date: { $gte: todayStart, $lt: endOfToday }
                }).select('punchIn punchOut').lean();
                const punchIn = att?.punchIn ? new Date(att.punchIn) : null;
                const punchOut = att?.punchOut ? new Date(att.punchOut) : null;
                const shouldTrack = !!(punchIn && !punchOut);
                await MonitoringAttendanceCache.findOneAndUpdate(
                    { deviceId },
                    {
                        $set: {
                            deviceId,
                            employeeID: device.employeeID,
                            tenantId: device.tenantId,
                            shouldTrack,
                            lastCheckIn: punchIn,
                            lastCheckOut: punchOut,
                            lastUpdated: new Date()
                        }
                    },
                    { upsert: true }
                );
                cache = await MonitoringAttendanceCache.findOne({ deviceId }).lean();
                console.log('[attendance-status] Created cache from Attendance', { deviceId, shouldTrack });
            } catch (err) {
                console.warn('[attendance-status] Fallback cache create failed', { deviceId, err: err.message });
            }
        }
        if (!cache) {
            console.log('[attendance-status] shouldTrack=false (no cache, require check-in for today)', { deviceId });
            return res.status(200).json({
                shouldTrack: false,
                alertToShow: null,
                alertMessage: null,
                lastCheckIn: null,
                lastCheckOut: null
            });
        }
        // Day boundary: if cache says track but lastCheckIn is from a previous day, stop tracking until check-in for today
        let shouldTrack = !!cache.shouldTrack;
        const lastCheckInDate = cache.lastCheckIn ? new Date(cache.lastCheckIn) : null;
        if (shouldTrack && lastCheckInDate && lastCheckInDate < todayStart) {
            console.log('[attendance-status] shouldTrack=false: check-in was previous day, require check-in for today', { deviceId, lastCheckIn: cache.lastCheckIn });
            shouldTrack = false;
            await MonitoringAttendanceCache.findOneAndUpdate(
                { deviceId },
                { $set: { shouldTrack: false, lastUpdated: new Date() } }
            );
        }
        if (!shouldTrack) {
            console.log('[attendance-status] shouldTrack=false: not checked in today or already checked out', { deviceId, lastCheckIn: cache.lastCheckIn, lastCheckOut: cache.lastCheckOut });
        } else {
            console.log('[attendance-status] shouldTrack=true: checked in today, not yet checked out', { deviceId });
        }
        const alertMessage = cache.alertToShow === 'start_tracking'
            ? 'You have checked in. Start tracking.'
            : cache.alertToShow === 'stop_tracking'
                ? 'You have checked out. Stop tracking.'
                : null;
        return res.status(200).json({
            shouldTrack,
            alertToShow: cache.alertToShow || null,
            alertMessage,
            lastCheckIn: cache.lastCheckIn || null,
            lastCheckOut: cache.lastCheckOut || null
        });
    } catch (error) {
        console.error('[Device getAttendanceStatus]', error);
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again or contact your administrator.' });
    }
};

/** PATCH /device/autoupdate - Update autoupdate preference for this device. */
exports.updateAutoupdate = async (req, res) => {
    try {
        const deviceId = req.device?.deviceId;
        if (!deviceId) return res.status(401).json({ message: 'Session expired. Please log in again.' });
        const { autoupdate } = req.body;
        if (typeof autoupdate !== 'boolean') {
            return res.status(400).json({ success: false, message: 'Invalid request. Please try again.' });
        }
        await Device.updateOne({ deviceId }, { $set: { autoupdate } });
        console.log('[Device updateAutoupdate] OK', { deviceId, autoupdate });
        res.status(200).json({ success: true, autoupdate });
    } catch (error) {
        console.error('[Device updateAutoupdate]', error);
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again or contact your administrator.' });
    }
};

/** GET /device/version-check - Check if agent update is available from monitoringversions. Query: ?currentVersion=1.0.1&platform=windows */
exports.versionCheck = async (req, res) => {
    try {
        const currentVersion = (req.query.currentVersion || req.query.version || '').trim();
        const platform = (req.query.platform || 'windows').toLowerCase();

        const latest = await MonitoringVersion.findOne({ status: 'active' })
            .sort({ createdAt: -1 })
            .select('version platforms forceUpdate description releaseNotes')
            .lean();

        const latestVersion = latest?.version ?? null;
        const forceUpdate = latest?.forceUpdate ?? false;
        const platformObj = latest?.platforms?.find(p => p.name?.toLowerCase() === platform);
        const downloadUrl = platformObj?.downloadUrl ?? null;
        const updateAvailable = !!currentVersion && !!latestVersion && currentVersion !== latestVersion;

        res.status(200).json({
            currentVersion: currentVersion || null,
            latestVersion,
            downloadUrl,
            updateAvailable,
            forceUpdate,
            description: latest?.description ?? null,
            releaseNotes: latest?.releaseNotes ?? []
        });
    } catch (error) {
        console.error('[Device versionCheck]', error);
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again or contact your administrator.' });
    }
};

/** POST /device/ack-attendance-alert - Clear alertToShow after agent shows it. */
exports.ackAttendanceAlert = async (req, res) => {
    try {
        const deviceId = req.device?.deviceId;
        if (!deviceId) return res.status(401).json({ message: 'Session expired. Please log in again.' });
        await MonitoringAttendanceCache.updateOne(
            { deviceId },
            { $set: { alertToShow: null, lastUpdated: new Date() } }
        );
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[Device ackAttendanceAlert]', error);
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again or contact your administrator.' });
    }
};
