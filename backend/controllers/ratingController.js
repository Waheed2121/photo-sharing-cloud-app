const pool = require("../config/db")
const { getCache, setCache, invalidateByPrefix } = require("../utils/cache")

exports.addRating = async (req, res) => {
    try {
        const { image_id, rating } = req.body || {}
        const user_id = req.user && req.user.id

        if (!image_id || !user_id || rating === undefined) {
            return res.status(400).json({
                error: "image_id and rating are required in the JSON body"
            })
        }

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ error: "rating must be an integer between 1 and 5" })
        }

        const result = await pool.query(
            `INSERT INTO ratings (image_id, user_id, rating)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [image_id, user_id, rating]
        )

        res.status(201).json({
            message: "Rating added successfully",
            rating: result.rows[0]
        })
        invalidateByPrefix(`ratings:image:${image_id}:`)
        invalidateByPrefix("images:")

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Database error: " + error.message })
    }
}

exports.getRatingsByImage = async (req, res) => {
    const { imageId } = req.params

    try {
        const cacheKey = `ratings:image:${imageId}`
        const cached = getCache(cacheKey)
        if (cached) {
            return res.json(cached)
        }

        const result = await pool.query(
            "SELECT * FROM ratings WHERE image_id = $1",
            [imageId]
        )

        const payload = {
            ratings: result.rows
        }
        setCache(cacheKey, payload)
        res.json(payload)

    } catch (error) {
        console.error(error)
        res.status(500).json({
            error: "Database error"
        })
    }
}
