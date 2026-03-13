const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const pool = require("../config/db")

const JWT_SECRET = process.env.JWT_SECRET
const PUBLIC_ROLE = "consumer"

if (!JWT_SECRET) {
    throw new Error("Missing required environment variable: JWT_SECRET")
}

exports.register = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" })
        }

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        )
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: "User already exists" })
        }

        const passwordHash = await bcrypt.hash(password, 10)
        const created = await pool.query(
            `INSERT INTO users (email, password_hash, role)
             VALUES ($1, $2, $3)
             RETURNING id, email, role`,
            [email, passwordHash, PUBLIC_ROLE]
        )
        const user = created.rows[0]

        // return user WITHOUT password
        res.json({
            message: "User registered successfully",
            user
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Registration failed" })
    }
}

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" })
        }

        const result = await pool.query(
            "SELECT id, email, password_hash, role FROM users WHERE email = $1",
            [email]
        )
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" })
        }
        const user = result.rows[0]

        const validPassword = await bcrypt.compare(password, user.password_hash)

        if (!validPassword) {
            return res.status(401).json({ error: "Invalid password" })
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn: "1h" }
        )

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Login failed" })
    }
}
