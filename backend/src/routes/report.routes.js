const express = require("express");
const router = express.Router();
const auth = require("../midlleware/auth.middleware");
const {
  createReport,
  getReports,
  getMyReports,
  getReport,
  upvoteReport,
  deleteReport,
  getStats,
} = require("../controllers/report.controller");

// Public browsing
router.get("/", getReports);
router.get("/stats", getStats);
router.get("/mine", auth, getMyReports);
router.get("/:id", getReport);

// Requires auth
router.post("/", auth, createReport); // multer runs inside controller
router.post("/:id/upvote", auth, upvoteReport);
router.delete("/:id", auth, deleteReport);

module.exports = router;
