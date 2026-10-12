const nodemailer = require("nodemailer");

const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = process.env.SMTP_SECURE !== "false";
const hasEmailConfig = Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
);

const transporter = hasEmailConfig
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: smtpPort,
        secure: smtpSecure,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    })
    : null;

const verifyEmailTransport = async () => {
    if (!transporter) {
        throw new Error("Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.");
    }

    await transporter.verify();
    console.log("Email transport verified");
};

const sendEmail = async ({ to, subject, html }) => {
    if (!transporter) {
        throw new Error("Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.");
    }

    const result = await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html
    });

    if (!result.accepted?.length) {
        throw new Error("Email was not accepted by the SMTP server.");
    }

    return result;
};

module.exports = sendEmail;
module.exports.verifyEmailTransport = verifyEmailTransport;
