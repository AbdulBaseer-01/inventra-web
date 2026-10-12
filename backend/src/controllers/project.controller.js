const Project = require("../models/project.model");
const { handleProjectUpload, cloudinary } = require("../midlleware/upload.middleware");
const { geocodeLocation } = require("../utils/geocodeLocation");

const publicProject = (doc) => ({
  id: doc._id,
  name: doc.name,
  projectCode: doc.projectCode,
  category: doc.category,
  description: doc.description,
  contractor: doc.contractor,
  budget: doc.budget,
  timeline: doc.timeline,
  progress: doc.progress,
  status: doc.status,
  riskLevel: doc.riskLevel,
  location: doc.location,
  aiPrediction: doc.aiPrediction,
  images: doc.images,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

exports.createProject = async (req, res) => {
  try {
    await handleProjectUpload(req, res);

    const body = req.body;
    const images = (req.files || []).map((f) => ({ url: f.path, publicId: f.filename }));
    const geocoded = await geocodeLocation({
      address: body.address,
      landmark: body.landmark,
      city: body.city,
      district: body.district,
      state: body.state,
    });

    const project = await Project.create({
      ...body,
      images,
      addedBy: req.user.id,
      location: {
        type: "Point",
        coordinates: geocoded.coordinates,
        address: body.address,
        landmark: body.landmark,
        city: geocoded.city,
        district: geocoded.district,
        state: geocoded.state,
      },
      budget: { allocated: parseFloat(body.budgetAllocated), spent: parseFloat(body.budgetSpent || 0) },
      timeline: { startDate: body.startDate, expectedEndDate: body.expectedEndDate },
      contractor: { name: body.contractorName, contactEmail: body.contractorEmail, previousDelays: parseInt(body.contractorDelays || 0) },
    });

    return res.status(201).json({ success: true, project: publicProject(project) });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Server error" });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const { page = 1, limit = 30, category, status, riskLevel, district } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (riskLevel) filter.riskLevel = riskLevel;
    if (district) {
      const locationRegex = new RegExp(district, "i");
      filter.$or = [
        { "location.address": locationRegex },
        { "location.landmark": locationRegex },
        { "location.city": locationRegex },
        { "location.district": locationRegex },
        { "location.state": locationRegex },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate("addedBy", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Project.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      projects: projects.map(publicProject),
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), limit: parseInt(limit) },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate("relatedReports", "title status category createdAt").lean();
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    return res.status(200).json({ success: true, project: publicProject(project) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    return res.status(200).json({ success: true, project: publicProject(project) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getNearbyProjects = async (req, res) => {
  try {
    const { address, landmark, city, district, state, radius = 5000 } = req.query;
    const geocoded = await geocodeLocation({ address, landmark, city, district, state });

    const projects = await Project.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: geocoded.coordinates },
          $maxDistance: parseInt(radius),
        },
      },
    })
      .limit(50)
      .lean();

    return res.status(200).json({ success: true, projects: projects.map(publicProject) });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Server error" });
  }
};

exports.getMapData = async (req, res) => {
  try {
    // Lightweight projection for map pins — just what's needed for markers + popups
    const projects = await Project.find({})
      .select("name projectCode category status riskLevel location progress.percentage timeline")
      .lean();

    return res.status(200).json({ success: true, projects });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
