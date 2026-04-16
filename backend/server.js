require("dotenv").config()
const express = require("express")
const cors = require("cors")
const bcrypt = require("bcrypt")
const fs = require("fs")
const pool = require("./config/db")

const authRoutes = require("./routes/authRoutes")
const imageRoutes = require("./routes/imageRoutes")
const commentRoutes = require("./routes/commentRoutes")
const ratingRoutes = require("./routes/ratingRoutes")
const likeRoutes = require("./routes/likeRoutes")
const imageController = require("./controllers/imageController")
const { authenticate, authorize } = require("./middleware/authMiddleware")

const app = express()
const isProduction = process.env.NODE_ENV === "production"
const path = require("path")
const uploadsDir = path.join(__dirname, "uploads")

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
}

const requiredEnvVars = [
    "JWT_SECRET"
]

if (isProduction) {
    requiredEnvVars.push(
        "DATABASE_URL",
        "AZURE_STORAGE_CONNECTION_STRING",
        "BLOB_CONTAINER_NAME"
    )
}

const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name])
if (missingEnvVars.length > 0) {
    throw new Error(
        `Missing required environment variables: ${missingEnvVars.join(", ")}`
    )
}

app.use(cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))
app.use(express.json())
app.use(express.static(path.join(__dirname, "../frontend")))

app.use("/api/auth", authRoutes)
app.use("/api/images", imageRoutes)
app.use("/api/comments", commentRoutes)
app.use("/api/ratings", ratingRoutes)
app.use("/api/likes", likeRoutes)

// Endpoint aliases for local/API testing compatibility
app.use("/", authRoutes)
app.use("/images", imageRoutes)
app.use("/comments", commentRoutes)
app.use("/ratings", ratingRoutes)
app.use("/likes", likeRoutes)

app.delete("/image/:id", authenticate, authorize("creator"), imageController.deleteImage)
app.use("/uploads", express.static(uploadsDir))

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"))
})

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" })
})

app.use((req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"))
})

const PORT = process.env.PORT || 3000

async function ensureDatabaseSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role VARCHAR(20) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `)

    await pool.query(`
        CREATE TABLE IF NOT EXISTS images (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255),
            caption TEXT,
            location VARCHAR(255),
            people_present TEXT,
            image_url TEXT NOT NULL,
            creator_id INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `)

    await pool.query(`
        CREATE TABLE IF NOT EXISTS comments (
            id SERIAL PRIMARY KEY,
            image_id INTEGER REFERENCES images(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            comment TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `)

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ratings (
            id SERIAL PRIMARY KEY,
            image_id INTEGER REFERENCES images(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (image_id, user_id)
        )
    `)

    await pool.query(`
        CREATE TABLE IF NOT EXISTS likes (
            id SERIAL PRIMARY KEY,
            image_id INTEGER REFERENCES images(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (image_id, user_id)
        )
    `)
}

async function seedRequiredUsers() {
    const requiredUsers = [
        {
            email: "user@test.com",
            password: "password123",
            role: "consumer"
        },
        {
            email: "creator@test.com",
            password: "creator123",
            role: "creator"
        }
    ]

    for (const user of requiredUsers) {
        const existing = await pool.query(
            "SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
            [user.email]
        )

        if (existing.rows.length > 0) {
            continue
        }

        const hashedPassword = await bcrypt.hash(user.password, 10)
        await pool.query(
            `INSERT INTO users (email, password_hash, role)
             VALUES ($1, $2, $3)`,
            [user.email.toLowerCase(), hashedPassword, user.role]
        )
    }
}

async function ensureSampleImages() {
    await pool.query(
        `UPDATE images
         SET image_url = 'https://source.unsplash.com/800x600/?nature,landscape'
         WHERE image_url IS NULL OR BTRIM(image_url) = ''`
    )

    const sampleLocations = ["Paris", "Tokyo", "New York", "London", "Dubai", "Sydney", "Rome", "Kyoto", "Cape Town", "Bali", "Santorini", "Machu Picchu"];
    const sampleTitles = ["Beautiful Sunset", "Mountain Peak", "Urban Landscape", "Forest Trail", "Ocean Horizon", "City Lights", "Desert Dunes", "Winter Wonderland", "Autumn Leaves", "Spring Blossom"];
    const sampleCaptions = ["An unforgettable view.", "Nature at its best.", "Capturing the moment.", "Wanderlust adventures.", "Exploring the unknown.", "A peaceful retreat.", "Vibrant and full of life.", "Serene surroundings.", "The golden hour magic.", "A breathtaking scenery."];

    // Fix any existing generic data
    const existingGenerics = await pool.query("SELECT id FROM images WHERE title LIKE 'Sample Image %'");
    for (let i = 0; i < existingGenerics.rows.length; i++) {
        const id = existingGenerics.rows[i].id;
        await pool.query(`UPDATE images SET title = $1, caption = $2, location = $3, people_present = $4 WHERE id = $5`, [
            sampleTitles[i % sampleTitles.length],
            sampleCaptions[i % sampleCaptions.length],
            sampleLocations[i % sampleLocations.length],
            "None",
            id
        ]);
    }

    const minimumSampleCount = 20
    const countResult = await pool.query("SELECT COUNT(*)::int AS count FROM images")
    const count = Number(countResult.rows[0] && countResult.rows[0].count ? countResult.rows[0].count : 0)

    if (count >= minimumSampleCount) {
        return
    }

    const creatorResult = await pool.query(
        "SELECT id FROM users WHERE role = $1 ORDER BY id ASC LIMIT 1",
        ["creator"]
    )

    if (creatorResult.rows.length === 0) {
        return
    }

    const creatorId = creatorResult.rows[0].id
    const imagesToAdd = minimumSampleCount - count
    const sourceUrls = [
        "https://source.unsplash.com/800x600/?nature",
        "https://source.unsplash.com/800x600/?mountain",
        "https://source.unsplash.com/800x600/?ocean"
    ]

    for (let index = 0; index < imagesToAdd; index += 1) {
        const imageUrl = sourceUrls[index % sourceUrls.length]
        const i = count + index;
        await pool.query(
            `INSERT INTO images (title, caption, location, people_present, image_url, creator_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                sampleTitles[i % sampleTitles.length],
                sampleCaptions[i % sampleCaptions.length],
                sampleLocations[i % sampleLocations.length],
                "None",
                imageUrl,
                creatorId
            ]
        )
    }

    console.log(`Sample gallery images seeded: +${imagesToAdd}.`)
}

async function startServer() {
    try {
        await pool.query("SELECT 1")
        await ensureDatabaseSchema()
        await seedRequiredUsers()
        await ensureSampleImages()

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`)
        })
    } catch (error) {
        console.error("Server startup failed:", error.message)
        process.exit(1)
    }
}

startServer()
