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
let categoriesCache = [];

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
    // wire category -> subcategory select behavior (populate on change)
    const catSel = document.getElementById('categorySelect');
    const subSel = document.getElementById('subcategorySelect');
    if (catSel) catSel.addEventListener('change', () => populateSubcategorySelect(catSel.value));

    // --- EVENT LISTENERS ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Lógica de logout... (pode adicionar a chamada à API de logout aqui)
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            window.location.href = 'index.html';
        });
    }

    const testApiBtn = document.getElementById('test-api-btn');
    if (testApiBtn) testApiBtn.addEventListener('click', testApi);

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

    // wire server error debug panel
    const serverPanel = document.getElementById('server-error-panel');
    const serverBody = document.getElementById('server-error-body');
    const closeBtn = document.getElementById('close-server-error');
    if (closeBtn && serverPanel) closeBtn.addEventListener('click', () => { serverPanel.style.display = 'none'; serverBody.textContent = ''; });
});

// show server error text/html in the debug panel (visible only when content provided)
function showServerError(text) {
    try {
        const panel = document.getElementById('server-error-panel');
        const body = document.getElementById('server-error-body');
        if (!panel || !body) return;
        body.textContent = text;
        panel.style.display = 'block';
    } catch (e) { console.error('showServerError failed', e); }
}


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
    // include selected category and subcategory id if present
    const categorySelect = document.getElementById('categorySelect');
    let chosenCategoryId = categorySelect && categorySelect.value ? categorySelect.value : null;
    const subcategorySelect = document.getElementById('subcategorySelect');
    let chosenSubcategoryId = subcategorySelect && subcategorySelect.value ? subcategorySelect.value : null;
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
    if (chosenSubcategoryId) formData.append('subcategoryId', chosenSubcategoryId);

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
        if (!response.ok) {
            const txt = await response.text();
            console.error('handleUserFormSubmit failed', response.status, txt);
            let msg = `Erro ao criar usuário (status ${response.status}).`;
            try { const parsed = JSON.parse(txt); if (parsed && parsed.message) msg = parsed.message; } catch(e){}
            throw new Error(msg);
        }
        const result = await response.json();

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
        if (!response.ok) {
            const txt = await response.text();
            console.error('handleResetFormSubmit failed', response.status, txt);
            let msg = `Erro ao resetar tema (status ${response.status}).`;
            try { const parsed = JSON.parse(txt); if (parsed && parsed.message) msg = parsed.message; } catch(e){}
            throw new Error(msg);
        }
        const result = await response.json();

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
        if (!response.ok) {
            const txt = await response.text();
            console.error('loadThemes fetch error:', response.status, txt);
            showServerError(txt);
            container.innerHTML = `<div class="text-red-600">Erro ao carregar temas (status ${response.status}). Veja painel de erro.</div>`;
            return;
        }
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

    // Render each category as a Windows-like folder card containing files
    map.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-folder';
        const header = document.createElement('div');
        header.className = 'folder-header';
        header.innerHTML = `<div class="folder-title">${cat.name} <span class="folder-count">(${cat.themes.length})</span></div>`;
        card.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'folder-grid';

        // create folder icon (represents the category)
        const folderEl = document.createElement('div');
        folderEl.className = 'win-folder';
        folderEl.innerHTML = `<div class="folder-icon" aria-hidden="true">📁</div><div class="folder-label">${cat.name}</div>`;
    folderEl.tabIndex = 0;
    folderEl.setAttribute('role','button');
    folderEl.setAttribute('aria-label', `Categoria ${cat.name}`);
        // clicking the folder toggles open/close of its file list
        folderEl.addEventListener('click', (e) => {
            // on mobile/touch, clicking opens context for the folder
            if (isTouchDevice()) {
                showContextMenuFor('category', cat, e);
                return;
            }
            const list = card.querySelector('.folder-list');
            const isOpen = list.style.display === 'flex' || list.style.display === 'block';
            list.style.display = isOpen ? 'none' : 'flex';
        });
        // right-click shows context menu on desktop
        folderEl.addEventListener('contextmenu', (e) => { e.preventDefault(); showContextMenuFor('category', cat, e); });
    // keyboard open (Enter) and context (Shift+F10 handled globally)
    folderEl.addEventListener('keydown', (ke) => { if (ke.key === 'Enter') { const list = card.querySelector('.folder-list'); list.style.display = (list.style.display === 'flex' || list.style.display === 'block') ? 'none' : 'flex'; } });
        grid.appendChild(folderEl);

        // files for this category
        const list = document.createElement('div');
        list.className = 'folder-list';
        list.style.display = 'none';
        list.style.flexDirection = 'column';
        list.style.width = '100%';
        if (cat.themes.length === 0) list.innerHTML = '<div class="text-gray-500">Nenhum tema nesta categoria.</div>';
        cat.themes.forEach(theme => {
            const file = document.createElement('div');
            file.className = 'win-file';
            file.innerHTML = `<div class="file-icon">📄</div><div class="file-name">${theme.name}<div style="font-size:12px;color:var(--muted)">ID: ${theme.id}</div></div>`;
            file.tabIndex = 0;
            file.setAttribute('role','button');
            file.setAttribute('aria-label', `Tema ${theme.name}`);
            // left click on mobile shows context, on desktop single click selects
            file.addEventListener('click', (e) => {
                if (isTouchDevice()) { showContextMenuFor('theme', theme, e); return; }
                // desktop: single click selects file (visual only)
                document.querySelectorAll('.win-file').forEach(f => f.style.background = '');
                file.style.background = 'rgba(11,110,246,0.04)';
            });
            // double-click opens preview modal on desktop
            file.addEventListener('dblclick', (e) => { if (!isTouchDevice() && window.openThemeModal) window.openThemeModal(theme); });
            // keyboard activation: Enter opens preview, Space opens context menu
            file.addEventListener('keydown', (ke) => { if (ke.key === 'Enter') { if (window.openThemeModal) window.openThemeModal(theme); } if (ke.key === ' ') { ke.preventDefault(); showContextMenuFor('theme', theme, ke); } });
            file.addEventListener('contextmenu', (e) => { e.preventDefault(); showContextMenuFor('theme', theme, e); });
            list.appendChild(file);
        });

        card.appendChild(grid);
        card.appendChild(list);
        container.appendChild(card);
    });
}

