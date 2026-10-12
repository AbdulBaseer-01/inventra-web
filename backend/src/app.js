require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./config/db");
const { verifyEmailTransport } = require("./services/email.service");

const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");

const app = express();

app.set("trust proxy", 1);

app.use(express.json({ limit: "10kb" }));

app.use(cookieParser());

app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true
    })
);

app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" }
    })
);

app.use(morgan("dev"));
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Server Running"
    });
});

app.get("/health", (_req, res) => {
    res.json({ success: true, message: "OK" });
});

const startServer = async () => {
    await connectDB();
    const port = Number(process.env.PORT || 5000);
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });

    try {
        await verifyEmailTransport();
    } catch (error) {
        console.error(`Email transport verification failed: ${error.message}`);
        console.error("The API is running, but verification and password-reset emails may fail until SMTP is configured.");
    }
};

if (require.main === module) {
    startServer().catch((error) => {
        console.error("Unable to start server:", error.message);
        process.exitCode = 1;
    });
}

module.exports = app;
