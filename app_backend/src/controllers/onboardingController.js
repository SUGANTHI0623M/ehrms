const Onboarding = require('../models/Onboarding');
const Staff = require('../models/Staff');
const Candidate = require('../models/Candidate');
const JobOpening = require('../models/JobOpening');

// Get current user's onboarding
const getMyOnboarding = async (req, res) => {
    try {
        const userId = req.user._id;
        const staffId = req.staff?._id;

        console.log('DEBUG: getMyOnboarding request for:', {
            userId: userId,
            staffId: staffId,
            email: req.user.email
        });

        if (!staffId) {
            console.log('DEBUG: No staffId found in request');
            return res.status(404).json({
                success: false,
                error: { message: 'Staff record not found' }
            });
        }

        // Find candidate record first to expand search options
        const staff = await Staff.findById(staffId).populate('candidateId');
        let candidate = staff?.candidateId;
        if (!candidate && staff?.email) {
            candidate = await Candidate.findOne({
                email: staff.email.toLowerCase(),
                businessId: staff.businessId
            });
        }

        // Find onboarding by staffId OR candidateId
        let query = { $or: [{ staffId }] };
        if (candidate?._id) {
            query.$or.push({ candidateId: candidate._id });
        }

        console.log('DEBUG: Searching for onboarding with query:', JSON.stringify(query));
        let onboarding = await Onboarding.findOne(query)
            .populate({
                path: 'staffId',
                select: 'employeeId name email phone designation department joiningDate',
                populate: {
                    path: 'userId',
                    select: 'email name'
                }
            })
            .populate({
                path: 'candidateId',
                select: 'firstName lastName email phone position jobId'
            })
            .populate('createdBy', 'email name')
            .populate('documents.reviewedBy', 'email name');

        if (!onboarding && staff) {
            console.log('DEBUG: Onboarding not found. Attempting auto-create...');

            // Get documents from candidate if available
            let initialDocs = [];
            if (candidate && candidate.documents && candidate.documents.length > 0) {
                initialDocs = candidate.documents.map(doc => ({
                    name: doc.name || doc.type || 'Document',
                    type: doc.type || 'document',
                    required: true,
                    status: 'COMPLETED',
                    url: doc.url,
                    uploadedAt: new Date()
                }));
            }

            // If candidate documents are empty, add default required ones
            if (initialDocs.length === 0) {
                initialDocs = [
                    { name: 'Aadhar Card', type: 'id_proof', required: true, status: 'NOT_STARTED' },
                    { name: 'PAN Card', type: 'id_proof', required: true, status: 'NOT_STARTED' },
                    { name: 'Educational Certificates', type: 'education', required: true, status: 'NOT_STARTED' }
                ];
            }

            try {
                onboarding = await Onboarding.create({
                    staffId: staffId,
                    candidateId: candidate?._id,
                    businessId: staff.businessId,
                    documents: initialDocs,
                    status: 'IN_PROGRESS'
                });

                // Re-populate for consistent response
                onboarding = await Onboarding.findById(onboarding._id)
                    .populate('staffId')
                    .populate('candidateId');

                console.log('DEBUG: Auto-created onboarding successfully');
            } catch (createErr) {
                console.error('DEBUG: Onboarding creation failed:', createErr.message);
                // Case: record was created by another process in parallel
                onboarding = await Onboarding.findOne(query);
            }
        }


        if (!onboarding) {
            console.log('DEBUG: Final check - Onboarding still not found for staffId:', staffId);
            return res.status(404).json({
                success: false,
                error: { message: 'Onboarding record not found and could not be created' }
            });
        }

        console.log('DEBUG: Returning onboarding for staffId:', staffId, 'docs count:', onboarding.documents?.length || 0);

        return res.status(200).json({
            success: true,
            data: { onboarding }
        });

    } catch (error) {
        console.error('getMyOnboarding CRITICAL ERROR:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            errors: error.errors // Mongoose validation errors
        });
        res.status(500).json({
            success: false,
            error: {
                message: error.message,
                details: error.errors ? Object.keys(error.errors).map(key => error.errors[key].message) : null
            }
        });
    }
};

// Get all onboardings (admin)
const getAllOnboardings = async (req, res) => {
    try {
        const onboardings = await Onboarding.find({ businessId: req.user.businessId })
            .populate('staffId', 'employeeId name email designation department')
            .populate('candidateId', 'firstName lastName email position')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: { onboardings }
        });

    } catch (error) {
        console.error('getAllOnboardings Error:', error);
        res.status(500).json({
            success: false,
            error: { message: error.message }
        });
    }
};

module.exports = {
    getMyOnboarding,
    getAllOnboardings
};
