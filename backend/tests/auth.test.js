// tests/auth.test.js
// Basic test suite for authentication endpoints

const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');

// Test user data
const testUser = {
  username: 'testchef',
  email: 'testchef@example.com',
  password: 'password123',
};

let authToken = '';
let userId = '';

// Connect to a test DB before all tests
beforeAll(async () => {
  const testDbUri =
    process.env.MONGODB_TEST_URI ||
    'mongodb://localhost:27017/recipe-book-test';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(testDbUri);
  }
});

// Clean up test data after all tests
afterAll(async () => {
  const User = require('../models/User');
  const Recipe = require('../models/Recipe');
  await User.deleteMany({ email: testUser.email });
  await Recipe.deleteMany({ authorName: testUser.username });
  await mongoose.connection.close();
});

// ==================== AUTH TESTS ====================

describe('POST /api/auth/register', () => {
  it('should register a new user successfully', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.password).toBeUndefined(); // Password must never be returned
    authToken = res.body.token;
    userId = res.body.user._id;
  });

  it('should reject duplicate email registration', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject registration with invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...testUser,
      email: 'not-an-email',
      username: 'anotherone',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject registration with short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'newuser99',
      email: 'newuser99@test.com',
      password: '123',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    authToken = res.body.token; // refresh token
  });

  it('should reject invalid password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: 'wrongpassword',
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject non-existent email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@nowhere.com',
      password: 'password123',
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/auth/me', () => {
  it('should return current user when authenticated', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.user.username).toBe(testUser.username);
  });

  it('should reject request without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('should reject request with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalidtoken123');
    expect(res.statusCode).toBe(401);
  });
});
