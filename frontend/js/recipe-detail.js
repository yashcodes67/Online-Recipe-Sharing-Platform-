// js/recipe-detail.js
// Recipe detail page: render, rate, comment, delete, real-time updates

document.addEventListener('DOMContentLoaded', async () => {

  const recipeId = Utils.getParam('id');
  if (!recipeId) { showError(); return; }

  // ── DOM refs ─────────────────────────────────────────
  const loadingState = document.getElementById('loadingState');
  const errorState   = document.getElementById('errorState');
  const detail       = document.getElementById('recipeDetail');

  // ── Auth navbar ───────────────────────────────────────
  setupNavbar();

  // ── Socket.IO real-time ───────────────────────────────
  let socket;
  try {
   socket = io('https://recipe-backend-z4a6.onrender.com');
    socket.emit('join:recipe', recipeId);

    socket.on('recipe:rated', (data) => {
      if (data.recipeId === recipeId) {
        document.getElementById('avgRatingNum').textContent = data.averageRating.toFixed(1);
        document.getElementById('avgStars').innerHTML = Utils.renderStars(data.averageRating);
        document.getElementById('avgCount').textContent = `${data.ratingCount} rating${data.ratingCount !== 1 ? 's' : ''}`;
        document.getElementById('recipeRating').textContent = data.averageRating.toFixed(1) + ' ★';
        document.getElementById('recipeRatingCount').textContent = data.ratingCount;
      }
    });

    socket.on('recipe:commented', (data) => {
      if (data.recipeId === recipeId) {
        prependComment(data.comment);
        const countEl = document.getElementById('recipeCommentCount');
        countEl.textContent = parseInt(countEl.textContent || 0) + 1;
      }
    });

    socket.on('recipe:deleted', (data) => {
      if (data._id === recipeId) {
        Utils.showToast('This recipe was deleted by its author.', 'warning');
        setTimeout(() => window.location.href = 'recipes.html', 2000);
      }
    });
  } catch (e) { /* socket not critical */ }

  // ── Load recipe ───────────────────────────────────────
  let recipe;
  try {
    const data = await RecipeAPI.getById(recipeId);
    recipe = data.recipe;
    renderRecipe(recipe);
  } catch (err) {
    showError();
    return;
  }

  // ── Render ────────────────────────────────────────────
  function renderRecipe(r) {
    document.title = `${r.title} — RecipeBook`;

    // Hero image
    const hero = document.getElementById('recipeHero');if (r.image) {
  const img = document.getElementById('recipeHeroImg');
  img.src = r.image + '?t=' + Date.now();
  img.alt = r.title || 'Recipe image';
  img.style.display = 'block';
} else {
  document.getElementById('recipeHeroImg').style.display = 'none';
}
    // Category & difficulty
    const catColors = {
      Veg:'#4caf50','Non-Veg':'#f44336',Vegan:'#8bc34a',
      Dessert:'#e91e63',Breakfast:'#ff9800',Snack:'#9c27b0',
      Beverage:'#00bcd4',Other:'#607d8b'
    };
    const catEl = document.getElementById('recipeCategory');
    catEl.textContent = r.category;
    catEl.style.background = catColors[r.category] || '#607d8b';

    const diffEl = document.getElementById('recipeDifficulty');
    diffEl.textContent = r.difficulty;
    diffEl.className = `recipe-tag diff-${r.difficulty?.toLowerCase()}`;

    document.getElementById('recipeDate').textContent = `Added ${Utils.formatDate(r.createdAt)}`;
    document.getElementById('recipeTitle').textContent = r.title;
    document.getElementById('recipeDesc').textContent = r.description;

    // Author
    const author = r.author || {};
    const authorName = author.username || r.authorName || 'Chef';
    document.getElementById('authorAvatar').textContent = authorName[0].toUpperCase();
    const authorLink = document.getElementById('authorLink');
    authorLink.textContent = authorName;
    authorLink.href = `profile.html?id=${author._id || ''}`;

    // Owner actions
    const user = Auth.getUser();
    if (user && (user._id === (author._id || '') || user._id === r.author?._id)) {
      const oa = document.getElementById('ownerActions');
      oa.style.display = 'flex';
      document.getElementById('editRecipeBtn').href = `add-recipe.html?edit=${r._id}`;
    }

    // Stats
    if (r.cookTime) {
      document.getElementById('statTime').style.display = '';
      document.getElementById('recipeTime').textContent = `${r.cookTime} min`;
    }
    if (r.servings) {
      document.getElementById('statServings').style.display = '';
      document.getElementById('recipeServings').textContent = `${r.servings} servings`;
    }
    updateRatingDisplay(r.averageRating, r.ratingCount);
    document.getElementById('recipeCommentCount').textContent = r.comments?.length || 0;

    // Ingredients
    const ingList = document.getElementById('ingredientsList');
    ingList.innerHTML = '';
    (r.ingredients || []).forEach(ing => {
      const li = document.createElement('li');
      li.textContent = ing;
      ingList.appendChild(li);
    });

    // Steps
    const stepsList = document.getElementById('stepsList');
    stepsList.innerHTML = '';
    (r.steps || []).forEach((step, i) => {
      const li = document.createElement('li');
      li.className = 'step-item';
      li.innerHTML = `
        <div class="step-number">${i + 1}</div>
        <p class="step-text">${Utils.escapeHtml(step)}</p>
      `;
      stepsList.appendChild(li);
    });

    // Rating UI
    renderRatingSection(r);

    // Comments
    renderComments(r.comments || []);

    // Show detail, hide loading
    loadingState.classList.add('hidden');
    detail.classList.remove('hidden');
    detail.classList.add('fade-in');
  }

  function updateRatingDisplay(avg, count) {
    document.getElementById('avgRatingNum').textContent = avg > 0 ? avg.toFixed(1) : '—';
    document.getElementById('avgStars').innerHTML = Utils.renderStars(avg);
    document.getElementById('avgCount').textContent = count > 0
      ? `${count} rating${count !== 1 ? 's' : ''}` : 'No ratings yet';
    document.getElementById('recipeRating').textContent = avg > 0 ? `${avg.toFixed(1)} ★` : '—';
    document.getElementById('recipeRatingCount').textContent = count;
  }

  // ── Rating ────────────────────────────────────────────
  function renderRatingSection(r) {
    const user = Auth.getUser();
    const starContainer = document.getElementById('starContainer');
    const rateLoginMsg  = document.getElementById('rateLoginMsg');
    const commentInput  = document.getElementById('commentInput');
    const commentLoginMsg = document.getElementById('commentLoginMsg');

    if (!user) {
      rateLoginMsg.classList.remove('hidden');
      starContainer.style.display = 'none';
      document.getElementById('rateLoginLink').addEventListener('click', (e) => {
        e.preventDefault(); Utils.showToast('Please log in to rate recipes', 'info');
      });
      // Comments
      if (commentInput) commentInput.disabled = true;
      commentLoginMsg.classList.remove('hidden');
      return;
    }

    // Check if own recipe
    const authorId = r.author?._id || r.author;
    if (authorId && authorId.toString() === user._id.toString()) {
      document.getElementById('rateLabel').textContent = "You can't rate your own recipe";
      document.getElementById('rateLabel').style.color = 'var(--text-muted)';
      return;
    }

    // Interactive stars
    const stars = Utils.renderInteractiveStars(r.userRating || 0, async (value) => {
      try {
        const result = await RecipeAPI.rate(recipeId, value);
        updateRatingDisplay(result.averageRating, result.ratingCount);
        Utils.showToast(`You rated this recipe ${value} star${value !== 1 ? 's' : ''}! ⭐`, 'success');
      } catch (err) {
        Utils.showToast(err.message, 'error');
      }
    });
    starContainer.appendChild(stars);
    if (r.userRating) {
      document.getElementById('rateLabel').textContent = `Your rating: ${r.userRating} star${r.userRating !== 1 ? 's' : ''} (click to update)`;
    }
  }

  // ── Comments ──────────────────────────────────────────
  function renderComments(comments) {
    const list = document.getElementById('commentsList');
    const countLabel = document.getElementById('commentCountLabel');
    list.innerHTML = '';
    countLabel.textContent = `${comments.length} comment${comments.length !== 1 ? 's' : ''}`;

    if (comments.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted);font-size:.9rem;text-align:center;padding:24px 0;">No comments yet. Be the first!</p>';
      return;
    }

    // Newest first
    [...comments].reverse().forEach(c => appendComment(c, list));
  }

  function appendComment(c, container) {
    const div = document.createElement('div');
    div.className = 'comment-item fade-in';
    div.innerHTML = `
      <div class="comment-header">
        <span class="comment-author">
          <span class="author-avatar" style="width:26px;height:26px;font-size:.72rem;">${c.username[0].toUpperCase()}</span>
          ${Utils.escapeHtml(c.username)}
        </span>
        <span class="comment-date">${Utils.formatDate(c.createdAt)}</span>
      </div>
      <p class="comment-text">${Utils.escapeHtml(c.text)}</p>
    `;
    if (container) container.appendChild(div);
    return div;
  }

  function prependComment(c) {
    const list = document.getElementById('commentsList');
    // Remove "no comments" placeholder
    const placeholder = list.querySelector('p');
    if (placeholder) placeholder.remove();

    const div = appendComment(c, null);
    list.insertBefore(div, list.firstChild);

    // Update count label
    const current = parseInt(document.getElementById('recipeCommentCount').textContent) || 0;
    document.getElementById('commentCountLabel').textContent =
      `${current + 1} comment${current + 1 !== 1 ? 's' : ''}`;
  }

  // Comment submit
  document.getElementById('commentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!Auth.isLoggedIn()) { Utils.showToast('Please log in to comment', 'info'); return; }

    const input = document.getElementById('commentInput');
    const btn   = document.getElementById('commentSubmit');
    const text  = input.value.trim();

    if (!text) return;

    Utils.setButtonLoading(btn, true, 'Post');
    try {
      await RecipeAPI.comment(recipeId, text);
      input.value = '';
      Utils.showToast('Comment posted! 💬', 'success');
    } catch (err) {
      Utils.showToast(err.message, 'error');
    } finally {
      Utils.setButtonLoading(btn, false, 'Post');
    }
  });

  // ── Delete ────────────────────────────────────────────
  document.getElementById('deleteRecipeBtn')?.addEventListener('click', () => {
    document.getElementById('deleteModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  });

  document.getElementById('deleteModalClose')?.addEventListener('click', closeDeleteModal);
  document.getElementById('deleteCancelBtn')?.addEventListener('click', closeDeleteModal);
  document.getElementById('deleteModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'deleteModal') closeDeleteModal();
  });

  document.getElementById('deleteConfirmBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('deleteConfirmBtn');
    Utils.setButtonLoading(btn, true, 'Yes, Delete');
    try {
      await RecipeAPI.delete(recipeId);
      closeDeleteModal();
      Utils.showToast('Recipe deleted successfully', 'success');
      setTimeout(() => window.location.href = 'recipes.html', 1200);
    } catch (err) {
      Utils.showToast(err.message, 'error');
      Utils.setButtonLoading(btn, false, 'Yes, Delete');
    }
  });

  function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    document.body.style.overflow = '';
  }

  // ── Helpers ───────────────────────────────────────────
  function showError() {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.remove('hidden');
  }

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
  }

});
