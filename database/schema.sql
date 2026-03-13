-- USERS TABLE
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IMAGES TABLE
CREATE TABLE images (
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
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES images(id),
    user_id INTEGER REFERENCES users(id),
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RATINGS TABLE
CREATE TABLE ratings (
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES images(id),
    user_id INTEGER REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
