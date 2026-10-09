// js/add-recipe.js
// Handles both create and edit recipe functionality

document.addEventListener('DOMContentLoaded', async () => {

  const editId   = Utils.getParam('edit');
  const isEdit   = !!editId;

  // ── Auth gate ─────────────────────────────────────────
  if (!Auth.isLoggedIn()) {
    document.getElementById('authGate').classList.remove('hidden');
    return;
  }

  // Setup navbar
  const user = Auth.getUser();
  document.querySelectorAll('.nav-auth').forEach(el => el.style.display = '');
  const nu = document.getElementById('navUsername');
  const na = document.getElementById('navAvatar');
  if (nu) nu.textContent = user.username;
  if (na) na.textContent = user.username[0].toUpperCase();
  const al = document.querySelector('.nav-avatar-link');
  if (al) al.href = `profile.html?id=${user._id}`;
  document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.logout());

  // Show form
  document.getElementById('formWrapper').classList.remove('hidden');

  // Set form title
  if (isEdit) {
    document.getElementById('formTitle').textContent = '✏️ Edit Recipe';
    document.getElementById('formSubtitle').textContent = 'Update your recipe details below.';
    document.getElementById('submitBtn').textContent = '💾 Save Changes';
  }

  // ── DOM refs ─────────────────────────────────────────
  const form            = document.getElementById('recipeForm');
  const descTextarea    = document.getElementById('recipeDesc');
  const descCount       = document.getElementById('descCount');
  const ingredientsList = document.getElementById('ingredientsList');
  const stepsList       = document.getElementById('stepsList');
  const addIngBtn       = document.getElementById('addIngredientBtn');
  const addStepBtn      = document.getElementById('addStepBtn');
  const imageInput      = document.getElementById('recipeImage');
  const uploadArea      = document.getElementById('uploadArea');
  const imagePreview    = document.getElementById('imagePreview');
  const uploadPlaceholder = document.getElementById('uploadPlaceholder');
  const formError       = document.getElementById('formError');
  const submitBtn       = document.getElementById('submitBtn');

  // ── Load edit data ─────────────────────────────────────
  if (isEdit) {
    Utils.showLoading('Loading recipe…');
    try {
      const data = await RecipeAPI.getById(editId);
      const r = data.recipe;

      // Verify ownership
      const authorId = r.author?._id || r.author;
      if (authorId.toString() !== user._id.toString()) {
        Utils.hideLoading();
        Utils.showToast('You can only edit your own recipes', 'error');
        setTimeout(() => window.location.href = 'recipes.html', 1500);
        return;
      }

      // Populate form
      document.getElementById('recipeTitle').value     = r.title;
      descTextarea.value                                = r.description;
      descCount.textContent                             = r.description.length;
      document.getElementById('recipeCategory').value  = r.category;
      document.getElementById('recipeDifficulty').value = r.difficulty || 'Medium';
      if (r.cookTime) document.getElementById('recipeCookTime').value = r.cookTime;
      if (r.servings) document.getElementById('recipeServings').value = r.servings;

      // Ingredients
      r.ingredients.forEach(ing => addListItem(ingredientsList, ing, 'Ingredient…'));
      // Steps
      r.steps.forEach(step => addListItem(stepsList, step, 'Step description…'));

      // Existing image
      if (r.image) {
  imagePreview.src = r.image;
  imagePreview.style.display = 'block';
  uploadPlaceholder.style.display = 'none';
}

    } catch (err) {
      Utils.showToast('Failed to load recipe for editing', 'error');
      setTimeout(() => window.location.href = 'recipes.html', 1500);
    } finally {
      Utils.hideLoading();
    }
  } else {
    // Start with 3 ingredient rows and 2 step rows
    for (let i = 0; i < 3; i++) addListItem(ingredientsList, '', 'e.g. 2 cups flour');
    for (let i = 0; i < 2; i++) addListItem(stepsList, '', 'e.g. Preheat oven to 180°C…');
  }

  // ── Dynamic list items ─────────────────────────────────
  function addListItem(container, value = '', placeholder = '') {
    const row = document.createElement('div');
    row.className = 'dynamic-list-item';

    const isStep = container === stepsList;
    const idx = container.children.length + 1;

    if (isStep) {
      const num = document.createElement('div');
      num.className = 'step-number';
      num.style.cssText = 'width:32px;height:32px;font-size:.8rem;flex-shrink:0;align-self:center;';
      num.textContent = idx;
      row.appendChild(num);
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input';
    input.value = value;
    input.placeholder = isStep ? `Step ${idx}: ${placeholder}` : placeholder;
    input.maxLength = isStep ? 500 : 200;
    row.appendChild(input);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item-btn';
    removeBtn.title = 'Remove';
    removeBtn.innerHTML = '×';
    removeBtn.addEventListener('click', () => {
      row.remove();
      renumberItems(container, isStep);
    });
    row.appendChild(removeBtn);

    container.appendChild(row);
    input.focus();
    return input;
  }

  function renumberItems(container, isStep) {
    if (!isStep) return;
    container.querySelectorAll('.step-number').forEach((el, i) => {
      el.textContent = i + 1;
    });
    container.querySelectorAll('.form-input').forEach((el, i) => {
      el.placeholder = `Step ${i + 1}: describe this step…`;
    });
  }

  addIngBtn?.addEventListener('click', () => addListItem(ingredientsList, '', 'e.g. 1 tsp salt'));
  addStepBtn?.addEventListener('click', () => addListItem(stepsList, '', 'describe this step…'));

  // Allow Enter to add next item
  ingredientsList.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addListItem(ingredientsList, '', 'e.g. 1 tsp salt');
    }
  });

  // ── Description counter ────────────────────────────────
  descTextarea?.addEventListener('input', () => {
    descCount.textContent = descTextarea.value.length;
  });

  // ── Image upload ───────────────────────────────────────
  imageInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      Utils.showToast('Image too large. Max 5MB.', 'error');
      imageInput.value = ''; return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      imagePreview.src = ev.target.result;
      imagePreview.style.display = 'block';
      uploadPlaceholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });

  // Drag & drop
  uploadArea?.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
  uploadArea?.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
  uploadArea?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const dt = new DataTransfer();
      dt.items.add(file);
      imageInput.files = dt.files;
      imageInput.dispatchEvent(new Event('change'));
    }
  });

  // ── Form validation ────────────────────────────────────
  function validate() {
    let valid = true;
    formError.style.display = 'none';

    const title = document.getElementById('recipeTitle').value.trim();
    const desc  = descTextarea.value.trim();
    const cat   = document.getElementById('recipeCategory').value;

    if (!title || title.length < 3) {
      Utils.showFieldError(document.getElementById('recipeTitle'), 'Title must be at least 3 characters');
      valid = false;
    } else Utils.clearFieldError(document.getElementById('recipeTitle'));

    if (!desc || desc.length < 10) {
      Utils.showFieldError(descTextarea, 'Description must be at least 10 characters');
      valid = false;
    } else Utils.clearFieldError(descTextarea);

    if (!cat) {
      Utils.showFieldError(document.getElementById('recipeCategory'), 'Please select a category');
      valid = false;
    } else Utils.clearFieldError(document.getElementById('recipeCategory'));

    const ingredients = getListValues(ingredientsList);
    if (ingredients.length === 0) {
      formError.textContent = 'Please add at least one ingredient';
      formError.style.display = 'block';
      valid = false;
    }

    const steps = getListValues(stepsList);
    if (steps.length === 0) {
      formError.textContent = 'Please add at least one step';
      formError.style.display = 'block';
      valid = false;
    }

    return valid;
  }

  function getListValues(container) {
    return Array.from(container.querySelectorAll('.form-input'))
      .map(i => i.value.trim())
      .filter(v => v.length > 0);
  }

  // ── Submit ─────────────────────────────────────────────
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const formData = new FormData();
    formData.append('title',       document.getElementById('recipeTitle').value.trim());
    formData.append('description', descTextarea.value.trim());
    formData.append('category',    document.getElementById('recipeCategory').value);
    formData.append('difficulty',  document.getElementById('recipeDifficulty').value);

    const cookTime = document.getElementById('recipeCookTime').value;
    const servings = document.getElementById('recipeServings').value;
    if (cookTime) formData.append('cookTime', cookTime);
    if (servings) formData.append('servings', servings);

    const ingredients = getListValues(ingredientsList);
    const steps       = getListValues(stepsList);
    formData.append('ingredients', JSON.stringify(ingredients));
    formData.append('steps',       JSON.stringify(steps));

    if (imageInput.files[0]) formData.append('image', imageInput.files[0]);

    Utils.setButtonLoading(submitBtn, true, isEdit ? '💾 Save Changes' : '🍳 Publish Recipe');
    formError.style.display = 'none';

    try {
      let result;
      if (isEdit) {
        result = await RecipeAPI.update(editId, formData);
      } else {
        result = await RecipeAPI.create(formData);
      }

      Utils.showToast(
        isEdit ? 'Recipe updated successfully! 🎉' : 'Recipe published! 🍳',
        'success'
      );
      setTimeout(() => {
        window.location.href = `recipe.html?id=${result.recipe._id}`;
      }, 1000);

    } catch (err) {
      formError.textContent = err.message || 'Failed to save recipe. Please try again.';
      formError.style.display = 'block';
      Utils.setButtonLoading(submitBtn, false, isEdit ? '💾 Save Changes' : '🍳 Publish Recipe');
    }
  });

});
