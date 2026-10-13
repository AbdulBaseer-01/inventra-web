const { z } = require("zod");

const email = z
    .string()
    .trim()
    .email("Enter a valid email address")
    .toLowerCase();

const password = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[0-9]/, "Password must include a number");

const tokenParamSchema = z.object({
    token: z.string().min(20, "Invalid token")
});

const signupSchema = z.object({
    body: z.object({
        username: z
            .string()
            .trim()
            .min(2, "Username must be at least 2 characters")
            .max(40, "Username must be at most 40 characters")
            .optional(),
        name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name must be at most 80 characters").optional(),
        phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid phone number").optional(),
        email,
        password,
        role: z.enum(["customer", "store_owner", "delivery_partner", "admin"]).optional()
    })
});

const loginSchema = z.object({
    body: z.object({
        email,
        password: z.string().min(1, "Password is required")
    })
});

const registerStoreSchema = z.object({
    body: z.object({
        name: z.string().trim().min(2).max(80),
        email,
        phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid phone number"),
        password,
        store: z.object({
            name: z.string().trim().min(2).max(120),
            categoryId: z.string().trim().min(1),
            address: z.string().trim().min(2),
            area: z.string().trim().min(2),
            city: z.string().trim().min(2),
            pincode: z.string().regex(/^[1-9]\d{5}$/, "Enter a valid pincode"),
            latitude: z.number().nullable().optional(),
            longitude: z.number().nullable().optional()
        })
    })
});

const forgotPasswordSchema = z.object({
    body: z.object({
        email
    })
});

const resetPasswordSchema = z.object({
    params: tokenParamSchema,
    body: z.object({
        password
    })
});

const verifyEmailSchema = z.object({
    params: tokenParamSchema
});

const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().trim().min(2).max(80),
        phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid phone number"),
        avatar: z.union([z.string().url(), z.literal("")]),
        storeName: z.string().trim().min(2).max(120)
    })
});

module.exports = {
    signupSchema,
    registerStoreSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyEmailSchema,
    updateProfileSchema
};
