// routes/recipes.js
// Recipe CRUD, search, ratings, comments

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getAllRecipes,
  searchRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  rateRecipe,
  addComment,
  getUserRecipes,
} = require('../controllers/recipeController');
const { protect, optionalAuth } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

// Recipe validation
const recipeValidation = [
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be 3–100 characters'),
  body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be 10–1000 characters'),
  body('category')
    .isIn(['Veg', 'Non-Veg', 'Vegan', 'Dessert', 'Breakfast', 'Snack', 'Beverage', 'Other'])
    .withMessage('Invalid category'),
];

// Public routes
router.get('/', getAllRecipes);
router.get('/search', searchRecipes);
router.get('/user/:userId', getUserRecipes);
router.get('/:id', optionalAuth, getRecipeById);

// Protected routes
router.post(
  '/',
  protect,
  upload.single('image'),
  handleUploadError,
  recipeValidation,
  createRecipe
);
router.put(
  '/:id',
  protect,
  upload.single('image'),
  handleUploadError,
  updateRecipe
);
router.delete('/:id', protect, deleteRecipe);
router.post('/:id/rate', protect, rateRecipe);
router.post('/:id/comment', protect, addComment);

module.exports = router;
