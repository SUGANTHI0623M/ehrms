const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getAllTasks,
  getTasksByStaffId,
  getTaskById,
  createTask,
  updateTask,
  updateLocation,
  updateSteps,
  endTask,
} = require('../controllers/taskController');

router.get('/', getAllTasks);
router.get('/staff/:staffId', getTasksByStaffId);
router.get('/:id', getTaskById);
router.post('/', createTask);
router.patch('/:id', updateTask);
// Live tracking & step progress (authenticated).
router.post('/:id/location', protect, updateLocation);
router.patch('/:id/steps', protect, updateSteps);
router.post('/:id/end', protect, endTask);

module.exports = router;