const Product = require("../models/product.model");

const productResponse = (product) => ({
    id: product._id,
    name: product.name,
    category: product.category,
    description: product.description,
    imageUrl: product.imageUrl,
    price: product.price,
    weightValue: product.weightValue,
    weightUnit: product.weightUnit,
    stock: product.stock,
    discount: product.discount?.type ? product.discount : null,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
});

const validateDiscount = (discount, price) => {
    if (discount == null || discount === "") return null;

    const type = discount.type;
    const value = Number(discount.value);
    if (!["percent", "amount"].includes(type) || !Number.isFinite(value) || value <= 0) {
        const error = new Error("Discount must have a valid type and value");
        error.statusCode = 400;
        throw error;
    }
    if (type === "percent" && value > 100) {
        const error = new Error("Percentage discount cannot be more than 100");
        error.statusCode = 400;
        throw error;
    }
    if (type === "amount" && value >= price) {
        const error = new Error("Discount amount must be less than the product price");
        error.statusCode = 400;
        throw error;
    }

    return { type, value };
};

const productInput = (body) => ({
    name: body.name.trim(),
    category: body.category.trim(),
    description: body.description?.trim() || "",
    imageUrl: body.imageUrl?.trim() || "",
    price: Number(body.price),
    weightValue: Number(body.weightValue),
    weightUnit: body.weightUnit,
    stock: Number(body.stock),
    isActive: body.isActive !== false,
    discount: body.discount
});

const validateProduct = (input) => {
    if (!input.name || !input.category || !input.weightUnit) return "Name, category, and weight unit are required";
    if (![input.price, input.weightValue, input.stock].every(Number.isFinite) || input.price < 0 || input.weightValue <= 0 || input.stock < 0) {
        return "Price, weight, and stock must be valid positive numbers";
    }
    if (!["g", "kg", "ml", "l", "piece"].includes(input.weightUnit)) return "Invalid weight unit";
    return null;
};

exports.listProducts = async (req, res) => {
    const products = await Product.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, products: products.map(productResponse) });
};

exports.createProduct = async (req, res) => {
    try {
        const input = productInput(req.body);
        const validationError = validateProduct(input);
        if (validationError) return res.status(400).json({ success: false, message: validationError });

        input.discount = validateDiscount(input.discount, input.price);
        const product = await Product.create({ ...input, owner: req.user.id });
        res.status(201).json({ success: true, product: productResponse(product) });
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Unable to create product" });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const input = productInput(req.body);
        const validationError = validateProduct(input);
        if (validationError) return res.status(400).json({ success: false, message: validationError });

        input.discount = validateDiscount(input.discount, input.price);
        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, owner: req.user.id },
            input,
            { new: true, runValidators: true }
        );
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });
        res.json({ success: true, product: productResponse(product) });
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || "Unable to update product" });
    }
};

exports.deleteProduct = async (req, res) => {
    const product = await Product.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, message: "Product removed" });
};
