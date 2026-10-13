const express = require("express");
const auth = require("../midlleware/auth.middleware");
const { register, login, me, getAssignments, acceptAssignment } = require("../controllers/deliveryPartner.controller");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", auth, me);
router.get("/assignments", auth, getAssignments);
router.patch("/assignments/:id", auth, acceptAssignment);

module.exports = router;
