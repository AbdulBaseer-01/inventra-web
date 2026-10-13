const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    unitPrice: {
        type: Number,
        required: true,
        min: 0
    },
    imageUrl: {
        type: String,
        default: ""
    }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    store: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    customerName: {
        type: String,
        trim: true,
        required: true
    },
    storeName: {
        type: String,
        trim: true,
        required: true
    },
    address: {
        type: String,
        trim: true,
        required: true
    },
    items: {
        type: [orderItemSchema],
        required: true,
        default: []
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    deliveryFee: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "preparing", "ready_for_pickup", "out_for_delivery", "delivered", "cancelled"],
        default: "pending"
    },
    deliveryPartner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeliveryPartner",
        default: null
    },
    paymentMethod: {
        type: String,
        enum: ["cash_on_delivery"],
        default: "cash_on_delivery"
    }
}, { timestamps: true });

orderSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
