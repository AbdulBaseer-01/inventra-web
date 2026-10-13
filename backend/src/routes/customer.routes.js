const express = require("express");
const { listStores, listProducts, createOrder, getMyOrders } = require("../controllers/customer.controller");
const auth = require("../midlleware/auth.middleware");

const router = express.Router();

router.get("/stores", listStores);
router.get("/products", listProducts);
router.use(auth);
router.post("/orders", createOrder);
router.get("/orders", getMyOrders);

module.exports = router;
