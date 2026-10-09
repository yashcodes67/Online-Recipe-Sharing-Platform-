# 🍳 Online Recipe Sharing Platform

An Online Recipe Sharing Platform where users can share, discover, rate, and comment on recipes in real time.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Authentication** | JWT-based register/login/logout, bcrypt password hashing |
| **Recipes** | Create, edit, delete (owner only), view all, recipe detail |
| **Search** | Search by title, ingredients, or description |
| **Filter & Sort** | Filter by 8 categories; sort by newest, rating, popularity |
| **Ratings** | 1–5 star ratings, one per user, live average display |
| **Comments** | Add and view comments per recipe |
| **Image Upload** | Multer-powered image upload with drag & drop UI |
| **User Profiles** | View profile, bio, recipe count, and recipe grid |
| **Real-time** | Socket.IO: live updates for new recipes, ratings, comments |
| **Responsive** | Mobile-first, works on all screen sizes |
| **Tests** | Jest test suites for auth and recipe endpoints |

---

## 🗂 Project Structure

```
collaborative-recipe-book/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js    # Register, login, profile
│   │   └── recipeController.js  # Full recipe CRUD + rate/comment
│   ├── middleware/
│   │   ├── auth.js              # JWT protect/optional middleware
│   │   ├── upload.js            # Multer image upload
│   │   └── errorHandler.js      # Global error handling
│   ├── models/
│   │   ├── User.js              # User schema (bcrypt, virtuals)
│   │   └── Recipe.js            # Recipe schema (ratings, comments)
│   ├── routes/
│   │   ├── auth.js              # /api/auth/*
│   │   └── recipes.js           # /api/recipes/*
│   ├── tests/
│   │   ├── auth.test.js         # Auth endpoint tests
│   │   └── recipes.test.js      # Recipe endpoint tests
│   ├── uploads/                 # Uploaded images (gitignored)
│   ├── .env.example
│   ├── package.json
│   └── server.js                # Express + Socket.IO entry point
│
└── frontend/
    ├── css/
    │   └── main.css             # Complete design system
    ├── js/
    │   ├── auth.js              # Auth state management
    │   ├── recipes.js           # Recipe API client
    │   ├── utils.js             # UI utilities, cards, toasts
    │   ├── index.js             # Home page logic
    │   ├── browse.js            # Browse page logic
    │   ├── recipe-detail.js     # Recipe detail + real-time
    │   ├── add-recipe.js        # Create/edit recipe form
    │   └── profile.js           # User profile page
    ├── index.html               # Home page
    ├── recipes.html             # Browse all recipes
    ├── recipe.html              # Recipe detail
    ├── add-recipe.html          # Add/edit recipe form
    └── profile.html             # User profile
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- MongoDB 6+ (local) or MongoDB Atlas URI
- npm or yarn

### 1. Clone & Install Backend

```bash
cd collaborative-recipe-book/backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/recipe-book
JWT_SECRET=your_very_long_random_secret_here_change_this
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```
> ⚠️ Do not commit `.env` file. Use `.env.example` instead.

### 3. Start Backend

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```  

### 4. Serve Frontend

Use any static server. Examples:

```bash
# Using Node's http-server (install once: npm i -g http-server)
cd frontend
http-server -p 3000 -c-1

# Using Python
cd frontend
python3 -m http.server 3000

# Using VS Code Live Server extension
# Right-click index.html → Open with Live Server
```


### 5. Run Tests

```bash
cd backend
npm test
```

---

## 🌐 Deployment

### Backend → Render

1. Push backend to a GitHub repo
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo, set:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
4. Add Environment Variables (same as `.env` but with production values):
   - `MONGODB_URI` → your Atlas URI
   - `JWT_SECRET` → long random string
   - `FRONTEND_URL` → your Netlify/Vercel URL
   - `NODE_ENV` → `production`
   - Make sure MongoDB Atlas allows access from `0.0.0.0/0`

### Frontend → Netlify

1. Go to [netlify.com](https://netlify.com) → New site from Git
2. Select your repo, set publish directory to `frontend/`
3. Before deploying, update all `API_BASE` constants in the JS files:
   ```js
   const API_BASE = 'https://your-backend.onrender.com/api';
   ```
4. Deploy


### Database → MongoDB Atlas

1. Create account at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a free M0 cluster
3. Create a database user (username + password)
4. Whitelist `0.0.0.0/0` in Network Access (for Render)
5. Get your connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/recipe-book?retryWrites=true&w=majority
   ```
6. Set this as `MONGODB_URI` in Render environment variables

---
