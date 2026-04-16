const express = require("express")
const router = express.Router()

const likeController = require("../controllers/likeController")
const { authenticate, authorize } = require("../middleware/authMiddleware")

router.post("/", authenticate, authorize("consumer", "creator"), likeController.addLike)
router.get("/:imageId", authenticate, authorize("consumer", "creator"), likeController.getLikesByImage)
router.delete("/:imageId", authenticate, authorize("consumer", "creator"), likeController.removeLike)

module.exports = router