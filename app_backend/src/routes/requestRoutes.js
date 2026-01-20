const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getLeaves, createLeave, getLeaveTypes } = require('../controllers/leaveController');
const { getReimbursements, createReimbursement } = require('../controllers/reimbursementController');

const { getLoans, createLoan } = require('../controllers/loanController');
const { requestPayslip, getPayslipRequests } = require('../controllers/requestController');

// Leave Routes
router.get('/leave', protect, getLeaves);
router.get('/leave-types', protect, getLeaveTypes);
router.post('/leave', protect, createLeave);

// Reimbursement (Expense) Routes
router.get('/reimbursement', protect, getReimbursements);
router.post('/reimbursement', protect, createReimbursement);
router.get('/expense', protect, getReimbursements);
router.post('/expense', protect, createReimbursement);

// Loan Routes
router.get('/loan', protect, getLoans);
router.post('/loan', protect, createLoan);

// Payslip Routes
router.get('/payslip', protect, getPayslipRequests);
router.post('/payslip', protect, requestPayslip);

module.exports = router;
