import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_EMAIL,
    pass: process.env.MAIL_PASSWORD
  }
});

export async function sendMail(to: string, subject: string, text: string) {
  const mailOptions = {
    from: process.env.MAIL_EMAIL,
    to,
    subject,
    text
  };

  console.log(`Sending email to ${to} with subject "${subject}"`);
  console.log("My email is", process.env.MAIL_EMAIL);

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}