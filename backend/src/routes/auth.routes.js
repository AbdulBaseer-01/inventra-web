const express = require("express");
const router = express.Router();

const {
    signup,
    registerStore,
    login,
    logout,
    refresh,
    forgotPassword,
    resetPassword,
    verifyEmail,
    me,
    updateProfile
} = require("../controllers/auth.controller");

const validate = require("../midlleware/validate.middleware");
const auth = require("../midlleware/auth.middleware");
const authLimiter = require("../midlleware/ratelimiter.middleware");

const {
    signupSchema,
    registerStoreSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyEmailSchema,
    updateProfileSchema
} = require("../validators/auth.validator");

router.post("/signup", authLimiter, validate(signupSchema), signup);
router.post("/register-store", authLimiter, validate(registerStoreSchema), registerStore);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/me", auth, me);
router.patch("/me", auth, validate(updateProfileSchema), updateProfile);

router.get("/verify-email/:token", validate(verifyEmailSchema), verifyEmail);
router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password/:token", authLimiter, validate(resetPasswordSchema), resetPassword);

module.exports = router;