// Helper to detect touch devices
function isTouchDevice() { return ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0; }

// Show context menu for either category or theme
function showContextMenuFor(type, obj, event) {
    const menu = document.getElementById('custom-context-menu');
    if (!menu) return;
    menu.innerHTML = '';
    menu.setAttribute('aria-hidden', 'false');
    menu.tabIndex = -1;
    // build items depending on type
    const items = [];
    if (type === 'category') {
        items.push({ label: 'Abrir', action: () => { /* toggle handled by click */ } });
        items.push({ label: 'Atribuir Categoria', action: async () => { alert('Selecione um tema dentro desta pasta para atribuir categoria.'); } });
    }
    if (type === 'theme') {
        items.push({ label: 'Abrir', action: () => { alert('Abrir tema: ' + obj.name); } });
        items.push({ label: 'Atribuir Categoria', action: () => assignCategoryPrompt(obj.id) });
        items.push({ label: 'Resetar', action: () => openResetModal(obj.id) });
        items.push({ label: 'Apagar', action: () => deleteTheme(obj.id) });
    }

    items.forEach(it => {
        const el = document.createElement('div');
        el.className = 'ctx-item';
    el.textContent = it.label;
    el.setAttribute('role', 'menuitem');
    el.tabIndex = 0; // make focusable
    el.addEventListener('click', () => { hideContextMenu(); setTimeout(() => it.action(), 80); });
    // keyboard activation
    el.addEventListener('keydown', (ke) => { if (ke.key === 'Enter' || ke.key === ' ') { ke.preventDefault(); hideContextMenu(); setTimeout(() => it.action(), 80); } });
        menu.appendChild(el);
    });

    // position menu
    const x = (event.clientX || (event.touches && event.touches[0].clientX) || 60) + 4;
    const y = (event.clientY || (event.touches && event.touches[0].clientY) || 60) + 4;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'block';
    // focus first item for keyboard users
    setTimeout(() => {
        const first = menu.querySelector('[role="menuitem"]');
        if (first) first.focus();
    }, 10);
}

