const multer = require("multer")
const fs = require("fs")
const path = require("path")

const uploadsDir = path.join(__dirname, "..", "uploads")
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
}

// ── Storage ──────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + file.originalname
        cb(null, uniqueName)
    }
})

// ── MIME-type filter ──────────────────────────────────────────────────────────
const ALLOWED_TYPES = ["image/jpeg", "image/png"]

const fileFilter = (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true)
    } else {
        cb(new Error("Only JPEG and PNG images are allowed"), false)
    }
}

// ── Multer instance (5 MB limit) ──────────────────────────────────────────────
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
})

const uploadSingle = (req, res, next) => {
    upload.single("image")(req, res, function (err) {
        if (err) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ error: "File too large. Maximum size is 5 MB." })
            }
            return res.status(400).json({ error: err.message || "Upload error" })
        }
        next()
    })
}

module.exports = { uploadSingle }
