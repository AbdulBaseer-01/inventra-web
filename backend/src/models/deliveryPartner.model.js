const mongoose = require("mongoose");

const deliveryPartnerSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    address: {
        type: String,
        trim: true,
        default: ""
    },
    operatingArea: {
        type: String,
        trim: true,
        default: ""
    },
    documentUrl: {
        type: String,
        trim: true,
        default: ""
    },
    documentType: {
        type: String,
        trim: true,
        default: "government_id"
    },
    verificationStatus: {
        type: String,
        enum: ["pending", "approved", "rejected", "requires_more_info"],
        default: "pending"
    },
    availability: {
        type: Boolean,
        default: true
    },
    isEligible: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date,
        default: null
    },
    refreshToken: {
        type: String,
        select: false,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model("DeliveryPartner", deliveryPartnerSchema);
