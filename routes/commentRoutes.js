const express = require("express")
const router = express.Router()
const commentController = require("../controllers/commentController")
const { authenticate, authorize } = require("../middleware/authMiddleware")

router.post("/", authenticate, authorize("consumer", "creator"), commentController.addComment)
router.get("/:imageId", authenticate, authorize("consumer", "creator"), commentController.getCommentsByImage)

module.exports = router
