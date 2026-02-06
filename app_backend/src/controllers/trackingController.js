const Staff = require('../models/Staff');
const Tracking = require('../models/Tracking');
const Task = require('../models/Task');
const TaskDetails = require('../models/TaskDetails');
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
    const task = await Task.findById(taskId).select('assignedTo').populate('assignedTo', 'name');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    const staffIdObj = task.assignedTo?._id || staffId;
    const resolvedStaffName = task.assignedTo?.name || staffName;
    let geo = null;
    try {
      geo = await reverseGeocode(Number(lat), Number(lng));
    } catch (e) {
      console.log('[Tracking] Geocode failed:', e.message);
    }
    const trackingDoc = {
      taskId,
      staffId: staffIdObj || staffId,
      staffName: resolvedStaffName,
      latitude: Number(lat),
      longitude: Number(lng),
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
    if (taskId) query.taskId = taskId;
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
 * Body: { taskId, exitReason, lat?, lng? }
 * Saves exit to tasks.tasks_exit array AND trackings collection.
 * Mobile sends current GPS (lat, lng) for address resolution.
 */
exports.exitTracking = async (req, res) => {
  try {
    const { taskId, exitReason, lat, lng } = req.body;
    const staffId = req.staff?._id;
    const staffName = req.staff?.name;
    if (!taskId || !exitReason || String(exitReason).trim() === '') {
      return res.status(400).json({ success: false, message: 'taskId and exitReason required' });
    }
    const task = await Task.findById(taskId).select('assignedTo taskId status').populate('assignedTo', 'name');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (task.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: `Invalid status for exit: task must be in_progress, got ${task.status}`,
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
    };

    await Task.findByIdAndUpdate(taskId, {
      $set: { status: 'exited' },
      $unset: buildUnsetExtended(),
    });
    const details = await TaskDetails.findOne({ taskId: task.taskId }).lean();
    const tasksExit = [...(details?.tasks_exit || []), exitRecord];
    const fullDoc = {
      ...(details || {}),
      taskId: task.taskId,
      status: 'exited',
      tasks_exit: tasksExit,
    };
    await upsertTaskDetails(fullDoc);

    const trackingDoc = {
      taskId,
      staffId: staffIdObj || staffId,
      staffName: resolvedStaffName,
      latitude: exitLat,
      longitude: exitLng,
      exitStatus: 'exited',
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
 * Records restart in tasks.tasks_restarted, updates status to in_progress.
 */
exports.restartTracking = async (req, res) => {
  try {
    const { taskId, lat, lng, fullAddress, pincode } = req.body;
    if (!taskId) {
      return res.status(400).json({ success: false, message: 'taskId required' });
    }
    const task = await Task.findById(taskId).select('taskId status');
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    if (task.status !== 'exited') {
      return res.status(400).json({
        success: false,
        message: `Invalid status for restart: task must be exited, got ${task.status}`,
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
    const updateData = {
      status: 'in_progress',
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
    await Task.findByIdAndUpdate(taskId, {
      $set: { status: 'in_progress' },
      $unset: buildUnsetExtended(),
    });
    const details = await TaskDetails.findOne({ taskId: task.taskId }).lean();
    const tasksRestarted = [...(details?.tasks_restarted || []), restartRecord];
    const fullDoc = {
      ...(details || {}),
      taskId: task.taskId,
      ...updateData,
      tasks_restarted: tasksRestarted,
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
    const details = await TaskDetails.findOne({ taskId: task.taskId }).lean();
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
    await Task.findByIdAndUpdate(taskId, {
      $set: { status: 'arrived' },
      $unset: buildUnsetExtended(),
    });
    const fullDoc = {
      ...(details || {}),
      taskId: task.taskId,
      ...updateData,
    };
    await upsertTaskDetails(fullDoc);

    const trackingDoc = {
      taskId,
      staffId: staffIdObj || staffId,
      staffName: resolvedStaffName,
      latitude: arrivalLat,
      longitude: arrivalLng,
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
