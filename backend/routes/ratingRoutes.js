const express = require("express")
const router = express.Router()
const ratingController = require("../controllers/ratingController")

router.post("/", ratingController.addRating)
router.get("/:imageId", ratingController.getRatingsByImage)

module.exports = router
