const Task = require('../models/Task');
const TaskSettings = require('../models/TaskSettings');
const Customer = require('../models/Customer');
const Tracking = require('../models/Tracking');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const { sendTaskOtpEmail } = require('../services/emailService');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.createTask = async (req, res) => {
  try {
    const newTask = new Task(req.body);
    await newTask.save();
    res.status(201).json(newTask);
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
    console.log('[Tasks] Fetched', tasks.length, 'task(s)');
    res.status(200).json(tasks);
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
    const merged = await Promise.all(
      tasks.map((t) => mergeTaskSettings(t, companyId))
    );
    console.log('[Tasks] Fetched', tasks.length, 'task(s) for staff');
    res.status(200).json(merged);
  } catch (error) {
    console.error('[Tasks] Error fetching tasks by staff:', error.message);
    res.status(500).json({ message: error.message });
  }
};

/** Merge task-settings (enableOtpVerification, etc.) into task for API response. */
async function mergeTaskSettings(taskDoc, companyId) {
  const task = taskDoc?.toObject ? taskDoc.toObject() : { ...taskDoc };
  // Ensure customFields.otpVerified reflects progressSteps.otpVerified for API consumers
  if (task.progressSteps?.otpVerified === true) {
    task.customFields = task.customFields || {};
    task.customFields.otpVerified = true;
    task.customFields.otpVerifiedAt = task.otpVerifiedAt;
  }
  if (!companyId) return task;
  try {
    const settings = await TaskSettings.findOne({ companyId }).lean();
    if (settings?.settings?.enableOtpVerification === true) {
      task.customFields = task.customFields || {};
      // Respect task-level isOtpRequired: false – do not override with company setting
      task.customFields.otpRequired = task.isOtpRequired !== false;
    }
    if (settings?.settings?.requireApprovalOnComplete !== undefined) {
      task.requireApprovalOnComplete = settings.settings.requireApprovalOnComplete;
    }
    if (settings?.settings?.autoApprove !== undefined) {
      task.autoApprove = settings.settings.autoApprove;
    }
  } catch (err) {
    console.warn('[Tasks] mergeTaskSettings:', err.message);
  }
  return task;
}

