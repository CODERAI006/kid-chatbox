/**
 * Email Service Utility
 * Handles sending emails via SMTP using nodemailer
 */

const nodemailer = require('nodemailer');

/**
 * Get email header with logo
 * Uses the robot emoji 🤖 from the home page
 * @returns {string} HTML header section with logo
 */
function getEmailHeader() {
  return `
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <div style="font-size: 80px; margin-bottom: 15px; display: inline-block;">🤖</div>
    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Guru ID</h1>
    <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">AI-Powered Learning Platform</p>
  </div>
  `;
}

/**
 * Get email footer
 * @returns {string} HTML footer section
 */
function getEmailFooter() {
  return `
  <div style="text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #e0e0e0;">
    <p style="margin: 5px 0;">This is an automated email. Please do not reply to this message.</p>
    <p style="margin: 5px 0;">© ${new Date().getFullYear()} Guru ID. All rights reserved.</p>
    <p style="margin: 10px 0 0 0;">
      <a href="#" style="color: #667eea; text-decoration: none;">Privacy Policy</a> | 
      <a href="#" style="color: #667eea; text-decoration: none;">Terms of Service</a> | 
      <a href="#" style="color: #667eea; text-decoration: none;">Contact Support</a>
    </p>
  </div>
  `;
}

/**
 * SMTP configuration from environment variables
 */
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'info@greenwoodscity.in',
    pass: process.env.SMTP_PASSWORD || 'Greenwood@122003',
  },
};

/**
 * Email sender address (from address for all emails)
 * Can be overridden via environment variable
 */
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'info@guruai.com';

/**
 * Create reusable transporter instance
 */
let transporter = null;

/**
 * Initialize email transporter
 * @returns {Promise<nodemailer.Transporter>} Configured transporter instance
 */
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(SMTP_CONFIG);
  }
  return transporter;
}

/**
 * Verify SMTP connection
 * @returns {Promise<boolean>} True if connection is successful
 */
async function verifyConnection() {
  try {
    const transport = getTransporter();
    await transport.verify();
    return true;
  } catch (error) {
    console.error('SMTP connection verification failed:', error.message);
    return false;
  }
}

/**
 * Send welcome email with credentials to newly registered user
 * @param {Object} userData - User information
 * @param {string} userData.email - User email address
 * @param {string} userData.name - User name
 * @param {string} userData.password - User password (plain text, will be sent in email)
 * @returns {Promise<Object>} Email send result
 * @throws {Error} If email sending fails
 */
async function sendWelcomeEmail({ email, name, password }) {
  if (!email || !name || !password) {
    throw new Error('Email, name, and password are required to send welcome email');
  }

  const transport = getTransporter();

  const mailOptions = {
    from: `"Guru ID Team" <${EMAIL_FROM_ADDRESS}>`,
    to: email,
    subject: 'Welcome to Guru ID - Your Account Credentials',
    html: getWelcomeEmailTemplate(name, email, password),
    text: getWelcomeEmailTextTemplate(name, email, password),
  };

  try {
    const info = await transport.sendMail(mailOptions);
    console.log(`Welcome email sent successfully to ${email}:`, info.messageId);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(`Failed to send welcome email to ${email}:`, error.message);
    throw error;
  }
}

/**
 * Send welcome email to Google login users (no password needed)
 * @param {Object} userData - User information
 * @param {string} userData.email - User email address
 * @param {string} userData.name - User name
 * @returns {Promise<Object>} Email send result
 * @throws {Error} If email sending fails
 */
async function sendGoogleWelcomeEmail({ email, name }) {
  if (!email || !name) {
    throw new Error('Email and name are required to send welcome email');
  }

  const transport = getTransporter();

  const mailOptions = {
    from: `"Guru ID Team" <${EMAIL_FROM_ADDRESS}>`,
    to: email,
    subject: 'Welcome to Guru ID - Your Account is Ready!',
    html: getGoogleWelcomeEmailTemplate(name, email),
    text: getGoogleWelcomeEmailTextTemplate(name, email),
  };

  try {
    const info = await transport.sendMail(mailOptions);
    console.log(`Welcome email sent successfully to ${email}:`, info.messageId);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(`Failed to send welcome email to ${email}:`, error.message);
    throw error;
  }
}

