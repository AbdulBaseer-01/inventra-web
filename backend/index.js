const express = require("express");
const cors = require("cors");
require("dotenv").config();
const bcrypt = require("bcryptjs");

const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("./generated/prisma/client");

const app = express();
const PORT = process.env.PORT || 5000;

const FRONTEND_URL =
    process.env.FRONTEND_URL || "http://localhost:5173";

// Initialize Prisma with PostgreSQL
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

// Middleware
app.use(
    cors({
        origin: FRONTEND_URL,
        credentials: true,
    })
);

app.use(express.json({ limit: "20kb" }));

// Welcome endpoint
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Welcome to the Inventra API!",
    });
});

// Health-check endpoint
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        status: "OK",
        service: "Inventra Backend",
    });
});

// Test database connection
app.get("/api/db-test", async (req, res) => {
    try {
        const userCount = await prisma.user.count();

        res.status(200).json({
            success: true,
            message: "Database connection successful!",
            usersInDatabase: userCount,
        });
    } catch (error) {
        console.error("Database connection failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Database connection failed.",
        });
    }
});

// Create a user
app.post("/api/users", async (req, res) => {
    try {
        const { name, email } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof email !== "string" ||
            !email.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid name and email are required.",
            });
        }

        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: email.trim(),
            },
        });

        res.status(201).json({
            success: true,
            message: "User created successfully!",
            user,
        });
    } catch (error) {
        console.error("User creation failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Could not create user. Check the server logs.",
        });
    }
});

// Retrieve all users
app.get("/api/users", async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        res.status(200).json({
            success: true,
            users,
        });
    } catch (error) {
        console.error("Fetching users failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Could not retrieve users.",
        });
    }
});

// Register a user and their store
app.post("/api/auth/register-store", async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            password,
            store
        } = req.body;

        // Validate user details
        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof email !== "string" ||
            !email.trim() ||
            typeof phone !== "string" ||
            !phone.trim() ||
            typeof password !== "string" ||
            !store ||
            typeof store !== "object" ||
            Array.isArray(store)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required user and store details."
            });
        }

        // Validate email
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        // Validate password
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters."
            });
        }

        // Validate phone number
        if (!/^\d{10}$/.test(phone.trim())) {
            return res.status(400).json({
                success: false,
                message: "Phone number must contain exactly 10 digits."
            });
        }

        // Validate store details
        const requiredStoreFields = [
            "name",
            "categoryId",
            "address",
            "area",
            "city",
            "pincode"
        ];

        for (const field of requiredStoreFields) {
            if (
                typeof store[field] !== "string" ||
                !store[field].trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: `Please provide a valid store ${field}.`
                });
            }
        }

        if (!/^\d{6}$/.test(store.pincode.trim())) {
            return res.status(400).json({
                success: false,
                message: "Pincode must contain exactly 6 digits."
            });
        }

        // Validate optional GPS coordinates
        const { latitude, longitude } = store;

        if (
            latitude != null &&
            (typeof latitude !== "number" ||
                !Number.isFinite(latitude) ||
                latitude < -90 ||
                latitude > 90)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid latitude."
            });
        }

        if (
            longitude != null &&
            (typeof longitude !== "number" ||
                !Number.isFinite(longitude) ||
                longitude < -180 ||
                longitude > 180)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid longitude."
            });
        }

        // Hash the password before saving it
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create the user and store together
        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                password: hashedPassword,

                store: {
                    create: {
                        name: store.name.trim(),
                        categoryId: store.categoryId.trim(),
                        address: store.address.trim(),
                        area: store.area.trim(),
                        city: store.city.trim(),
                        pincode: store.pincode.trim(),
                        latitude: latitude ?? null,
                        longitude: longitude ?? null
                    }
                }
            },

            // Never return the password or password hash
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                createdAt: true,
                store: true
            }
        });

        return res.status(201).json({
            success: true,
            message: "Account and store registered successfully!",
            user
        });

    } catch (error) {
        console.error("Store registration failed:", error.message);

        // Email or phone already exists
        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "This email address or phone number is already registered."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Registration failed. Please try again."
        });
    }
});
// Start backend
app.listen(PORT, () => {
    console.log("Inventra backend is running!");
    console.log(`Server: http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
});