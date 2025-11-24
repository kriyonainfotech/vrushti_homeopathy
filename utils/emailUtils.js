const nodemailer = require('nodemailer');

// Helper to check environment variables are loaded
console.log("SMTP_HOST:", process.env.SMTP_HOST);
console.log("SMTP_PORT:", process.env.SMTP_PORT);
console.log("SMTP_EMAIL:", process.env.SMTP_EMAIL);
console.log("SMTP_PASSWORD:", process.env.SMTP_PASSWORD ? '********' : 'undefined'); // Masking password for log

const sendEmail = async (options) => {
    // Gmail requires specific settings and an "App Password" to authenticate.
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Use 'gmail' service for simplicity
        auth: {
            user: process.env.SMTP_EMAIL, // Your Gmail address (vrushticlinic@gmail.com)
            pass: process.env.SMTP_PASSWORD // IMPORTANT: This must be an App Password, NOT your main Gmail password.
        }
    });

    // 2. Define email data
    const message = {
        from: `${process.env.FROM_NAME || 'Clinic App'} <${process.env.SMTP_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        html: options.message,
    };

    // 3. Send the email
    console.log(`[LOG] Attempting to send email to: ${options.email}`);
    const info = await transporter.sendMail(message);
    console.log(`[LOG] Message sent: %s`, info.messageId);
};

module.exports = sendEmail;