/**
 * Generate HTML email template for welcome email
 * @param {string} name - User name
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {string} HTML email content
 */
function getWelcomeEmailTemplate(name, email, password) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Guru ID</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
    ${getEmailHeader()}
  
  <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Dear ${name},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Thank you for registering with Guru ID! We're thrilled to have you join our learning community.
    </p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Your account has been successfully created. Below are your login credentials:
    </p>
    
    <div style="background: #ffffff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 10px 0; font-size: 14px;"><strong>Email:</strong> <span style="color: #667eea;">${email}</span></p>
      <p style="margin: 10px 0; font-size: 14px;"><strong>Password:</strong> <span style="color: #667eea; font-family: monospace;">${password}</span></p>
    </div>
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>⚠️ Important:</strong> Please keep your credentials safe and secure. We recommend changing your password after your first login.
      </p>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Your account is now <strong style="color: #28a745;">enabled</strong> and ready to use! You can access all features of Guru ID, including:
    </p>
    
    <ul style="font-size: 16px; margin-bottom: 20px; padding-left: 20px;">
      <li>Interactive quizzes and assessments</li>
      <li>Personalized study materials</li>
      <li>Progress tracking and analytics</li>
      <li>Age-appropriate learning content</li>
      <li>Multi-language support</li>
    </ul>
    
    <p style="font-size: 16px; margin-bottom: 30px;">
      If you have any questions or need assistance, please don't hesitate to contact our support team.
    </p>
    
    <p style="font-size: 16px; margin-bottom: 10px;">
      Once again, welcome aboard! We're excited to be part of your learning journey.
    </p>
    
    <p style="font-size: 16px; margin-top: 30px;">
      Best regards,<br>
      <strong style="color: #667eea;">The Guru ID Team</strong>
    </p>
  </div>
  ${getEmailFooter()}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email template for welcome email
 * @param {string} name - User name
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {string} Plain text email content
 */
function getWelcomeEmailTextTemplate(name, email, password) {
  return `
Welcome to Guru ID! 🎉

Dear ${name},

Thank you for registering with Guru ID! We're thrilled to have you join our learning community.

Your account has been successfully created. Below are your login credentials:

Email: ${email}
Password: ${password}

⚠️ Important: Please keep your credentials safe and secure. We recommend changing your password after your first login.

Your account is now enabled and ready to use! You can access all features of Guru ID, including:
- Interactive quizzes and assessments
- Personalized study materials
- Progress tracking and analytics
- Age-appropriate learning content
- Multi-language support

If you have any questions or need assistance, please don't hesitate to contact our support team.

Once again, welcome aboard! We're excited to be part of your learning journey.

Best regards,
The Guru ID Team

---
This is an automated email. Please do not reply to this message.
© ${new Date().getFullYear()} Guru ID. All rights reserved.
  `.trim();
}

/**
 * Generate HTML email template for Google login welcome email
 * @param {string} name - User name
 * @param {string} email - User email
 * @returns {string} HTML email content
 */
