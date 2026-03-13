const pool = require("../config/db")

exports.addRating = async (req, res) => {
    try {
        const { image_id, user_id, rating } = req.body || {}

        if (!image_id || !user_id || rating === undefined) {
            return res.status(400).json({ error: "Missing required fields or invalid JSON body. Make sure to send a raw JSON body in Postman." })
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

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Database error: " + error.message })
    }
}

exports.getRatingsByImage = async (req, res) => {
    const { imageId } = req.params

    try {
        const result = await pool.query(
            "SELECT * FROM ratings WHERE image_id = $1",
            [imageId]
        )

        res.json({
            ratings: result.rows
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({
            error: "Database error"
        })
    }
}
