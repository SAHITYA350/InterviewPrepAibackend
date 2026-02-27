# Backend API Server

Node.js and Express backend with MongoDB, authentication, file uploads, and AI integrations (Google GenAI + OpenAI).

---

## Tech Stack

- Node.js
- Express 5
- MongoDB
- Mongoose
- JWT Authentication
- bcryptjs
- Multer
- dotenv
- CORS
- Google Generative AI
- OpenAI API
- Nodemon (development)

---

## Installation

1. Clone the repository

```
git clone https://github.com/your-username/your-repo-name.git
cd backend
```

2. Install dependencies

```
npm install
```

3. Create a `.env` file in the root directory

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_API_KEY=your_google_api_key
OPENAI_API_KEY=your_openai_api_key
```

4. Start development server

```
npm run dev
```

5. Start production server

```
npm start
```

Server runs at:

```
http://localhost:5000
```

---

## Available Scripts

```
npm start      # Run with Node
npm run dev    # Run with Nodemon
```

---

## Project Structure

```
backend/
│── server.js
│── package.json
│── .env
│── routes/
│── controllers/
│── models/
│── middleware/
```

---

## Features

- User authentication with JWT
- Password hashing with bcrypt
- MongoDB database integration
- File upload handling with Multer
- AI response generation using Google and OpenAI APIs
- CORS enabled for frontend connection
- Environment variable configuration

---

## Security Notes

- Do not commit `.env` file
- Keep API keys private
- Use strong JWT secrets
- Enable HTTPS in production

---
