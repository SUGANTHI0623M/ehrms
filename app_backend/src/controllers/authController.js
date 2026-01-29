const User = require('../models/User');
const Staff = require('../models/Staff');
const Company = require('../models/Company');
const Branch = require('../models/Branch');
const Candidate = require('../models/Candidate');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../services/emailService');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

// Helper to safely build case-insensitive regex
const buildEmailRegex = (email) => {
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escaped}$`, 'i');
};

// Helper to find or create a user by email, with Candidate fallback
const findOrCreateUserByEmail = async (rawEmail) => {
    if (!rawEmail) return null;

    const email = rawEmail.trim();
    const normalizedEmail = email.toLowerCase();

    // 1. Exact / normalized match
    let user = await User.findOne({ email: normalizedEmail });

    // 2. Case-insensitive regex fallback
    if (!user) {
        user = await User.findOne({ email: buildEmailRegex(email) });
    }

    if (user) {
        return user;
    }

    // 3. Candidate fallback
    const candidate = await Candidate.findOne({
        email: buildEmailRegex(email)
    }).lean();

    if (!candidate) {
        return null;
    }

    // Auto-create basic user from candidate
    const randomPassword = Math.random().toString(36).slice(-10) + '!aA1';

    const name = [candidate.firstName, candidate.lastName].filter(Boolean).join(' ') || candidate.email;

    const newUser = await User.create({
        name,
        email: normalizedEmail,
        password: randomPassword,
        role: 'Employee',
        companyId: candidate.businessId
    });

    return newUser;
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: { message: 'Email and password are required' } 
            });
        }

        console.log(`[Login] Attempting login for email: ${email}`);

        // 1. Try to find User (explicitly select password field to ensure it's included)
        let user = await User.findOne({ email: email.toLowerCase().trim() })
            .select('+password')
            .populate('roleId');
        let staff = null;

        console.log(`[Login] User found: ${user ? 'Yes' : 'No'}`);

        if (user) {
            console.log(`[Login] User ID: ${user._id}, Role: ${user.role}, IsActive: ${user.isActive}`);
            console.log(`[Login] Password field exists: ${user.password ? 'Yes' : 'No'}`);
            
            // Check if user is active
            if (!user.isActive) {
                return res.status(401).json({ success: false, error: { message: 'Account is inactive' } });
            }

            // Check if user has a password set
            if (!user.password) {
                return res.status(401).json({ success: false, error: { message: 'Password not set for this account' } });
            }

            const passwordMatch = await user.matchPassword(password);
            console.log(`[Login] Password match: ${passwordMatch}`);
            
            if (passwordMatch) {
                staff = await Staff.findOne({ userId: user._id })
                    .populate('branchId')
                    .populate('businessId');
                console.log(`[Login] Staff found: ${staff ? 'Yes' : 'No'}`);
            } else {
                console.log(`[Login] Invalid password for user: ${email}`);
                return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
            }
        } else {
            // 2. Fallback: Try to find Staff directly (explicitly select password field)
            console.log(`[Login] User not found, trying Staff...`);
            staff = await Staff.findOne({ email: email.toLowerCase().trim() })
                .select('+password')
                .populate('branchId')
                .populate('businessId');

            if (staff) {
                console.log(`[Login] Staff found, checking password...`);
                
                // If staff has no password, check linked User's password
                if (!staff.password) {
                    if (staff.userId) {
                        console.log(`[Login] Staff has no password, checking linked User password...`);
                        user = await User.findById(staff.userId)
                            .select('+password')
                            .populate('roleId');
                        
                        if (!user || !user.password) {
                            return res.status(401).json({ success: false, error: { message: 'Password not set for this account' } });
                        }
                        
                        // Check if user is active
                        if (!user.isActive) {
                            return res.status(401).json({ success: false, error: { message: 'Account is inactive' } });
                        }
                        
                        const userPasswordMatch = await user.matchPassword(password);
                        if (userPasswordMatch) {
                            console.log(`[Login] Linked User password correct`);
                        } else {
                            console.log(`[Login] Invalid password for linked User`);
                            return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
                        }
                    } else {
                        return res.status(401).json({ success: false, error: { message: 'Password not set for this account' } });
                    }
                } else {
                    // Staff has password, check it
                    const staffPasswordMatch = await staff.matchPassword(password);
                    if (staffPasswordMatch) {
                        user = await User.findById(staff.userId).populate('roleId');
                        console.log(`[Login] Staff password correct, User found: ${user ? 'Yes' : 'No'}`);
                    } else {
                        console.log(`[Login] Invalid password for staff: ${email}`);
                        return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
                    }
                }
            } else {
                console.log(`[Login] Neither User nor Staff found for email: ${email}`);
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

/**
 * Update education details for current user's candidate record.
 * Education is stored on Candidate model; finds or creates candidate linked to staff.
 */
const updateEducation = async (req, res) => {
    try {
        const staff = req.staff;
        if (!staff) {
            return res.status(404).json({ success: false, error: { message: 'Staff record not found' } });
        }

        const education = req.body.education;
        if (!Array.isArray(education)) {
            return res.status(400).json({
                success: false,
                error: { message: 'education must be an array' }
            });
        }

        // Normalize education entries to match Candidate schema
        const normalizedEducation = education.map((edu) => ({
            qualification: edu.qualification || '',
            courseName: edu.courseName || edu.course || '',
            institution: edu.institution || '',
            university: edu.university || '',
            yearOfPassing: edu.yearOfPassing != null ? String(edu.yearOfPassing) : '',
            percentage: edu.percentage != null ? String(edu.percentage) : '',
            cgpa: edu.cgpa != null ? String(edu.cgpa) : ''
        }));

        let candidate = await Candidate.findById(staff.candidateId);
        if (!candidate && staff.email) {
            candidate = await Candidate.findOne({
                email: staff.email.toLowerCase(),
                businessId: staff.businessId
            });
        }

        if (!candidate) {
            // Create a minimal candidate for this staff so we can store education
            candidate = await Candidate.create({
                firstName: (staff.name || 'Staff').split(' ')[0] || 'Staff',
                lastName: (staff.name || '').split(' ').slice(1).join(' ') || 'User',
                email: staff.email,
                phone: staff.phone || '',
                position: staff.designation || 'Employee',
                primarySkill: 'General',
                status: 'Applied',
                businessId: staff.businessId,
                education: normalizedEducation
            });
            // Update staff.candidateId without triggering full validation
            await Staff.findByIdAndUpdate(
                staff._id,
                { candidateId: candidate._id },
                { runValidators: false, new: false }
            );
        } else {
            candidate.education = normalizedEducation;
            await candidate.save();
        }

        const updatedCandidate = await Candidate.findById(candidate._id).lean();
        res.json({
            success: true,
            message: 'Education updated successfully',
            data: {
                education: updatedCandidate.education || []
            }
        });
    } catch (error) {
        console.error('updateEducation Error:', error);
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

// -------------------------------
// Password reset with OTP flow
// -------------------------------

// Phase 1: Request OTP
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: { message: 'Email is required' }
            });
        }

        const user = await findOrCreateUserByEmail(email);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: { message: 'No account found with this email' }
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.resetPasswordOTP = otp;
        user.resetPasswordOTPExpiry = expiry;
        await user.save();

        // Send OTP via email (and potentially other channels later)
        sendOTPEmail(user.email, otp);

        return res.status(200).json({
            success: true,
            message: 'OTP has been sent to your registered email address'
        });
    } catch (error) {
        console.error('forgotPassword Error:', error);
        return res.status(500).json({
            success: false,
            error: { message: error.message }
        });
    }
};

// Phase 2: Verify OTP
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                error: { message: 'Email and OTP are required' }
            });
        }

        const user = await findOrCreateUserByEmail(email);

        if (!user || !user.resetPasswordOTP || !user.resetPasswordOTPExpiry) {
            return res.status(400).json({
                success: false,
                error: { message: 'Invalid or expired OTP' }
            });
        }

        if (user.resetPasswordOTP !== otp) {
            return res.status(400).json({
                success: false,
                error: { message: 'Invalid OTP' }
            });
        }

        if (new Date() > user.resetPasswordOTPExpiry) {
            return res.status(400).json({
                success: false,
                error: { message: 'OTP has expired' }
            });
        }

        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully'
        });
    } catch (error) {
        console.error('verifyOTP Error:', error);
        return res.status(500).json({
            success: false,
            error: { message: error.message }
        });
    }
};

// Phase 3: Reset password
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                success: false,
                error: { message: 'Email, OTP and new password are required' }
            });
        }

        const user = await findOrCreateUserByEmail(email);

        if (!user || !user.resetPasswordOTP || !user.resetPasswordOTPExpiry) {
            return res.status(400).json({
                success: false,
                error: { message: 'Invalid or expired OTP' }
            });
        }

        if (user.resetPasswordOTP !== otp) {
            return res.status(400).json({
                success: false,
                error: { message: 'Invalid OTP' }
            });
        }

        if (new Date() > user.resetPasswordOTPExpiry) {
            return res.status(400).json({
                success: false,
                error: { message: 'OTP has expired' }
            });
        }

        user.password = newPassword; // Will be hashed by pre-save hook
        user.resetPasswordOTP = undefined;
        user.resetPasswordOTPExpiry = undefined;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Password has been reset successfully'
        });
    } catch (error) {
        console.error('resetPassword Error:', error);
        return res.status(500).json({
            success: false,
            error: { message: error.message }
        });
    }
};

// -------------------------------
// Change password (old + new)
// -------------------------------

const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: { message: 'Old password and new password are required' }
            });
        }

        if (oldPassword === newPassword) {
            return res.status(400).json({
                success: false,
                error: { message: 'New password must be different from old password' }
            });
        }

        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: { message: 'Not authenticated' }
            });
        }

        // Load user with password field
        const user = await User.findById(userId).select('+password');
        if (!user || !user.password) {
            return res.status(404).json({
                success: false,
                error: { message: 'User not found or password not set' }
            });
        }

        const isMatch = await user.matchPassword(oldPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: { message: 'Old password is incorrect' }
            });
        }

        user.password = newPassword; // pre-save hook will hash
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('changePassword Error:', error);
        return res.status(500).json({
            success: false,
            error: { message: error.message }
        });
    }
};

// -------------------------------
// Update profile photo (Cloudinary)
// -------------------------------

const updateProfilePhoto = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                error: { message: 'No file uploaded' }
            });
        }

        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: { message: 'Not authenticated' }
            });
        }

        // Convert buffer to base64 data URL for Cloudinary
        const base64 = req.file.buffer.toString('base64');
        const dataUri = `data:${req.file.mimetype || 'image/jpeg'};base64,${base64}`;

        const uploadResult = await cloudinary.uploader.upload(dataUri, {
            folder: 'hrms/profile_photos',
            resource_type: 'image'
        });

        const photoUrl = uploadResult.secure_url;

        // Update User avatar
        const user = await User.findById(userId);
        if (user) {
            user.avatar = photoUrl;
            await user.save();
        }

        // Update Staff avatar if staff record exists
        if (req.staff && req.staff._id) {
            await Staff.findByIdAndUpdate(
                req.staff._id,
                { avatar: photoUrl },
                { new: true }
            );
        }

        return res.status(200).json({
            success: true,
            message: 'Profile photo updated successfully',
            data: { photoUrl }
        });
    } catch (error) {
        console.error('updateProfilePhoto Error:', error);
        return res.status(500).json({
            success: false,
            error: { message: error.message }
        });
    }
};

module.exports = {
    login,
    googleLogin,
    register,
    getProfile,
    updateProfile,
    updateEducation,
    forgotPassword,
    verifyOTP,
    resetPassword,
    changePassword,
    updateProfilePhoto
};