function getGoogleWelcomeEmailTemplate(name, email) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Guru ID</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
    ${getEmailHeader()}
  
  <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Dear ${name},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Welcome to Guru ID! 🎉 We're thrilled to have you join our learning community.
    </p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Your account has been successfully created using Google Sign-In. Your account is now <strong style="color: #28a745;">enabled</strong> and ready to use!
    </p>
    
    <div style="background: #ffffff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 10px 0; font-size: 14px;"><strong>Email:</strong> <span style="color: #667eea;">${email}</span></p>
      <p style="margin: 10px 0; font-size: 14px;"><strong>Login Method:</strong> <span style="color: #667eea;">Google Sign-In</span></p>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      You can now access all features of Guru ID, including:
    </p>
    
    <ul style="font-size: 16px; margin-bottom: 20px; padding-left: 20px;">
      <li>Interactive quizzes and assessments</li>
      <li>Personalized study materials</li>
      <li>Progress tracking and analytics</li>
      <li>Age-appropriate learning content</li>
      <li>Multi-language support</li>
    </ul>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Simply use the "Login with Google" button to access your account anytime.
    </p>
    
    <p style="font-size: 16px; margin-bottom: 30px;">
      If you have any questions or need assistance, please don't hesitate to contact our support team.
    </p>
    
    <p style="font-size: 16px; margin-bottom: 10px;">
      Once again, welcome aboard! We're excited to be part of your learning journey.
    </p>
    
    <p style="font-size: 16px; margin-top: 30px;">
      Best regards,<br>
      <strong style="color: #667eea;">The Guru ID Team</strong>
    </p>
  </div>
  ${getEmailFooter()}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email template for Google login welcome email
 * @param {string} name - User name
 * @param {string} email - User email
 * @returns {string} Plain text email content
 */
function getGoogleWelcomeEmailTextTemplate(name, email) {
  return `
Welcome to Guru ID! 🎉

Dear ${name},

Welcome to Guru ID! We're thrilled to have you join our learning community.

Your account has been successfully created using Google Sign-In. Your account is now enabled and ready to use!

Email: ${email}
Login Method: Google Sign-In

You can now access all features of Guru ID, including:
- Interactive quizzes and assessments
- Personalized study materials
- Progress tracking and analytics
- Age-appropriate learning content
- Multi-language support

Simply use the "Login with Google" button to access your account anytime.

If you have any questions or need assistance, please don't hesitate to contact our support team.

Once again, welcome aboard! We're excited to be part of your learning journey.

Best regards,
The Guru ID Team

---
This is an automated email. Please do not reply to this message.
© ${new Date().getFullYear()} Guru ID. All rights reserved.
  `.trim();
}

/**
 * Send account approval email to user
 * @param {Object} userData - User information
 * @param {string} userData.email - User email address
 * @param {string} userData.name - User name
 * @returns {Promise<Object>} Email send result
 * @throws {Error} If email sending fails
 */
async function sendApprovalEmail({ email, name }) {
  if (!email || !name) {
    throw new Error('Email and name are required to send approval email');
  }

  const transport = getTransporter();

  const mailOptions = {
    from: `"Guru ID Team" <${EMAIL_FROM_ADDRESS}>`,
    to: email,
    subject: '🎉 Your Guru ID Account Has Been Approved!',
    html: getApprovalEmailTemplate(name),
    text: getApprovalEmailTextTemplate(name),
  };

  try {
    const info = await transport.sendMail(mailOptions);
    console.log(`Approval email sent successfully to ${email}:`, info.messageId);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(`Failed to send approval email to ${email}:`, error.message);
    throw error;
  }
}

/**
 * Generate HTML email template for account approval
 * @param {string} name - User name
 * @returns {string} HTML email content
 */
