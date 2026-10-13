const Product = require("../models/product.model");
const Order = require("../models/order.model");
const User = require("../models/user.model");

const serializeStore = (user) => ({
    id: user._id,
    name: user.store?.name || user.name || "Store",
    address: user.store?.address || "Address not provided",
    area: user.store?.area || "",
    city: user.store?.city || "",
    categoryId: user.store?.categoryId || "",
    location: user.store?.location || null,
    phone: user.phone,
    email: user.email
});

const serializeProduct = (product, owner = null) => ({
    id: product._id,
    name: product.name,
    category: product.category,
    description: product.description,
    imageUrl: product.imageUrl,
    price: product.price,
    stock: product.stock,
    weightValue: product.weightValue,
    weightUnit: product.weightUnit,
    discount: product.discount || null,
    isActive: product.isActive,
    store: owner ? {
        id: owner._id,
        name: owner.store?.name || owner.name || "Store"
    } : null
});

const serializeOrder = (order) => ({
    id: order._id,
    status: order.status,
    total: order.total,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    address: order.address,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
        productId: item.product,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        imageUrl: item.imageUrl
    })),
    store: {
        id: order.store?._id || order.store,
        name: order.storeName
    }
});

exports.listStores = async (req, res) => {
    try {
        const stores = await User.find({
            role: { $in: ["store_owner", "user"] },
            "store.name": { $exists: true, $ne: "" }
        }).lean();

        const activeStores = stores
            .filter((store) => store.store && store.store.name)
            .map(serializeStore);

        return res.json({ success: true, stores: activeStores });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Unable to load stores" });
    }
};

exports.listProducts = async (req, res) => {
    try {
        const { storeId, category, search } = req.query;
        const filter = { isActive: true, stock: { $gt: 0 } };

        if (storeId) filter.owner = storeId;
        if (category) filter.category = { $regex: category, $options: "i" };
        if (search) filter.name = { $regex: search, $options: "i" };

        const products = await Product.find(filter).populate("owner", "store name").sort({ createdAt: -1 }).lean();

        return res.json({
            success: true,
            products: products.map((product) => serializeProduct(product, product.owner))
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Unable to load products" });
    }
};

exports.createOrder = async (req, res) => {
    try {
        const { items, deliveryAddress } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart cannot be empty" });
        }

        const uniqueProductIds = [...new Set(items.map((item) => item.productId))];
        const productIds = uniqueProductIds;
        const products = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();

        if (products.length !== productIds.length) {
            return res.status(400).json({ success: false, message: "One or more products are unavailable" });
        }

        const productMap = new Map(products.map((product) => [String(product._id), product]));
        const storeIds = new Set();
        let subtotal = 0;
        const preparedItems = [];

        for (const item of items) {
            const product = productMap.get(String(item.productId));
            if (!product) {
                return res.status(400).json({ success: false, message: "A selected product is not available" });
            }

            const quantity = Number(item.quantity);
            if (!Number.isFinite(quantity) || quantity < 1) {
                return res.status(400).json({ success: false, message: "Invalid quantity selected" });
            }

            if (product.stock < quantity) {
                return res.status(400).json({ success: false, message: `${product.name} is out of stock` });
            }

            storeIds.add(String(product.owner));
            const itemSubtotal = product.price * quantity;
            subtotal += itemSubtotal;

            preparedItems.push({
                product: product._id,
                name: product.name,
                quantity,
                unitPrice: product.price,
                imageUrl: product.imageUrl || ""
            });
        }

        if (storeIds.size > 1) {
            return res.status(400).json({ success: false, message: "Orders must be placed from one store at a time" });
        }

        const storeId = [...storeIds][0];
        const store = await User.findById(storeId).lean();
        if (!store) {
            return res.status(404).json({ success: false, message: "Store not found" });
        }

        const deliveryFee = subtotal > 500 ? 0 : 40;
        const total = subtotal + deliveryFee;

        const order = await Order.create({
            customer: req.user.id,
            customerName: req.user.name || req.user.username || "Customer",
            store: storeId,
            storeName: store.store?.name || store.name || "Store",
            address: deliveryAddress || "Delivery address not provided",
            items: preparedItems,
            subtotal,
            deliveryFee,
            total,
            paymentMethod: "cash_on_delivery",
            status: "pending"
        });

        const stockUpdates = [];
        for (const item of items) {
            const product = productMap.get(String(item.productId));
            if (!product) continue;
            const quantity = Number(item.quantity);
            stockUpdates.push({
                updateOne: {
                    filter: { _id: product._id },
                    update: { $inc: { stock: -quantity } }
                }
            });
        }

        if (stockUpdates.length) {
            await Product.bulkWrite(stockUpdates);
        }

        return res.status(201).json({ success: true, order: serializeOrder(order) });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Unable to place order" });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customer: req.user.id }).sort({ createdAt: -1 }).lean();
        return res.json({ success: true, orders: orders.map(serializeOrder) });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Unable to load order history" });
    }
};
