const Staff = require('../models/Staff');
const Tracking = require('../models/Tracking');
const Task = require('../models/Task');
const TaskDetails = require('../models/TaskDetails');
const Branch = require('../models/Branch');
const Attendance = require('../models/Attendance');
const { upsertTaskDetails, buildUnsetExtended } = require('./taskController');
const { reverseGeocode } = require('../services/geocodingService');
const { parseTimestamp } = require('../utils/dateUtils');

/** Build location object per spec: { lat, lng, address?, pincode?, recordedAt } */
function buildLocationObject(lat, lng, address, pincode) {
  const now = new Date();
  return {
    lat: Number(lat),
    lng: Number(lng),
    ...(address != null && address !== '' && { address: String(address) }),
    ...(pincode != null && pincode !== '' && { pincode: String(pincode) }),
    recordedAt: parseTimestamp(now),
  };
}

/** Haversine distance in meters between two lat/lng points. */
function haversineDistanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get last start point (time + lat/lng) for segment calculation.
 * If restarted[] has entries: use last restart (segment: travel_resumed). Else: use initial start (segment: travel_started).
 */
function getLastStartPoint(details) {
  const restarted = details?.restarted || [];
  if (restarted.length > 0) {
    const last = restarted[restarted.length - 1];
    const loc = last.restartLocation || last;
    const lat = loc.lat ?? loc.latitude;
    const lng = loc.lng ?? loc.longitude;
    const t = last.restartedAt || last.resumedAt || last.time;
    return { startTime: t ? new Date(t) : null, startLat: lat, startLng: lng, segment: 'travel_resumed' };
  }
  const startTime = details?.startTime || details?.rideStartedAt || details?.started;
  const loc = details?.startLocation || details?.rideStartLocation || {};
  const lat = loc.lat ?? loc.latitude;
  const lng = loc.lng ?? loc.longitude;
  return { startTime: startTime ? new Date(startTime) : null, startLat: lat, startLng: lng, segment: 'travel_started' };
}

/**
 * Compute duration (seconds) and distance (km) from start point to end point.
 * segment: travel_started | travel_resumed (where segment began)
 * endType: travel_exited | arrived (how segment ended)
 */
function computeTravelSegment(startPoint, endLat, endLng, endTime, isArrived) {
  const segment = startPoint.segment; // travel_started or travel_resumed
  const endType = isArrived ? 'arrived' : 'travel_exited';
  const end = endTime ? new Date(endTime) : new Date();
  let durationSeconds = 0;
  if (startPoint.startTime) {
    durationSeconds = Math.round((end - startPoint.startTime) / 1000);
  }
  let distanceKm = 0;
  if (startPoint.startLat != null && startPoint.startLng != null && endLat != null && endLng != null) {
    const distM = haversineDistanceM(
      Number(startPoint.startLat),
      Number(startPoint.startLng),
      Number(endLat),
      Number(endLng)
    );
    distanceKm = distM / 1000;
  }
  return { segment, endType, durationSeconds, distanceKm, endTime: end };
}

/** Compute presenceStatus: 'task' if task in_progress, else 'in_office' if within staff's branch geofence, else 'out_of_office'.
 * Uses staff.branchId to find branch in branches collection and its geofence lat/lng/radius. */
async function computePresenceStatus(taskStatus, lat, lng, branchId) {
  const statusLower = String(taskStatus || '').toLowerCase();
  if (statusLower === 'in_progress') return 'task';

  if (!branchId) return 'out_of_office';
  const branch = await Branch.findById(branchId).select('geofence').lean();
  const gf = branch?.geofence;
  if (!gf?.enabled || gf?.latitude == null || gf?.longitude == null) return 'out_of_office';

  const radius = gf.radius ?? 100;
  const distM = haversineDistanceM(Number(lat), Number(lng), gf.latitude, gf.longitude);
  return distM <= radius ? 'in_office' : 'out_of_office';
}

