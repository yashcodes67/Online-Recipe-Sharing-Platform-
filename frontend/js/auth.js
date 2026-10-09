// js/auth.js
// Manages authentication state, login/logout, token storage

const API_BASE = 'https://recipe-backend-z4a6.onrender.com/api';

const Auth = (() => {
  let currentUser = null;

  // ── Getters ──────────────────────────────────────────────

  const getToken = () => localStorage.getItem('token');

  const getUser = () => {
    if (currentUser) return currentUser;
    const stored = localStorage.getItem('user');
    if (stored) {
      try { currentUser = JSON.parse(stored); } catch { currentUser = null; }
    }
    return currentUser;
  };

  const isLoggedIn = () => !!getToken() && !!getUser();

  // ── Auth Actions ─────────────────────────────────────────

  const saveSession = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    currentUser = user;
    updateNavbar();
    dispatchAuthEvent('login', user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    updateNavbar();
    dispatchAuthEvent('logout', null);
    window.location.href = 'index.html';
  };

  // ── API Calls ─────────────────────────────────────────────

  const headers = (isForm = false) => {
    const h = {};
    if (!isForm) h['Content-Type'] = 'application/json';
    const t = getToken();
    if (t) h['Authorization'] = `Bearer ${t}`;
    return h;
  };

  const register = async (username, email, password, bio = '') => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ username, email, password, bio }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    saveSession(data.token, data.user);
    return data;
  };

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    saveSession(data.token, data.user);
    return data;
  };

  const refreshUser = async () => {
    if (!getToken()) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { headers: headers() });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        currentUser = data.user;
        return data.user;
      }
    } catch { /* network error, keep existing */ }
    return getUser();
  };

  // ── UI Updates ────────────────────────────────────────────

  const updateNavbar = () => {
    const user = getUser();
    const guestLinks = document.querySelectorAll('.nav-guest');
    const authLinks = document.querySelectorAll('.nav-auth');
    const userDisplays = document.querySelectorAll('.nav-username');
    const avatarLinks = document.querySelectorAll('.nav-avatar-link');

    guestLinks.forEach(el => el.style.display = user ? 'none' : '');
    authLinks.forEach(el => el.style.display = user ? '' : 'none');
    userDisplays.forEach(el => { el.textContent = user ? user.username : ''; });
    avatarLinks.forEach(el => {
      if (user) el.href = `profile.html?id=${user._id}`;
    });
  };

  const dispatchAuthEvent = (type, user) => {
    document.dispatchEvent(new CustomEvent('auth:change', { detail: { type, user } }));
  };

  // ── Redirect Helpers ──────────────────────────────────────

  const requireAuth = (redirectTo = 'index.html') => {
    if (!isLoggedIn()) {
      sessionStorage.setItem('redirectAfterLogin', window.location.href);
      window.location.href = redirectTo;
      return false;
    }
    return true;
  };

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
  });

  return {
    getToken, getUser, isLoggedIn,
    register, login, logout, refreshUser,
    updateNavbar, requireAuth, headers,
  };
})();

window.Auth = Auth;
