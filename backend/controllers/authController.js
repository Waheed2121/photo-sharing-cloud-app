const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

// temporary in-memory storage
const users = []

exports.register = async (req, res) => {
    try {
        const { email, password, role } = req.body

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = {
            id: users.length + 1,
            email,
            password: hashedPassword,
            role
        }

        users.push(user)

        // return user WITHOUT password
        res.json({
            message: "User registered successfully",
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        })

    } catch (error) {
        res.status(500).json({ error: "Registration failed" })
    }
}

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body

        const user = users.find(u => u.email === email)

        if (!user) {
            return res.status(404).json({ error: "User not found" })
        }

        const validPassword = await bcrypt.compare(password, user.password)

        if (!validPassword) {
            return res.status(401).json({ error: "Invalid password" })
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            "secretkey",
            { expiresIn: "1h" }
        )

        res.json({
            message: "Login successful",
            token
        })

    } catch (error) {
        res.status(500).json({ error: "Login failed" })
    }
}
