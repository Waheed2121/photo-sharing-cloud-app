const express = require("express")
const router = express.Router()

const { uploadSingle } = require("../middleware/uploadMiddleware")
const { authenticate, authorize } = require("../middleware/authMiddleware")
const imageController = require("../controllers/imageController")
const galleryRoles = ["consumer", "creator"]

// ── Gallery routes ────────────────────────────────────────────────────────────
// NOTE: /search MUST be registered before any /:id route to avoid capture.

// GET /api/images/search?q=&page=1&limit=10
router.get("/search", authenticate, authorize(...galleryRoles), imageController.searchImages)

// GET /api/images?page=1&limit=10
router.get("/", authenticate, authorize(...galleryRoles), imageController.getImages)

// ── Upload route ──────────────────────────────────────────────────────────────

// POST /api/images/upload  — JWT required, role must be "creator"
router.post(
    "/upload",
    authenticate,
    authorize("creator"),
    uploadSingle,
    imageController.uploadImage
)

// DELETE /api/images/:id — JWT required, role must be "creator"
router.delete(
    "/:id",
    authenticate,
    authorize("creator"),
    imageController.deleteImage
)

module.exports = router
