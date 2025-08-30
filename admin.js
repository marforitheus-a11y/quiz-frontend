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

document.addEventListener('DOMContentLoaded', async () => {
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
    await loadCategories();
    // ensure the category select used in the 'Adicionar Tema' form is populated
    await populateCategorySelect();

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
    let chosenCategoryId = categorySelect && categorySelect.value ? categorySelect.value : null;
    // if category is a local entry, try to persist it first
    if (chosenCategoryId && String(chosenCategoryId).startsWith('local-')) {
        const localCat = findLocalCategoryById(chosenCategoryId);
        if (localCat) {
            try {
                const resp = await fetch(`${API_URL}/admin/categories`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ name: localCat.name, parentId: null })
                });
                if (resp.ok) {
                    const created = await resp.json();
                    chosenCategoryId = created.id; // replace with server id
                    // refresh categories on UI
                    await loadCategories();
                } else {
                    // couldn't persist - inform user but proceed without category
                    alert('Não foi possível salvar a categoria no servidor. O tema será enviado sem categoria.');
                    chosenCategoryId = null;
                }
            } catch (err) {
                console.warn('Erro ao persistir categoria local:', err);
                alert('Erro de rede ao salvar a categoria. O tema será enviado sem categoria.');
                chosenCategoryId = null;
            }
        }
    }
    if (chosenCategoryId) formData.append('categoryId', chosenCategoryId);

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
    const container = document.getElementById('themes-by-category');
    if (!container) return;
    try {
        const response = await fetch(`${API_URL}/themes`, { headers: { 'Authorization': `Bearer ${token}` } });
        const themes = await response.json();
        renderThemesByCategory(container, themes);
    } catch (error) { console.error('Erro ao carregar temas:', error); container.innerHTML = '<div class="text-red-600">Erro ao carregar temas.</div>'; }
}

function renderThemesByCategory(container, themes = []) {
    container.innerHTML = '';
    // build a map: categoryId -> { id, name, themes: [] }
    const map = new Map();
    const uncategorizedKey = '__uncategorized__';
    themes.forEach(t => {
        const cid = t.category_id || uncategorizedKey;
        if (!map.has(cid)) map.set(cid, { id: cid, name: (t.category_name || 'Sem categoria'), themes: [] });
        map.get(cid).themes.push(t);
    });

    // Create folder UI for each category
    map.forEach(cat => {
        const folder = document.createElement('div');
        folder.className = 'category-folder';

        const header = document.createElement('div');
        header.className = 'folder-header';
        header.innerHTML = `<div class="folder-title">${cat.name} <span class="folder-count">(${cat.themes.length})</span></div><button class="btn-small folder-toggle">Abrir</button>`;
        folder.appendChild(header);

        const list = document.createElement('div');
        list.className = 'folder-list';
        if (cat.themes.length === 0) list.innerHTML = '<div class="text-gray-500">Nenhum tema nesta categoria.</div>';
        cat.themes.forEach(theme => {
            const item = document.createElement('div');
            item.className = 'folder-item';
            item.innerHTML = `<div class="folder-item-main"><div class="folder-item-name">${theme.name}</div><div class="folder-item-meta">ID: ${theme.id}${theme.description? ' — ' + theme.description : ''}</div></div><div class="folder-item-actions"><button class="btn-secondary" onclick="openResetModal(${theme.id})">Resetar</button><button class="btn-delete" onclick="deleteTheme(${theme.id})">Apagar</button></div>`;
            list.appendChild(item);
        });

        header.querySelector('.folder-toggle').addEventListener('click', () => {
            const isOpen = list.style.display === 'block';
            list.style.display = isOpen ? 'none' : 'block';
            header.querySelector('.folder-toggle').textContent = isOpen ? 'Abrir' : 'Fechar';
        });

        folder.appendChild(list);
        container.appendChild(folder);
    });
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
    // also refresh the admin theme category select so it stays in sync
    try { await populateCategorySelect(); } catch (e) { /* ignore */ }
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
    // fallback to localStorage implementation (mark as local with prefix so we can detect later)
    const raw = localStorage.getItem('local_categories');
    const categories = raw ? JSON.parse(raw) : [];
    const localId = `local-${Date.now()}`;

    // helper to find and insert with depth limit
    if (!parentId) {
        categories.push({ id: localId, name, children: [], __local: true });
    } else {
        const inserted = insertIntoCategories(categories, parentId, { id: localId, name, children: [], __local: true });
        if (!inserted) return alert('Não foi possível inserir: profundidade máxima ou id não encontrado.');
    }
    localStorage.setItem('local_categories', JSON.stringify(categories));
    await loadCategories();
    alert('Categoria criada localmente. Houveram problemas ao salvar no servidor; ao enviar um tema que usar esta categoria, o sistema tentará persistir automaticamente no servidor.');
}

// helper to find a category by id inside local storage (recursive)
function findLocalCategoryById(id) {
    const raw = localStorage.getItem('local_categories');
    if (!raw) return null;
    const categories = JSON.parse(raw);
    function search(list) {
        for (const item of list) {
            if (String(item.id) === String(id)) return item;
            if (item.children && item.children.length) {
                const found = search(item.children);
                if (found) return found;
            }
        }
        return null;
    }
    return search(categories);
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
    let cats = [];
    // Try public endpoint first, then admin endpoint, then localStorage as a last resort
    try {
        const resp = await fetch(`${API_URL}/categories`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (resp.ok) cats = await resp.json();
        else {
            // try admin endpoint as fallback
            const resp2 = await fetch(`${API_URL}/admin/categories`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (resp2.ok) cats = await resp2.json();
        }
    } catch (err) {
        // network/other error - try admin endpoint
        try {
            const resp2 = await fetch(`${API_URL}/admin/categories`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (resp2.ok) cats = await resp2.json();
        } catch (e) { /* ignore */ }
    }

    // fallback to localStorage
    if ((!cats || cats.length === 0)) {
        const raw = localStorage.getItem('local_categories');
        if (raw) cats = JSON.parse(raw);
    }

    if (!cats || cats.length === 0) return;
    // flatten small tree to grouped options
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
}