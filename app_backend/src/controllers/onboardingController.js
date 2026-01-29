const Onboarding = require('../models/Onboarding');
const Staff = require('../models/Staff');
const Candidate = require('../models/Candidate');
const JobOpening = require('../models/JobOpening');
const DocumentRequirement = require('../models/DocumentRequirement');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper function to get document requirements for business
const getDocumentRequirementsForBusiness = async (businessId) => {
    const businessIdObj = businessId ? new mongoose.Types.ObjectId(businessId.toString()) : null;
    
    // Get business-specific requirements first, then global defaults
    const businessRequirements = await DocumentRequirement.find({
        businessId: businessIdObj,
        isActive: true
    }).sort({ order: 1 }).lean();

    const globalRequirements = await DocumentRequirement.find({
        businessId: null,
        isActive: true
    }).sort({ order: 1 }).lean();

    // Merge: business-specific override global, but include all active ones
    const requirementMap = new Map();
    
    // Add global requirements first
    globalRequirements.forEach(req => {
        requirementMap.set(req.name, req);
    });

    // Override with business-specific requirements
    businessRequirements.forEach(req => {
        requirementMap.set(req.name, req);
    });

    // If no requirements found, return default requirements matching the image
    if (requirementMap.size === 0) {
        console.log('[getDocumentRequirementsForBusiness] No requirements found, returning defaults');
        return [
            { name: 'Personal Information Form', type: 'form', required: true, order: 1 },
            { name: 'Bank Account Details', type: 'document', required: true, order: 2 },
            { name: 'PAN Card Copy', type: 'document', required: true, order: 3 },
            { name: 'Aadhar Card Copy', type: 'document', required: true, order: 4 },
            { name: 'Educational Certificates', type: 'document', required: true, order: 5 },
            { name: 'Previous Employment Proof', type: 'document', required: false, order: 6 },
            { name: 'Address Proof', type: 'document', required: true, order: 7 },
            { name: 'Medical Certificate', type: 'document', required: false, order: 8 }
        ];
    }

    return Array.from(requirementMap.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
};

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
            console.log('[getMyOnboarding] Onboarding not found. Attempting auto-create...');

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

            // Get document requirements from database
            const requirements = await getDocumentRequirementsForBusiness(staff.businessId);
            console.log('[getMyOnboarding] Document requirements fetched:', {
                requirementsCount: requirements.length,
                requirementNames: requirements.map(r => r.name)
            });

            // If candidate documents are empty, use requirements from database
            if (initialDocs.length === 0 && requirements.length > 0) {
                initialDocs = requirements.map(req => ({
                    name: req.name,
                    type: req.type,
                    required: req.required !== false, // Default to true if not specified
                    status: 'NOT_STARTED'
                }));
                console.log('[getMyOnboarding] Created initial docs from requirements:', initialDocs.length);
            }

            // Fallback to hardcoded defaults if no requirements found
            if (initialDocs.length === 0) {
                console.log('[getMyOnboarding] No requirements found, using hardcoded defaults');
                initialDocs = [
                    { name: 'Aadhar Card', type: 'document', required: true, status: 'NOT_STARTED' },
                    { name: 'PAN Card', type: 'document', required: true, status: 'NOT_STARTED' },
                    { name: 'Educational Certificates', type: 'document', required: true, status: 'NOT_STARTED' }
                ];
            }

            try {
                // Use new Onboarding() and save() instead of create() to avoid pre-save hook issues
                const newOnboarding = new Onboarding({
                    staffId: staffId,
                    candidateId: candidate?._id,
                    businessId: staff.businessId,
                    documents: initialDocs,
                    status: 'IN_PROGRESS',
                    createdBy: req.user._id
                });

                onboarding = await newOnboarding.save();
                console.log('[getMyOnboarding] ✅ Auto-created onboarding successfully:', {
                    onboardingId: onboarding._id,
                    documentsCount: initialDocs.length
                });

                // Re-populate for consistent response
                onboarding = await Onboarding.findById(onboarding._id)
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
            } catch (createErr) {
                console.error('[getMyOnboarding] ❌ Onboarding creation failed:', {
                    message: createErr.message,
                    name: createErr.name,
                    code: createErr.code,
                    keyPattern: createErr.keyPattern,
                    keyValue: createErr.keyValue
                });
                
                // Case: record was created by another process in parallel, or unique constraint violation
                onboarding = await Onboarding.findOne(query)
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
                
                if (!onboarding) {
                    console.error('[getMyOnboarding] ❌ Could not find onboarding after creation failure');
                } else {
                    console.log('[getMyOnboarding] Found existing onboarding after creation failure');
                }
            }
        }


        if (!onboarding) {
            console.log('[getMyOnboarding] Final check - Onboarding still not found for staffId:', staffId);
            return res.status(404).json({
                success: false,
                error: { message: 'Onboarding record not found and could not be created' }
            });
        }

        // Ensure this onboarding has all required document templates.
        // This also back-fills older records that were created before
        // we started seeding default documents.
        const requirements = await getDocumentRequirementsForBusiness(onboarding.businessId);
        console.log('[getMyOnboarding] Document requirements for merge:', {
            requirementsCount: requirements.length,
            requirementNames: requirements.map(r => r.name)
        });

        // Build a quick lookup of existing docs by name
        const existingByName = new Map();
        if (onboarding.documents && Array.isArray(onboarding.documents)) {
            for (const d of onboarding.documents) {
                if (d?.name) {
                    existingByName.set(d.name, d);
                    console.log('[getMyOnboarding] Existing document:', {
                        name: d.name,
                        status: d.status,
                        hasUrl: !!d.url,
                        required: d.required
                    });
                }
            }
        } else {
            console.log('[getMyOnboarding] No documents array, initializing empty array');
            onboarding.documents = [];
        }

        // Add any missing required / default docs
        let needsSave = false;
        const addedDocuments = [];
        for (const req of requirements) {
            if (!existingByName.has(req.name)) {
                console.log('[getMyOnboarding] Adding missing document:', {
                    name: req.name,
                    type: req.type,
                    required: req.required
                });
                onboarding.documents.push({
                    name: req.name,
                    type: req.type,
                    required: req.required !== false,
                    status: 'NOT_STARTED'
                });
                addedDocuments.push(req.name);
                needsSave = true;
            } else {
                console.log('[getMyOnboarding] Document already exists:', req.name);
            }
        }

        if (needsSave) {
            console.log('[getMyOnboarding] Saving onboarding with added documents:', addedDocuments);
            await onboarding.save();
            console.log('[getMyOnboarding] Onboarding saved successfully. Total documents:', onboarding.documents?.length);
        } else {
            console.log('[getMyOnboarding] No documents to add, all requirements already present');
        }

        // Log final state
        console.log('[getMyOnboarding] Final document list:', {
            totalDocuments: onboarding.documents?.length || 0,
            documents: onboarding.documents?.map(d => ({
                name: d.name,
                status: d.status,
                required: d.required,
                hasUrl: !!d.url
            }))
        });

        console.log('[getMyOnboarding] Returning onboarding for staffId:', staffId, 'docs count:', onboarding.documents?.length || 0);

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

