const { Pool } = require("pg")

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "1234",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "photo_sharing_app",
  port: process.env.DB_PORT || 5432
})

module.exports = pool
