const Report = require("../models/report.model");
const { handleReportUpload, cloudinary } = require("../midlleware/upload.middleware");
const { geocodeLocation } = require("../utils/geocodeLocation");

// ── helpers ──────────────────────────────────────────────────────────────────

const publicReport = (doc) => ({
  id: doc._id,
  title: doc.title,
  description: doc.description,
  category: doc.category,
  status: doc.status,
  severity: doc.severity,
  location: doc.location,
  images: doc.images,
  aiAnalysis: doc.aiAnalysis,
  upvotes: doc.upvotes,
  hasUpvoted: false, // overridden in controller when user context is available
  adminNote: doc.adminNote,
  citizen: doc.citizen,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

// ── controllers ───────────────────────────────────────────────────────────────

exports.createReport = async (req, res) => {
  try {
    // Handle image uploads first (mutates req.files)
    await handleReportUpload(req, res);

    const { title, description, category, severity, address, landmark, city, district, state } = req.body;

    if (!address && !landmark) {
      return res.status(400).json({ success: false, message: "Street address or landmark is required" });
    }

    if (!city || !district) {
      return res.status(400).json({ success: false, message: "City and district are required" });
    }

    const geocoded = await geocodeLocation({ address, landmark, city, district, state });

    const images = (req.files || []).map((f) => ({
      url: f.path,
      publicId: f.filename,
    }));

    const report = await Report.create({
      citizen: req.user.id,
      title,
      description,
      category,
      severity: severity || "medium",
      location: {
        type: "Point",
        coordinates: geocoded.coordinates,
        address,
        landmark,
        city: geocoded.city,
        district: geocoded.district,
        state: geocoded.state,
      },
      images,
    });

    return res.status(201).json({ success: true, report: publicReport(report) });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Server error" });
  }
};

exports.getReports = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      status,
      severity,
      district,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
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
    const sortOrder = order === "asc" ? 1 : -1;
    const allowedSorts = ["createdAt", "upvotes", "severity"];
    const sortField = allowedSorts.includes(sortBy) ? sortBy : "createdAt";

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate("citizen", "username avatar")
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Report.countDocuments(filter),
    ]);

    const userId = req.user?.id?.toString();

    const shaped = reports.map((r) => ({
      ...publicReport(r),
      citizen: r.citizen,
      hasUpvoted: userId ? (r.upvotedBy || []).some((id) => id.toString() === userId) : false,
    }));

    return res.status(200).json({
      success: true,
      reports: shaped,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getMyReports = async (req, res) => {
  try {
    const { page = 1, limit = 15, status } = req.query;
    const filter = { citizen: req.user.id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reports, total] = await Promise.all([
      Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Report.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      reports: reports.map(publicReport),
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), limit: parseInt(limit) },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate("citizen", "username avatar email")
      .lean();

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    const userId = req.user?.id?.toString();
    return res.status(200).json({
      success: true,
      report: {
        ...publicReport(report),
        citizen: report.citizen,
        hasUpvoted: userId ? (report.upvotedBy || []).some((id) => id.toString() === userId) : false,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.upvoteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).select("+upvotedBy");
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });

    const userId = req.user.id.toString();
    const alreadyUpvoted = report.upvotedBy.some((id) => id.toString() === userId);

    if (alreadyUpvoted) {
      report.upvotedBy = report.upvotedBy.filter((id) => id.toString() !== userId);
      report.upvotes = Math.max(0, report.upvotes - 1);
    } else {
      report.upvotedBy.push(req.user.id);
      report.upvotes += 1;
    }

    await report.save();

    return res.status(200).json({ success: true, upvotes: report.upvotes, hasUpvoted: !alreadyUpvoted });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });

    // Only the citizen who filed it (or an admin) can delete
    if (report.citizen.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // Remove images from Cloudinary
    await Promise.all(report.images.map((img) => cloudinary.uploader.destroy(img.publicId)));
    await report.deleteOne();

    return res.status(200).json({ success: true, message: "Report deleted" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [statusBreakdown, categoryBreakdown, severityBreakdown, total] = await Promise.all([
      Report.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Report.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
      Report.aggregate([{ $group: { _id: "$severity", count: { $sum: 1 } } }]),
      Report.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        total,
        byStatus: Object.fromEntries(statusBreakdown.map((x) => [x._id, x.count])),
        byCategory: Object.fromEntries(categoryBreakdown.map((x) => [x._id, x.count])),
        bySeverity: Object.fromEntries(severityBreakdown.map((x) => [x._id, x.count])),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
