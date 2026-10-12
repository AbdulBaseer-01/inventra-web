const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const sendEmail = require("../services/email.service");

const {
    generateAccessToken,
    generateRefreshToken
} = require("../utils/generateToken");

const {
    accessCookieOptions,
    refreshCookieOptions
} = require("../utils/cookieOptions");

const hashToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

const createToken = () => crypto.randomBytes(32).toString("hex");

const publicUser = (user) => ({
    id: user._id,
    name: user.name || user.username,
    username: user.username,
    email: user.email,
    phone: user.phone,
    store: user.store,
    avatar: user.avatar,
    role: user.role,
    isVerified: user.isVerified
});

const setAuthCookies = (res, accessToken, refreshToken) => {
    res.cookie("accessToken", accessToken, accessCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshCookieOptions);
};

const clearAuthCookies = (res) => {
    res.clearCookie("accessToken", accessCookieOptions);
    res.clearCookie("refreshToken", refreshCookieOptions);
};

const issueSession = async (user, res) => {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = hashToken(refreshToken);
    user.lastLogin = new Date();
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    return { accessToken, refreshToken };
};

exports.signup = async (req, res) => {
    let user;
    try {
        const { username, email, password } = req.body;
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists"
            });
        }

        const verificationToken = createToken();
        user = await User.create({
            username,
            email,
            password: await bcrypt.hash(password, 12),
            verificationToken: hashToken(verificationToken)
        });

        const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
        const verificationLink = `${clientUrl}/verify-email/${verificationToken}`;

        await sendEmail({
            to: user.email,
            subject: "Verify your email",
            html: `
                <h2>Welcome to HackPrix</h2>
                <p>Confirm your email to activate your account.</p>
                <a href="${verificationLink}">Verify email</a>
            `
        });

        return res.status(201).json({
            success: true,
            message: "User created. Please verify your email.",
            user: publicUser(user)
        });
    } catch (error) {
        if (user?._id) {
            await User.deleteOne({ _id: user._id }).catch((cleanupError) => {
                console.error("Failed to clean up user after email failure:", cleanupError);
            });
        }
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

exports.registerStore = async (req, res) => {
    let user;
    try {
        const { name, email, phone, password, store } = req.body;
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists"
            });
        }

        user = await User.create({
            name,
            username: name,
            email,
            phone,
            password: await bcrypt.hash(password, 12),
            store: {
                ...store,
                location: store.latitude != null && store.longitude != null
                    ? { latitude: store.latitude, longitude: store.longitude }
                    : undefined
            }
        });

        const verificationToken = createToken();
        user.verificationToken = hashToken(verificationToken);
        await user.save();

        const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
        await sendEmail({
            to: user.email,
            subject: "Verify your email",
            html: `
                <h2>Welcome to Inventra</h2>
                <p>Confirm your email to activate your account.</p>
                <a href="${clientUrl}/verify-email/${verificationToken}">Verify email</a>
            `
        });

        return res.status(201).json({
            success: true,
            message: "Account and store registered. Please verify your email.",
            user: publicUser(user)
        });
    } catch (error) {
        if (user?._id) {
            await User.deleteOne({ _id: user._id }).catch((cleanupError) => {
                console.error("Failed to clean up user after email failure:", cleanupError);
            });
        }
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const user = await User.findOne({
            verificationToken: hashToken(req.params.token)
        }).select("+verificationToken");

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired verification link"
            });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Email verified successfully"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select("+password +refreshToken");

        if (!user || !user.password) {
            return res.status(400).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email before signing in"
            });
        }

        await issueSession(user, res);

        return res.status(200).json({
            success: true,
            message: "Logged in",
            user: publicUser(user)
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

exports.refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token missing"
            });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id).select("+refreshToken");

        if (!user || user.refreshToken !== hashToken(refreshToken)) {
            clearAuthCookies(res);
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token"
            });
        }

        await issueSession(user, res);

        return res.status(200).json({
            success: true,
            message: "Session refreshed",
            user: publicUser(user)
        });
    } catch (error) {
        clearAuthCookies(res);
        return res.status(401).json({
            success: false,
            message: "Invalid refresh token"
        });
    }
};

exports.logout = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken) {
            const hashedRefreshToken = hashToken(refreshToken);
            await User.findOneAndUpdate(
                { refreshToken: hashedRefreshToken },
                { $unset: { refreshToken: 1 } }
            );
        }

        clearAuthCookies(res);

        return res.status(200).json({
            success: true,
            message: "Logged out"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email }).select("+resetPasswordToken");

        if (user) {
            const resetToken = createToken();
            user.resetPasswordToken = hashToken(resetToken);
            user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
            await user.save();

            const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
            const resetLink = `${clientUrl}/reset-password/${resetToken}`;

            await sendEmail({
                to: user.email,
                subject: "Reset your password",
                html: `
                    <h2>Password reset</h2>
                    <p>This link expires in 15 minutes.</p>
                    <a href="${resetLink}">Reset password</a>
                `
            });
        }

        return res.status(200).json({
            success: true,
            message: "If that email exists, a reset link has been sent"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: hashToken(req.params.token),
            resetPasswordExpire: { $gt: Date.now() }
        }).select("+password +resetPasswordToken");

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset link"
            });
        }

        user.password = await bcrypt.hash(req.body.password, 12);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        user.refreshToken = undefined;
        await user.save();

        clearAuthCookies(res);

        return res.status(200).json({
            success: true,
            message: "Password updated successfully"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

exports.me = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user: publicUser(user)
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        user.name = req.body.name;
        user.phone = req.body.phone;
        user.avatar = req.body.avatar;
        user.store = user.store || {};
        user.store.name = req.body.storeName;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: publicUser(user)
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Unable to update profile"
        });
    }
};
