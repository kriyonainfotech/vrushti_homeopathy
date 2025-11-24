const User = require('../models/userModel');
const sendEmail = require('../utils/emailUtils');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Helper function for email validation
const validateEmail = (email) => {
    const re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return re.test(email);
};

// Helper function for basic phone number validation (must be at least 10 digits)
const validatePhone = (phone) => {
    // Simple check for digits and min length 10
    const re = /^\d{10,}$/;
    return re.test(phone.replace(/[\s()+-]/g, ''));
};


// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { name, email, phone, password, role } = req.body;

        // --- 1. Validation Logic (Moved from Model) ---
        if (!name || !email || !phone || !password) {
            return res.status(400).json({ success: false, error: 'Please provide name, email, phone, and password.' });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ success: false, error: 'Please add a valid email address.' });
        }
        if (!validatePhone(phone)) {
            return res.status(400).json({ success: false, error: 'Please provide a valid phone number (min 10 digits).' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
        }

        // --- 2. Hashing Logic (Moved from Model Middleware) ---
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            console.error(`[ERROR] Registration failed: Duplicate email: ${email}`);
            return res.status(400).json({ success: false, error: 'Email already registered.' });
        }

        // Create user
        user = await User.create({
            name,
            email,
            phone, // Added phone field
            password: hashedPassword,
            // Only allow 'admin' role if explicitly requested
            role: role === 'admin' ? 'admin' : 'staff'
        });

        // Response does not include JWT token/cookie anymore.
        res.status(201).json({
            success: true,
            message: 'Registration successful. Please log in.',
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone, // Added phone to response
                role: user.role
            }
        });
        console.log(`[LOG] New user registered: ${user.email} (${user.role})`);
    } catch (err) {
        console.error(`[ERROR] Registration failed: ${err.message}`);
        res.status(500).json({ success: false, error: 'Server error during registration.' });
    }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // --- 1. Validation Logic (Moved from Model) ---
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide email and password.' });
        }
        if (!validateEmail(email)) {
            return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
        }

        // Check for user (must select password manually as it is set to select: false)
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            console.log(`[LOG] Login failed for email: ${email} (User not found)`);
            return res.status(401).json({ success: false, error: 'Invalid credentials.' });
        }

        // --- 2. Password Matching Logic (Moved from Model Method) ---
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            console.log(`[LOG] Login failed for email: ${email} (Password mismatch)`);
            return res.status(401).json({ success: false, error: 'Invalid credentials.' });
        }

        // Response does not include JWT token/cookie anymore.
        // Frontend (Flutter) will receive the user ID and role, and can use them for subsequent protected calls (e.g., via a custom header).
        res.status(200).json({
            success: true,
            message: 'Login successful.',
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone, // Added phone to response
                role: user.role
            }
        });
        console.log(`[LOG] User logged in: ${user.email}`);
    } catch (err) {
        console.error(`[ERROR] Login failed: ${err.message}`);
        res.status(500).json({ success: false, error: 'Server error during login.' });
    }
};

