// tests/recipes.test.js
// Basic test suite for recipe CRUD, ratings, and comments

const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');

let authToken = '';
let recipeId = '';

const testUser = {
  username: 'recipetester',
  email: 'recipetester@example.com',
  password: 'password123',
};

const sampleRecipe = {
  title: 'Classic Margherita Pizza',
  description: 'A simple and delicious Italian pizza with fresh ingredients.',
  ingredients: JSON.stringify(['Pizza dough', 'Tomato sauce', 'Mozzarella', 'Fresh basil']),
  steps: JSON.stringify(['Preheat oven to 250°C', 'Spread sauce on dough', 'Add cheese', 'Bake 10 mins']),
  category: 'Veg',
  cookTime: '30',
  servings: '4',
  difficulty: 'Easy',
};

beforeAll(async () => {
  const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/recipe-book-test';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(testDbUri);
  }

  // Register and login test user
  await request(app).post('/api/auth/register').send(testUser);
  const loginRes = await request(app).post('/api/auth/login').send({
    email: testUser.email,
    password: testUser.password,
  });
  authToken = loginRes.body.token;
});

afterAll(async () => {
  const User = require('../models/User');
  const Recipe = require('../models/Recipe');
  await Recipe.deleteMany({ authorName: testUser.username });
  await User.deleteMany({ email: testUser.email });
  await mongoose.connection.close();
});

// ==================== RECIPE TESTS ====================

describe('POST /api/recipes', () => {
  it('should create a recipe when authenticated', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${authToken}`)
      .field('title', sampleRecipe.title)
      .field('description', sampleRecipe.description)
      .field('ingredients', sampleRecipe.ingredients)
      .field('steps', sampleRecipe.steps)
      .field('category', sampleRecipe.category)
      .field('cookTime', sampleRecipe.cookTime)
      .field('servings', sampleRecipe.servings);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.recipe.title).toBe(sampleRecipe.title);
    recipeId = res.body.recipe._id;
  });

  it('should reject recipe creation without auth', async () => {
    const res = await request(app).post('/api/recipes').send(sampleRecipe);
    expect(res.statusCode).toBe(401);
  });

  it('should reject recipe with missing title', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${authToken}`)
      .field('description', sampleRecipe.description)
      .field('ingredients', sampleRecipe.ingredients)
      .field('steps', sampleRecipe.steps)
      .field('category', sampleRecipe.category);

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/recipes', () => {
  it('should return list of recipes', async () => {
    const res = await request(app).get('/api/recipes');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.recipes)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  it('should filter by category', async () => {
    const res = await request(app).get('/api/recipes?category=Veg');
    expect(res.statusCode).toBe(200);
    res.body.recipes.forEach((r) => expect(r.category).toBe('Veg'));
  });
});

describe('GET /api/recipes/search', () => {
  it('should search recipes by title', async () => {
    const res = await request(app).get('/api/recipes/search?q=Margherita');
    expect(res.statusCode).toBe(200);
    expect(res.body.recipes.length).toBeGreaterThan(0);
  });

  it('should return 400 for empty search query', async () => {
    const res = await request(app).get('/api/recipes/search?q=');
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/recipes/:id', () => {
  it('should return a single recipe', async () => {
    const res = await request(app).get(`/api/recipes/${recipeId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.recipe._id).toBe(recipeId);
  });

  it('should return 400 for invalid recipe ID format', async () => {
    const res = await request(app).get('/api/recipes/invalidid');
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/recipes/:id/comment', () => {
  it('should add a comment when authenticated', async () => {
    const res = await request(app)
      .post(`/api/recipes/${recipeId}/comment`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ text: 'Tried this recipe — absolutely delicious!' });

    expect(res.statusCode).toBe(201);
    expect(res.body.comment.text).toBe('Tried this recipe — absolutely delicious!');
  });

  it('should reject empty comment', async () => {
    const res = await request(app)
      .post(`/api/recipes/${recipeId}/comment`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ text: '' });

    expect(res.statusCode).toBe(400);
  });
});

describe('DELETE /api/recipes/:id', () => {
  it('should delete recipe created by user', async () => {
    const res = await request(app)
      .delete(`/api/recipes/${recipeId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
