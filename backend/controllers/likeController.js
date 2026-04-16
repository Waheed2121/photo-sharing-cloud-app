const pool = require("../config/db")
const { getCache, setCache, invalidateByPrefix } = require("../utils/cache")

exports.addLike = async (req, res) => {
    try {
        const { image_id } = req.body || {}
        const user_id = req.user && req.user.id

        if (!image_id || !user_id) {
            return res.status(400).json({ error: "image_id is required" })
        }

        const result = await pool.query(
            `INSERT INTO likes (image_id, user_id)
             VALUES ($1, $2)
             RETURNING *`,
            [image_id, user_id]
        )

        invalidateByPrefix(`likes:image:${image_id}`)
        invalidateByPrefix("images:")

        res.status(201).json({
            message: "Like added successfully",
            like: result.rows[0]
        })
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ error: "You already liked this image" })
        }
        console.error(error)
        res.status(500).json({ error: "Database error: " + error.message })
    }
}

exports.removeLike = async (req, res) => {
    try {
        const { imageId } = req.params
        const user_id = req.user && req.user.id

        if (!imageId || !user_id) {
            return res.status(400).json({ error: "imageId is required" })
        }

        const result = await pool.query(
            `DELETE FROM likes
             WHERE image_id = $1
               AND user_id = $2
             RETURNING *`,
            [imageId, user_id]
        )

        invalidateByPrefix(`likes:image:${imageId}`)
        invalidateByPrefix("images:")

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Like not found" })
        }

        res.json({ message: "Like removed successfully" })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Database error: " + error.message })
    }
}

exports.getLikesByImage = async (req, res) => {
    const { imageId } = req.params
    const user_id = req.user && req.user.id

    try {
        const cacheKey = `likes:image:${imageId}:user:${user_id || 0}`
        const cached = getCache(cacheKey)
        if (cached) {
            return res.json(cached)
        }

        const result = await pool.query(
            `SELECT
                l.id,
                l.image_id,
                l.user_id,
                l.created_at,
                u.email AS user_email,
                u.role AS user_role
             FROM likes l
             LEFT JOIN users u ON u.id = l.user_id
             WHERE l.image_id = $1
             ORDER BY l.created_at DESC`,
            [imageId]
        )

        const payload = {
            likes: result.rows,
            totalLikes: result.rows.length,
            likedByUser: user_id ? result.rows.some((like) => Number(like.user_id) === Number(user_id)) : false
        }
        setCache(cacheKey, payload)
        res.json(payload)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Database error" })
    }
}