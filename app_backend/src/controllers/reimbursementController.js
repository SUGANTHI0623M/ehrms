const Reimbursement = require('../models/Reimbursement');
const Staff = require('../models/Staff');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const getReimbursements = async (req, res) => {
    try {
        const currentStaff = req.staff;
        const { status, type, page = 1, limit = 10, search, startDate, endDate } = req.query;
        const query = {};

        if (currentStaff) {
            query.employeeId = currentStaff._id;
        } else {
            return res.json({
                success: true,
                data: { reimbursements: [], pagination: { total: 0, page, limit, pages: 0 } }
            });
        }

        if (status && status !== 'all' && status !== 'All Status') query.status = status;
        if (type && type !== 'all' && type !== 'All Type') query.type = type;

        // Date Filter
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        // Search (Description, Type, ApprovedBy logic would require lookup but we'll stick to local fields first)
        // Search (Description, Type, ApprovedBy)
        if (search) {
            const userIds = await User.find({ name: { $regex: search, $options: 'i' } }).distinct('_id');
            query.$or = [
                { description: { $regex: search, $options: 'i' } },
                { type: { $regex: search, $options: 'i' } },
                { approvedBy: { $in: userIds } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const reimbursements = await Reimbursement.find(query)
            .populate('approvedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Reimbursement.countDocuments(query);

        res.json({
            success: true,
            data: {
                reimbursements,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

// Cloudinary folder for expense request proof files
const EXPENSE_PROOF_FOLDER = 'hrms/expense-proofs';

const createReimbursement = async (req, res) => {
    try {
        const { type, amount, date, description, proofFiles } = req.body;
        const currentStaff = req.staff;

        if (!currentStaff) {
            return res.status(400).json({ success: false, error: { message: 'Staff profile not found' } });
        }

        const needsCloudinary = proofFiles && Array.isArray(proofFiles) && proofFiles.length > 0 &&
            proofFiles.some(f => typeof f === 'string' && !f.startsWith('http://') && !f.startsWith('https://'));
        if (needsCloudinary && (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET)) {
            return res.status(503).json({
                success: false,
                error: { message: 'Proof upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.' }
            });
        }

        let uploadedProofUrls = [];
        if (proofFiles && Array.isArray(proofFiles) && proofFiles.length > 0) {
            for (let i = 0; i < proofFiles.length; i++) {
                const fileStr = proofFiles[i];
                if (typeof fileStr !== 'string') continue;
                if (fileStr.startsWith('http://') || fileStr.startsWith('https://')) {
                    uploadedProofUrls.push(fileStr);
                    continue;
                }
                try {
                    const result = await cloudinary.uploader.upload(fileStr, {
                        folder: EXPENSE_PROOF_FOLDER,
                        resource_type: 'auto',
                        public_id: `expense_${currentStaff._id}_${Date.now()}_${i}`
                    });
                    uploadedProofUrls.push(result.secure_url);
                } catch (uploadError) {
                    console.error('Cloudinary upload failed for expense proof:', uploadError.message);
                    return res.status(500).json({
                        success: false,
                        error: { message: 'Failed to upload proof file to Cloudinary: ' + uploadError.message }
                    });
                }
            }
        }

        const reimbursement = await Reimbursement.create({
            employeeId: currentStaff._id,
            businessId: currentStaff.businessId,
            type,
            amount,
            date,
            description,
            proofFiles: uploadedProofUrls
        });

        res.status(201).json({
            success: true,
            data: { reimbursement }
        });
    } catch (error) {
        console.error('createReimbursement Error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

module.exports = {
    getReimbursements,
    createReimbursement
};
