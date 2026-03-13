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
app.use(express.static(path.join(__dirname, "public")))

app.use("/api/auth", authRoutes)
app.use("/api/images", imageRoutes)
app.use("/api/comments", commentRoutes)
app.use("/api/ratings", ratingRoutes)
app.use("/uploads", express.static(uploadsDir))

app.get("/", (req, res) => {
    res.status(200).json({ status: "API running" })
})

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" })
})

app.use((req, res) => {
    res.sendFile(path.join(__dirname, "public", "welcome.html"))
})

const PORT = process.env.PORT || 3000

async function ensureCreatorUser() {
    const email = "creator@test.com"
    const password = "creator123"
    const role = "creator"

    const existing = await pool.query(
        "SELECT id, email FROM users WHERE role = $1 LIMIT 1",
        [role]
    )

    if (existing.rows.length > 0) {
        console.log(`Creator user already exists (${existing.rows[0].email}).`)
        return
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    await pool.query(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, $3)`,
        [email, hashedPassword, role]
    )

    console.log("Default creator user created: creator@test.com")
}

async function startServer() {
    try {
        await pool.query("SELECT 1")
        await ensureCreatorUser()

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`)
        })
    } catch (error) {
        console.error("Server startup failed:", error.message)
        process.exit(1)
    }
}

startServer()
