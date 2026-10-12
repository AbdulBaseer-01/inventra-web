const { Resend } = require("resend");

const hasEmailConfig = Boolean(
    process.env.RESEND_API_KEY &&
    process.env.RESEND_FROM
);

const resend = hasEmailConfig
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

const emailConfigError = () =>
    new Error(
        "Email is not configured. Set RESEND_API_KEY and RESEND_FROM."
    );

const verifyEmailTransport = async () => {
    if (!resend) {
        throw emailConfigError();
    }

    console.log("Resend email transport configured");
};

const sendEmail = async ({ to, subject, html }) => {
    if (!resend) {
        throw emailConfigError();
    }

    const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM,
        to,
        subject,
        html
    });

    if (error) {
        const sendError = new Error(error.message || "Resend rejected the email.");
        sendError.statusCode = 502;
        throw sendError;
    }

    if (!data?.id) {
        const sendError = new Error("Resend did not return an email ID.");
        sendError.statusCode = 502;
        throw sendError;
    }

    return data;
};

module.exports = sendEmail;
module.exports.verifyEmailTransport = verifyEmailTransport;
