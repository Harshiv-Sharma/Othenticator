const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    logger.error('Error with email configuration:', error);
  } else {
    logger.info('Email server is ready to take our messages');
  }
});

const sendPasswordResetEmail = async (email, verificationCode) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Your Password Reset Code',
      text: `Your verification code is: ${verificationCode}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #111827; margin-bottom: 20px;">Password Reset Code</h2>
          <p style="color: #4b5563; margin-bottom: 20px;">Use the following code to reset your password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="
              font-size: 24px; 
              font-weight: bold; 
              letter-spacing: 2px; 
              padding: 15px; 
              background: #f5f5f5; 
              display: inline-block; 
              border-radius: 6px; 
              min-width: 200px;
              border: 2px dashed #4F46E5;
            ">
              ${verificationCode}
            </div>
          </div>
          
          <p style="color: #4b5563; margin-bottom: 10px; font-size: 14px; color: #6b7280;">
            This code will expire in 10 minutes.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${email}`);
  } catch (error) {
    logger.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

module.exports = {
  sendPasswordResetEmail,
};