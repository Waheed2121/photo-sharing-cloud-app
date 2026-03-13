const express = require("express")
const router = express.Router()

const upload = require("../middleware/uploadMiddleware")
const imageController = require("../controllers/imageController")

router.post("/upload", upload.single("image"), imageController.uploadImage)
router.get("/", imageController.getImages)

module.exports = router
