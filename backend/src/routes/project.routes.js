const express = require("express");
const router = express.Router();
const auth = require("../midlleware/auth.middleware");
const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  getNearbyProjects,
  getMapData,
} = require("../controllers/project.controller");

router.get("/", getProjects);
router.get("/map", getMapData);
router.get("/nearby", getNearbyProjects);
router.get("/:id", getProject);

router.post("/", auth, createProject);
router.patch("/:id", auth, updateProject);

module.exports = router;
