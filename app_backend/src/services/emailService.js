const nodemailer = require('nodemailer');

// Create a reusable transporter using SMTP settings from environment variables
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Send a password reset OTP email
 * @param {string} toEmail
 * @param {string} otp
 */
const sendOTPEmail = async (toEmail, otp) => {
    if (!toEmail || !otp) return;

    const fromEmail = process.env.SENDPULSE_FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const fromName = process.env.SENDPULSE_FROM_NAME || 'ASKEVA HRMS';

    const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: toEmail,
        subject: 'Your ASKEVA HRMS Password Reset OTP',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>Password Reset Request</h2>
                <p>We received a request to reset the password for your ASKEVA HRMS account.</p>
                <p>Your One-Time Password (OTP) is:</p>
                <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
                <p>This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
                <p>If you did not request a password reset, you can safely ignore this email.</p>
                <br/>
                <p>Regards,<br/>ASKEVA HRMS Team</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EmailService] OTP email sent to ${toEmail}`);
    } catch (error) {
        console.error('[EmailService] Failed to send OTP email:', error.message);
        // Do not throw error further to avoid leaking email status to client
    }
};

module.exports = {
    sendOTPEmail
};