function hideContextMenu() { const m = document.getElementById('custom-context-menu'); if (m) m.style.display = 'none'; }

// hide context menu on global click
document.addEventListener('click', (e) => { const menu = document.getElementById('custom-context-menu'); if (!menu) return; if (menu.style.display === 'block') menu.style.display = 'none'; });
document.addEventListener('contextmenu', (e) => { /* allow specific handlers only */ });

// Keyboard: open context menu via ContextMenu key or Shift+F10 when focusing a file/folder
document.addEventListener('keydown', (e) => {
    // 93 = ContextMenu key on some keyboards; fallback to 'ContextMenu' and Shift+F10
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
        const active = document.activeElement;
        if (!active) return;
        // try to find associated file or folder element
        const themeEl = active.closest && active.closest('.win-file');
        const catEl = active.closest && active.closest('.win-folder');
        if (themeEl) {
            e.preventDefault();
            const rect = themeEl.getBoundingClientRect();
            showContextMenuFor('theme', { id: extractIdFromFile(themeEl), name: themeEl.innerText }, { clientX: rect.left + 8, clientY: rect.top + 8 });
        } else if (catEl) {
            e.preventDefault();
            const rect = catEl.getBoundingClientRect();
            showContextMenuFor('category', { id: null, name: catEl.innerText }, { clientX: rect.left + 8, clientY: rect.top + 8 });
        }
    }
});

function extractIdFromFile(fileEl) {
    try {
        const idDiv = fileEl.querySelector('.file-name div');
        if (!idDiv) return null;
        const txt = idDiv.textContent || '';
        const m = txt.match(/ID:\s*(\d+)/);
        if (m) return m[1];
    } catch (e) {}
    return null;
}

async function loadUsers() {
    const usersTableBody = document.getElementById('users-table-body');
    if (!usersTableBody) return;
    try {
        const response = await fetch(`${API_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) {
            const txt = await response.text();
            console.error('loadUsers failed', response.status, txt);
            return;
        }
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
        if (!response.ok) {
            const txt = await response.text();
            console.error('deleteTheme failed', response.status, txt);
            let msg = `Erro ao apagar tema (status ${response.status}).`;
            try { const parsed = JSON.parse(txt); if (parsed && parsed.message) msg = parsed.message; } catch(e){}
            throw new Error(msg);
        }
        const result = await response.json();
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
        // ensure categoriesCache is updated for other UI pieces
        categoriesCache = categories;
        // ensure each root category has the two subcategories we want (local-only auto-create)
        categories.forEach(root => {
            if (!root.children) root.children = [];
            const names = root.children.map(c => c.name);
            if (!names.includes('Conhecimentos Básicos')) root.children.push({ id: `local-sub-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, name: 'Conhecimentos Básicos', children: [], __local:true });
            if (!names.includes('Conhecimentos Específicos')) root.children.push({ id: `local-sub-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, name: 'Conhecimentos Específicos', children: [], __local:true });
        });
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
    breadcrumb.textContent = cat.name;

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

        // render children inline (one level deep) without repeating root name
        if (cat.children && cat.children.length) {
            const childList = document.createElement('div');
            childList.style.marginLeft = '12px';
            childList.style.marginTop = '8px';
            cat.children.forEach(child => {
                const childDiv = document.createElement('div');
                childDiv.className = 'category-item';
                childDiv.style.background = 'transparent';
                childDiv.style.border = '1px dashed rgba(0,0,0,0.04)';
                childDiv.innerHTML = `<div class="category-breadcrumb no-break">${child.name}${(child.children && child.children.length)? ' › ' + child.children.map(c=>c.name).join(' • '):''}</div>`;
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
    // cache for other UI pieces
    categoriesCache = cats;
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
    // reset subcategory select
    try { populateSubcategorySelect(document.getElementById('categorySelect').value); } catch(e){}
}

// Prompt admin to choose from available categories and assign to a theme
async function assignCategoryPrompt(themeId) {
    try {
        // fetch categories (admin endpoint)
        const resp = await fetch(`${API_URL}/admin/categories`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!resp.ok) {
            const text = await resp.text();
            console.error('assignCategoryPrompt: failed to fetch categories', resp.status, text);
            return alert('Não foi possível buscar categorias no servidor.');
        }
        const cats = await resp.json();
        // flatten to list
        const flat = [];
        function walk(list, prefix = '') {
            for (const c of list) {
                flat.push({ id: c.id, name: prefix + c.name });
                if (c.children && c.children.length) walk(c.children, prefix + c.name + ' > ');
            }
        }
        walk(cats);
        flat.unshift({ id: '', name: 'Sem categoria' });
        // build prompt text
        const promptText = flat.map((c,i) => `${i}. ${c.name}`).join('\n');
        const choice = prompt(`Escolha a categoria para o tema (digite o número):\n\n${promptText}`);
        if (choice === null) return;
        const idx = parseInt(choice, 10);
        if (isNaN(idx) || idx < 0 || idx >= flat.length) return alert('Escolha inválida.');
        const chosen = flat[idx];
        const updateResp = await fetch(`${API_URL}/admin/themes/${themeId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ categoryId: chosen.id || null }) });
        if (!updateResp.ok) {
            const text = await updateResp.text();
            console.error('assignCategoryPrompt: update failed', updateResp.status, text);
            showServerError(text);
            let msg = `Erro ao atualizar tema (status ${updateResp.status}).`;
            try { const parsed = JSON.parse(text); if (parsed && parsed.message) msg = parsed.message; } catch(e){}
            throw new Error(msg);
        }
        const result = await updateResp.json();
        alert('Categoria atribuída com sucesso.');
        await loadThemes();
        // close context menu if open
        hideContextMenu();
    } catch (err) {
        console.error('Erro assignCategory:', err);
        alert('Erro ao atribuir categoria. Veja o console para mais detalhes.');
    }
}

