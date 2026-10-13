const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Order = require("../models/order.model");
const DeliveryPartner = require("../models/deliveryPartner.model");

const sanitizePartner = (partner) => ({
    id: partner._id,
    fullName: partner.fullName,
    email: partner.email,
    phone: partner.phone,
    dateOfBirth: partner.dateOfBirth,
    address: partner.address,
    operatingArea: partner.operatingArea,
    documentUrl: partner.documentUrl,
    documentType: partner.documentType,
    verificationStatus: partner.verificationStatus,
    availability: partner.availability,
    isEligible: partner.isEligible,
    createdAt: partner.createdAt
});

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_ACCESS_SECRET, { expiresIn: "7d" });

const calculateAge = (dateOfBirth) => {
    const birthDate = new Date(dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) {
        return 0;
    }

    const difference = Date.now() - birthDate.getTime();
    const ageDate = new Date(difference);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
};

exports.register = async (req, res) => {
    try {
        const {
            fullName,
            email,
            phone,
            password,
            dateOfBirth,
            address,
            operatingArea,
            documentUrl,
            documentType
        } = req.body;

        if (!fullName || !email || !phone || !password || !dateOfBirth) {
            return res.status(400).json({ success: false, message: "Missing required delivery partner details" });
        }

        const age = calculateAge(dateOfBirth);
        if (age < 18) {
            return res.status(400).json({ success: false, message: "Delivery partners must be at least 18 years old" });
        }

        const existing = await DeliveryPartner.findOne({ email });
        if (existing) {
            return res.status(409).json({ success: false, message: "Delivery partner already exists" });
        }

        const partner = await DeliveryPartner.create({
            fullName,
            email,
            phone,
            password: await bcrypt.hash(password, 12),
            dateOfBirth,
            address: address || "",
            operatingArea: operatingArea || "",
            documentUrl: documentUrl || "",
            documentType: documentType || "government_id",
            verificationStatus: "pending",
            availability: true,
            isEligible: true
        });

        const token = generateToken(partner._id);
        return res.status(201).json({
            success: true,
            message: "Delivery partner registration received for manual review",
            token,
            profile: sanitizePartner(partner)
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Unable to register delivery partner" });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const partner = await DeliveryPartner.findOne({ email }).select("+password");

        if (!partner) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const matches = await bcrypt.compare(password, partner.password);
        if (!matches) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const token = generateToken(partner._id);
        partner.lastLogin = new Date();
        await partner.save();

        return res.json({
            success: true,
            message: "Logged in",
            token,
            profile: sanitizePartner(partner)
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Unable to login" });
    }
};

exports.me = async (req, res) => {
    try {
        const partner = await DeliveryPartner.findById(req.user.id);
        if (!partner) {
            return res.status(404).json({ success: false, message: "Delivery partner not found" });
        }

        return res.json({ success: true, profile: sanitizePartner(partner) });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Unable to load profile" });
    }
};

exports.getAssignments = async (req, res) => {
    try {
        const partner = await DeliveryPartner.findById(req.user.id);
        if (!partner) {
            return res.status(404).json({ success: false, message: "Delivery partner not found" });
        }

        if (partner.verificationStatus !== "approved" || !partner.isEligible) {
            return res.status(403).json({ success: false, message: "Your profile is not approved for deliveries yet" });
        }

        const assignments = await Order.find({
            status: { $in: ["pending", "accepted", "preparing"] },
            deliveryPartner: null
        }).sort({ createdAt: -1 }).lean();

        return res.json({ success: true, assignments: assignments.map((order) => ({
            id: order._id,
            status: order.status,
            total: order.total,
            address: order.address,
            storeName: order.storeName,
            createdAt: order.createdAt,
            items: order.items.length,
            pickup: order.storeName,
            distance: "Est. 3.5 km"
        })) });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Unable to fetch assignments" });
    }
};

exports.acceptAssignment = async (req, res) => {
    try {
        const partner = await DeliveryPartner.findById(req.user.id);
        if (!partner || partner.verificationStatus !== "approved" || !partner.isEligible) {
            return res.status(403).json({ success: false, message: "You cannot accept assignments until approved" });
        }

        const order = await Order.findOne({
            _id: req.params.id,
            deliveryPartner: null,
            status: { $in: ["pending", "accepted", "preparing"] }
        });

        if (!order) {
            return res.status(409).json({ success: false, message: "Assignment is no longer available" });
        }

        order.deliveryPartner = partner._id;
        order.status = "accepted";
        await order.save();

        return res.json({ success: true, message: "Assignment accepted", order: { id: order._id, status: order.status } });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Unable to accept assignment" });
    }
};
