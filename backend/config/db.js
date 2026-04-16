const { Pool } = require("pg")

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL)
const rejectUnauthorized = process.env.PG_REJECT_UNAUTHORIZED === "true"

const pool = hasDatabaseUrl
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized }
    })
  : new Pool({
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "abdur123",
      host: process.env.DB_HOST || "localhost",
      database: process.env.DB_NAME || "photo_sharing_app",
      port: parseInt(process.env.DB_PORT) || 5432,
      // SSL required by Azure PostgreSQL Flexible Server; disabled for local dev
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized } : false
    })

module.exports = pool
