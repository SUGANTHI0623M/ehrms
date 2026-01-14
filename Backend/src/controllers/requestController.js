const Leave = require('../models/Leave');
const Loan = require('../models/Loan');
const Expense = require('../models/Expense');
const PayslipRequest = require('../models/PayslipRequest');

// @desc    Apply for Leave
// @route   POST /api/requests/leave
// @access  Private
const applyLeave = async (req, res) => {
    try {
        const { leaveType, startDate, endDate, days, reason } = req.body;

        // Basic Validation
        if (!leaveType || !startDate || !endDate || !days) {
            return res.status(400).json({ message: 'Please fill in all required fields' });
        }

        const leave = await Leave.create({
            employeeId: req.user._id,
            businessId: req.user.businessId, // Assuming user has businessId
            leaveType,
            startDate,
            endDate,
            days,
            reason
        });

        res.status(201).json(leave);
    } catch (error) {
        console.error('Apply Leave Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get My Leave Requests
// @route   GET /api/requests/leave
// @access  Private
const getLeaveRequests = async (req, res) => {
    try {
        const { status } = req.query;
        let query = { employeeId: req.user._id };

        if (status && status !== 'All Status') {
            query.status = status;
        }

        const leaves = await Leave.find(query).sort({ createdAt: -1 });
        res.json(leaves);
    } catch (error) {
        console.error('Get Leave Requests Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Request Loan
// @route   POST /api/requests/loan
// @access  Private
const applyLoan = async (req, res) => {
    try {
        const { loanType, amount, tenureMonths, interestRate, purpose } = req.body;

        if (!loanType || !amount || !tenureMonths) {
            return res.status(400).json({ message: 'Please fill in all required fields' });
        }

        let emi = 0;
        if (interestRate > 0) {
            const r = interestRate / 12 / 100;
            emi = (amount * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
        } else {
            emi = amount / tenureMonths;
        }

        const loan = await Loan.create({
            employeeId: req.user._id,
            businessId: req.user.businessId,
            loanType,
            amount,
            tenureMonths,
            interestRate,
            emi: parseFloat(emi.toFixed(2)),
            purpose
        });

        res.status(201).json(loan);
    } catch (error) {
        console.error('Apply Loan Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get My Loan Requests
// @route   GET /api/requests/loan
// @access  Private
const getLoanRequests = async (req, res) => {
    try {
        const { status } = req.query;
        let query = { employeeId: req.user._id };

        if (status && status !== 'All Status') {
            query.status = status;
        }

        const loans = await Loan.find(query).sort({ createdAt: -1 });
        res.json(loans);
    } catch (error) {
        console.error('Get Loan Requests Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Apply for Expense
// @route   POST /api/requests/expense
// @access  Private
const applyExpense = async (req, res) => {
    try {
        const { expenseType, amount, date, description } = req.body;

        if (!expenseType || !amount || !date) {
            return res.status(400).json({ message: 'Please fill in required fields' });
        }

        const expense = await Expense.create({
            employeeId: req.user._id,
            businessId: req.user.businessId,
            expenseType,
            amount,
            date,
            description
        });

        res.status(201).json(expense);
    } catch (error) {
        console.error('Apply Expense Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get My Expense Requests
// @route   GET /api/requests/expense
// @access  Private
const getExpenseRequests = async (req, res) => {
    try {
        const { status } = req.query;
        let query = { employeeId: req.user._id };

        if (status && status !== 'All Status') {
            query.status = status;
        }

        const expenses = await Expense.find(query).sort({ createdAt: -1 });
        res.json(expenses);
    } catch (error) {
        console.error('Get Expense Requests Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Request Payslip
// @route   POST /api/requests/payslip
// @access  Private
const requestPayslip = async (req, res) => {
    try {
        const { month, year, reason } = req.body;

        if (!month || !year) {
            return res.status(400).json({ message: 'Please select month and year' });
        }

        const payslip = await PayslipRequest.create({
            employeeId: req.user._id,
            businessId: req.user.businessId,
            month,
            year,
            reason
        });

        res.status(201).json(payslip);
    } catch (error) {
        console.error('Request Payslip Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get My Payslip Requests
// @route   GET /api/requests/payslip
// @access  Private
const getPayslipRequests = async (req, res) => {
    try {
        const { status } = req.query;
        let query = { employeeId: req.user._id };

        if (status && status !== 'All Status') {
            query.status = status;
        }

        const requests = await PayslipRequest.find(query).sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        console.error('Get Payslip Requests Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    applyLeave,
    getLeaveRequests,
    applyLoan,
    getLoanRequests,
    applyExpense,
    getExpenseRequests,
    requestPayslip,
    getPayslipRequests
};
