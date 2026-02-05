const Staff = require('../models/Staff');
const Tracking = require('../models/Tracking');
const Task = require('../models/Task');
const { reverseGeocode } = require('../services/geocodingService');

/**
 * POST /api/tracking/store
 * Body: { taskId, lat, lng, timestamp?, batteryPercent?, movementType? }
 * Stores tracking point in Tracking collection with reverse-geocoded address.
 * Called by mobile app on Start Ride and every 15 sec during Live Tracking.
 */
exports.storeTracking = async (req, res) => {
  try {
    const { taskId, lat, lng, timestamp, batteryPercent, movementType } = req.body;
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
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      batteryPercent: batteryPercent != null ? Number(batteryPercent) : undefined,
      movementType: movementType || undefined,
      address: geo?.address || undefined,
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
