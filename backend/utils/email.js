const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // No SMTP configured - fall back to logging emails to the console so
    // the app remains fully usable in local development.
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

async function sendEmail({ to, subject, text }) {
  const t = getTransporter();

  if (!t) {
    console.log(`[email:not-configured] To: ${to} | Subject: ${subject}\n${text}`);
    return { delivered: false, logged: true };
  }

  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM || 'Rent & Flatmate Finder <no-reply@rentfinder.local>',
      to,
      subject,
      text,
    });
    return { delivered: true, logged: false };
  } catch (err) {
    console.error('Email send failed:', err.message);
    console.log(`[email:failed-fallback-log] To: ${to} | Subject: ${subject}\n${text}`);
    return { delivered: false, logged: true, error: err.message };
  }
}

module.exports = { sendEmail };