/** Compute presenceStatus for staff presence (no task): 'in_office' if within branch geofence, else 'out_of_office'. */
async function computePresenceStatusForOffice(lat, lng, branchId) {
  if (!branchId) return 'out_of_office';
  const branch = await Branch.findById(branchId).select('geofence').lean();
  const gf = branch?.geofence;
  if (!gf?.enabled || gf?.latitude == null || gf?.longitude == null) return 'out_of_office';

  const radius = gf.radius ?? 200;
  const distM = haversineDistanceM(Number(lat), Number(lng), gf.latitude, gf.longitude);
  return distM <= radius ? 'in_office' : 'out_of_office';
}

/**
 * Validate today's attendance for presence tracking.
 * Track ONLY IF: punchIn exists AND punchOut does NOT exist AND leaveType is null/empty/not present.
 */
async function validateAttendanceForPresence(staffId) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

  let attendance = await Attendance.findOne({
    employeeId: staffId,
    date: { $gte: startOfDay, $lte: endOfDay },
  }).lean();

  if (!attendance) {
    attendance = await Attendance.findOne({
      user: staffId,
      date: { $gte: startOfDay, $lte: endOfDay },
    }).lean();
  }

  if (!attendance) return { canTrack: false, reason: 'no_attendance' };

  const punchIn = attendance.punchIn;
  const punchOut = attendance.punchOut;
  const leaveType = attendance.leaveType;

  if (!punchIn) return { canTrack: false, reason: 'no_check_in' };
  if (punchOut) return { canTrack: false, reason: 'checked_out' };
  if (leaveType != null && String(leaveType).trim() !== '') return { canTrack: false, reason: 'on_leave' };

  return { canTrack: true };
}

/**
 * POST /api/tracking/presence/store
 * Body: { lat, lng, timestamp?, batteryPercent?, movementType?, accuracy?, presenceStatus? }
 * Stores presence tracking point. Attendance-validated: only when checked in, not checked out, not on leave.
 * presenceStatus: 'in_office' | 'out_of_office' (server computes if not sent)
 */