function getApprovalEmailTemplate(name) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Approved - Guru ID</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
    ${getEmailHeader()}
  
  <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 10px 10px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="background: #d4edda; border: 2px solid #28a745; border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 40px;">✅</span>
      </div>
      <h2 style="color: #28a745; margin: 0; font-size: 24px;">Account Approved!</h2>
    </div>

    <p style="font-size: 16px; margin-bottom: 20px;">Dear ${name},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Great news! Your Guru ID account has been <strong style="color: #28a745;">approved</strong> by our admin team. You can now access all the amazing features of our platform!
    </p>
    
    <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold; color: #667eea;">What's Next?</p>
      <ul style="margin: 0; padding-left: 20px; font-size: 15px;">
        <li style="margin-bottom: 10px;">Access interactive quizzes and assessments</li>
        <li style="margin-bottom: 10px;">Explore personalized study materials</li>
        <li style="margin-bottom: 10px;">Track your progress with detailed analytics</li>
        <li style="margin-bottom: 10px;">Enjoy age-appropriate learning content</li>
        <li style="margin-bottom: 10px;">Learn in your preferred language</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
        Start Learning Now →
      </a>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      We're excited to be part of your learning journey and can't wait to see you excel!
    </p>
    
    <p style="font-size: 16px; margin-top: 30px;">
      Best regards,<br>
      <strong style="color: #667eea;">The Guru ID Team</strong>
    </p>
  </div>
  ${getEmailFooter()}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email template for account approval
 * @param {string} name - User name
 * @returns {string} Plain text email content
 */
function getApprovalEmailTextTemplate(name) {
  return `
Account Approved! ✅

Dear ${name},

Great news! Your Guru ID account has been approved by our admin team. You can now access all the amazing features of our platform!

What's Next?
- Access interactive quizzes and assessments
- Explore personalized study materials
- Track your progress with detailed analytics
- Enjoy age-appropriate learning content
- Learn in your preferred language

We're excited to be part of your learning journey and can't wait to see you excel!

Best regards,
The Guru ID Team

---
This is an automated email. Please do not reply to this message.
© ${new Date().getFullYear()} Guru ID. All rights reserved.
  `.trim();
}

/**
 * Send quiz completion email to user
 * @param {Object} quizData - Quiz completion information
 * @param {string} quizData.email - User email address
 * @param {string} quizData.name - User name
 * @param {string} quizData.subject - Quiz subject
 * @param {string} quizData.subtopic - Quiz subtopic
 * @param {number} quizData.scorePercentage - Score percentage
 * @param {number} quizData.correctAnswers - Number of correct answers
 * @param {number} quizData.totalQuestions - Total number of questions
 * @param {number} quizData.timeTaken - Time taken in seconds
 * @returns {Promise<Object>} Email send result
 * @throws {Error} If email sending fails
 */
async function sendQuizCompletionEmail({ email, name, subject, subtopic, scorePercentage, correctAnswers, totalQuestions, timeTaken }) {
  if (!email || !name || !subject || scorePercentage === undefined) {
    throw new Error('Email, name, subject, and scorePercentage are required to send quiz completion email');
  }

  const transport = getTransporter();

  const mailOptions = {
    from: `"Guru ID Team" <${EMAIL_FROM_ADDRESS}>`,
    to: email,
    subject: `🎯 Quiz Completed: ${subject} - ${Math.round(scorePercentage)}% Score`,
    html: getQuizCompletionEmailTemplate(name, subject, subtopic, scorePercentage, correctAnswers, totalQuestions, timeTaken),
    text: getQuizCompletionEmailTextTemplate(name, subject, subtopic, scorePercentage, correctAnswers, totalQuestions, timeTaken),
  };

  try {
    const info = await transport.sendMail(mailOptions);
    console.log(`Quiz completion email sent successfully to ${email}:`, info.messageId);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(`Failed to send quiz completion email to ${email}:`, error.message);
    throw error;
  }
}

/**
 * Generate HTML email template for quiz completion
 * @param {string} name - User name
 * @param {string} subject - Quiz subject
 * @param {string} subtopic - Quiz subtopic
 * @param {number} scorePercentage - Score percentage
 * @param {number} correctAnswers - Number of correct answers
 * @param {number} totalQuestions - Total questions
 * @param {number} timeTaken - Time taken in seconds
 * @returns {string} HTML email content
 */
