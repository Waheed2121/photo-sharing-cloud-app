const pool = require("../config/db")
const { getCache, setCache, invalidateByPrefix } = require("../utils/cache")

exports.addComment = async (req, res) => {
    try {
        const { image_id, comment } = req.body || {}
        const user_id = req.user && req.user.id

        if (!image_id || !user_id || !comment) {
            return res.status(400).json({
                error: "image_id and comment are required in the JSON body"
            })
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
        invalidateByPrefix(`comments:image:${image_id}`)
        invalidateByPrefix("images:")

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Database error: " + error.message })
    }
}

exports.getCommentsByImage = async (req, res) => {
    const { imageId } = req.params

    try {
        const cacheKey = `comments:image:${imageId}`
        const cached = getCache(cacheKey)
        if (cached) {
            return res.json(cached)
        }

        const result = await pool.query(
            `SELECT
                c.id,
                c.image_id,
                c.user_id,
                c.comment,
                c.created_at,
                u.email AS user_email,
                u.role AS user_role
             FROM comments c
             LEFT JOIN users u ON u.id = c.user_id
             WHERE c.image_id = $1
             ORDER BY c.created_at DESC`,
            [imageId]
        )

        const payload = {
            comments: result.rows
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
