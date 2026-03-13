const pool = require("../config/db")
const { resolveImageUrl } = require("../services/imageStorage")
const { getCache, setCache, invalidateByPrefix } = require("../utils/cache")

// ── Shared helpers ─────────────────────────────────────────────────────────────

/**
 * Parse and validate pagination query params.
 * Returns { page, limit, offset } or throws if invalid.
 */
function parsePagination(query) {
    const page = Math.max(1, parseInt(query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10))
    const offset = (page - 1) * limit
    return { page, limit, offset }
}

/**
 * Build a standard pagination metadata object.
 */
function paginationMeta(total, page, limit) {
    return {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    }
}

// ── Controllers ────────────────────────────────────────────────────────────────

/**
 * POST /api/images/upload
 * Requires: authenticate + authorize("creator")
 */
exports.uploadImage = async (req, res) => {
    const { title, caption, location, people } = req.body
    const creatorId = req.user && req.user.id

    if (!req.file) {
        return res.status(400).json({ error: "No image uploaded" })
    }
    if (!creatorId) {
        return res.status(401).json({ error: "Invalid authentication context" })
    }

    try {
        const imageUrl = await resolveImageUrl(req.file, creatorId)

        const result = await pool.query(
            `INSERT INTO images (title, caption, location, people_present, image_url, creator_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [title, caption, location, people, imageUrl, creatorId]
        )

        res.status(201).json({
            message: "Image uploaded successfully",
            image: result.rows[0]
        })
        invalidateByPrefix("images:")
        invalidateByPrefix("comments:")
        invalidateByPrefix("ratings:")
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Upload failed: " + error.message })
    }
}

/**
 * GET /api/images?page=1&limit=10
 * Authenticated for consumer/creator roles.
 */
exports.getImages = async (req, res) => {
    try {
        const { page, limit, offset } = parsePagination(req.query)
        const cacheKey = `images:list:${page}:${limit}`
        const cached = getCache(cacheKey)
        if (cached) {
            return res.json(cached)
        }

        // Total count (for pagination meta)
        const countResult = await pool.query("SELECT COUNT(*) FROM images")
        const total = parseInt(countResult.rows[0].count)

        const result = await pool.query(
            `SELECT
                i.id,
                i.title,
                i.caption,
                i.location,
                i.people_present,
                i.image_url,
                i.created_at,
                u.email AS uploader,
                r.average_rating AS average_rating,
                COALESCE(c.comments, '[]'::json) AS comments
             FROM images i
             LEFT JOIN users u ON u.id = i.creator_id
             LEFT JOIN LATERAL (
                 SELECT AVG(rt.rating)::numeric(10,2) AS average_rating
                 FROM ratings rt
                 WHERE rt.image_id = i.id
             ) r ON true
             LEFT JOIN LATERAL (
                 SELECT json_agg(
                     json_build_object(
                         'id', cm.id,
                         'user_id', cm.user_id,
                         'comment', cm.comment,
                         'created_at', cm.created_at
                     )
                     ORDER BY cm.created_at DESC
                 ) AS comments
                 FROM comments cm
                 WHERE cm.image_id = i.id
             ) c ON true
             ORDER BY i.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        )

        const payload = {
            images: result.rows,
            pagination: paginationMeta(total, page, limit)
        }
        setCache(cacheKey, payload)
        res.json(payload)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Database error" })
    }
}

/**
 * GET /api/images/search?q=&page=1&limit=10
 * Authenticated for consumer/creator roles.
 * Searches title, caption, and location using ILIKE (case-insensitive).
 */
exports.searchImages = async (req, res) => {
    const { q } = req.query

    if (!q || q.trim() === "") {
        return res.status(400).json({ error: "Search query 'q' is required" })
    }

    try {
        const { page, limit, offset } = parsePagination(req.query)
        const pattern = `%${q.trim()}%`
        const cacheKey = `images:search:${q.trim().toLowerCase()}:${page}:${limit}`
        const cached = getCache(cacheKey)
        if (cached) {
            return res.json(cached)
        }

        const WHERE = `
            WHERE i.title    ILIKE $1
               OR i.caption  ILIKE $1
               OR i.location ILIKE $1
        `

        // Total matching count
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM images i ${WHERE}`,
            [pattern]
        )
        const total = parseInt(countResult.rows[0].count)

        const result = await pool.query(
            `SELECT
                i.id,
                i.title,
                i.caption,
                i.location,
                i.people_present,
                i.image_url,
                i.created_at,
                u.email AS uploader,
                r.average_rating AS average_rating,
                COALESCE(c.comments, '[]'::json) AS comments
             FROM images i
             LEFT JOIN users u ON u.id = i.creator_id
             LEFT JOIN LATERAL (
                 SELECT AVG(rt.rating)::numeric(10,2) AS average_rating
                 FROM ratings rt
                 WHERE rt.image_id = i.id
             ) r ON true
             LEFT JOIN LATERAL (
                 SELECT json_agg(
                     json_build_object(
                         'id', cm.id,
                         'user_id', cm.user_id,
                         'comment', cm.comment,
                         'created_at', cm.created_at
                     )
                     ORDER BY cm.created_at DESC
                 ) AS comments
                 FROM comments cm
                 WHERE cm.image_id = i.id
             ) c ON true
             ${WHERE}
             ORDER BY i.created_at DESC
             LIMIT $2 OFFSET $3`,
            [pattern, limit, offset]
        )

        const payload = {
            images: result.rows,
            pagination: paginationMeta(total, page, limit)
        }
        setCache(cacheKey, payload)
        res.json(payload)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Database error" })
    }
}
