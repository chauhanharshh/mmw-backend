import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from '../utils/logger.js';

// Transporter configuration - using environment variables
// Note: User will need to provide these in .env
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Send an email notification to the admin about a new enquiry.
 */
export async function sendEnquiryNotification(enquiry) {
    if (!process.env.SMTP_USER || !process.env.ADMIN_EMAIL) {
        logger.warn('SMTP or Admin email not configured. Skipping email notification.');
        return;
    }

    const mailOptions = {
        from: `"MapsMyWay Enquiry" <${process.env.SMTP_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `New Enquiry Received: ${enquiry.package}`,
        html: `
      <h2>New Enquiry Details</h2>
      <p><strong>Name:</strong> ${enquiry.name}</p>
      <p><strong>Email:</strong> ${enquiry.email}</p>
      <p><strong>Phone:</strong> ${enquiry.phone}</p>
      <p><strong>Package:</strong> ${enquiry.package}</p>
      <p><strong>Source:</strong> ${enquiry.source}</p>
      <p><strong>Message:</strong> ${enquiry.message || 'No message provided'}</p>
      <br/>
      <p>View this in the admin panel to mark as contacted.</p>
    `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        logger.info(`Enquiry notification sent: ${info.messageId}`);
    } catch (error) {
        logger.error('Error sending enquiry notification email:', error);
    }
}