// THEME PREVIEW MODAL WIRING
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('theme-modal');
    const body = document.getElementById('theme-modal-body');
    const close = document.getElementById('close-theme-modal');
    const btnAssign = document.getElementById('modal-assign');
    const btnReset = document.getElementById('modal-reset');
    const btnDelete = document.getElementById('modal-delete');
    let currentThemeId = null;

    function openThemeModal(theme) {
        currentThemeId = theme.id;
        if (body) body.textContent = JSON.stringify(theme, null, 2);
        if (modal) { modal.style.display = 'flex'; modal.setAttribute('data-open','true'); }
    }

    if (close) close.addEventListener('click', () => { if (modal) { modal.style.display = 'none'; modal.removeAttribute('data-open'); } });
    if (btnAssign) btnAssign.addEventListener('click', () => { if (currentThemeId) assignCategoryPrompt(currentThemeId); });
    if (btnReset) btnReset.addEventListener('click', () => { if (currentThemeId) openResetModal(currentThemeId); });
    if (btnDelete) btnDelete.addEventListener('click', () => { if (currentThemeId) deleteTheme(currentThemeId); });

    // expose helper to show modal from file click
    window.openThemeModal = openThemeModal;
});

async function testApi() {
    try {
        const resp = await fetch(`${API_URL}/health`);
        if (!resp.ok) {
            const t = await resp.text();
            showServerError(`Status: ${resp.status}\n\n${t}`);
            alert('Health check falhou. Veja painel de erro.');
            return;
        }
        const data = await resp.json();
        showServerError(`Health OK:\n${JSON.stringify(data, null, 2)}`);
        alert('API respondeu com sucesso. Veja painel de erro para detalhes.');
    } catch (err) {
        showServerError(String(err));
        alert('Erro ao contatar API. Veja painel de erro.');
    }
}

// populate subcategory select for a given category id
function populateSubcategorySelect(categoryId) {
    const sel = document.getElementById('subcategorySelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">Sem subcategoria</option>';
    if (!categoryId) return;
    // find category in cache
    const root = categoriesCache && categoriesCache.find(c => String(c.id) === String(categoryId));
    if (!root || !root.children || root.children.length === 0) return;
    root.children.forEach(child => {
        const opt = document.createElement('option');
        opt.value = child.id;
        opt.textContent = child.name;
        sel.appendChild(opt);
    });
}