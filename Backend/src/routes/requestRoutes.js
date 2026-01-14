const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    applyLeave,
    getLeaveRequests,
    applyLoan,
    getLoanRequests,
    applyExpense,
    getExpenseRequests,
    requestPayslip,
    getPayslipRequests
} = require('../controllers/requestController');

router.post('/leave', protect, applyLeave);
router.get('/leave', protect, getLeaveRequests);

router.post('/loan', protect, applyLoan);
router.get('/loan', protect, getLoanRequests);

router.post('/expense', protect, applyExpense);
router.get('/expense', protect, getExpenseRequests);

router.post('/payslip', protect, requestPayslip);
router.get('/payslip', protect, getPayslipRequests);

module.exports = router;
