const User = require('../models/User');
const Staff = require('../models/Staff');
const Company = require('../models/Company');
const Branch = require('../models/Branch');
const Candidate = require('../models/Candidate');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Try to find User
        let user = await User.findOne({ email }).populate('roleId');
        let staff = null;

        if (user) {
            if (await user.matchPassword(password)) {
                staff = await Staff.findOne({ userId: user._id })
                    .populate('branchId')
                    .populate('businessId');
            } else {
                return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
            }
        } else {
            // 2. Fallback: Try to find Staff directly
            staff = await Staff.findOne({ email })
                .populate('branchId')
                .populate('businessId');

            if (staff && await staff.matchPassword(password)) {
                user = await User.findById(staff.userId).populate('roleId');
            } else {
                return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
            }
        }

        if (!user) {
            return res.status(401).json({ success: false, error: { message: 'User record not found' } });
        }

        // Generate Token
        // Use consistent secret with middleware
        const secret = process.env.JWT_SECRET || 'secret';
        const accessToken = jwt.sign({ id: user._id }, secret, { expiresIn: '30d' });

        // Prepare Response
        let company = staff?.businessId || user.companyId;
        const formattedPermissions = user.roleId?.permissions || [];

        const userResponse = {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone,
            companyId: company?._id || company,
            permissions: formattedPermissions,
            staffId: staff?._id,
            avatar: staff?.avatar || user.avatar
        };

        // Create a refresh token (if needed by frontend, though Flutter usually uses access token for now)
        // For parity with Web Backend, we can generate one
        const refreshToken = jwt.sign({ id: user._id }, secret, { expiresIn: '7d' });

        // Set refresh token as httpOnly cookie (standard practice from Web Backend)
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/'
        });

        res.json({
            success: true,
            data: {
                user: userResponse,
                accessToken,
                refreshToken // Send it in body too for Mobile App storage if needed
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

const googleLogin = async (req, res) => {
    try {
        const { email } = req.body;

        // Find User
        let user = await User.findOne({ email }).populate('roleId');
        let staff = null;

        if (user) {
            staff = await Staff.findOne({ userId: user._id })
                .populate('branchId')
                .populate('businessId');

            // Allow if no staff? Maybe. But for HRMS usually need staff.
            // Old logic allowed it.
        } else {
            // Check Staff by email
            staff = await Staff.findOne({ email });
            if (staff && staff.userId) {
                user = await User.findById(staff.userId).populate('roleId');
            }
        }

        if (!user) {
            return res.status(401).json({ success: false, error: { message: 'User not registered. Please sign up first.' } });
        }

        const accessToken = generateToken(user._id);

        let company = staff?.businessId || user.companyId;
        const formattedPermissions = user.roleId?.permissions || [];

        const userResponse = {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone,
            companyId: company?._id || company,
            permissions: formattedPermissions,
            staffId: staff?._id,
            avatar: staff?.avatar || user.avatar
        };

        res.json({
            success: true,
            data: {
                user: userResponse,
                accessToken
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

const register = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ success: false, error: { message: 'User already exists' } });

        const user = await User.create({ name, email, password });
        if (user) {
            const accessToken = generateToken(user._id);
            res.status(201).json({
                success: true,
                data: {
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email
                    },
                    accessToken
                }
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

const getProfile = async (req, res) => {
    try {
        // req.user and req.staff are populated by authMiddleware
        const user = req.user;
        const staff = req.staff;

        if (!user) {
            return res.status(404).json({ success: false, error: { message: 'User not found' } });
        }

        // Re-fetch to ensure latest data and populated fields
        const fullUser = await User.findById(user._id).populate('roleId');

        let fullStaff = null;
        let candidateData = null;

        if (staff) {
            fullStaff = await Staff.findById(staff._id)
                .populate('branchId')
                .populate('businessId')
                .populate('candidateId') // Populate candidate to get education, experience, documents
                .populate('department') // Assuming department might be a ref or string, populating just in case
                .populate('designation'); // Same here

            // Extract candidate data if available
            if (fullStaff?.candidateId) {
                candidateData = fullStaff.candidateId;
            } else if (fullStaff?.email) {
                // Fallback: If candidateId is not populated but staff has email, try to find candidate by email
                candidateData = await Candidate.findOne({
                    email: fullStaff.email.toLowerCase(),
                    businessId: fullStaff.businessId
                }).lean();
            }
        }

        res.status(200).json({
            success: true,
            data: {
                profile: {
                    name: fullUser.name,
                    email: fullUser.email,
                    phone: fullStaff?.phone || fullUser.phone,
                    avatar: fullUser.avatar || fullStaff?.avatar
                },
                staffData: fullStaff ? {
                    ...fullStaff.toObject(),
                    candidateId: candidateData || fullStaff.candidateId,
                    // Preserve nested structure for frontend expectations
                    employmentIds: {
                        uan: fullStaff.uan,
                        pan: fullStaff.pan,
                        aadhaar: fullStaff.aadhaar,
                        pfNumber: fullStaff.pfNumber,
                        esiNumber: fullStaff.esiNumber
                    }
                } : null
            }
        });

    } catch (error) {
        console.error('getProfile Error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name, phone, avatar } = req.body;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, error: { message: 'User not found' } });

        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (avatar) user.avatar = avatar; // Assuming User model has avatar, otherwise update Staff

        await user.save();

        if (req.staff) {
            const {
                gender, maritalStatus, dob, bloodGroup, address, bankDetails,
                employmentIds, uan, pan, aadhaar, pfNumber, esiNumber,
                designation, department, shiftName, status
            } = req.body;

            const updateData = {};
            if (name) updateData.name = name;
            if (phone) updateData.phone = phone;
            if (avatar) updateData.avatar = avatar;
            if (gender) updateData.gender = gender;
            if (maritalStatus) updateData.maritalStatus = maritalStatus;
            if (dob) updateData.dob = dob;
            if (bloodGroup) updateData.bloodGroup = bloodGroup;
            if (address) updateData.address = address;
            if (bankDetails) updateData.bankDetails = bankDetails;

            // Professional details
            if (designation) updateData.designation = designation;
            if (department) updateData.department = department;
            if (shiftName) updateData.shiftName = shiftName;
            if (status) updateData.status = status;

            // Handle employment IDs
            if (employmentIds) {
                updateData.uan = employmentIds.uan;
                updateData.pan = employmentIds.pan;
                updateData.aadhaar = employmentIds.aadhaar;
                updateData.pfNumber = employmentIds.pfNumber;
                updateData.esiNumber = employmentIds.esiNumber;
            }
            // Or direct fields
            if (uan !== undefined) updateData.uan = uan;
            if (pan !== undefined) updateData.pan = pan;
            if (aadhaar !== undefined) updateData.aadhaar = aadhaar;
            if (pfNumber !== undefined) updateData.pfNumber = pfNumber;
            if (esiNumber !== undefined) updateData.esiNumber = esiNumber;

            await Staff.findByIdAndUpdate(req.staff._id, updateData, {
                runValidators: false,
                new: true
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    phone: user.phone,
                    avatar: user.avatar
                }
            }
        });

    } catch (error) {
        console.error('updateProfile Error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

module.exports = { login, googleLogin, register, getProfile, updateProfile };
