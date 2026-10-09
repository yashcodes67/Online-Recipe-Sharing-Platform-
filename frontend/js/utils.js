// js/utils.js
// Shared UI utility functions used across all pages

const Utils = (() => {

  // ── Toast Notifications ───────────────────────────────────

  const showToast = (message, type = 'success', duration = 3500) => {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-show'));

    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  };

  const createToastContainer = () => {
    const el = document.createElement('div');
    el.id = 'toast-container';
    document.body.appendChild(el);
    return el;
  };

  // ── Loading Overlay ───────────────────────────────────────

  const showLoading = (message = 'Loading...') => {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.innerHTML = `
        <div class="loading-box">
          <div class="spinner"></div>
          <p class="loading-text">${message}</p>
        </div>
      `;
      document.body.appendChild(overlay);
    } else {
      overlay.querySelector('.loading-text').textContent = message;
    }
    overlay.style.display = 'flex';
  };

  const hideLoading = () => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
  };

  // ── Star Rendering ────────────────────────────────────────

  const renderStars = (rating, max = 5) => {
    const filled = Math.round(rating);
    return Array.from({ length: max }, (_, i) =>
      `<span class="star ${i < filled ? 'star-filled' : 'star-empty'}">★</span>`
    ).join('');
  };

  const renderInteractiveStars = (currentRating = 0, onRate) => {
    const container = document.createElement('div');
    container.className = 'star-rating-interactive';

    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('span');
      star.className = `star-btn ${i <= currentRating ? 'active' : ''}`;
      star.textContent = '★';
      star.dataset.value = i;

      star.addEventListener('mouseenter', () => {
        container.querySelectorAll('.star-btn').forEach((s, idx) => {
          s.classList.toggle('hover', idx < i);
        });
      });

      star.addEventListener('mouseleave', () => {
        container.querySelectorAll('.star-btn').forEach(s => s.classList.remove('hover'));
      });

      star.addEventListener('click', () => {
        container.querySelectorAll('.star-btn').forEach((s, idx) => {
          s.classList.toggle('active', idx < i);
        });
        if (onRate) onRate(i);
      });

      container.appendChild(star);
    }

    return container;
  };

  // ── Recipe Card ───────────────────────────────────────────

  const createRecipeCard = (recipe) => {
    const card = document.createElement('article');
    card.className = 'recipe-card';
    card.dataset.id = recipe._id;

    const imgSrc = recipe.image
  ? recipe.image
  : `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=250&fit=crop`;

    const categoryColors = {
      Veg: '#4caf50', 'Non-Veg': '#f44336', Vegan: '#8bc34a',
      Dessert: '#e91e63', Breakfast: '#ff9800', Snack: '#9c27b0',
      Beverage: '#00bcd4', Other: '#607d8b',
    };
    const catColor = categoryColors[recipe.category] || '#607d8b';

    card.innerHTML = `
      <div class="card-image-wrap">
        <img src="${imgSrc}" alt="${escapeHtml(recipe.title)}" class="card-image" loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=250&fit=crop'">
        <span class="card-category" style="background:${catColor}">${recipe.category}</span>
        ${recipe.difficulty ? `<span class="card-difficulty diff-${recipe.difficulty.toLowerCase()}">${recipe.difficulty}</span>` : ''}
      </div>
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(recipe.title)}</h3>
        <p class="card-desc">${escapeHtml(recipe.description.substring(0, 90))}${recipe.description.length > 90 ? '…' : ''}</p>
        <div class="card-meta">
          <div class="card-rating">
            ${renderStars(recipe.averageRating)}
            <span class="rating-value">${recipe.averageRating > 0 ? recipe.averageRating.toFixed(1) : 'New'}</span>
            <span class="rating-count">${recipe.ratingCount > 0 ? `(${recipe.ratingCount})` : ''}</span>
          </div>
          <div class="card-info">
            ${recipe.cookTime ? `<span class="info-pill">⏱ ${recipe.cookTime}m</span>` : ''}
            ${recipe.servings ? `<span class="info-pill">👥 ${recipe.servings}</span>` : ''}
          </div>
        </div>
        <div class="card-footer">
          <span class="card-author">
            <span class="author-avatar">${(recipe.authorName || recipe.author?.username || '?')[0].toUpperCase()}</span>
            ${escapeHtml(recipe.authorName || recipe.author?.username || 'Chef')}
          </span>
          <a href="recipe.html?id=${recipe._id}" class="btn-view">View Recipe →</a>
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (!e.target.closest('a')) {
        window.location.href = `recipe.html?id=${recipe._id}`;
      }
    });

    return card;
  };

  // ── Skeleton Loader ───────────────────────────────────────

  const createSkeletonCards = (count = 6) => {
    return Array.from({ length: count }, () => {
      const el = document.createElement('div');
      el.className = 'recipe-card skeleton-card';
      el.innerHTML = `
        <div class="skeleton skeleton-img"></div>
        <div class="card-body">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text short"></div>
        </div>
      `;
      return el;
    });
  };

  // ── URL / Query Params ────────────────────────────────────

  const getParam = (name) => new URLSearchParams(window.location.search).get(name);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str || ''));
    return div.innerHTML;
  };

  // ── Form Helpers ──────────────────────────────────────────

  const showFieldError = (inputEl, message) => {
    clearFieldError(inputEl);
    inputEl.classList.add('input-error');
    const err = document.createElement('span');
    err.className = 'field-error';
    err.textContent = message;
    inputEl.parentNode.appendChild(err);
  };

  const clearFieldError = (inputEl) => {
    inputEl.classList.remove('input-error');
    const existing = inputEl.parentNode.querySelector('.field-error');
    if (existing) existing.remove();
  };

  const clearAllErrors = (formEl) => {
    formEl.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    formEl.querySelectorAll('.field-error').forEach(el => el.remove());
  };

  const setButtonLoading = (btn, loading, originalText) => {
    btn.disabled = loading;
    btn.textContent = loading ? 'Please wait…' : originalText;
    btn.classList.toggle('btn-loading', loading);
  };

  return {
    showToast, showLoading, hideLoading,
    renderStars, renderInteractiveStars,
    createRecipeCard, createSkeletonCards,
    getParam, formatDate, escapeHtml,
    showFieldError, clearFieldError, clearAllErrors, setButtonLoading,
  };
})();

window.Utils = Utils;
