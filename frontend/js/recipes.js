// js/recipes.js
// Recipe CRUD, search, rating, commenting API helpers

const RECIPE_API_BASE = 'https://recipe-backend-z4a6.onrender.com/api';

const RecipeAPI = (() => {
  const h = (isForm = false) => {
    const headers = {};
    if (!isForm) headers['Content-Type'] = 'application/json';
    const t = localStorage.getItem('token');
    if (t) headers['Authorization'] = `Bearer ${t}`;
    return headers;
  };

  const handle = async (res) => {
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Request failed');
    return data;
  };

  return {
    getAll: async (page = 1, limit = 12, category = '', sort = '') => {
      const p = new URLSearchParams({ page, limit });
      if (category && category !== 'All') p.append('category', category);
      if (sort) p.append('sort', sort);
      return handle(await fetch(`${RECIPE_API_BASE}/recipes?${p}`, { headers: h() }));
    },

    search: async (q, category = '') => {
      const p = new URLSearchParams({ q });
      if (category && category !== 'All') p.append('category', category);
      return handle(await fetch(`${RECIPE_API_BASE}/recipes/search?${p}`, { headers: h() }));
    },

    getById: async (id) => {
      return handle(await fetch(`${RECIPE_API_BASE}/recipes/${id}`, { headers: h() }));
    },

    getUserRecipes: async (userId) => {
      return handle(await fetch(`${RECIPE_API_BASE}/recipes/user/${userId}`, { headers: h() }));
    },

    create: async (formData) => {
      return handle(await fetch(`${RECIPE_API_BASE}/recipes`, {
        method: 'POST', headers: h(true), body: formData,
      }));
    },

    update: async (id, formData) => {
      return handle(await fetch(`${RECIPE_API_BASE}/recipes/${id}`, {
        method: 'PUT', headers: h(true), body: formData,
      }));
    },

    delete: async (id) => {
      return handle(await fetch(`${RECIPE_API_BASE}/recipes/${id}`, {
        method: 'DELETE', headers: h(),
      }));
    },

    rate: async (id, value) => {
      return handle(await fetch(`${RECIPE_API_BASE}/recipes/${id}/rate`, {
        method: 'POST', headers: h(),
        body: JSON.stringify({ value }),
      }));
    },

    comment: async (id, text) => {
      return handle(await fetch(`${RECIPE_API_BASE}/recipes/${id}/comment`, {
        method: 'POST', headers: h(),
        body: JSON.stringify({ text }),
      }));
    },
  };
})();

window.RecipeAPI = RecipeAPI;
