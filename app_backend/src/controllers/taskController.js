const Task = require('../models/Task');
const Customer = require('../models/Customer');

exports.createTask = async (req, res) => {
  try {
    const newTask = new Task(req.body);
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
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
    console.log('[Tasks] Fetched', tasks.length, 'task(s) for staff');
    res.status(200).json(tasks);
  } catch (error) {
    console.error('[Tasks] Error fetching tasks by staff:', error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.getTaskById = async (req, res) => {
  try {
    const taskId = req.params.id;
    console.log('[Tasks] GET /tasks/:id - taskId:', taskId);
    const task = await Task.findById(taskId).populate('assignedTo').populate('customerId');
    if (!task) {
      console.log('[Tasks] Task not found:', taskId);
      return res.status(404).json({ message: 'Task not found' });
    }
    console.log('[Tasks] Fetched task:', task.taskId || taskId);
    res.status(200).json(task);
  } catch (error) {
    console.error('[Tasks] Error fetching task by id:', error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const { status, startTime, startLocation } = req.body;
    console.log('[Tasks] PATCH /tasks/:id - update:', taskId, { status, startTime, startLocation });
    const updateData = {};
    if (status != null) updateData.status = status;
    if (startTime != null) updateData.startTime = new Date(startTime);
    if (startLocation != null) updateData.startLocation = startLocation;
    const task = await Task.findByIdAndUpdate(
      taskId,
      { $set: updateData },
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

// POST /tasks/:id/location – append live location (throttled by client, e.g. every 10–15 sec).
exports.updateLocation = async (req, res) => {
  try {
    const taskId = req.params.id;
    const { lat, lng, timestamp } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ message: 'lat and lng required' });
    }
    const point = { lat: Number(lat), lng: Number(lng), timestamp: timestamp ? new Date(timestamp) : new Date() };
    const task = await Task.findByIdAndUpdate(
      taskId,
      { $push: { locationHistory: { $each: [point], $slice: -500 } } },
      { new: true }
    ).select('taskId locationHistory');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
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