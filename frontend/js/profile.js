// js/profile.js
// User profile page: shows user info and their recipes

document.addEventListener('DOMContentLoaded', async () => {

  const userId = Utils.getParam('id');
  const currentUser = Auth.getUser();

  // Setup navbar
  setupNavbar();

  // If no user ID, redirect to own profile or home
  if (!userId) {
    if (currentUser) {
      window.location.href = `profile.html?id=${currentUser._id}`;
    } else {
      window.location.href = 'index.html';
    }
    return;
  }

  const isOwnProfile = currentUser && currentUser._id === userId;

  // Load profile
  try {
    const API_BASE = 'https://recipe-backend-z4a6.onrender.com/api';
    const token = Auth.getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const [profileRes, recipesRes] = await Promise.all([
      fetch(`${API_BASE}/auth/profile/${userId}`, { headers }),
      fetch(`${API_BASE}/recipes/user/${userId}`, { headers }),
    ]);

    const profileData = await profileRes.json();
    const recipesData = await recipesRes.json();

    if (!profileData.success) {
      showError(); return;
    }

    renderProfile(profileData.user, recipesData.recipes || [], isOwnProfile);

  } catch (err) {
    showError();
    console.error('Profile load error:', err);
  }

  function renderProfile(user, recipes, isOwn) {
    document.title = `${user.username}'s Profile — RecipeBook`;

    // Avatar
    document.getElementById('profileAvatar').textContent = user.username[0].toUpperCase();

    // Info
    document.getElementById('profileUsername').textContent = user.username;
    document.getElementById('profileBio').textContent = user.bio || (isOwn ? 'No bio yet — add one!' : 'No bio provided.');
    document.getElementById('profileRecipeCount').textContent = recipes.length;
    document.getElementById('profileJoined').textContent = Utils.formatDate(user.createdAt).split(',')[1]?.trim() || Utils.formatDate(user.createdAt);

    if (isOwn) {
      document.getElementById('ownProfileActions').style.display = 'block';
    }

    // Recipes section
    document.getElementById('recipesHeading').textContent = isOwn
      ? `Your Recipes (${recipes.length})`
      : `${user.username}'s Recipes (${recipes.length})`;

    const grid = document.getElementById('userRecipesGrid');
    const noRecipes = document.getElementById('noRecipes');

    if (recipes.length === 0) {
      grid.style.display = 'none';
      noRecipes.classList.remove('hidden');
      if (isOwn) {
        document.getElementById('noRecipesTitle').textContent = "You haven't shared any recipes yet";
        document.getElementById('noRecipesMsg').textContent = 'Share your first recipe with the community!';
        document.getElementById('ownNoRecipes').style.display = 'block';
      }
    } else {
      recipes.forEach(r => {
        const card = Utils.createRecipeCard(r);
        // Add edit button for own recipes
        if (isOwn) {
          const footer = card.querySelector('.card-footer');
          if (footer) {
            const editBtn = document.createElement('a');
            editBtn.href  = `add-recipe.html?edit=${r._id}`;
            editBtn.className = 'btn btn-outline btn-sm';
            editBtn.style.fontSize = '.78rem';
            editBtn.textContent = '✏️ Edit';
            editBtn.addEventListener('click', e => e.stopPropagation());
            footer.appendChild(editBtn);
          }
        }
        grid.appendChild(card);
      });
    }

    // Show content
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('profileContent').classList.remove('hidden');
  }

  function showError() {
    document.getElementById('loadingState').style.display = 'none';
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
    document.getElementById('loginBtn')?.addEventListener('click', () => window.location.href = 'index.html');
  }

});