// Upload document for onboarding
const uploadDocument = async (req, res) => {
    try {
        const { onboardingId, documentId } = req.params;
        const file = req.file;

        console.log('[uploadDocument] Upload request:', {
            onboardingId,
            documentId,
            userId: req.user?._id,
            hasFile: !!file,
            fileName: file?.originalname
        });

        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(onboardingId)) {
            console.error('[uploadDocument] Invalid onboardingId:', onboardingId);
            return res.status(400).json({
                success: false,
                error: { message: `Invalid onboarding ID format: ${onboardingId}` }
            });
        }

        if (!mongoose.Types.ObjectId.isValid(documentId)) {
            console.error('[uploadDocument] Invalid documentId:', documentId);
            return res.status(400).json({
                success: false,
                error: { message: `Invalid document ID format: ${documentId}` }
            });
        }

        if (!file) {
            return res.status(400).json({
                success: false,
                error: { message: 'No file uploaded' }
            });
        }

        // Find onboarding record
        const onboarding = await Onboarding.findById(onboardingId);
        if (!onboarding) {
            console.error('[uploadDocument] Onboarding not found:', onboardingId);
            return res.status(404).json({
                success: false,
                error: { message: 'Onboarding record not found' }
            });
        }

        // Find document within onboarding
        const document = onboarding.documents.id(documentId);
        if (!document) {
            console.error('[uploadDocument] Document not found:', documentId);
            return res.status(404).json({
                success: false,
                error: { message: 'Document not found within onboarding record' }
            });
        }

        console.log('[uploadDocument] Found document:', {
            name: document.name,
            currentStatus: document.status,
            hasUrl: !!document.url
        });

        // Upload to Cloudinary
        let uploadResult;
        try {
            // Upload file to Cloudinary
            uploadResult = await cloudinary.uploader.upload(file.path, {
                folder: 'hrms/onboarding',
                resource_type: 'auto',
                public_id: `onboarding_${onboardingId}_${documentId}_${Date.now()}`,
            });

            console.log('[uploadDocument] Cloudinary upload successful:', {
                url: uploadResult.secure_url,
                publicId: uploadResult.public_id
            });

            // Delete local file after upload
            if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        } catch (uploadError) {
            console.error('[uploadDocument] Cloudinary upload failed:', uploadError.message);
            
            // Clean up local file
            if (file.path && fs.existsSync(file.path)) {
                try {
                    fs.unlinkSync(file.path);
                } catch (cleanupError) {
                    console.error('[uploadDocument] Failed to cleanup local file:', cleanupError.message);
                }
            }

            return res.status(500).json({
                success: false,
                error: { message: 'Failed to upload document to Cloudinary: ' + uploadError.message }
            });
        }

        if (!uploadResult || !uploadResult.secure_url) {
            return res.status(500).json({
                success: false,
                error: { message: 'Failed to upload document to Cloudinary' }
            });
        }

        // Update document with Cloudinary URL
        const fileUrl = uploadResult.secure_url;
        document.url = fileUrl;
        document.status = 'PENDING';
        document.uploadedAt = new Date();

        await onboarding.save();

        console.log('[uploadDocument] ✅ Document updated successfully:', {
            documentId,
            url: fileUrl,
            status: document.status
        });

        // Re-populate for response
        const updatedOnboarding = await Onboarding.findById(onboarding._id)
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

        res.json({
            success: true,
            data: {
                onboarding: updatedOnboarding,
                documentUrl: fileUrl
            },
            message: 'Document uploaded successfully'
        });

    } catch (error) {
        // Clean up uploaded file on error
        if (req.file?.path && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.error('[uploadDocument] Failed to cleanup file on error:', cleanupError.message);
            }
        }

        console.error('[uploadDocument] ❌ Error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        res.status(500).json({
            success: false,
            error: { message: error.message || 'Failed to upload document' }
        });
    }
};

module.exports = {
    getMyOnboarding,
    getAllOnboardings,
    uploadDocument
};
