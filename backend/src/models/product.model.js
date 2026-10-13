const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        barcode: {
            type: String,
            trim: true,
            match: /^\d{8,14}$/,
            default: undefined
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },
        category: {
            type: String,
            required: true,
            trim: true,
            maxlength: 60
        },
        description: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: ""
        },
        imageUrl: {
            type: String,
            trim: true,
            default: ""
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        weightValue: {
            type: Number,
            required: true,
            min: 0
        },
        weightUnit: {
            type: String,
            enum: ["g", "kg", "ml", "l", "piece"],
            required: true
        },
        stock: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        discount: {
            type: {
                type: String,
                enum: ["percent", "amount"]
            },
            value: {
                type: Number,
                min: 0
            }
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

productSchema.index({ owner: 1, createdAt: -1 });
productSchema.index({ owner: 1, barcode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Product", productSchema);
