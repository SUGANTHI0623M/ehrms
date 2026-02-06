const Task = require('../models/Task');
const TaskDetails = require('../models/TaskDetails');
const TaskSettings = require('../models/TaskSettings');

/** Build location object per spec: { lat, lng, address?, pincode?, recordedAt } */
function buildLocationObject(lat, lng, address, pincode) {
  const now = parseTimestamp(new Date());
  return {
    lat: Number(lat),
    lng: Number(lng),
    ...(address != null && address !== '' && { address: String(address) }),
    ...(pincode != null && pincode !== '' && { pincode: String(pincode) }),
    recordedAt: now,
  };
}

/** Valid status transitions for updateTask. Reject invalid transitions. */
const VALID_TRANSITIONS = {
  approved: ['assigned', 'pending'],
  staffapproved: ['assigned', 'pending'],
  rejected: ['assigned', 'pending'],
  in_progress: ['approved', 'staffapproved', 'assigned', 'pending', 'exited'],
};
function isValidStatusTransition(fromStatus, toStatus) {
  if (!toStatus) return true;
  const allowed = VALID_TRANSITIONS[toStatus];
  if (!allowed) return true; // Allow other transitions for backward compat
  return allowed.includes(fromStatus);
}
const Customer = require('../models/Customer');
const Tracking = require('../models/Tracking');
const { parseTimestamp } = require('../utils/dateUtils');

const MINIMAL_TASK_KEYS = [
  'taskId', 'taskTitle', 'description', 'status', 'assignedTo', 'customerId',
  'assignedBy', 'assignedDate', 'expectedCompletionDate', 'earliestCompletionDate',
  'latestCompletionDate', 'businessId',
];

const EXTENDED_TASK_KEYS = [
  'sourceLocation', 'destinationLocation', 'destinationChanged', 'destinations',
  'startLocation', 'rideStartLocation', 'rideStartedAt', 'startTime', 'started',
  'tripDistanceKm', 'tripDurationSeconds', 'arrivalTime', 'arrived',
  'arrivedLatitude', 'arrivedLongitude', 'arrivedFullAddress', 'arrivedPincode',
  'arrivedDate', 'arrivedTime', 'arrivalLocation', 'sourceFullAddress',
  'photoProofUrl', 'photoProofUploadedAt', 'photoProofDescription', 'photoProofLat',
  'photoProofLng', 'photoProofAddress', 'otpCode', 'otpSentAt', 'otpVerifiedAt',
  'otpVerifiedLat', 'otpVerifiedLng', 'otpVerifiedAddress', 'progressSteps',
  'tasks_exit', 'tasks_restarted', 'completedDate', 'completedBy', 'locationHistory',
  'approvedAt', 'approvedBy', 'rejectedAt', 'rejectedBy',
];

/** Build $unset for extended fields (to keep tasks collection minimal). Exported for trackingController. */
exports.buildUnsetExtended = function buildUnsetExtended() {
  const unset = {};
  for (const k of EXTENDED_TASK_KEYS) unset[k] = 1;
  return unset;
};