exports.storePresenceTracking = async (req, res) => {
  try {
    const { lat, lng, timestamp, batteryPercent, movementType, accuracy, presenceStatus: clientPresenceStatus } = req.body;
    const staffId = req.staff?._id;
    const staffName = req.staff?.name;

    if (lat == null || lng == null) {
      return res.status(400).json({ success: false, message: 'lat, lng required' });
    }

    const validation = await validateAttendanceForPresence(staffId);
    if (!validation.canTrack) {
      return res.status(403).json({
        success: false,
        message: `Presence tracking not allowed: ${validation.reason || 'attendance state invalid'}`,
        reason: validation.reason,
      });
    }

    const branchId = req.staff?.branchId;
    const resolvedPresenceStatus =
      clientPresenceStatus && ['in_office', 'out_of_office'].includes(clientPresenceStatus)
        ? clientPresenceStatus
        : await computePresenceStatusForOffice(Number(lat), Number(lng), branchId);

    let geo = null;
    try {
      geo = await reverseGeocode(Number(lat), Number(lng));
    } catch (e) {
      console.log('[PresenceTracking] Geocode failed:', e.message);
    }

    const now = parseTimestamp(timestamp);
    const doc = {
      staffId,
      staffName: staffName || undefined,
      latitude: Number(lat),
      longitude: Number(lng),
      presenceStatus: resolvedPresenceStatus,
      timestamp: now,
      status: 'arrived',
      time: now,
      batteryPercent: batteryPercent != null ? Number(batteryPercent) : undefined,
      movementType: movementType || undefined,
      accuracy: accuracy != null ? Number(accuracy) : undefined,
      address: geo?.address || undefined,
      fullAddress: geo?.address || geo?.fullAddress || undefined,
      city: geo?.city || undefined,
      area: geo?.area || undefined,
      pincode: geo?.pincode || undefined,
    };

    const saved = await Tracking.create(doc);

    if (resolvedPresenceStatus === 'in_office') {
      console.log(
        '[PresenceTracking] in_office stored:',
        JSON.stringify({
          _id: saved._id,
          staffId: String(staffId),
          staffName: doc.staffName,
          latitude: doc.latitude,
          longitude: doc.longitude,
          presenceStatus: resolvedPresenceStatus,
          timestamp: doc.timestamp,
          address: doc.address,
          accuracy: doc.accuracy,
        }),
      );
    }

    res.status(201).json({ success: true, data: { _id: saved._id } });
  } catch (error) {
    console.error('[PresenceTracking] Error storing:', error.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * GET /api/tracking/presence/status
 * Returns whether staff can start presence tracking (attendance-validated).
 */
exports.getPresenceTrackingStatus = async (req, res) => {
  try {
    const staffId = req.staff?._id;
    if (!staffId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const validation = await validateAttendanceForPresence(staffId);
    const staff = await Staff.findById(staffId)
      .select('branchId')
      .populate('branchId', 'branchName geofence')
      .lean();

    let branchGeofence = null;
    if (staff?.branchId?.geofence?.enabled) {
      const gf = staff.branchId.geofence;
      branchGeofence = {
        latitude: gf.latitude,
        longitude: gf.longitude,
        radius: gf.radius ?? 200,
      };
    }

    res.status(200).json({
      success: true,
      data: {
        canTrack: validation.canTrack,
        reason: validation.reason,
        branchGeofence,
      },
    });
  } catch (error) {
    console.error('[PresenceTracking] Error getting status:', error.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * GET /api/tracking/presence
 * Query: staffId, from, to, limit – admin fetches presence records.
 */
exports.getPresenceTrackingData = async (req, res) => {
  try {
    const { staffId, from, to, limit = 500 } = req.query;
    const query = { $or: [{ taskId: null }, { taskId: { $exists: false } }] };
    if (staffId) query.staffId = staffId;
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }
    const records = await Tracking.find(query)
      .sort({ timestamp: -1 })
      .limit(Math.min(parseInt(limit, 10) || 500, 2000))
      .lean();
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    console.error('[PresenceTracking] Error fetching:', error.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * POST /api/tracking/store
 * Body: { taskId, lat, lng, timestamp?, batteryPercent?, movementType? }
 * Stores tracking point in Tracking collection with reverse-geocoded address.
 * Called by mobile app on Start Ride and every 15 sec during Live Tracking.
 */
exports.storeTracking = async (req, res) => {
  try {
    console.log('[Tracking] POST /store – raw body:', JSON.stringify(req.body));
    const { taskId, lat, lng, timestamp, batteryPercent, movementType, destinationLat, destinationLng } = req.body;
    const staffId = req.staff?._id;
    const staffName = req.staff?.name;
    if (!taskId || lat == null || lng == null) {
      return res.status(400).json({ success: false, message: 'taskId, lat, lng required' });
    }
    // taskId from body can be mongo _id or TASK-XXXXXXXX-XXXX; we store tasks._id (ObjectId)
    const isObjectId = /^[a-fA-F0-9]{24}$/.test(String(taskId));
    let task = isObjectId ? await Task.findById(taskId) : await Task.findOne({ taskId });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    task = await task.populate('assignedTo', 'name branchId');
    const staffIdObj = task.assignedTo?._id || staffId;
    const branchId = task.assignedTo?.branchId || req.staff?.branchId;
    const presenceStatus = await computePresenceStatus(task.status, lat, lng, branchId);
    const resolvedStaffName = task.assignedTo?.name || staffName;
    let geo = null;
    try {
      geo = await reverseGeocode(Number(lat), Number(lng));
    } catch (e) {
      console.log('[Tracking] Geocode failed:', e.message);
    }
    const trackingDoc = {
      taskId: task._id,
      staffId: staffIdObj || staffId,
      staffName: resolvedStaffName,
      latitude: Number(lat),
      longitude: Number(lng),
      presenceStatus,
      timestamp: parseTimestamp(timestamp),
      batteryPercent: batteryPercent != null ? Number(batteryPercent) : undefined,
      movementType: movementType || undefined,
      destinationLat: destinationLat != null ? Number(destinationLat) : undefined,
      destinationLng: destinationLng != null ? Number(destinationLng) : undefined,
      address: geo?.address || undefined,
      fullAddress: geo?.address || geo?.fullAddress || undefined,
      city: geo?.city || undefined,
      area: geo?.area || undefined,
      pincode: geo?.pincode || undefined,
    };
    console.log('[Tracking] POST /store – inserting:', JSON.stringify(trackingDoc, null, 2));
    const saved = await Tracking.create(trackingDoc);
    console.log('[Tracking] POST /store – saved _id:', saved._id);
    res.status(201).json({ success: true, data: { _id: saved._id } });
  } catch (error) {
    console.error('[Tracking] Error storing:', error.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * GET /api/tracking
 * Query: staffId, taskId, from (ISO date), to (ISO date), limit (default 500)
 * Admin fetches tracking records from the Tracking collection.
 */
exports.getTrackingData = async (req, res) => {
  try {
    const { staffId, taskId, from, to, limit = 500 } = req.query;
    const query = {};
    if (staffId) query.staffId = staffId;
    if (taskId) {
      const isObjectId = /^[a-fA-F0-9]{24}$/.test(String(taskId));
      const taskDoc = isObjectId ? await Task.findById(taskId).select('_id') : await Task.findOne({ taskId }).select('_id');
      query.taskId = taskDoc ? taskDoc._id : taskId;
    }
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }
    const records = await Tracking.find(query)
      .sort({ timestamp: -1 })
      .limit(Math.min(parseInt(limit, 10) || 500, 2000))
      .lean();
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    console.error('[Tracking] Error fetching tracking data:', error.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * POST /api/tracking/exit
 * Body: { taskId, exitReason, exitType, lat?, lng? }
 * exitType: 'hold' (staff can resume) | 'exited' (exit full ride; only admin can reopen, then staff resumes).
 * Saves exit to tasks.task_exit, task_details.exit array AND trackings collection.
 */
exports.exitTracking = async (req, res) => {
  try {
    console.log('[Tracking] POST /exit – body:', JSON.stringify(req.body));
    const { taskId, exitReason, exitType, lat, lng } = req.body;
    const staffId = req.staff?._id;
    const staffName = req.staff?.name;
    if (!taskId || !exitReason || String(exitReason).trim() === '') {
      const missing = [];
      if (!taskId) missing.push('taskId');
      if (!exitReason || String(exitReason).trim() === '') missing.push('exitReason');
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`,
      });
    }
    const normalizedExitType = (exitType === 'hold' || exitType === 'exited') ? exitType : 'exited';
    // Support taskId as MongoDB ObjectId or TASK-XXXXXXXX-XXXX
    const isObjectId = /^[a-fA-F0-9]{24}$/.test(String(taskId));
    let task = isObjectId ? await Task.findById(taskId) : await Task.findOne({ taskId });
    task = task ? await task.populate('assignedTo', 'name') : null;
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    const statusLower = String(task.status || '').toLowerCase().replace(/\s+/g, '');
    const allowedForExit = ['in_progress', 'inprogress', 'arrived', 'servingtoday', 'holdonarrival', 'reopenedonarrival'];
    if (!allowedForExit.includes(statusLower)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status for exit: task must be in_progress, arrived, holdOnArrival, or reopenedOnArrival, got ${task.status}`,
      });
    }
    const staffIdObj = task.assignedTo?._id || staffId;
    const resolvedStaffName = task.assignedTo?.name || staffName;

    const exitLat = lat != null ? Number(lat) : 0;
    const exitLng = lng != null ? Number(lng) : 0;
    let geo = null;
    if (exitLat !== 0 || exitLng !== 0) {
      try {
        geo = await reverseGeocode(exitLat, exitLng);
      } catch (e) {
        console.log('[Tracking] Exit geocode failed:', e.message);
      }
    }

    const exitAddress = geo?.address || undefined;
    const exitNow = parseTimestamp(new Date());
    const exitLocation = buildLocationObject(exitLat, exitLng, exitAddress, geo?.pincode);
    const exitRecord = {
      exitedAt: exitNow,
      exitReason: String(exitReason).trim(),
      exitLocation,
      status: normalizedExitType,
    };

    // When exiting from arrived (or holdOnArrival/reopenedOnArrival): use holdOnArrival / exitOnArrival; else Hold / exited
    const fromArrivedState = ['arrived', 'holdonarrival', 'reopenedonarrival'].includes(statusLower);
    let taskStatus;
    if (fromArrivedState) {
      taskStatus = normalizedExitType === 'hold' ? 'holdOnArrival' : 'exitOnArrival';
    } else {
      taskStatus = normalizedExitType === 'hold' ? 'Hold' : 'exited';
    }

    // Append to task.exit (never delete previous exits); set current task_exit and status
    const taskMongoId = task._id;
    try {
      await Task.findByIdAndUpdate(taskMongoId, {
        $set: {
          status: taskStatus,
          task_exit: {
            status: normalizedExitType,
            exitReason: String(exitReason).trim(),
            exitedAt: exitNow,
          },
        },
        $push: { exit: exitRecord },
        $unset: buildUnsetExtended(),
      }, { runValidators: false });
    } catch (updateErr) {
      console.error('[Tracking] Exit Task update failed:', updateErr.message);
      return res.status(400).json({
        success: false,
        message: `Failed to update task status: ${updateErr.message}`,
      });
    }
    const details = await TaskDetails.findOne({ taskId: task._id }).lean();
    const tasksExit = [...(details?.exit || []), exitRecord];

    // Compute and append travel segment only when exiting during ride (in_progress); skip when exiting after arrived
    let taskTravelDuration = details?.taskTravelDuration || [];
    let taskTravelDistance = details?.taskTravelDistance || [];
    if (statusLower === 'in_progress' || statusLower === 'in progress') {
      const startPoint = getLastStartPoint(details);
      const travelSegment = computeTravelSegment(startPoint, exitLat, exitLng, exitNow, false);
      taskTravelDuration = [...taskTravelDuration, { segment: travelSegment.segment, endType: travelSegment.endType, durationSeconds: travelSegment.durationSeconds, endTime: travelSegment.endTime }];
      taskTravelDistance = [...taskTravelDistance, { segment: travelSegment.segment, endType: travelSegment.endType, distanceKm: travelSegment.distanceKm, endTime: travelSegment.endTime }];
    }

    const fullDoc = {
      ...(details || {}),
      taskMongoId: task._id,
      status: taskStatus,
      exit: tasksExit,
      taskTravelDuration,
      taskTravelDistance,
    };
    await upsertTaskDetails(fullDoc);

    const trackingDoc = {
      taskId: task._id,
      staffId: staffIdObj || staffId,
      staffName: resolvedStaffName,
      latitude: exitLat,
      longitude: exitLng,
      presenceStatus: 'task', // task is in_progress at exit time
      exitStatus: normalizedExitType,
      exitReason: exitRecord.exitReason,
      exitedAt: exitRecord.exitedAt,
      time: exitRecord.exitedAt,
      address: exitAddress,
      fullAddress: exitAddress,
      pincode: geo?.pincode || undefined,
    };
    await Tracking.create(trackingDoc);
    res.status(201).json({ success: true, message: 'Exit recorded' });
  } catch (error) {
    console.error('[Tracking] Error recording exit:', error.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * POST /api/tracking/restart
 * Body: { taskId, lat?, lng? }
 * Allowed only when: task_exit.status === 'hold' (staff can resume) OR task.status === 'reopened' (admin reopened after exit full).
 */
exports.restartTracking = async (req, res) => {
  try {
    const { taskId, lat, lng, fullAddress, pincode } = req.body;
    if (!taskId) {
      return res.status(400).json({ success: false, message: 'taskId required' });
    }
    const task = await Task.findById(taskId).select('taskId status task_exit').lean();
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    const exitStatus = task.task_exit?.status;
    const statusLower = String(task.status || '').toLowerCase();
    const canRestart =
      statusLower === 'hold' ||
      statusLower === 'holdonarrival' ||
      statusLower === 'reopenedonarrival' ||
      (statusLower === 'exited' && (exitStatus === 'hold' || exitStatus == null)) ||
      statusLower === 'reopened';
    if (!canRestart) {
      if (!['exited', 'exitedonarrival', 'exitonarrival', 'reopened', 'reopenedonarrival', 'hold', 'holdonarrival'].includes(statusLower)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status for restart: task must be hold, holdOnArrival, exited, exitOnArrival, reopened, or reopenedOnArrival, got ${task.status}`,
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Only admin can reopen this task. You cannot resume until the task is reopened.',
      });
    }
    const resumeLat = lat != null ? Number(lat) : 0;
    const resumeLng = lng != null ? Number(lng) : 0;
    let geo = null;
    if (resumeLat !== 0 || resumeLng !== 0) {
      try {
        geo = await reverseGeocode(resumeLat, resumeLng);
      } catch (e) {
        console.log('[Tracking] Restart geocode failed:', e.message);
      }
    }
    const restartAddress = fullAddress || geo?.address || undefined;
    const resumeNow = parseTimestamp(new Date());
    const restartLocation = buildLocationObject(
      resumeLat,
      resumeLng,
      restartAddress,
      pincode || geo?.pincode
    );
    const restartRecord = {
      restartedAt: resumeNow,
      restartLocation,
    };
    const wasOnArrival = ['holdonarrival', 'reopenedonarrival'].includes(statusLower);
    const updateData = {
      status: wasOnArrival ? 'arrived' : 'in_progress',
      startTime: resumeNow,
      started: resumeNow,
      startLocation: { lat: resumeLat, lng: resumeLng },
      rideStartLocation: restartLocation,
      rideStartedAt: resumeNow,
      sourceLocation: {
        lat: resumeLat,
        lng: resumeLng,
        address: fullAddress || geo?.address || undefined,
        fullAddress: fullAddress || geo?.address || undefined,
        pincode: pincode || geo?.pincode || undefined,
      },
    };
    // Append to task.restarted; clear task_exit; set arrived (if was on arrival) or in_progress
    await Task.findByIdAndUpdate(taskId, {
      $set: { status: wasOnArrival ? 'arrived' : 'in_progress' },
      $push: { restarted: restartRecord },
      $unset: { ...buildUnsetExtended(), task_exit: 1 },
    });
    const details = await TaskDetails.findOne({ taskId: task._id }).lean();
    const tasksRestarted = [...(details?.restarted || []), restartRecord];
    const fullDoc = {
      ...(details || {}),
      taskMongoId: task._id,
      ...updateData,
      restarted: tasksRestarted,
    };
    await upsertTaskDetails(fullDoc);
    res.status(200).json({ success: true, message: 'Restart recorded' });
  } catch (error) {
    console.error('[Tracking] Error recording restart:', error.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * POST /api/tracking/arrived
 * Body: { taskId, lat, lng, fullAddress?, pincode?, sourceFullAddress? }
 * Stores arrived in tasks and trackings. Sets task status to "arrived".
 */
exports.arrivedTracking = async (req, res) => {
  try {
    const { taskId, lat, lng, fullAddress, pincode, sourceFullAddress } = req.body;
    const staffId = req.staff?._id;
    const staffName = req.staff?.name;
    if (!taskId || lat == null || lng == null) {
      return res.status(400).json({ success: false, message: 'taskId, lat, lng required' });
    }
    const task = await Task.findById(taskId).select('assignedTo taskId status').populate('assignedTo', 'name');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (task.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: `Invalid status for arrived: task must be in_progress, got ${task.status}`,
      });
    }
    const details = await TaskDetails.findOne({ taskId: task._id }).lean();
    const staffIdObj = task.assignedTo?._id || staffId;
    const resolvedStaffName = task.assignedTo?.name || staffName;

    const arrivalLat = Number(lat);
    const arrivalLng = Number(lng);
    let geo = null;
    try {
      geo = await reverseGeocode(arrivalLat, arrivalLng);
    } catch (e) {
      console.log('[Tracking] Arrived geocode failed:', e.message);
    }
    const resolvedFullAddress = fullAddress || geo?.address;
    const resolvedPincode = pincode || geo?.pincode;
    const srcLoc = details?.sourceLocation || req.body?.sourceLocation || {};
    const resolvedSourceFullAddress = sourceFullAddress || srcLoc.address || srcLoc.fullAddress;

    const now = parseTimestamp(new Date());
    const arrivalLocation = buildLocationObject(
      arrivalLat,
      arrivalLng,
      resolvedFullAddress,
      resolvedPincode
    );
    const updateData = {
      status: 'arrived',
      progressSteps: { ...(details?.progressSteps || {}), reachedLocation: true },
      arrivalTime: now,
      arrived: now,
      arrivedAt: now,
      arrivedLatitude: arrivalLat,
      arrivedLongitude: arrivalLng,
      arrivedFullAddress: resolvedFullAddress,
      arrivedPincode: resolvedPincode,
      arrivedDate: now,
      arrivedTime: new Date(now).toTimeString().slice(0, 8),
      arrivalLocation,
      sourceFullAddress: resolvedSourceFullAddress,
    };
    if (req.body.tripDurationSeconds != null) updateData.tripDurationSeconds = Number(req.body.tripDurationSeconds);
    if (req.body.sourceLocation) {
      updateData.sourceLocation = { ...srcLoc, ...req.body.sourceLocation };
    }
    const srcLat = srcLoc.lat ?? srcLoc.latitude;
    const srcLng = srcLoc.lng ?? srcLoc.longitude;
    if (srcLat != null && srcLng != null) {
      const distM = haversineDistanceM(srcLat, srcLng, arrivalLat, arrivalLng);
      updateData.tripDistanceKm = distM / 1000;
    } else if (req.body.tripDistanceKm != null) {
      updateData.tripDistanceKm = Number(req.body.tripDistanceKm);
    }

    // Compute and append travel segment: travel_started→arrived or travel_resumed→arrived
    const startPoint = getLastStartPoint(details);
    const travelSegment = computeTravelSegment(startPoint, arrivalLat, arrivalLng, now, true);
    const taskTravelDuration = [...(details?.taskTravelDuration || []), { segment: travelSegment.segment, endType: travelSegment.endType, durationSeconds: travelSegment.durationSeconds, endTime: travelSegment.endTime }];
    const taskTravelDistance = [...(details?.taskTravelDistance || []), { segment: travelSegment.segment, endType: travelSegment.endType, distanceKm: travelSegment.distanceKm, endTime: travelSegment.endTime }];

    await Task.findByIdAndUpdate(taskId, {
      $set: { status: 'arrived' },
      $unset: buildUnsetExtended(),
    });
    const fullDoc = {
      ...(details || {}),
      taskMongoId: task._id,
      ...updateData,
      taskTravelDuration,
      taskTravelDistance,
    };
    await upsertTaskDetails(fullDoc);

    const trackingDoc = {
      taskId: task._id,
      staffId: staffIdObj || staffId,
      staffName: resolvedStaffName,
      latitude: arrivalLat,
      longitude: arrivalLng,
      presenceStatus: 'task', // task is in_progress at arrived time
      status: 'arrived',
      fullAddress: resolvedFullAddress,
      address: resolvedFullAddress,
      pincode: resolvedPincode,
      time: now,
      timestamp: now,
    };
    await Tracking.create(trackingDoc);
    res.status(201).json({ success: true, message: 'Arrived recorded' });
  } catch (error) {
    console.error('[Tracking] Error recording arrived:', error.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * POST /api/tracking/start
 * Body: { staffId: "698431645d46a76820cf973d" }
 * Admin starts tracking a staff by staffId. Returns staff info.
 * Admin then connects via Socket.io, emits admin:track-staff { staffId }, and receives
 * tracking:location events for that staff.
 */
exports.startTracking = async (req, res) => {
  try {
    const { staffId } = req.body;
    if (!staffId) {
      return res.status(400).json({ success: false, message: 'staffId required' });
    }
    const staff = await Staff.findById(staffId).select('name');
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }
    res.status(200).json({
      success: true,
      data: {
        message: `Tracking started for ${staff.name}`,
        staffId: staff._id.toString(),
        staffName: staff.name,
      },
    });
  } catch (error) {
    console.error('[Tracking] Error starting tracking:', error.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
