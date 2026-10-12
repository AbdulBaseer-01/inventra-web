const express = require("express");
const auth = require("../midlleware/auth.middleware");
const { listProducts, createProduct, updateProduct, deleteProduct } = require("../controllers/product.controller");

const router = express.Router();

router.use(auth);
router.get("/", listProducts);
router.post("/", createProduct);
router.patch("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
