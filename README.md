# Cloud Photo Sharing Platform

Node.js + Express photo sharing web application for a cloud computing assignment.

## Architecture

- Frontend: HTML, CSS, JavaScript (`backend/public`)
- Backend: Node.js, Express (`backend`)
- Database: Azure Database for PostgreSQL
- Storage: Azure Blob Storage
- Hosting: Azure App Service

## Features

- Register and login (JWT authentication)
- Creator-only image upload
- Gallery view
- Search (title, caption, location)
- Pagination
- Comments
- Ratings

## Run Locally

1. Create environment file:
   - Copy `backend/.env.example` to `backend/.env`
   - Fill in required values
2. Install dependencies:

```bash
cd backend
npm install
```

3. Start server:

```bash
npm start
```

4. Open:
   - `http://localhost:3000/welcome.html`

## API Endpoints

- `POST /api/auth/register` - Register consumer user
- `POST /api/auth/login` - Login and return JWT
- `GET /api/images?page=&limit=` - Get gallery (auth required)
- `GET /api/images/search?q=&page=&limit=` - Search images (auth required)
- `POST /api/images/upload` - Upload image (creator role, multipart/form-data)
- `POST /api/comments` - Add comment (auth required)
- `GET /api/comments/:imageId` - Get comments for image (auth required)
- `POST /api/ratings` - Add rating (auth required)
- `GET /api/ratings/:imageId` - Get ratings for image (auth required)
- `GET /health` - Health check

## Notes

- `backend/uploads` is kept empty in the repository for submission.
- Uploaded files are stored in Azure Blob Storage in cloud deployment.
