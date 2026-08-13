require('dotenv').config();
const { sendEmail } = require('../config/email');

// Get command line arguments
const args = process.argv.slice(2);

// Simple argument parser
const parseArgs = () => {
  const parsed = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    if (key && value) {
      parsed[key] = value;
    }
  }
  return parsed;
};

const main = async () => {
  try {
    const params = parseArgs();

    // Required parameters
    if (!params.to || !params.subject) {
      console.error('Usage: node scripts/sendEmail.js --to email@example.com --subject "Subject" --text "Message text" [--html "<html>content</html>"]');
      process.exit(1);
    }

    // Check if email configuration is set
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Error: EMAIL_USER and EMAIL_PASS must be set in .env file');
      process.exit(1);
    }

    const emailOptions = {
      to: params.to,
      subject: params.subject,
      text: params.text || '',
      html: params.html || params.text || '',
    };

    console.log('Sending email...');
    console.log('To:', emailOptions.to);
    console.log('Subject:', emailOptions.subject);

    const result = await sendEmail(emailOptions);

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', result.messageId);
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    process.exit(1);
  }
};

main();

