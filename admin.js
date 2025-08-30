// ==================================================================
// ARQUIVO admin.js (VERSÃO FINAL E COMPLETA)
// ==================================================================

// --- LÓGICA DE PROTEÇÃO (EXECUTADA IMEDIATAMENTE) ---
(function authenticateAdminPage() {
    function parseJwt(token) { try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; } }
    const token = localStorage.getItem('token');
    let isAdmin = false;
    if (token) {
        const payload = parseJwt(token);
        if (payload && payload.role === 'admin') { isAdmin = true; }
    }
    if (!isAdmin) {
        alert('Acesso negado. Esta área é exclusiva para administradores.');
        window.location.href = 'index.html';
        throw new Error("Acesso não autorizado.");
    }
})();

// --- CÓDIGO PRINCIPAL DO PAINEL DE ADMIN ---
const token = localStorage.getItem('token');
const username = localStorage.getItem('username');
const API_URL = 'https://quiz-api-z4ri.onrender.com'; // ⚠️ VERIFIQUE SUA URL AQUI

document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES DE ELEMENTOS ---
    const themeForm = document.getElementById('theme-form');
    const userForm = document.getElementById('user-form');
    const logoutBtn = document.getElementById('logout-btn');
    const themesTableBody = document.getElementById('themes-table-body');
    const usersTableBody = document.getElementById('users-table-body');
    const reportsTableBody = document.getElementById('reports-table-body');
    const reloadUsersBtn = document.getElementById('reload-users-btn');
    
    // Elementos do Modal de Reset
    const resetModal = document.getElementById('reset-modal');
    const resetForm = document.getElementById('reset-theme-form');
    const cancelResetBtn = document.getElementById('cancel-reset');
    
    // --- CARREGAMENTO INICIAL ---
    loadThemes();
    loadUsers();
    loadReports();
    loadCategories();

    // --- EVENT LISTENERS ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Lógica de logout... (pode adicionar a chamada à API de logout aqui)
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            window.location.href = 'index.html';
        });
    }

    if (reloadUsersBtn) {
        reloadUsersBtn.addEventListener('click', loadUsers);
    }

    const createRootBtn = document.getElementById('create-root-category');
    if (createRootBtn) createRootBtn.addEventListener('click', () => openCreateCategoryModal(null));

    if (themeForm) {
        themeForm.addEventListener('submit', handleThemeFormSubmit);
    }

    if (userForm) {
        userForm.addEventListener('submit', handleUserFormSubmit);
    }
    
    if (cancelResetBtn) {
        cancelResetBtn.addEventListener('click', () => resetModal.style.display = 'none');
    }

    if (resetForm) {
        resetForm.addEventListener('submit', handleResetFormSubmit);
    }
});


// --- FUNÇÕES DE LÓGICA DOS FORMULÁRIOS ---
async function handleThemeFormSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-theme-btn');
    const progressContainer = document.getElementById('upload-progress-container');
    const statusEl = document.getElementById('theme-status');
    const progressBar = document.getElementById('progress-bar-fill');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Processando...';
    progressContainer.style.display = 'block';
    statusEl.textContent = 'Enviando PDF...';
    progressBar.style.width = '20%';

    const formData = new FormData();
    formData.append('themeName', e.target.themeName.value);
    formData.append('questionCount', e.target.questionCount.value);
    formData.append('pdfFile', e.target.pdfFile.files[0]);
    // include selected category id if present
    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect && categorySelect.value) formData.append('categoryId', categorySelect.value);

    try {
        statusEl.textContent = 'Analisando e gerando questões com a IA (pode levar até 30s)...';
        progressBar.style.width = '60%';

        const response = await fetch(`${API_URL}/admin/themes`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        statusEl.textContent = result.message;
        statusEl.style.color = 'var(--success-color)';
        progressBar.style.width = '100%';
        themeForm.reset();
        loadThemes(); // Atualiza a lista de temas
    } catch (error) {
        statusEl.textContent = `Erro: ${error.message}`;
        statusEl.style.color = 'var(--danger-color)';
        progressBar.style.width = '100%';
        progressBar.style.backgroundColor = 'var(--danger-color)';
    } finally {
        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar e Gerar Questões';
            progressContainer.style.display = 'none';
            progressBar.style.width = '0%';
            progressBar.style.backgroundColor = 'var(--primary-color)';
        }, 4000);
    }
}

