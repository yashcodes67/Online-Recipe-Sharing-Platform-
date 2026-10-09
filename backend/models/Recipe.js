// models/Recipe.js
// Mongoose schema for Recipe with embedded ratings and comments

const mongoose = require('mongoose');

// Sub-schema for ratings
const ratingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
  },
  { _id: false }
);

// Sub-schema for comments
const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      maxlength: [500, 'Comment cannot exceed 500 characters'],
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }
);

// Main Recipe schema
const recipeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Recipe title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Recipe description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    ingredients: {
      type: [String],
      required: [true, 'At least one ingredient is required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one ingredient is required',
      },
    },
    steps: {
      type: [String],
      required: [true, 'At least one step is required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one step is required',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['Veg', 'Non-Veg', 'Vegan', 'Dessert', 'Breakfast', 'Snack', 'Beverage', 'Other'],
        message: '{VALUE} is not a valid category',
      },
    },
    image: {
      type: String,
      default: '', // File path or URL
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    cookTime: {
      type: Number, // in minutes
      min: [1, 'Cook time must be at least 1 minute'],
    },
    servings: {
      type: Number,
      min: [1, 'Servings must be at least 1'],
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    ratings: [ratingSchema],
    comments: [commentSchema],
    // Computed fields stored for performance
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for search performance
recipeSchema.index({ title: 'text', ingredients: 'text', description: 'text' });
recipeSchema.index({ category: 1 });
recipeSchema.index({ author: 1 });
recipeSchema.index({ averageRating: -1 });
recipeSchema.index({ createdAt: -1 });

// Method: Recalculate average rating
recipeSchema.methods.recalculateRating = function () {
  if (this.ratings.length === 0) {
    this.averageRating = 0;
    this.ratingCount = 0;
  } else {
    const sum = this.ratings.reduce((acc, r) => acc + r.value, 0);
    this.averageRating = Math.round((sum / this.ratings.length) * 10) / 10;
    this.ratingCount = this.ratings.length;
  }
};

const Recipe = mongoose.model('Recipe', recipeSchema);
module.exports = Recipe;