function getQuizCompletionEmailTemplate(name, subject, subtopic, scorePercentage, correctAnswers, totalQuestions, timeTaken) {
  const passed = scorePercentage >= 60;
  const scoreColor = passed ? '#28a745' : '#ffc107';
  const scoreEmoji = passed ? '🎉' : '📚';
  const minutes = Math.floor(timeTaken / 60);
  const seconds = timeTaken % 60;
  const timeFormatted = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quiz Completed - Guru ID</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
    ${getEmailHeader()}
  
  <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 10px 10px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 50px; margin-bottom: 15px;">${scoreEmoji}</div>
      <h2 style="color: #667eea; margin: 0; font-size: 24px;">Quiz Completed!</h2>
      <p style="color: #666; margin: 5px 0 0 0; font-size: 16px;">${subject}${subtopic ? ` - ${subtopic}` : ''}</p>
    </div>

    <p style="font-size: 16px; margin-bottom: 25px;">Dear ${name},</p>
    
    <p style="font-size: 16px; margin-bottom: 25px;">
      Congratulations on completing your quiz! Here's a summary of your performance:
    </p>
    
    <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-radius: 10px; padding: 25px; margin: 25px 0; text-align: center;">
      <div style="font-size: 48px; font-weight: bold; color: ${scoreColor}; margin-bottom: 10px;">
        ${Math.round(scorePercentage)}%
      </div>
      <p style="margin: 0; font-size: 18px; color: #333; font-weight: bold;">Your Score</p>
    </div>

    <div style="display: flex; justify-content: space-around; margin: 30px 0; flex-wrap: wrap;">
      <div style="text-align: center; flex: 1; min-width: 120px; margin: 10px;">
        <div style="font-size: 32px; font-weight: bold; color: #28a745; margin-bottom: 5px;">${correctAnswers}</div>
        <p style="margin: 0; font-size: 14px; color: #666;">Correct Answers</p>
      </div>
      <div style="text-align: center; flex: 1; min-width: 120px; margin: 10px;">
        <div style="font-size: 32px; font-weight: bold; color: #dc3545; margin-bottom: 5px;">${totalQuestions - correctAnswers}</div>
        <p style="margin: 0; font-size: 14px; color: #666;">Incorrect Answers</p>
      </div>
      <div style="text-align: center; flex: 1; min-width: 120px; margin: 10px;">
        <div style="font-size: 32px; font-weight: bold; color: #667eea; margin-bottom: 5px;">${timeFormatted}</div>
        <p style="margin: 0; font-size: 14px; color: #666;">Time Taken</p>
      </div>
    </div>

    ${passed ? `
    <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 15px; color: #155724;">
        <strong>🎉 Excellent Work!</strong> You've passed the quiz! Keep up the great work and continue learning.
      </p>
    </div>
    ` : `
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 15px; color: #856404;">
        <strong>📚 Keep Learning!</strong> Don't worry if you didn't pass this time. Review the material and try again. Every attempt is a learning opportunity!
      </p>
    </div>
    `}

    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
        View Detailed Results →
      </a>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Keep practicing and improving! Your progress is being tracked, and you can review your performance anytime in your dashboard.
    </p>
    
    <p style="font-size: 16px; margin-top: 30px;">
      Best regards,<br>
      <strong style="color: #667eea;">The Guru ID Team</strong>
    </p>
  </div>
  ${getEmailFooter()}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email template for quiz completion
 * @param {string} name - User name
 * @param {string} subject - Quiz subject
 * @param {string} subtopic - Quiz subtopic
 * @param {number} scorePercentage - Score percentage
 * @param {number} correctAnswers - Number of correct answers
 * @param {number} totalQuestions - Total questions
 * @param {number} timeTaken - Time taken in seconds
 * @returns {string} Plain text email content
 */
function getQuizCompletionEmailTextTemplate(name, subject, subtopic, scorePercentage, correctAnswers, totalQuestions, timeTaken) {
  const passed = scorePercentage >= 60;
  const minutes = Math.floor(timeTaken / 60);
  const seconds = timeTaken % 60;
  const timeFormatted = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return `
Quiz Completed! 🎯

Dear ${name},

Congratulations on completing your quiz! Here's a summary of your performance:

Quiz: ${subject}${subtopic ? ` - ${subtopic}` : ''}
Score: ${Math.round(scorePercentage)}%
Correct Answers: ${correctAnswers}
Incorrect Answers: ${totalQuestions - correctAnswers}
Time Taken: ${timeFormatted}

${passed ? '🎉 Excellent Work! You\'ve passed the quiz! Keep up the great work and continue learning.' : '📚 Keep Learning! Don\'t worry if you didn\'t pass this time. Review the material and try again. Every attempt is a learning opportunity!'}

Keep practicing and improving! Your progress is being tracked, and you can review your performance anytime in your dashboard.

Best regards,
The Guru ID Team

---
This is an automated email. Please do not reply to this message.
© ${new Date().getFullYear()} Guru ID. All rights reserved.
  `.trim();
}

/**
 * Send login credentials to an existing user (password created or reset by admin)
 */
async function sendCredentialsEmail({ email, name, password, isReset = false }) {
  if (!email || !name || !password) {
    throw new Error('Email, name, and password are required to send credentials email');
  }

  const transport = getTransporter();
  const actionLabel = isReset ? 'reset' : 'created';
  const subject = isReset
    ? 'Guru ID - Your Password Has Been Reset'
    : 'Guru ID - Your Login Password Has Been Set';

  const mailOptions = {
    from: `"Guru ID Team" <${EMAIL_FROM_ADDRESS}>`,
    to: email,
    subject,
    html: getCredentialsEmailTemplate(name, email, password, isReset),
    text: getCredentialsEmailTextTemplate(name, email, password, isReset),
  };

  try {
    const info = await transport.sendMail(mailOptions);
    console.log(`Credentials email sent to ${email} (${actionLabel}):`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Failed to send credentials email to ${email}:`, error.message);
    throw error;
  }
}

function getCredentialsEmailTemplate(name, email, password, isReset) {
  const intro = isReset
    ? 'Your Guru ID login password has been reset by an administrator.'
    : 'A login password has been created for your Guru ID account by an administrator.';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Guru ID Login Credentials</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
    ${getEmailHeader()}
  <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Dear ${name},</p>
    <p style="font-size: 16px; margin-bottom: 20px;">${intro}</p>
    <p style="font-size: 16px; margin-bottom: 20px;">You can sign in with email and password using the credentials below:</p>
    <div style="background: #ffffff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 10px 0; font-size: 14px;"><strong>Email:</strong> <span style="color: #667eea;">${email}</span></p>
      <p style="margin: 10px 0; font-size: 14px;"><strong>Password:</strong> <span style="color: #667eea; font-family: monospace;">${password}</span></p>
    </div>
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>Important:</strong> Keep these credentials secure. Change your password after signing in if you can.
      </p>
    </div>
    <p style="font-size: 16px; margin-top: 30px;">
      Best regards,<br>
      <strong style="color: #667eea;">The Guru ID Team</strong>
    </p>
  </div>
  ${getEmailFooter()}
  </div>
</body>
</html>
  `.trim();
}

function getCredentialsEmailTextTemplate(name, email, password, isReset) {
  const intro = isReset
    ? 'Your Guru ID login password has been reset by an administrator.'
    : 'A login password has been created for your Guru ID account by an administrator.';

  return `
Guru ID Login Credentials

Dear ${name},

${intro}

Email: ${email}
Password: ${password}

Important: Keep these credentials secure. Change your password after signing in if you can.

Best regards,
The Guru ID Team
  `.trim();
}

module.exports = {
  sendWelcomeEmail,
  sendGoogleWelcomeEmail,
  sendCredentialsEmail,
  sendApprovalEmail,
  sendQuizCompletionEmail,
  verifyConnection,
  getTransporter,
};

