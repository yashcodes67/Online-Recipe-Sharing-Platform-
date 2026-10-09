// controllers/recipeController.js
// Full CRUD for recipes, plus ratings and comments

const Recipe = require('../models/Recipe');
const User = require('../models/User');
const { validationResult } = require('express-validator');


/**
 * @route   GET /api/recipes
 * @desc    Get all recipes with pagination and optional filters
 * @access  Public
 */
const getAllRecipes = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const { category, sort } = req.query;

    // Build filter query
    const filter = {};
    if (category && category !== 'All') {
      filter.category = category;
    }

    // Build sort query
    let sortQuery = { createdAt: -1 }; // Default: newest first
    if (sort === 'rating') sortQuery = { averageRating: -1 };
    if (sort === 'oldest') sortQuery = { createdAt: 1 };
    if (sort === 'popular') sortQuery = { ratingCount: -1 };

    const [recipes, total] = await Promise.all([
      Recipe.find(filter)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .populate('author', 'username avatar')
        .select('-ratings -comments'), // Exclude heavy subdocs from list view
      Recipe.countDocuments(filter),
    ]);

    res.json({
      success: true,
      recipes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/recipes/search
 * @desc    Search recipes by title or ingredients, with optional category filter
 * @access  Public
 */
const searchRecipes = async (req, res, next) => {
  try {
    const { q, category } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const filter = {
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { ingredients: { $elemMatch: { $regex: q, $options: 'i' } } },
        { description: { $regex: q, $options: 'i' } },
      ],
    };

    if (category && category !== 'All') {
      filter.category = category;
    }

    const recipes = await Recipe.find(filter)
      .sort({ averageRating: -1 })
      .limit(20)
      .populate('author', 'username avatar')
      .select('-ratings -comments');

    res.json({
      success: true,
      recipes,
      total: recipes.length,
      query: q,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/recipes/:id
 * @desc    Get single recipe with full details
 * @access  Public
 */
const getRecipeById = async (req, res, next) => {
  try {
    const recipe = await Recipe.findById(req.params.id)
      .populate('author', 'username avatar bio');

    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    // Check if current user has rated
    let userRating = null;
    if (req.user) {
      const existing = recipe.ratings.find(
        (r) => r.user.toString() === req.user._id.toString()
      );
      if (existing) userRating = existing.value;
    }

    const recipeObj = recipe.toObject();
    recipeObj.userRating = userRating;
    delete recipeObj.ratings; // Don't expose all ratings

    res.json({ success: true, recipe: recipeObj });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/recipes
 * @desc    Create a new recipe
 * @access  Private
 */
const createRecipe = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const {
      title, description, category,
      cookTime, servings, difficulty,
    } = req.body;

    // Parse ingredients and steps (sent as JSON strings or arrays)
    let ingredients = req.body.ingredients;
    let steps = req.body.steps;

    if (typeof ingredients === 'string') {
      try { ingredients = JSON.parse(ingredients); } catch { ingredients = [ingredients]; }
    }
    if (typeof steps === 'string') {
      try { steps = JSON.parse(steps); } catch { steps = [steps]; }
    }

    // Filter empty values
    ingredients = ingredients.filter((i) => i.trim());
    steps = steps.filter((s) => s.trim());

    const recipeData = {
      title,
      description,
      ingredients,
      steps,
      category,
      cookTime: cookTime ? parseInt(cookTime) : undefined,
      servings: servings ? parseInt(servings) : undefined,
      difficulty: difficulty || 'Medium',
      author: req.user._id,
      authorName: req.user.username,
    };

    // Handle uploaded image
    if (req.file) {
      recipeData.image = req.file.path;
    }

    const recipe = await Recipe.create(recipeData);

    // Increment user's recipe count
    await User.findByIdAndUpdate(req.user._id, { $inc: { recipesCount: 1 } });

    // Emit real-time event via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('recipe:created', {
        _id: recipe._id,
        title: recipe.title,
        category: recipe.category,
        authorName: recipe.authorName,
        image: recipe.image,
      });
    }

    const populated = await Recipe.findById(recipe._id).populate('author', 'username avatar');

    res.status(201).json({
      success: true,
      message: 'Recipe created successfully!',
      recipe: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/recipes/:id
 * @desc    Update a recipe (owner only)
 * @access  Private
 */
const updateRecipe = async (req, res, next) => {
  try {
    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    // Authorization check
    if (recipe.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this recipe',
      });
    }

    const {
      title, description, category,
      cookTime, servings, difficulty,
    } = req.body;

    let ingredients = req.body.ingredients;
    let steps = req.body.steps;

    if (typeof ingredients === 'string') {
      try { ingredients = JSON.parse(ingredients); } catch { ingredients = [ingredients]; }
    }
    if (typeof steps === 'string') {
      try { steps = JSON.parse(steps); } catch { steps = [steps]; }
    }

    if (ingredients) ingredients = ingredients.filter((i) => i.trim());
    if (steps) steps = steps.filter((s) => s.trim());

    const updates = {
      ...(title && { title }),
      ...(description && { description }),
      ...(ingredients && { ingredients }),
      ...(steps && { steps }),
      ...(category && { category }),
      ...(cookTime && { cookTime: parseInt(cookTime) }),
      ...(servings && { servings: parseInt(servings) }),
      ...(difficulty && { difficulty }),
    };

    // Handle new image upload
    if (req.file) {
  updates.image = req.file.path;
  }

    const updated = await Recipe.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('author', 'username avatar');

    // Emit real-time update
    const io = req.app.get('io');
    if (io) io.emit('recipe:updated', { _id: updated._id, title: updated.title });

    res.json({
      success: true,
      message: 'Recipe updated successfully!',
      recipe: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/recipes/:id
 * @desc    Delete a recipe (owner only)
 * @access  Private
 */
const deleteRecipe = async (req, res, next) => {
  try {
    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    if (recipe.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this recipe',
      });
    }

  

    await recipe.deleteOne();

    // Decrement user recipe count
    await User.findByIdAndUpdate(req.user._id, { $inc: { recipesCount: -1 } });

    // Emit real-time event
    const io = req.app.get('io');
    if (io) io.emit('recipe:deleted', { _id: req.params.id });

    res.json({ success: true, message: 'Recipe deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/recipes/:id/rate
 * @desc    Rate a recipe (1–5 stars, one per user)
 * @access  Private
 */
const rateRecipe = async (req, res, next) => {
  try {
    const { value } = req.body;

    if (!value || value < 1 || value > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    // Cannot rate own recipe
    if (recipe.author.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot rate your own recipe',
      });
    }

    // Check if user already rated
    const existingIndex = recipe.ratings.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingIndex >= 0) {
      // Update existing rating
      recipe.ratings[existingIndex].value = parseInt(value);
    } else {
      // Add new rating
      recipe.ratings.push({ user: req.user._id, value: parseInt(value) });
    }

    // Recalculate average
    recipe.recalculateRating();
    await recipe.save();

    // Emit real-time rating update
    const io = req.app.get('io');
    if (io) {
      io.to(`recipe:${req.params.id}`).emit('recipe:rated', {
        recipeId: req.params.id,
        averageRating: recipe.averageRating,
        ratingCount: recipe.ratingCount,
        userRating: parseInt(value),
      });
    }

    res.json({
      success: true,
      message: 'Rating submitted!',
      averageRating: recipe.averageRating,
      ratingCount: recipe.ratingCount,
      userRating: parseInt(value),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/recipes/:id/comment
 * @desc    Add a comment to a recipe
 * @access  Private
 */
const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required',
      });
    }

    if (text.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Comment cannot exceed 500 characters',
      });
    }

    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    const comment = {
      user: req.user._id,
      username: req.user.username,
      text: text.trim(),
      createdAt: new Date(),
    };

    recipe.comments.push(comment);
    await recipe.save();

    const newComment = recipe.comments[recipe.comments.length - 1];

    // Emit real-time comment
    const io = req.app.get('io');
    if (io) {
      io.to(`recipe:${req.params.id}`).emit('recipe:commented', {
        recipeId: req.params.id,
        comment: newComment,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Comment added!',
      comment: newComment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/recipes/user/:userId
 * @desc    Get all recipes by a specific user
 * @access  Public
 */
const getUserRecipes = async (req, res, next) => {
  try {
    const recipes = await Recipe.find({ author: req.params.userId })
      .sort({ createdAt: -1 })
      .select('-ratings -comments')
      .populate('author', 'username avatar');

    res.json({ success: true, recipes });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRecipes,
  searchRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  rateRecipe,
  addComment,
  getUserRecipes,
};