async function handleUserFormSubmit(e) {
    e.preventDefault();
    const statusEl = document.getElementById('user-status');
    statusEl.textContent = 'Criando usuário...';

    const userData = {
        username: e.target.username.value,
        password: e.target.password.value,
        subscription_expires_at: e.target.subscription.value || null,
    };

    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        
        statusEl.textContent = result.message;
        statusEl.style.color = 'var(--success-color)';
        userForm.reset();
        loadUsers();
    } catch (error) {
        statusEl.textContent = `Erro: ${error.message}`;
        statusEl.style.color = 'var(--danger-color)';
    }
}

async function handleResetFormSubmit(e) {
    e.preventDefault();
    const statusEl = document.getElementById('reset-status');
    statusEl.textContent = 'Resetando questões...';
    
    const themeId = document.getElementById('reset-theme-id').value;
    const formData = new FormData();
    formData.append('questionCount', e.target.questionCount.value);
    formData.append('pdfFile', e.target.pdfFile.files[0]);

    try {
        const response = await fetch(`${API_URL}/admin/themes/${themeId}/reset`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        statusEl.textContent = result.message;
        statusEl.style.color = 'var(--success-color)';
        setTimeout(() => {
            document.getElementById('reset-modal').style.display = 'none';
        }, 2000);

    } catch (error) {
        statusEl.textContent = `Erro: ${error.message}`;
        statusEl.style.color = 'var(--danger-color)';
    }
}

// --- FUNÇÕES DE CARREGAMENTO DE DADOS ---
async function loadThemes() {
    const themesTableBody = document.getElementById('themes-table-body');
    if (!themesTableBody) return;
    try {
        const response = await fetch(`${API_URL}/themes`, { headers: { 'Authorization': `Bearer ${token}` } });
        const themes = await response.json();
        themesTableBody.innerHTML = '';
        themes.forEach(theme => {
            const row = `
                <tr>
                    <td>${theme.id}</td>
                    <td>${theme.name}</td>
                    <td class="actions">
                        <button class="btn-secondary" onclick="openResetModal(${theme.id})">Resetar</button>
                        <button class="btn-delete" onclick="deleteTheme(${theme.id})">Apagar</button>
                    </td>
                </tr>
            `;
            themesTableBody.innerHTML += row;
        });
    } catch (error) { console.error('Erro ao carregar temas:', error); }
}

async function loadUsers() {
    const usersTableBody = document.getElementById('users-table-body');
    if (!usersTableBody) return;
    try {
        const response = await fetch(`${API_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
        const users = await response.json();
        usersTableBody.innerHTML = '';
        users.forEach(user => {
            const activeIcon = user.isActive ? '<span class="status-icon active" title="Online"></span>' : '<span class="status-icon inactive" title="Offline"></span>';
            const expirationDate = user.subscription_expires_at ? new Date(user.subscription_expires_at).toLocaleDateString('pt-BR') : 'N/A';
            const row = `
                <tr>
                    <td>${user.id}</td>
                    <td class="no-break">${user.username}</td>
                    <td>${activeIcon}</td>
                    <td>${expirationDate}</td>
                    <td><button class="btn-delete" onclick="deleteUser(${user.id})">Apagar</button></td>
                </tr>
            `;
            usersTableBody.innerHTML += row;
        });
    } catch (error) { console.error('Erro ao carregar usuários:', error); }
}

async function loadActiveSessions() {
    // Implemente se desejar
}
async function loadReports() {
    // Implemente se desejar
}

// --- FUNÇÕES GLOBAIS DE AÇÃO (para botões onClick) ---
async function deleteTheme(themeId) {
    if (!confirm(`Tem certeza que deseja apagar o tema com ID ${themeId}? Todas as questões associadas serão perdidas.`)) return;
    try {
        const response = await fetch(`${API_URL}/admin/themes/${themeId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        alert(result.message);
        loadThemes();
    } catch (error) { alert(`Erro: ${error.message}`); }
}

async function deleteUser(userId) {
    if (!confirm(`Tem certeza que deseja apagar o usuário com ID ${userId}?`)) return;
    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        alert(result.message);
        loadUsers();
    } catch (error) { alert(`Erro: ${error.message}`); }
}

function openResetModal(themeId) {
    document.getElementById('reset-theme-id').value = themeId;
    document.getElementById('reset-modal').style.display = 'flex';
}

// ---------------- CATEGORIAS ----------------
async function loadCategories() {
    const list = document.getElementById('categories-list');
    if (!list) return;
    list.innerHTML = '<div class="text-gray-500">Carregando categorias...</div>';
    try {
        // Try backend first; fall back to localStorage
        let categories = null;
        try {
            const resp = await fetch(`${API_URL}/admin/categories`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (resp.ok) categories = await resp.json();
        } catch (err) { /* ignore */ }

        if (!categories) {
            const raw = localStorage.getItem('local_categories');
            categories = raw ? JSON.parse(raw) : [];
        }
        renderCategories(list, categories);
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        list.innerHTML = '<div class="text-red-600">Erro ao carregar categorias</div>';
    }
}

function renderCategories(container, categories) {
    container.innerHTML = '';
    if (!categories || categories.length === 0) {
        container.innerHTML = '<div class="text-gray-500">Nenhuma categoria criada.</div>';
        return;
    }
    categories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'category-item';
        const breadcrumb = document.createElement('div');
        breadcrumb.className = 'category-breadcrumb no-break';
        breadcrumb.textContent = `${cat.name}` + (cat.children && cat.children.length ? ` › ${cat.children.map(c=>c.name).join(' • ')}` : '');

        const actions = document.createElement('div');
        actions.className = 'category-actions';
        const addBtn = document.createElement('button');
        addBtn.className = 'btn-small';
        addBtn.textContent = '+';
        addBtn.title = 'Adicionar subcategoria (máx 2 níveis abaixo)';
        addBtn.addEventListener('click', () => openCreateCategoryModal(cat.id));

        const delBtn = document.createElement('button');
        delBtn.className = 'btn-small';
        delBtn.textContent = 'Apagar';
        delBtn.addEventListener('click', () => deleteCategory(cat.id));

        actions.appendChild(addBtn);
        actions.appendChild(delBtn);

        div.appendChild(breadcrumb);
        div.appendChild(actions);
        container.appendChild(div);

        // render children inline (one level deep)
        if (cat.children && cat.children.length) {
            const childList = document.createElement('div');
            childList.style.marginLeft = '12px';
            childList.style.marginTop = '8px';
            cat.children.forEach(child => {
                const childDiv = document.createElement('div');
                childDiv.className = 'category-item';
                childDiv.style.background = 'transparent';
                childDiv.style.border = '1px dashed rgba(0,0,0,0.04)';
                childDiv.innerHTML = `<div class="category-breadcrumb no-break">${cat.name} › ${child.name}${(child.children && child.children.length)? ' › ' + child.children.map(c=>c.name).join(' • '):''}</div>`;
                const chActions = document.createElement('div');
                chActions.className = 'category-actions';
                const addSub = document.createElement('button');
                addSub.className='btn-small';
                addSub.textContent = '+';
                addSub.title = 'Adicionar sub-subcategoria (nível máximo)';
                addSub.addEventListener('click', () => openCreateCategoryModal(child.id));
                const delCh = document.createElement('button');
                delCh.className='btn-small';
                delCh.textContent='Apagar';
                delCh.addEventListener('click', ()=>deleteCategory(child.id));
                chActions.appendChild(addSub); chActions.appendChild(delCh);
                childDiv.appendChild(chActions);
                childList.appendChild(childDiv);

                // third level omitted in list (kept in breadcrumb only)
            });
            container.appendChild(childList);
        }
    });
}

function openCreateCategoryModal(parentId) {
    const name = prompt(parentId ? 'Nome da nova subcategoria (até 2 níveis abaixo):' : 'Nome da nova categoria:');
    if (!name) return;
    createCategory({ name: name.trim(), parentId });
}

async function createCategory({ name, parentId = null }) {
    // try backend
    try {
        const resp = await fetch(`${API_URL}/admin/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, parentId })
        });
        if (resp.ok) { await loadCategories(); return; }
    } catch (err) { /* continue to fallback */ }

    // fallback to localStorage implementation
    const raw = localStorage.getItem('local_categories');
    const categories = raw ? JSON.parse(raw) : [];

    // helper to find and insert with depth limit
    if (!parentId) {
        categories.push({ id: Date.now(), name, children: [] });
    } else {
        const inserted = insertIntoCategories(categories, parentId, { id: Date.now(), name, children: [] });
        if (!inserted) return alert('Não foi possível inserir: profundidade máxima ou id não encontrado.');
    }
    localStorage.setItem('local_categories', JSON.stringify(categories));
    await loadCategories();
}

function insertIntoCategories(list, targetId, node) {
    for (let item of list) {
        if (item.id === targetId) {
            // only allow up to 2 nested levels (root -> child -> grandchild)
            const depth = computeDepth(item);
            if (depth >= 2) return false;
            item.children = item.children || [];
            item.children.push(node);
            return true;
        }
        if (item.children && item.children.length) {
            const ok = insertIntoCategories(item.children, targetId, node);
            if (ok) return true;
        }
    }
    return false;
}

function computeDepth(node) {
    if (!node || !node.children || node.children.length === 0) return 0;
    return 1 + Math.max(...node.children.map(computeDepth));
}

async function deleteCategory(catId) {
    if (!confirm('Apagar categoria e todas as subcategorias?')) return;
    try {
        const resp = await fetch(`${API_URL}/admin/categories/${catId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (resp.ok) { await loadCategories(); return; }
    } catch (err) { /* fallback below */ }

    // fallback localStorage delete
    const raw = localStorage.getItem('local_categories');
    const categories = raw ? JSON.parse(raw) : [];
    const newList = removeFromCategories(categories, catId);
    localStorage.setItem('local_categories', JSON.stringify(newList));
    await loadCategories();
}

function removeFromCategories(list, targetId) {
    return list.filter(item => item.id !== targetId).map(item => ({ ...item, children: item.children ? removeFromCategories(item.children, targetId) : [] }));
}

// populate the category select in the admin theme form
async function populateCategorySelect() {
    const sel = document.getElementById('categorySelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">Sem categoria</option>';
    try {
        const resp = await fetch(`${API_URL}/categories`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!resp.ok) return;
        const cats = await resp.json();
        // flatten small tree to grouped optgroups
        cats.forEach(root => {
            const opt = document.createElement('option');
            opt.value = root.id;
            opt.textContent = root.name;
            sel.appendChild(opt);
            if (root.children && root.children.length) {
                root.children.forEach(child => {
                    const sub = document.createElement('option');
                    sub.value = child.id;
                    sub.textContent = `  └ ${root.name} › ${child.name}`;
                    sel.appendChild(sub);
                    if (child.children && child.children.length) {
                        child.children.forEach(gc => {
                            const g = document.createElement('option');
                            g.value = gc.id;
                            g.textContent = `    └ ${root.name} › ${child.name} › ${gc.name}`;
                            sel.appendChild(g);
                        });
                    }
                });
            }
        });
    } catch (err) { /* ignore */ }
}