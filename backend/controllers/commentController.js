const pool = require("../config/db")

exports.addComment = async (req, res) => {
    try {
        const { image_id, user_id, comment } = req.body || {}

        if (!image_id || !user_id || !comment) {
            return res.status(400).json({ error: "Missing required fields or invalid JSON body. Make sure to send a raw JSON body in Postman." })
        }

        const result = await pool.query(
            `INSERT INTO comments (image_id, user_id, comment)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [image_id, user_id, comment]
        )

        res.status(201).json({
            message: "Comment added successfully",
            comment: result.rows[0]
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Database error: " + error.message })
    }
}

exports.getCommentsByImage = async (req, res) => {
    const { imageId } = req.params

    try {
        const result = await pool.query(
            "SELECT * FROM comments WHERE image_id = $1 ORDER BY created_at DESC",
            [imageId]
        )

        res.json({
            comments: result.rows
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({
            error: "Database error"
        })
    }
}