function getCompanyIdFromTask(task) {
  const assignedTo = task.assignedTo;
  if (assignedTo?.businessId) return assignedTo.businessId;
  if (assignedTo?._id && typeof assignedTo === 'object') return null;
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
    const companyId = getCompanyIdFromTask(task);
    const merged = await mergeTaskSettings(task, companyId);
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
    // Support startLocation or startLat/startLng
    const resolvedStartLocation = startLocation || (startLat != null && startLng != null ? { lat: startLat, lng: startLng } : null);
    console.log('[Tasks] PATCH /tasks/:id - full body:', JSON.stringify(req.body));
    const updateData = {};
    if (status != null) updateData.status = status;
    if (startTime != null) updateData.startTime = new Date(startTime);
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
    if (arrivalTime != null) updateData.arrivalTime = new Date(arrivalTime);

    const updateOp = { $set: updateData };
    if (destinationLocation != null) {
      updateOp.$push = {
        destinations: {
          lat: Number(destinationLocation.lat),
          lng: Number(destinationLocation.lng),
          address: destinationLocation.address || '',
          changedAt: new Date(),
        },
      };
    }
    const task = await Task.findByIdAndUpdate(
      taskId,
      updateOp,
      { new: true }
    ).populate('assignedTo').populate('customerId');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    console.log('[Tasks] Updated task:', task.taskId);
    res.status(200).json(task);
  } catch (error) {
    console.error('[Tasks] Error updating task:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// POST /tasks/:id/location – append live GPS point to task.locationHistory.
// Tracking collection is stored via POST /api/tracking/store (mobile calls it separately).
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
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      batteryPercent: batteryPercent != null ? Number(batteryPercent) : undefined,
    };
    const task = await Task.findByIdAndUpdate(
      taskId,
      { $push: { locationHistory: { $each: [point], $slice: -2000 } } },
      { new: true }
    )
      .select('taskId locationHistory assignedTo')
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
    const task = await Task.findByIdAndUpdate(
      taskId,
      { $set: updateData },
      { new: true }
    ).populate('assignedTo').populate('customerId');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    console.log('[Tasks] Updated steps for task:', task.taskId);
    res.status(200).json(task);
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

    const trackingRecords = await Tracking.find({ taskId })
      .sort({ timestamp: 1 })
      .lean();

    const locationHistory = task.locationHistory || [];
    const routePoints = locationHistory.length > 0
      ? locationHistory.map((p) => ({ lat: p.lat, lng: p.lng, timestamp: p.timestamp }))
      : trackingRecords
          .filter((r) => r.latitude != null && r.longitude != null)
          .map((r) => ({
            lat: r.latitude,
            lng: r.longitude,
            timestamp: r.timestamp,
            movementType: r.movementType,
            address: r.address || r.fullAddress,
          }));

    const timeline = [];
    const taskObj = task;

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
      if (!timeline.some((t) => t.type === 'exit' && new Date(t.time).getTime() === new Date(ex.exitedAt).getTime())) {
        timeline.push({
          type: 'exit',
          label: 'Outage',
          time: ex.exitedAt,
          address: ex.address,
          lat: ex.lat,
          lng: ex.lng,
          exitReason: ex.exitReason,
        });
      }
    }

    const restarts = taskObj.tasks_restarted || [];
    for (const rs of restarts) {
      timeline.push({
        type: 'restart',
        label: 'Resumed',
        time: rs.resumedAt,
        address: rs.address,
        lat: rs.lat,
        lng: rs.lng,
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
      task: task,
      timeline,
      routePoints,
    });
  } catch (error) {
    console.error('[Tasks] getCompletionReport error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// GET /tasks/:id/tracking-path – full GPS path for admin replay (NO interpolation).
exports.getTrackingPath = async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId)
      .select('taskId locationHistory status assignedTo customerId')
      .populate('assignedTo', 'name')
      .populate('customerId', 'address city pincode');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const points = (task.locationHistory || []).map((p) => ({
      latitude: p.lat,
      longitude: p.lng,
      timestamp: p.timestamp,
      batteryPercent: p.batteryPercent,
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
    const updateData = {
      photoProofUrl: photoUrl,
      photoProofUploadedAt: new Date(),
      'progressSteps.photoProof': true,
    };
    if (description) updateData.photoProofDescription = description;
    if (lat != null) updateData.photoProofLat = Number(lat);
    if (lng != null) updateData.photoProofLng = Number(lng);
    if (fullAddress) updateData.photoProofAddress = String(fullAddress);
    const task = await Task.findByIdAndUpdate(
      taskId,
      { $set: updateData },
      { new: true }
    ).populate('assignedTo').populate('customerId');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    console.log('[Tasks] Photo proof uploaded for task:', task.taskId);
    res.status(200).json(task);
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
    const customer = task.customerId;
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
    await Task.findByIdAndUpdate(taskMongoId, {
      $set: {
        otpCode: otp,
        otpSentAt: new Date(),
      },
    });
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
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const storedOtp = task.otpCode;
    if (!storedOtp) {
      return res.status(400).json({ message: 'No OTP sent for this task. Please send OTP first.' });
    }
    const otpStr = String(otp).trim();
    if (otpStr !== storedOtp) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }
    const { lat, lng, fullAddress } = req.body;
    const otpUpdate = {
      'progressSteps.otpVerified': true,
      otpVerifiedAt: new Date(),
    };
    if (lat != null) otpUpdate.otpVerifiedLat = Number(lat);
    if (lng != null) otpUpdate.otpVerifiedLng = Number(lng);
    if (fullAddress) otpUpdate.otpVerifiedAddress = String(fullAddress);
    const updated = await Task.findByIdAndUpdate(
      taskId,
      { $set: otpUpdate },
      { new: true }
    ).populate('assignedTo').populate('customerId');
    console.log('[Tasks] OTP verified for task:', updated.taskId);
    res.status(200).json(updated);
  } catch (error) {
    console.error('[Tasks] verifyOtp error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// POST /tasks/:id/end – set status completed and completedDate.
exports.endTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findByIdAndUpdate(
      taskId,
      { $set: { status: 'completed', completedDate: new Date() } },
      { new: true }
    ).populate('assignedTo').populate('customerId');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    console.log('[Tasks] Task ended:', task.taskId);
    res.status(200).json(task);
  } catch (error) {
    console.error('[Tasks] Error ending task:', error.message);
    res.status(500).json({ message: error.message });
  }
};