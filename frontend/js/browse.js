// js/browse.js
// Browse/search page: full recipe listing with filter, sort, pagination

document.addEventListener('DOMContentLoaded', () => {

  let currentPage = 1;
  let currentCategory = 'All';
  let currentSort = '';
  let searchQuery = '';
  let isSearchMode = false;

  const grid        = document.getElementById('recipesGrid');
  const emptyState  = document.getElementById('emptyState');
  const emptyMsg    = document.getElementById('emptyMsg');
  const pagination  = document.getElementById('pagination');
  const resultCount = document.getElementById('resultCount');
  const searchInput = document.getElementById('searchInput');
  const searchForm  = document.getElementById('searchForm');
  const filterPills = document.getElementById('filterPills');
  const sortSelect  = document.getElementById('sortSelect');

  // Navbar auth
  setupNavbar();
  loadRecipes();

  function setupNavbar() {
    const user = Auth.getUser();
    document.querySelectorAll('.nav-guest').forEach(el => el.style.display = user ? 'none' : '');
    document.querySelectorAll('.nav-auth').forEach(el => el.style.display = user ? '' : 'none');
    if (user) {
      const nu = document.getElementById('navUsername');
      const na = document.getElementById('navAvatar');
      if (nu) nu.textContent = user.username;
      if (na) na.textContent = user.username[0].toUpperCase();
      const al = document.querySelector('.nav-avatar-link');
      if (al) al.href = `profile.html?id=${user._id}`;
    }
    document.getElementById('logoutBtn')?.addEventListener('click', () => { Auth.logout(); setupNavbar(); });
    document.getElementById('loginBtn')?.addEventListener('click', () => openAuthModal('login'));
    document.getElementById('registerBtn')?.addEventListener('click', () => openAuthModal('register'));
    document.getElementById('hamburger')?.addEventListener('click', () => {
      document.getElementById('navLinks').classList.toggle('open');
    });
  }

  // ── Search ──────────────────────────────────────────
  searchForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    searchQuery = searchInput.value.trim();
    if (!searchQuery) { isSearchMode = false; } else { isSearchMode = true; }
    currentPage = 1;
    loadRecipes();
  });

  // Clear search on empty input
  searchInput?.addEventListener('input', () => {
    if (!searchInput.value.trim() && isSearchMode) {
      isSearchMode = false; searchQuery = '';
      currentPage = 1; loadRecipes();
    }
  });

  // ── Filters ─────────────────────────────────────────
  filterPills?.addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentCategory = pill.dataset.cat;
    currentPage = 1;
    loadRecipes();
  });

  sortSelect?.addEventListener('change', () => {
    currentSort = sortSelect.value;
    currentPage = 1;
    loadRecipes();
  });

  // ── Load ─────────────────────────────────────────────
  async function loadRecipes() {
    grid.innerHTML = '';
    Utils.createSkeletonCards(8).forEach(s => grid.appendChild(s));
    emptyState.classList.add('hidden');
    pagination.innerHTML = '';
    if (resultCount) resultCount.textContent = '';

    try {
      let data;
      if (isSearchMode && searchQuery) {
        data = await RecipeAPI.search(searchQuery, currentCategory);
        data.pagination = { page: 1, pages: 1, total: data.total || data.recipes.length };
      } else {
        data = await RecipeAPI.getAll(currentPage, 12, currentCategory, currentSort);
      }

      grid.innerHTML = '';

      const total = data.pagination?.total ?? data.recipes?.length ?? 0;
      if (resultCount) resultCount.textContent = `${total} recipe${total !== 1 ? 's' : ''}`;

      if (!data.recipes || data.recipes.length === 0) {
        emptyState.classList.remove('hidden');
        if (emptyMsg) emptyMsg.textContent = isSearchMode
          ? `No results for "${searchQuery}". Try different keywords.`
          : 'No recipes in this category yet. Be the first!';
        return;
      }

      data.recipes.forEach(r => grid.appendChild(Utils.createRecipeCard(r)));

      if (data.pagination?.pages > 1) {
        renderPagination(data.pagination.page, data.pagination.pages);
      }
    } catch (err) {
      grid.innerHTML = '';
      emptyState.classList.remove('hidden');
      if (emptyMsg) emptyMsg.textContent = 'Failed to load. Please check your connection.';
    }
  }

  function renderPagination(page, pages) {
    pagination.innerHTML = '';
    const prev = makePageBtn('‹', page === 1, () => { currentPage = page - 1; loadRecipes(); scrollToTop(); });
    pagination.appendChild(prev);

    for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
      const btn = makePageBtn(i, false, () => { currentPage = i; loadRecipes(); scrollToTop(); });
      if (i === page) btn.classList.add('active');
      pagination.appendChild(btn);
    }

    const next = makePageBtn('›', page === pages, () => { currentPage = page + 1; loadRecipes(); scrollToTop(); });
    pagination.appendChild(next);
  }

  function makePageBtn(label, disabled, onClick) {
    const btn = document.createElement('button');
    btn.className = 'page-btn'; btn.textContent = label; btn.disabled = disabled;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

  // ── Auth Modal ────────────────────────────────────────
  function openAuthModal(tab = 'login') {
    document.getElementById('authModal').classList.remove('hidden');
    switchTab(tab);
    document.body.style.overflow = 'hidden';
  }
  function closeAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
    document.body.style.overflow = '';
  }
  function switchTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('authModalTitle').textContent = isLogin ? 'Welcome Back' : 'Create Account';
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('loginPanel').classList.toggle('active', isLogin);
    document.getElementById('registerPanel').classList.toggle('active', !isLogin);
  }

  document.getElementById('authModalClose')?.addEventListener('click', closeAuthModal);
  document.getElementById('authModal')?.addEventListener('click', e => { if (e.target.id === 'authModal') closeAuthModal(); });
  document.querySelectorAll('.auth-tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('loginError');
    const btn = document.getElementById('loginSubmit');
    errEl.style.display = 'none';
    Utils.setButtonLoading(btn, true, 'Login');
    try {
      await Auth.login(document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
      closeAuthModal(); setupNavbar();
      Utils.showToast('Welcome back! 👋', 'success');
    } catch (err) { errEl.textContent = err.message; errEl.style.display = 'block'; }
    finally { Utils.setButtonLoading(btn, false, 'Login'); }
  });

  document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('registerError');
    const btn = document.getElementById('registerSubmit');
    errEl.style.display = 'none';
    Utils.setButtonLoading(btn, true, 'Create Account');
    try {
      await Auth.register(
        document.getElementById('regUsername').value,
        document.getElementById('regEmail').value,
        document.getElementById('regPassword').value
      );
      closeAuthModal(); setupNavbar();
      Utils.showToast('Welcome aboard! 🎉', 'success');
    } catch (err) { errEl.textContent = err.message; errEl.style.display = 'block'; }
    finally { Utils.setButtonLoading(btn, false, 'Create Account'); }
  });

});
