// server.js
// Main entry point for the Collaborative Recipe Book API
// Express + Socket.IO + MongoDB

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const recipeRoutes = require('./routes/recipes');

// Connect to MongoDB
connectDB();

// Initialize Express
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// Attach io to app for use in controllers
app.set('io', io);

// ==================== MIDDLEWARE ====================

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== ROUTES ====================

app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Collaborative Recipe Book API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ==================== SOCKET.IO ====================

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Join a recipe room to get real-time updates for that recipe
  socket.on('join:recipe', (recipeId) => {
    socket.join(`recipe:${recipeId}`);
    console.log(`👁️  Socket ${socket.id} joined recipe room: ${recipeId}`);
  });

  // Leave recipe room
  socket.on('leave:recipe', (recipeId) => {
    socket.leave(`recipe:${recipeId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// ==================== ERROR HANDLERS ====================

app.use(notFound);
app.use(errorHandler);

// ==================== START SERVER ====================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('');
  console.log('🍳  Collaborative Recipe Book API');
  console.log(`🚀  Server running on port ${PORT}`);
  console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡  Socket.IO enabled`);
  console.log('');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});

module.exports = { app, server };
