const nodemailer = require("nodemailer");

const hasEmailConfig = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const transporter = hasEmailConfig
    ? nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    })
    : null;

const verifyEmailTransport = async () => {
    if (!transporter) {
        throw new Error("Email is not configured. Set EMAIL_USER and EMAIL_PASS.");
    }

    await transporter.verify();
    console.log("Email transport verified");
};

const sendEmail = async ({ to, subject, html }) => {
    if (!transporter) {
        throw new Error("Email is not configured. Set EMAIL_USER and EMAIL_PASS.");
    }

    const result = await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
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
