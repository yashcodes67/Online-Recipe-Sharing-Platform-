// js/api.ts
// Centralized API service for all backend communication

const API_BASE = 'https://recipe-backend-z4a6.onrender.com/api';

// ==================== TYPES ====================

export interface User {
  _id: string;
  username: string;
  email: string;
  bio: string;
  avatar: string;
  recipesCount: number;
  createdAt: string;
}

export interface Comment {
  _id: string;
  user: string;
  username: string;
  text: string;
  createdAt: string;
}

export interface Recipe {
  _id: string;
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  category: string;
  image: string;
  author: { _id: string; username: string; avatar: string };
  authorName: string;
  cookTime?: number;
  servings?: number;
  difficulty: string;
  averageRating: number;
  ratingCount: number;
  comments: Comment[];
  userRating?: number;
  createdAt: string;
}

export interface PaginatedRecipes {
  recipes: Recipe[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// ==================== HELPERS ====================

const getHeaders = (isFormData = false): HeadersInit => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const handleResponse = async (res: Response) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

// ==================== AUTH ====================

export const authAPI = {
  register: async (username: string, email: string, password: string, bio = '') => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, email, password, bio }),
    });
    return handleResponse(res);
  },

  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  getMe: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getUserProfile: async (userId: string) => {
    const res = await fetch(`${API_BASE}/auth/profile/${userId}`, { headers: getHeaders() });
    return handleResponse(res);
  },
};

// ==================== RECIPES ====================

export const recipeAPI = {
  getAll: async (page = 1, limit = 12, category = '', sort = '') => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (category && category !== 'All') params.append('category', category);
    if (sort) params.append('sort', sort);
    const res = await fetch(`${API_BASE}/recipes?${params}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  search: async (q: string, category = '') => {
    const params = new URLSearchParams({ q });
    if (category && category !== 'All') params.append('category', category);
    const res = await fetch(`${API_BASE}/recipes/search?${params}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getById: async (id: string) => {
    const res = await fetch(`${API_BASE}/recipes/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getUserRecipes: async (userId: string) => {
    const res = await fetch(`${API_BASE}/recipes/user/${userId}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  create: async (formData: FormData) => {
    const res = await fetch(`${API_BASE}/recipes`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData,
    });
    return handleResponse(res);
  },

  update: async (id: string, formData: FormData) => {
    const res = await fetch(`${API_BASE}/recipes/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: formData,
    });
    return handleResponse(res);
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/recipes/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  rate: async (id: string, value: number) => {
    const res = await fetch(`${API_BASE}/recipes/${id}/rate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ value }),
    });
    return handleResponse(res);
  },

  comment: async (id: string, text: string) => {
    const res = await fetch(`${API_BASE}/recipes/${id}/comment`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text }),
    });
    return handleResponse(res);
  },
};
