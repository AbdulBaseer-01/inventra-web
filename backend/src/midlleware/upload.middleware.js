const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const reportStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "civicwatch/reports",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1200, height: 900, crop: "limit", quality: "auto:good" }],
  },
});

const projectStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "civicwatch/projects",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1400, height: 900, crop: "limit", quality: "auto:good" }],
  },
});

const uploadReportImages = multer({
  storage: reportStorage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
}).array("images", 5); // up to 5 images per report

const uploadProjectImages = multer({
  storage: projectStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
}).array("images", 8);

// Promisified wrappers so controllers can use async/await
const handleReportUpload = (req, res) =>
  new Promise((resolve, reject) => {
    uploadReportImages(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

const handleProjectUpload = (req, res) =>
  new Promise((resolve, reject) => {
    uploadProjectImages(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

module.exports = { cloudinary, handleReportUpload, handleProjectUpload };