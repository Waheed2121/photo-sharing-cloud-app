Photo Sharing Cloud Application - Task 1

This project implements Task 1 for a cloud-native photo sharing platform.

Implemented requirements:
- Creator account can upload images with metadata (`title`, `caption`, `location`, `people`).
- Consumer account can browse/search images, comment on images, and rate images.
- Search endpoint: `GET /api/images/search?q=...` (PostgreSQL `ILIKE` on title/caption/location).
- Gallery pagination: `GET /api/images?page=1&limit=10`.
- Upload validation: JPEG/PNG only, max size 5MB.
- JWT authentication with role-based authorization.
- User persistence in PostgreSQL (`users` table), not in memory.
- Basic API response caching added for gallery/search/comments/ratings to support scalability.

Roles:
- Public registration creates `consumer` users only.
- `creator` users are enrolled directly in the database (no public creator enrollment page).

Create a creator user manually:
1. Generate a bcrypt hash for a password.
2. Insert into PostgreSQL:

```sql
INSERT INTO users (email, password_hash, role)
VALUES ('creator@example.com', '<bcrypt_hash>', 'creator');
```

Run backend:
1. Configure `backend/.env`.
2. Install dependencies in `backend`.
3. Start server and open `http://localhost:3000/`.

/Notes on "ideal" Task 1 items:
- Caching is implemented in-app (short TTL cache).
- Dynamic DNS routing is deployment-level and is configured on the cloud platform during Task 2 deployment.
