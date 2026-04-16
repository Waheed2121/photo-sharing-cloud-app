const express = require("express")
const router = express.Router()
const ratingController = require("../controllers/ratingController")
const { authenticate, authorize } = require("../middleware/authMiddleware")

router.post("/", authenticate, authorize("consumer", "creator"), ratingController.addRating)
router.get("/:imageId", authenticate, authorize("consumer", "creator"), ratingController.getRatingsByImage)

module.exports = router
