const jwt = require("jsonwebtoken")

const JWT_SECRET = process.env.JWT_SECRET || "secretkey"

/**
 * authenticate — verifies the Bearer token in Authorization header.
 * Populates req.user = { id, role } on success.
 */
exports.authenticate = (req, res, next) => {
    const authHeader = req.headers["authorization"]

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" })
    }

    const token = authHeader.split(" ")[1]

    try {
        const decoded = jwt.verify(token, JWT_SECRET)
        req.user = decoded
        next()
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" })
    }
}

/**
 * authorize(...roles) — role-based guard, must come after authenticate.
 * Usage: router.post("/upload", authenticate, authorize("creator"), ...)
 */
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Access denied. Required role(s): ${roles.join(", ")}`
            })
        }
        next()
    }
}
