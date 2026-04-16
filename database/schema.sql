-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IMAGES TABLE
CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    caption TEXT,
    location VARCHAR(255),
    people_present TEXT,
    image_url TEXT NOT NULL,
    creator_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- COMMENTS TABLE
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES images(id),
    user_id INTEGER REFERENCES users(id),
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RATINGS TABLE
CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES images(id),
    user_id INTEGER REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (image_id, user_id)
);

-- LIKES TABLE
CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES images(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (image_id, user_id)
);