// @desc    Forgot Password - Send Reset Token to email
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
// @desc    Forgot Password - Send OTP to email
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            console.log(`[LOG] Forgot password request for non-existent email: ${req.body.email}`);
            // Security measure: send 200 OK regardless of user existence
            return res.status(200).json({ success: true, message: 'If a user with that email exists, an OTP has been sent.' });
        }

        // --- 1. OTP Generation Logic ---
        // Generate 6-digit numeric OTP
        const otpRaw = Math.floor(100000 + Math.random() * 900000).toString();

        // Hash the OTP before storing it
        const resetPasswordTokenHashed = crypto
            .createHash('sha256')
            .update(otpRaw)
            .digest('hex');

        // Set expiration to 10 minutes
        const resetPasswordExpire = Date.now() + 10 * 60 * 1000;

        user.resetPasswordToken = resetPasswordTokenHashed;
        user.resetPasswordExpire = resetPasswordExpire;

        await user.save({ validateBeforeSave: false });

        // --- 2. Branded HTML Email Template ---
        const brandPrimary = '#27a4db'; // Blue from logo
        const brandSecondary = '#81be41'; // Green from logo
        const clinicName = 'Vrushti Homeopathic & Diet Clinic';

        const message = `
            <div style="font-family: 'PT Magistral Black Cyrillic', 'Lucida Sans Unicode', Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                
                <!-- Header with Primary Color -->
                <div style="background-color: ${brandPrimary}; color: white; padding: 20px 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">Password Reset Request</h1>
                    <p style="margin: 5px 0 0; font-size: 14px;">${clinicName}</p>
                </div>

                <!-- Body Content -->
                <div style="padding: 30px; background-color: #ffffff;">
                    <p style="font-size: 16px; color: #333; line-height: 1.5;">Hello ${user.name},</p>
                    <p style="font-size: 16px; color: #333; line-height: 1.5;">We received a request to reset the password for your ${clinicName} account. Please use the following One-Time Password (OTP) to proceed with changing your password.</p>
                    
                    <!-- OTP Box with Secondary Color Highlight -->
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="display: inline-block; background-color: #f7f7f7; color: ${brandPrimary}; font-size: 36px; font-weight: bold; padding: 20px 40px; border-radius: 8px; border: 3px solid ${brandSecondary}; letter-spacing: 3px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            ${otpRaw}
                        </span>
                    </div>

                    <p style="font-size: 14px; color: #555; text-align: center; margin-bottom: 20px;">This OTP is valid for the next 10 minutes.</p>
                    <p style="font-size: 14px; color: #555; line-height: 1.5; margin-top: 20px;">If you did not request a password reset, please secure your account immediately or ignore this email.</p>
                </div>

                <!-- Footer -->
                <div style="background-color: #f7f7f7; color: #888; padding: 15px 30px; text-align: center; font-size: 12px; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0;">This is an automated message. Please do not reply.</p>
                    <p style="margin: 5px 0 0;">&copy; ${new Date().getFullYear()} ${clinicName}. All rights reserved.</p>
                </div>
            </div>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Your Password Reset OTP (Valid for 10 Minutes)',
                message: message
            });

            res.status(200).json({
                success: true,
                message: 'OTP sent successfully to your email.'
            });
            console.log(`[LOG] Password reset OTP sent to: ${user.email}`);
        } catch (err) {
            // If email fails, clear the token from the user object
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });

            console.error(`[ERROR] Failed to send password reset email: ${err.message}`);
            // Log the user's email was the issue for debugging
            return res.status(500).json({ success: false, error: 'Email could not be sent. Server error.' });
        }
    } catch (err) {
        console.error(`[ERROR] Forgot password failed: ${err.message}`);
        res.status(500).json({ success: false, error: 'Server error during forgot password process.' });
    }
};


// @desc    Reset Password using OTP, email, and new password
// @route   POST /api/v1/auth/resetpassword
// @access  Public
exports.resetPassword = async (req, res, next) => {
    try {
        const { email, otp, password } = req.body;
        console.log(req.body, 'reset password')

        // --- 1. Validation Logic ---
        if (!email || !otp || !password) {
            return res.status(400).json({ success: false, error: 'Please provide email, OTP, and a new password.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
        }

        // Hash the provided OTP (which acts as the reset token)
        const resetPasswordTokenHashed = crypto
            .createHash('sha256')
            .update(otp)
            .digest('hex');

        // Find user by email, HASHED token, AND check expiration date
        const user = await User.findOne({
            email,
            resetPasswordToken: resetPasswordTokenHashed,
            resetPasswordExpire: { $gt: Date.now() } // $gt means greater than
        });

        if (!user) {
            console.log(`[LOG] Password reset failed: Invalid OTP or expired.`);
            return res.status(400).json({ success: false, error: 'Invalid or expired OTP. Please try the forgot password process again.' });
        }

        // --- 2. Hashing Logic (New Password) ---
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Set new password and clear token fields
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        // Response does not include JWT token/cookie anymore.
        res.status(200).json({
            success: true,
            message: 'Password successfully reset.'
        });
        console.log(`[LOG] Password successfully reset for user: ${user.email}`);
    } catch (err) {
        console.error(`[ERROR] Reset password failed: ${err.message}`);
        res.status(500).json({ success: false, error: 'Server error during password reset.' });
    }
};