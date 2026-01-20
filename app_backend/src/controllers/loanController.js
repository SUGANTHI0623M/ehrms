const Loan = require('../models/Loan');
const Staff = require('../models/Staff');
const mongoose = require('mongoose');

// Helper to calculate EMI
const calculateEMI = (principal, tenure, rate) => {
    if (rate === 0) return principal / tenure;
    const monthlyRate = rate / 12 / 100;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
        (Math.pow(1 + monthlyRate, tenure) - 1);
    return Math.round(emi);
};

// @desc    Get Loans
// @route   GET /api/loans
// @access  Private (Employee sees own, Admin sees Company's)
const getLoans = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 10, startDate, endDate } = req.query;
        const query = {};

        // If 'req.staff' is present (meaning logged in as Employee), filter by employeeId
        if (req.staff) {
            query.employeeId = req.staff._id;
        } else if (req.user && req.user.role === 'Employee') {
            // Fallback if req.staff middleware logic changes
            const staff = await Staff.findOne({ userId: req.user._id });
            if (staff) query.employeeId = staff._id;
            else return res.json({ success: true, data: { loans: [], pagination: { page, limit, total: 0, pages: 0 } } });
        }

        // Company Scope
        if (req.user && req.user.role !== 'Super Admin' && req.user.companyId) {
            query.businessId = req.user.companyId;
        } else if (req.staff && req.staff.businessId) {
            query.businessId = req.staff.businessId;
        }

        // Filters
        if (status && status !== 'all' && status !== 'All Status') {
            query.status = status;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        // Search
        if (search) {
            query.$or = [
                { purpose: { $regex: search, $options: 'i' } },
                { loanType: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const loans = await Loan.find(query)
            .populate('employeeId', 'name employeeId designation')
            .populate('approvedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Loan.countDocuments(query);

        res.json({
            success: true,
            data: {
                loans,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            }
        });

    } catch (error) {
        console.error('getLoans Error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

// @desc    Create Loan Request
// @route   POST /api/loans
// @access  Private (Employee)
const createLoan = async (req, res) => {
    try {
        const { amount, tenure, purpose, loanType, interestRate = 0 } = req.body;

        if (!amount || !tenure || !purpose || !loanType) {
            return res.status(400).json({ success: false, error: { message: 'Please provide all required fields' } });
        }

        const emi = calculateEMI(amount, tenure, interestRate);

        // Identify Staff
        let staffId;
        let businessId;

        if (req.staff) {
            staffId = req.staff._id;
            businessId = req.staff.businessId;
        } else {
            // Fallback
            const staff = await Staff.findOne({ userId: req.user._id });
            if (!staff) return res.status(404).json({ success: false, error: { message: 'Staff profile not found' } });
            staffId = staff._id;
            businessId = staff.businessId;
        }

        const loan = await Loan.create({
            employeeId: staffId,
            loanType,
            amount,
            purpose,
            interestRate,
            tenure,
            emi,
            remainingAmount: amount,
            businessId,
            status: 'Pending'
        });

        res.status(201).json({
            success: true,
            data: { loan }
        });

    } catch (error) {
        console.error('createLoan Error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

module.exports = { getLoans, createLoan };
