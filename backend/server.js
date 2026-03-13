const express = require("express")
const cors = require("cors")

const authRoutes = require("./routes/authRoutes")
const imageRoutes = require("./routes/imageRoutes")
const commentRoutes = require("./routes/commentRoutes")
const ratingRoutes = require("./routes/ratingRoutes")

const app = express()

app.use(cors())
app.use(express.json())

app.use("/api/auth", authRoutes)
app.use("/api/images", imageRoutes)
app.use("/api/comments", commentRoutes)
app.use("/api/ratings", ratingRoutes)

app.get("/", (req, res) => {
    res.send("Photo Sharing API Running")
})

const PORT = 3000

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
