// js/index.js
// Home page: loads recipes, handles search, filters, auth modal, pagination

document.addEventListener('DOMContentLoaded', () => {

  // ── State ─────────────────────────────────────────────
  let currentPage = 1;
  let currentCategory = 'All';
  let currentSort = '';
  let totalPages = 1;
  let isSearchMode = false;
  let searchQuery = '';

  // ── DOM Refs ──────────────────────────────────────────
  const grid        = document.getElementById('recipesGrid');
  const emptyState  = document.getElementById('emptyState');
  const pagination  = document.getElementById('pagination');
  const filterPills = document.getElementById('filterPills');
  const sortSelect  = document.getElementById('sortSelect');
  const statRecipes = document.getElementById('statRecipes');

  // Navbar
  const loginBtn    = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const logoutBtn   = document.getElementById('logoutBtn');
  const navUsername = document.getElementById('navUsername');
  const navAvatar   = document.getElementById('navAvatar');
  const hamburger   = document.getElementById('hamburger');
  const navLinks    = document.getElementById('navLinks');

  // Auth modal
  const authModal      = document.getElementById('authModal');
  const authModalClose = document.getElementById('authModalClose');
  const authModalTitle = document.getElementById('authModalTitle');
  const loginForm      = document.getElementById('loginForm');
  const registerForm   = document.getElementById('registerForm');
  const loginPanel     = document.getElementById('loginPanel');
  const registerPanel  = document.getElementById('registerPanel');
  const authTabs       = document.querySelectorAll('.auth-tab');

  // Hero
  const heroSearchForm = document.getElementById('heroSearchForm');
  const heroSearch     = document.getElementById('heroSearch');
  const heroAddBtn     = document.getElementById('heroAddBtn');

  // ── Init ──────────────────────────────────────────────
  updateAuthUI();
  loadRecipes();

  if (new URLSearchParams(window.location.search).get('login') === 'true') {
  openAuthModal('login');
}

  // ── Auth UI ───────────────────────────────────────────
  function updateAuthUI() {
    const user = Auth.getUser();
    document.querySelectorAll('.nav-guest').forEach(el => el.style.display = user ? 'none' : '');
    document.querySelectorAll('.nav-auth').forEach(el => el.style.display = user ? '' : 'none');
    if (user) {
      if (navUsername) navUsername.textContent = user.username;
      if (navAvatar) navAvatar.textContent = user.username[0].toUpperCase();
      const avatarLink = document.querySelector('.nav-avatar-link');
      if (avatarLink) avatarLink.href = `profile.html?id=${user._id}`;
    }
  }

  // ── Navbar Events ─────────────────────────────────────
  loginBtn?.addEventListener('click', () => openAuthModal('login'));
  registerBtn?.addEventListener('click', () => openAuthModal('register'));
  logoutBtn?.addEventListener('click', () => { Auth.logout(); updateAuthUI(); });
  hamburger?.addEventListener('click', () => navLinks.classList.toggle('open'));

  heroAddBtn?.addEventListener('click', (e) => {
    if (!Auth.isLoggedIn()) { e.preventDefault(); openAuthModal('register'); }
  });

  // ── Auth Modal ────────────────────────────────────────
  function openAuthModal(tab = 'login') {
    authModal.classList.remove('hidden');
    switchAuthTab(tab);
    document.body.style.overflow = 'hidden';
  }

  function closeAuthModal() {
    authModal.classList.add('hidden');
    document.body.style.overflow = '';
    loginForm.reset(); registerForm.reset();
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('registerError').style.display = 'none';
    Utils.clearAllErrors(loginForm);
    Utils.clearAllErrors(registerForm);
  }

  function switchAuthTab(tab) {
    const isLogin = tab === 'login';
    authModalTitle.textContent = isLogin ? 'Welcome Back' : 'Create Account';
    authTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    loginPanel.classList.toggle('active', isLogin);
    registerPanel.classList.toggle('active', !isLogin);
  }

  authModalClose?.addEventListener('click', closeAuthModal);
  authModal?.addEventListener('click', (e) => { if (e.target === authModal) closeAuthModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAuthModal(); });

  authTabs.forEach(tab => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
  });

  document.querySelectorAll('.auth-tab-switch').forEach(btn => {
    btn.addEventListener('click', () => switchAuthTab(btn.dataset.to));
  });

  // Login submit
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('loginError');
    const btn = document.getElementById('loginSubmit');

    errEl.style.display = 'none';
    Utils.setButtonLoading(btn, true, 'Login');

    try {
      await Auth.login(email, password);
      closeAuthModal();
      updateAuthUI();
      Utils.showToast('Welcome back! 👋', 'success');
      loadRecipes();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    } finally {
      Utils.setButtonLoading(btn, false, 'Login');
    }
  });

  // Register submit
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const bio      = document.getElementById('regBio').value.trim();
    const errEl    = document.getElementById('registerError');
    const btn      = document.getElementById('registerSubmit');

    errEl.style.display = 'none';

    // Client-side validation
    if (username.length < 3) {
      errEl.textContent = 'Username must be at least 3 characters'; errEl.style.display = 'block'; return;
    }
    if (password.length < 6) {
      errEl.textContent = 'Password must be at least 6 characters'; errEl.style.display = 'block'; return;
    }

    Utils.setButtonLoading(btn, true, 'Create Account');

    try {
      await Auth.register(username, email, password, bio);
      closeAuthModal();
      updateAuthUI();
      Utils.showToast('Account created! Welcome aboard 🎉', 'success');
      loadRecipes();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    } finally {
      Utils.setButtonLoading(btn, false, 'Create Account');
    }
  });

  // ── Filters & Sort ────────────────────────────────────
  filterPills?.addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentCategory = pill.dataset.cat;
    currentPage = 1;
    isSearchMode = false;
    heroSearch.value = '';
    loadRecipes();
  });

  sortSelect?.addEventListener('change', () => {
    currentSort = sortSelect.value;
    currentPage = 1;
    loadRecipes();
  });

  // ── Search ────────────────────────────────────────────
  heroSearchForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    searchQuery = heroSearch.value.trim();
    if (!searchQuery) return;
    isSearchMode = true;
    currentPage = 1;
    loadRecipes();
  });

  // ── Load Recipes ──────────────────────────────────────
  async function loadRecipes() {
    // Show skeletons
    grid.innerHTML = '';
    Utils.createSkeletonCards(6).forEach(s => grid.appendChild(s));
    emptyState.classList.add('hidden');
    pagination.innerHTML = '';

    try {
      let data;
      if (isSearchMode && searchQuery) {
        data = await RecipeAPI.search(searchQuery, currentCategory);
        data.pagination = { page: 1, pages: 1, total: data.total };
      } else {
        data = await RecipeAPI.getAll(currentPage, 12, currentCategory, currentSort);
      }

      grid.innerHTML = '';

      if (!data.recipes || data.recipes.length === 0) {
        emptyState.classList.remove('hidden');
        if (statRecipes) statRecipes.textContent = '0';
        return;
      }

      data.recipes.forEach(recipe => {
        grid.appendChild(Utils.createRecipeCard(recipe));
      });

      // Update stats
      if (statRecipes && data.pagination) {
        statRecipes.textContent = data.pagination.total || data.recipes.length;
      }

      // Pagination
      if (data.pagination && data.pagination.pages > 1) {
        totalPages = data.pagination.pages;
        renderPagination(data.pagination.page, data.pagination.pages);
      }

    } catch (err) {
      grid.innerHTML = '';
      emptyState.classList.remove('hidden');
      emptyState.querySelector('p').textContent = 'Failed to load recipes. Is the server running?';
      console.error('Load recipes error:', err);
    }
  }

  // ── Pagination ────────────────────────────────────────
  function renderPagination(page, pages) {
    pagination.innerHTML = '';

    const prev = document.createElement('button');
    prev.className = 'page-btn';
    prev.textContent = '‹';
    prev.disabled = page === 1;
    prev.addEventListener('click', () => { currentPage = page - 1; loadRecipes(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    pagination.appendChild(prev);

    const start = Math.max(1, page - 2);
    const end = Math.min(pages, page + 2);

    for (let i = start; i <= end; i++) {
      const btn = document.createElement('button');
      btn.className = `page-btn ${i === page ? 'active' : ''}`;
      btn.textContent = i;
      btn.addEventListener('click', () => { currentPage = i; loadRecipes(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
      pagination.appendChild(btn);
    }

    const next = document.createElement('button');
    next.className = 'page-btn';
    next.textContent = '›';
    next.disabled = page === pages;
    next.addEventListener('click', () => { currentPage = page + 1; loadRecipes(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    pagination.appendChild(next);
  }

  // ── Real-time Updates (Socket.IO) ─────────────────────
  if (window.io) {
    const socket = io('https://recipe-backend-z4a6.onrender.com');
    socket.on('recipe:created', () => {
      if (currentPage === 1 && !isSearchMode) {
        Utils.showToast('A new recipe was just added! 🍽', 'info');
        loadRecipes();
      }
    });
    socket.on('recipe:deleted', () => {
      if (currentPage === 1 && !isSearchMode) loadRecipes();
    });
  }

});
