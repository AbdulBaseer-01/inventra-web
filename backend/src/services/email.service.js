const dns = require("dns");
const nodemailer = require("nodemailer");

if (typeof dns.setDefaultResultOrder === "function") {
    dns.setDefaultResultOrder("ipv4first");
}

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === "true";

const hasEmailConfig = Boolean(
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
);

const transporter = hasEmailConfig
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        family: 4,
        requireTLS: smtpPort === 587,
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    })
    : null;

const emailConfigError = () =>
    new Error(
        "Email is not configured. Set SMTP_USER and SMTP_PASS."
    );

const verifyEmailTransport = async () => {
    if (!transporter) {
        throw emailConfigError();
    }

    await transporter.verify();
    console.log("Email transport verified");
};

const sendEmail = async ({ to, subject, html }) => {
    if (!transporter) {
        throw emailConfigError();
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
