const pool = require("../config/db")

exports.uploadImage = async (req, res) => {

    const { title, caption, location, people } = req.body

    if (!req.file) {
        return res.status(400).json({ error: "No image uploaded" })
    }

    const filename = req.file.filename

    try {

        const result = await pool.query(
            `INSERT INTO images (title, caption, location, people_present, image_url)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [title, caption, location, people, filename]
        )

        res.json({
            message: "Image uploaded successfully",
            image: result.rows[0]
        })

    } catch (error) {

        console.error(error)

        res.status(500).json({
            error: "Database error: " + error.message
        })
    }
}

exports.getImages = async (req, res) => {
    try {

        const result = await pool.query(`
            SELECT id, title, caption, location, people_present, image_url, created_at
            FROM images
            ORDER BY created_at DESC
        `)

        res.json({
            images: result.rows
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Database error" })
    }
}