/** Extract minimal fields for tasks collection. */
function getMinimalTaskFields(doc) {
  const obj = doc?.toObject ? doc.toObject() : { ...doc };
  const out = {};
  for (const k of MINIMAL_TASK_KEYS) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

/** Fields that come from TaskSettings only – do not store in task_details */
const TASK_SETTINGS_ONLY_FIELDS = ['isOtpRequired', 'isGeoFenceRequired', 'isPhotoRequired', 'isFormRequired'];

/** Upsert full task details into task_details collection. Exported for use in trackingController. */
exports.upsertTaskDetails = async function upsertTaskDetails(fullDoc) {
  if (!fullDoc || !fullDoc.taskId) return;
  try {
    const obj = fullDoc?.toObject ? fullDoc.toObject() : { ...fullDoc };
    delete obj.locationHistory;
    delete obj.__v;
    delete obj._id; // task_details uses taskId as lookup, not _id
    TASK_SETTINGS_ONLY_FIELDS.forEach((k) => delete obj[k]);
    const unsetFields = {};
    TASK_SETTINGS_ONLY_FIELDS.forEach((k) => { unsetFields[k] = 1; });
    await TaskDetails.findOneAndUpdate(
      { taskId: obj.taskId },
      { $set: obj, $unset: unsetFields },
      { upsert: true, new: true }
    );
    console.log('[Tasks] Upserted task_details for:', obj.taskId);
  } catch (err) {
    console.warn('[Tasks] upsertTaskDetails error:', err.message);
  }
};

/** Merge Task + TaskDetails for API response. Extended fields always from task_details. */
async function mergeTaskWithDetails(taskDoc) {
  if (!taskDoc) return null;
  const task = taskDoc.toObject ? taskDoc.toObject() : { ...taskDoc };
  const taskIdStr = task.taskId || task._id?.toString();
  let details = null;
  if (taskIdStr) {
    details = await TaskDetails.findOne({ taskId: taskIdStr }).lean();
  }
  const merged = { ...(details || {}), ...task };
  merged._id = task._id;
  merged.taskId = task.taskId || details?.taskId || taskIdStr;
  if (details) {
    for (const k of EXTENDED_TASK_KEYS) {
      if (details[k] !== undefined) merged[k] = details[k];
    }
  }
  return merged;
}
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const { sendTaskOtpEmail } = require('../services/emailService');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** Normalize date fields in request body for correct UTC storage. */
function normalizeTaskBody(body) {
  const out = { ...body };
  const dateFields = ['expectedCompletionDate', 'assignedDate', 'earliestCompletionDate', 'latestCompletionDate'];
  for (const k of dateFields) {
    if (out[k] != null) out[k] = parseTimestamp(out[k]);
  }
  return out;
}

exports.createTask = async (req, res) => {
  try {
    const normalized = normalizeTaskBody(req.body);
    const minimal = getMinimalTaskFields(normalized);
    if (!minimal.taskId) minimal.taskId = `TASK-${Date.now()}`;
    const newTask = new Task(minimal);
    await newTask.save();
    const fullDoc = { ...normalized, taskId: newTask.taskId, _id: newTask._id };
    await exports.upsertTaskDetails(fullDoc);
    const merged = await mergeTaskWithDetails(newTask);
    res.status(201).json(merged);
  } catch (error) {
    console.error('[Tasks] createTask validation error:', error.message);
    console.error('[Tasks] Request body:', JSON.stringify(req.body, null, 2));
    if (error.errors) {
      Object.keys(error.errors).forEach((k) => {
        console.error(`[Tasks]   ${k}:`, error.errors[k]?.message);
      });
    }
    res.status(400).json({ message: error.message });
  }
};

exports.getAllTasks = async (req, res) => {
  try {
    console.log('[Tasks] GET /tasks - fetching all tasks...');
    const tasks = await Task.find().populate('assignedTo').populate('customerId');
    const merged = await Promise.all(tasks.map((t) => mergeTaskWithDetails(t)));
    console.log('[Tasks] Fetched', merged.length, 'task(s)');
    res.status(200).json(merged);
  } catch (error) {
    console.error('[Tasks] Error fetching all tasks:', error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.getTasksByStaffId = async (req, res) => {
  try {
    const { staffId } = req.params;
    console.log('[Tasks] GET /tasks/staff/:staffId - staffId:', staffId);
    const tasks = await Task.find({ assignedTo: staffId })
      .populate('assignedTo')
      .populate('customerId');
    const companyId = tasks[0] ? getCompanyIdFromTask(tasks[0]) : null;
    const mergedRaw = await Promise.all(tasks.map((t) => mergeTaskWithDetails(t)));
    const merged = await Promise.all(
      mergedRaw.map((t) => mergeTaskSettings(t, companyId))
    );
    console.log('[Tasks] Fetched', merged.length, 'task(s) for staff');
    res.status(200).json(merged);
  } catch (error) {
    console.error('[Tasks] Error fetching tasks by staff:', error.message);
    res.status(500).json({ message: error.message });
  }
};

/** Merge task-settings (enableOtpVerification, etc.) into task for API response. */
async function mergeTaskSettings(taskDoc, companyId) {
  const task = taskDoc?.toObject ? taskDoc.toObject() : { ...taskDoc };
  task.customFields = task.customFields || {};
  if (task.progressSteps?.otpVerified === true || task.otpVerifiedAt) {
    task.customFields.otpVerified = true;
    task.customFields.otpVerifiedAt = task.otpVerifiedAt || task.customFields.otpVerifiedAt;
  }
  try {
    let settings = null;
    // businessId in Staff/Task = businessId in task-settings; query by either
    if (companyId) {
      settings = await TaskSettings.findOne({
        $or: [{ companyId }, { businessId: companyId }],
      }).lean();
    }
    if (!settings) {
      settings = await TaskSettings.findOne().lean();
    }
    if (settings) {
      task.customFields = task.customFields || {};
      // OTP required/not required comes only from TaskSettings (enableOtpVerification)
      task.customFields.otpRequired = settings.settings?.enableOtpVerification === true;
      if (settings.settings?.requireApprovalOnComplete !== undefined) {
        task.requireApprovalOnComplete = settings.settings.requireApprovalOnComplete;
      }
      if (settings.settings?.autoApprove !== undefined) {
        task.autoApprove = settings.settings.autoApprove;
      }
    }
  } catch (err) {
    console.warn('[Tasks] mergeTaskSettings:', err.message);
  }
  return task;
}

function getCompanyIdFromTask(task) {
  const assignedTo = task?.assignedTo;
  if (assignedTo?.businessId) return assignedTo.businessId;
  if (task?.businessId) return task.businessId;
  return null;
}

exports.getTaskById = async (req, res) => {
  try {
    const taskId = req.params.id;
    console.log('[Tasks] GET /tasks/:id - taskId:', taskId);
    const task = await Task.findById(taskId).populate('assignedTo').populate('customerId');
    if (!task) {
      console.log('[Tasks] Task not found:', taskId);
      return res.status(404).json({ message: 'Task not found' });
    }
    const mergedTask = await mergeTaskWithDetails(task);
    const companyId = getCompanyIdFromTask(task);
    const merged = await mergeTaskSettings(mergedTask, companyId);
    console.log('[Tasks] Fetched task:', task.taskId || taskId);
    res.status(200).json(merged);
  } catch (error) {
    console.error('[Tasks] Error fetching task by id:', error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const {
      status,
      startTime,
      started,
      startLocation,
      startLat,
      startLng,
      sourceLocation,
      destinationLocation,
      destinationChanged,
      tripDistanceKm,
      tripDurationSeconds,
      arrivalTime,
    } = req.body;
    const resolvedStartLocation = startLocation || (startLat != null && startLng != null ? { lat: startLat, lng: startLng } : null);
    console.log('[Tasks] PATCH /tasks/:id - full body:', JSON.stringify(req.body));
    const updateData = {};
    if (status != null) updateData.status = status;
    const now = new Date();
    if (status === 'in_progress') {
      updateData.rideStartedAt = parseTimestamp(now);
      if (resolvedStartLocation) {
        updateData.rideStartLocation = buildLocationObject(
          resolvedStartLocation.lat,
          resolvedStartLocation.lng,
          resolvedStartLocation.address ?? resolvedStartLocation.fullAddress,
          resolvedStartLocation.pincode
        );
      }
    }
    if (startTime != null) updateData.startTime = parseTimestamp(startTime);
    if (started != null) updateData.started = parseTimestamp(started);
    if (resolvedStartLocation != null) updateData.startLocation = resolvedStartLocation;
    if (sourceLocation != null) updateData.sourceLocation = sourceLocation;
    if (destinationLocation != null) {
      updateData.destinationLocation = destinationLocation;
      updateData.destinationChanged = destinationChanged !== false;
    }
    if (destinationChanged != null && destinationLocation == null)
      updateData.destinationChanged = destinationChanged;
    if (tripDistanceKm != null) updateData.tripDistanceKm = Number(tripDistanceKm);
    if (tripDurationSeconds != null) updateData.tripDurationSeconds = Number(tripDurationSeconds);
    if (arrivalTime != null) updateData.arrivalTime = parseTimestamp(arrivalTime);
    const staffId = req.staff?._id;
    if ((status === 'approved' || status === 'staffapproved') && staffId) {
      updateData.approvedAt = parseTimestamp(new Date());
      updateData.approvedBy = staffId;
    }
    if (status === 'rejected' && staffId) {
      updateData.rejectedAt = new Date();
      updateData.rejectedBy = staffId;
    }

    const task = await Task.findById(taskId).populate('assignedTo').populate('customerId');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (status != null && !isValidStatusTransition(task.status, status)) {
      return res.status(400).json({
        message: `Invalid status transition: ${task.status} → ${status}`,
      });
    }

    const details = await TaskDetails.findOne({ taskId: task.taskId }).lean();
    const fullDoc = { ...(details || {}), ...req.body, ...updateData, taskId: task.taskId };
    if (destinationLocation != null) {
      fullDoc.destinations = fullDoc.destinations || [];
      fullDoc.destinations.push({
        lat: Number(destinationLocation.lat),
        lng: Number(destinationLocation.lng),
        address: destinationLocation.address || '',
        changedAt: parseTimestamp(new Date()),
      });
    }
    const minimalUpdate = getMinimalTaskFields(fullDoc);
    const updateOp = {};
    if (Object.keys(minimalUpdate).length > 0) updateOp.$set = minimalUpdate;
    updateOp.$unset = exports.buildUnsetExtended();
    // Update tasks collection (status, etc.)
    await Task.findByIdAndUpdate(taskId, updateOp);
    // Sync to task_details (approve → approved, start ride → in_progress)
    await exports.upsertTaskDetails(fullDoc);
    const updatedTask = await Task.findById(taskId).populate('assignedTo').populate('customerId');
    const merged = await mergeTaskWithDetails(updatedTask);
    const companyId = getCompanyIdFromTask(updatedTask);
    const finalMerged = await mergeTaskSettings(merged, companyId);
    console.log('[Tasks] Updated task:', task.taskId);
    res.status(200).json(finalMerged);
  } catch (error) {
    console.error('[Tasks] Error updating task:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// POST /tasks/:id/location – broadcast live GPS for Socket.io. Location stored in trackings collection.
exports.updateLocation = async (req, res) => {
  try {
    const taskId = req.params.id;
    const { lat, lng, timestamp, batteryPercent, movementType } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ message: 'lat and lng required' });
    }
    const point = {
      lat: Number(lat),
      lng: Number(lng),
      timestamp: parseTimestamp(timestamp),
      batteryPercent: batteryPercent != null ? Number(batteryPercent) : undefined,
    };
    const task = await Task.findById(taskId)
      .select('taskId assignedTo')
      .populate('assignedTo', 'name');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    // Note: Tracking storage is via POST /api/tracking/store (mobile calls it separately)
    // Broadcast to Socket.io for live view (staff + admin)
    const io = req.app.get('io');
    if (io) {
      const staffIdStr = task.assignedTo?._id?.toString();
      const payload = {
        taskId,
        taskMongoId: taskId,
        staffId: staffIdStr || undefined,
        latitude: point.lat,
        longitude: point.lng,
        timestamp: point.timestamp,
        batteryPercent: point.batteryPercent,
        movementType: movementType || undefined,
        staffName: task.assignedTo?.name,
      };
      io.to(`task:${taskId}`).emit('tracking:location', payload);
      io.to('admin:tracking').emit('tracking:location', payload);
      // Admin tracking by staffId (admin at 192.168.16.114 joins admin:staff:${staffId})
      if (staffIdStr) io.to(`admin:staff:${staffIdStr}`).emit('tracking:location', payload);
    }
    res.status(200).json({ success: true, taskId: task.taskId });
  } catch (error) {
    console.error('[Tasks] Error updating location:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// PATCH /tasks/:id/steps – update step completion (reachedLocation, photoProof, formFilled, otpVerified).
exports.updateSteps = async (req, res) => {
  try {
    const taskId = req.params.id;
    const { reachedLocation, photoProof, formFilled, otpVerified } = req.body;
    const updateData = {};
    if (reachedLocation !== undefined) updateData['progressSteps.reachedLocation'] = !!reachedLocation;
    if (photoProof !== undefined) updateData['progressSteps.photoProof'] = !!photoProof;
    if (formFilled !== undefined) updateData['progressSteps.formFilled'] = !!formFilled;
    if (otpVerified !== undefined) updateData['progressSteps.otpVerified'] = !!otpVerified;
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'At least one step field required' });
    }
    const task = await Task.findById(taskId).populate('assignedTo').populate('customerId');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const details = await TaskDetails.findOne({ taskId: task.taskId }).lean();
    const fullDoc = {
      ...(details || {}),
      taskId: task.taskId,
      progressSteps: {
        ...(details?.progressSteps || {}),
        ...(reachedLocation !== undefined && { reachedLocation: !!reachedLocation }),
        ...(photoProof !== undefined && { photoProof: !!photoProof }),
        ...(formFilled !== undefined && { formFilled: !!formFilled }),
        ...(otpVerified !== undefined && { otpVerified: !!otpVerified }),
      },
    };
    await exports.upsertTaskDetails(fullDoc);
    const merged = await mergeTaskWithDetails(task);
    console.log('[Tasks] Updated steps for task:', task.taskId);
    res.status(200).json(merged);
  } catch (error) {
    console.error('[Tasks] Error updating steps:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// GET /tasks/:id/completion-report – full task completion report with timeline + route from DB.
exports.getCompletionReport = async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId)
      .populate('assignedTo', 'name')
      .populate('customerId')
      .lean();
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const details = await TaskDetails.findOne({ taskId: task.taskId }).lean();
    const taskObj = { ...(details || {}), ...task };
    if (details) {
      for (const k of EXTENDED_TASK_KEYS) {
        if (details[k] !== undefined) taskObj[k] = details[k];
      }
    }

    const trackingRecords = await Tracking.find({ taskId })
      .sort({ timestamp: 1 })
      .lean();

    const routePoints = trackingRecords
          .filter((r) => r.latitude != null && r.longitude != null)
          .map((r) => ({
            lat: r.latitude,
            lng: r.longitude,
            timestamp: r.timestamp,
            movementType: r.movementType,
            address: r.address || r.fullAddress,
          }));

    const timeline = [];

    if (taskObj.startTime) {
      timeline.push({
        type: 'start',
        label: 'Start',
        time: taskObj.startTime,
        address: taskObj.sourceLocation?.address || taskObj.sourceLocation?.fullAddress,
        lat: taskObj.sourceLocation?.lat,
        lng: taskObj.sourceLocation?.lng,
      });
    }

    let lastMovementType = null;
    for (const tr of trackingRecords) {
      const ts = tr.timestamp || tr.time;
      if (!ts) continue;
      if (tr.status === 'arrived') {
        timeline.push({
          type: 'arrived',
          label: 'Arrived',
          time: ts,
          address: tr.fullAddress || tr.address,
          lat: tr.latitude,
          lng: tr.longitude,
        });
      } else if (tr.exitStatus === 'exited') {
        timeline.push({
          type: 'exit',
          label: 'Outage',
          time: tr.exitedAt || ts,
          address: tr.address || tr.fullAddress,
          lat: tr.latitude,
          lng: tr.longitude,
          exitReason: tr.exitReason,
        });
      } else if (tr.movementType && tr.movementType !== lastMovementType) {
        lastMovementType = tr.movementType;
        const label = tr.movementType === 'drive' ? 'Ride' : tr.movementType === 'walk' ? 'Walk' : tr.movementType === 'stop' ? 'Stop' : tr.movementType;
        timeline.push({
          type: 'movement',
          label,
          time: ts,
          address: tr.fullAddress || tr.address,
          lat: tr.latitude,
          lng: tr.longitude,
          movementType: tr.movementType,
        });
      }
    }

    const exits = taskObj.tasks_exit || [];
    for (const ex of exits) {
      const loc = ex.exitLocation || ex;
      const exTime = ex.exitedAt || ex.time;
      if (!timeline.some((t) => t.type === 'exit' && new Date(t.time).getTime() === new Date(exTime).getTime())) {
        timeline.push({
          type: 'exit',
          label: 'Outage',
          time: exTime,
          address: loc.address || loc.fullAddress,
          lat: loc.lat,
          lng: loc.lng,
          exitReason: ex.exitReason,
        });
      }
    }

    const restarts = taskObj.tasks_restarted || [];
    for (const rs of restarts) {
      const loc = rs.restartLocation || rs;
      const rsTime = rs.restartedAt || rs.resumedAt || rs.time;
      timeline.push({
        type: 'restart',
        label: 'Resumed',
        time: rsTime,
        address: loc.address || loc.fullAddress,
        lat: loc.lat,
        lng: loc.lng,
      });
    }

    if (taskObj.photoProofUploadedAt) {
      timeline.push({
        type: 'photo',
        label: 'Photo proof uploaded',
        time: taskObj.photoProofUploadedAt,
        address: taskObj.photoProofAddress,
        lat: taskObj.photoProofLat,
        lng: taskObj.photoProofLng,
      });
    }

    if (taskObj.otpVerifiedAt) {
      timeline.push({
        type: 'otp',
        label: 'OTP verified',
        time: taskObj.otpVerifiedAt,
        address: taskObj.otpVerifiedAddress,
        lat: taskObj.otpVerifiedLat,
        lng: taskObj.otpVerifiedLng,
      });
    }

    if (taskObj.arrivalTime && !timeline.some((t) => t.type === 'arrived')) {
      timeline.push({
        type: 'arrived',
        label: 'Arrived',
        time: taskObj.arrivalTime,
        address: taskObj.arrivedFullAddress,
        lat: taskObj.arrivedLatitude,
        lng: taskObj.arrivedLongitude,
      });
    }

    if (taskObj.completedDate) {
      timeline.push({
        type: 'completed',
        label: 'Completed',
        time: taskObj.completedDate,
        address: taskObj.arrivedFullAddress,
        lat: taskObj.arrivedLatitude,
        lng: taskObj.arrivedLongitude,
      });
    }

    timeline.sort((a, b) => {
      const ta = a.time ? new Date(a.time).getTime() : 0;
      const tb = b.time ? new Date(b.time).getTime() : 0;
      return ta - tb;
    });

    res.status(200).json({
      task: taskObj,
      timeline,
      routePoints,
    });
  } catch (error) {
    console.error('[Tasks] getCompletionReport error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// GET /tasks/:id/tracking-path – full GPS path for admin replay (from trackings collection).
exports.getTrackingPath = async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId)
      .select('taskId status assignedTo customerId')
      .populate('assignedTo', 'name')
      .populate('customerId', 'address city pincode');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const trackingRecords = await Tracking.find({ taskId })
      .sort({ timestamp: 1 })
      .lean();
    const points = trackingRecords
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => ({
        latitude: r.latitude,
        longitude: r.longitude,
        timestamp: r.timestamp,
        batteryPercent: r.batteryPercent,
      }));
    res.status(200).json({
      taskId: task.taskId,
      status: task.status,
      staff: task.assignedTo,
      customer: task.customerId,
      path: points,
    });
  } catch (error) {
    console.error('[Tasks] Error fetching tracking path:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// POST /tasks/:id/photo – upload photo proof to Cloudinary, store URL, set photoProof true.
exports.uploadPhotoProof = async (req, res) => {
  try {
    const taskId = req.params.id;
    const file = req.file;
    const description = req.body?.description?.trim();
    if (!file) {
      return res.status(400).json({ message: 'Photo file required' });
    }
    let uploadResult;
    try {
      uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: 'hrms/task-photos',
        resource_type: 'image',
        public_id: `task_${taskId}_${Date.now()}`,
      });
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (uploadErr) {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(500).json({ message: 'Photo upload failed: ' + uploadErr.message });
    }
    const photoUrl = uploadResult?.secure_url;
    if (!photoUrl) {
      return res.status(500).json({ message: 'Photo upload failed' });
    }
    const { lat, lng, fullAddress } = req.body;
    const task = await Task.findById(taskId).populate('assignedTo').populate('customerId');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const details = await TaskDetails.findOne({ taskId: task.taskId }).lean();
    const fullDoc = {
      ...(details || {}),
      taskId: task.taskId,
      photoProofUrl: photoUrl,
      photoProofUploadedAt: new Date(),
      progressSteps: {
        ...(details?.progressSteps || {}),
        photoProof: true,
      },
    };
    if (description) fullDoc.photoProofDescription = description;
    if (lat != null) fullDoc.photoProofLat = Number(lat);
    if (lng != null) fullDoc.photoProofLng = Number(lng);
    if (fullAddress) fullDoc.photoProofAddress = String(fullAddress);
    await exports.upsertTaskDetails(fullDoc);
    const merged = await mergeTaskWithDetails(task);
    const companyId = getCompanyIdFromTask(task);
    const finalMerged = await mergeTaskSettings(merged, companyId);
    console.log('[Tasks] Photo proof uploaded for task:', task.taskId);
    res.status(200).json(finalMerged);
  } catch (error) {
    console.error('[Tasks] uploadPhotoProof error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// POST /tasks/:id/send-otp – generate 4-digit OTP, send via SendPulse/emailService to customer email.
exports.sendOtp = async (req, res) => {
  try {
    const idParam = req.params.id;
    let task = await Task.findById(idParam).populate('customerId');
    if (!task) {
      task = await Task.findOne({ taskId: idParam }).populate('customerId');
    }
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const merged = await mergeTaskWithDetails(task);
    const customer = merged.customerId || task.customerId;
    if (!customer) {
      return res.status(400).json({ message: 'Task has no customer' });
    }
    const email = customer.emailId || customer.email;
    if (!email || !email.trim()) {
      return res.status(400).json({
        message: 'Customer email is required to send OTP. Please add email to customer.',
      });
    }
    const otp = String(Math.floor(1000 + Math.random() * 9000));
    const taskMongoId = task._id.toString();
    const subject = `Your OTP for Task #${task.taskId}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #333;">OTP Verification</h2>
        <p>Hello ${customer.customerName},</p>
        <p>Your 4-digit OTP for task <strong>#${task.taskId}</strong> is:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 8px; color: #1976d2;">${otp}</p>
        <p>Please share this OTP with the field staff to verify task completion.</p>
        <p style="color: #666; font-size: 12px;">This OTP is valid for 10 minutes. Do not share with anyone else.</p>
      </div>
    `;
    const result = await sendTaskOtpEmail(email.trim(), subject, html);
    if (!result.success) {
      return res.status(500).json({
        message: result.error || 'Failed to send OTP. Set SENDPULSE_CLIENT_ID, SENDPULSE_CLIENT_SECRET, SENDPULSE_FROM_EMAIL in .env',
      });
    }
    const details = await TaskDetails.findOne({ taskId: task.taskId }).lean();
    const fullDoc = {
      ...(details || {}),
      taskId: task.taskId,
      otpCode: otp,
      otpSentAt: new Date(),
    };
    await exports.upsertTaskDetails(fullDoc);
    console.log('[Tasks] OTP sent to', email, 'for task:', task.taskId);
    res.status(200).json({
      success: true,
      message: 'OTP sent to customer email',
      email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
    });
  } catch (error) {
    console.error('[Tasks] sendOtp error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// POST /tasks/:id/verify-otp – verify OTP, set otpVerified true.
exports.verifyOtp = async (req, res) => {
  try {
    const taskId = req.params.id;
    const { otp } = req.body;
    if (!otp || String(otp).length !== 4) {
      return res.status(400).json({ message: 'Valid 4-digit OTP required' });
    }
    const task = await Task.findById(taskId).populate('assignedTo').populate('customerId');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const details = await TaskDetails.findOne({ taskId: task.taskId }).lean();
    const storedOtp = details?.otpCode;
    if (!storedOtp) {
      return res.status(400).json({ message: 'No OTP sent for this task. Please send OTP first.' });
    }
    const otpStr = String(otp).trim();
    if (otpStr !== storedOtp) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }
    const { lat, lng, fullAddress } = req.body;
    const fullDoc = {
      ...(details || {}),
      taskId: task.taskId,
      progressSteps: {
        ...(details?.progressSteps || {}),
        otpVerified: true,
      },
      otpVerifiedAt: new Date(),
    };
    if (lat != null) fullDoc.otpVerifiedLat = Number(lat);
    if (lng != null) fullDoc.otpVerifiedLng = Number(lng);
    if (fullAddress) fullDoc.otpVerifiedAddress = String(fullAddress);
    await exports.upsertTaskDetails(fullDoc);
    const merged = await mergeTaskWithDetails(task);
    const companyId = getCompanyIdFromTask(task);
    const finalMerged = await mergeTaskSettings(merged, companyId);
    console.log('[Tasks] OTP verified for task:', task.taskId);
    res.status(200).json(finalMerged);
  } catch (error) {
    console.error('[Tasks] verifyOtp error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// POST /tasks/:id/end – set status completed or waiting_for_approval per settings.
exports.endTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const staffId = req.staff?._id;
    const task = await Task.findById(taskId).populate('assignedTo').populate('customerId');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.status !== 'arrived') {
      return res.status(400).json({
        message: `Invalid status for complete: task must be arrived, got ${task.status}`,
      });
    }
    const companyId = getCompanyIdFromTask(task);
    let requireApprovalOnComplete = false;
    try {
      const settings = await TaskSettings.findOne({ companyId }).lean();
      requireApprovalOnComplete = settings?.settings?.requireApprovalOnComplete === true;
    } catch (err) {
      console.warn('[Tasks] endTask mergeTaskSettings:', err.message);
    }
    const newStatus = requireApprovalOnComplete ? 'waiting_for_approval' : 'completed';
    const completedAt = parseTimestamp(new Date());
    await Task.findByIdAndUpdate(taskId, {
      $set: { status: newStatus },
      $unset: exports.buildUnsetExtended(),
    });
    const details = await TaskDetails.findOne({ taskId: task.taskId }).lean();
    const fullDoc = {
      ...(details || {}),
      taskId: task.taskId,
      status: newStatus,
      completedDate: completedAt,
      completedBy: staffId,
    };
    await exports.upsertTaskDetails(fullDoc);
    const updatedTask = await Task.findById(taskId).populate('assignedTo').populate('customerId');
    const merged = await mergeTaskWithDetails(updatedTask);
    const finalMerged = await mergeTaskSettings(merged, companyId);
    console.log('[Tasks] Task ended:', task.taskId, 'status:', newStatus);
    res.status(200).json(finalMerged);
  } catch (error) {
    console.error('[Tasks] Error ending task:', error.message);
    res.status(500).json({ message: error.message });
  }
};