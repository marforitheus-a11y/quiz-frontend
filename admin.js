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
let usersCache = [];

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
    // wire source type (pdf or web) toggle
    const sourceType = document.getElementById('sourceType');
    const pdfInput = document.getElementById('pdf-input');
    const webInput = document.getElementById('web-input');
    if (sourceType) {
        sourceType.addEventListener('change', () => {
            if (sourceType.value === 'web') {
                pdfInput.style.display = 'none';
                webInput.style.display = 'flex';
                document.getElementById('pdfFile').required = false;
                document.getElementById('searchQuery').required = true;
            } else {
                pdfInput.style.display = 'flex';
                webInput.style.display = 'none';
                document.getElementById('pdfFile').required = true;
                document.getElementById('searchQuery').required = false;
            }
        });
    }

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
    // search input for users
    const userSearch = document.getElementById('user-search');
    if (userSearch) {
        // simple debounce to avoid flood on fast typing
        let _deb = null;
        userSearch.placeholder = userSearch.placeholder || 'Buscar usuário por nome...';
        userSearch.addEventListener('input', (e) => {
            clearTimeout(_deb);
            _deb = setTimeout(() => {
                const q = String(e.target.value || '').trim().toLowerCase();
                renderUsersFiltered(q);
            }, 160);
        });
        // ensure it's visible and accessible
        userSearch.setAttribute('autocomplete', 'off');
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
    // include difficulty selection (easy|medium|hard)
    const diff = document.getElementById('difficultySelect') ? document.getElementById('difficultySelect').value : 'easy';
    formData.append('difficulty', diff);
    const source = document.getElementById('sourceType') ? document.getElementById('sourceType').value : 'pdf';
    formData.append('sourceType', source);
    if (source === 'pdf') formData.append('pdfFile', e.target.pdfFile.files[0]);
    else formData.append('searchQuery', e.target.searchQuery.value || '');
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
    if (!themes || themes.length === 0) { container.innerHTML = '<div class="text-gray-500">Nenhum tema disponível.</div>'; return; }

    // flatten themes with category and subcategory info (include question_count)
    const rows = themes.map(t => ({ category: t.category_name || 'Sem categoria', subcategory: t._subcategory_name || '', themeName: t.name, id: t.id, question_count: (t.question_count || 0) }));

    const wrapper = document.createElement('div'); wrapper.className = 'scroll-table';
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr><th>Categoria</th><th>Subcategoria</th><th>Tema</th><th style="width:80px;text-align:center">Questões</th><th>ID</th><th style="width:180px;text-align:right">Ações</th></tr>`;
    table.appendChild(thead);
    const tbody = document.createElement('tbody');

    rows.forEach(r => {
        const tr = document.createElement('tr');
    tr.innerHTML = `<td class="cat-name">${r.category}</td><td class="cat-sub">${r.subcategory || '<span class="text-gray-500">—</span>'}</td><td>${r.themeName}</td><td style="text-align:center">${r.question_count}</td><td>${r.id}</td>`;
        const actionTd = document.createElement('td'); actionTd.style.textAlign='right'; actionTd.style.padding='8px 12px';
        const assignBtn = document.createElement('button'); assignBtn.className='btn-secondary'; assignBtn.textContent='Atribuir Categoria'; assignBtn.addEventListener('click', ()=>assignCategoryPrompt(r.id));
        const resetBtn = document.createElement('button'); resetBtn.className='btn-secondary'; resetBtn.textContent='Resetar'; resetBtn.style.marginLeft='8px'; resetBtn.addEventListener('click', ()=>openResetModal(r.id));
        const addQBtn = document.createElement('button'); addQBtn.className='btn-primary'; addQBtn.textContent='Adicionar Questões'; addQBtn.style.marginLeft='8px'; addQBtn.addEventListener('click', ()=>openAddQuestionsModal(r.id));
        const delBtn = document.createElement('button'); delBtn.className='btn-delete'; delBtn.textContent='Apagar'; delBtn.style.marginLeft='8px'; delBtn.addEventListener('click', ()=>deleteTheme(r.id));
        actionTd.appendChild(assignBtn); actionTd.appendChild(resetBtn); actionTd.appendChild(addQBtn); actionTd.appendChild(delBtn);
        tr.appendChild(actionTd);
        tbody.appendChild(tr);
    });

    table.appendChild(tbody); wrapper.appendChild(table); container.appendChild(wrapper);
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
    items.push({ label: 'Adicionar Subcategoria', action: () => addSubcategoryToThemePrompt(obj.id) });
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
        usersCache = users || [];
        renderUsersFiltered('');
    } catch (error) { console.error('Erro ao carregar usuários:', error); }
}

function renderUsersFiltered(query) {
    const usersTableBody = document.getElementById('users-table-body');
    if (!usersTableBody) return;
    const q = String(query || '').trim().toLowerCase();
    usersTableBody.innerHTML = '';
    const list = usersCache.filter(u => !q || (u.username && String(u.username).toLowerCase().includes(q)));
    if (list.length === 0) {
        usersTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-500">Nenhum usuário encontrado.</td></tr>`;
        return;
    }
    list.forEach(user => {
        // determine online status from several possible fields
        const isActive = !!(user.isActive || user.online || user.is_online || user.last_seen && (Date.now() - new Date(user.last_seen).getTime() < 1000 * 60 * 5)); // treat last_seen within 5m as online
        const statusHtml = `<span class="status-pill ${isActive ? 'online' : 'offline'}">${isActive ? 'Online' : 'Offline'}</span>`;
        const expirationDate = user.subscription_expires_at ? new Date(user.subscription_expires_at).toLocaleDateString('pt-BR') : 'N/A';
        const row = `
            <tr>
                <td>${user.id}</td>
                <td class="no-break">${user.username}</td>
                <td>${statusHtml}</td>
                <td>${expirationDate}</td>
                <td><button class="btn-delete" onclick="deleteUser(${user.id})">Apagar</button></td>
            </tr>
        `;
        usersTableBody.innerHTML += row;
    });
}

async function loadActiveSessions() {
    // Implemente se desejar
}
async function loadReports() {
    const body = document.getElementById('reports-table-body');
    if (!body) return;
    try {
        const resp = await fetch(`${API_URL}/admin/reports`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!resp.ok) {
            const t = await resp.text();
            console.error('loadReports failed', resp.status, t);
            body.innerHTML = `<tr><td colspan="4" class="text-red-600">Erro ao carregar reportes.</td></tr>`;
            return;
        }
        const reports = await resp.json();
        body.innerHTML = '';
        if (!reports || reports.length === 0) {
            body.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-gray-500">Nenhum reporte recente.</td></tr>`;
            return;
        }
        reports.forEach(r => {
            const row = document.createElement('tr');
            const detailsPreview = r.details ? (r.details.length > 80 ? r.details.slice(0,77) + '...' : r.details) : '';
            row.innerHTML = `
                <td>${r.id}</td>
                <td class="no-break">${r.reported_by || '—'}</td>
                <td title="${r.details ? r.details.replace(/"/g,'\"') : ''}">${detailsPreview}</td>
                <td>${r.error_type || ''}</td>
                <td>${new Date(r.reported_at).toLocaleString()}</td>
                <td style="text-align:right"><button class="btn-secondary" data-report-id="${r.id}" data-question-id="${r.question_id || ''}">Analisar</button></td>
            `;
            body.appendChild(row);
        });

        // wire analyze buttons
        body.querySelectorAll('button[data-report-id]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const qid = btn.getAttribute('data-question-id');
                if (!qid) return alert('Questão associada não disponível.');
                // fetch full question JSON
                try {
                    const qresp = await fetch(`${API_URL}/admin/questions/${qid}`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (!qresp.ok) { const t = await qresp.text(); return alert('Erro ao buscar questão: ' + t); }
                    const qjson = await qresp.json();
                    // open modal and populate
                    document.getElementById('report-json-text').value = JSON.stringify(qjson, null, 2);
                    document.getElementById('report-json-modal').style.display = 'flex';
                } catch (err) { console.error('fetch question failed', err); alert('Erro ao buscar questão. Veja console.'); }
            });
        });
    } catch (err) {
        console.error('Erro loadReports:', err);
    }
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

    // build HTML table for categories and subcategories
    const wrapper = document.createElement('div');
    wrapper.className = 'scroll-table';
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr><th>Categoria</th><th>Subcategorias</th><th style="width:140px;text-align:right">Ações</th></tr>`;
    table.appendChild(thead);
    const tbody = document.createElement('tbody');

    categories.forEach(cat => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="cat-name">${cat.name}</td><td class="cat-sub">${cat.children && cat.children.length ? cat.children.map(c=>c.name).join(', ') : '<span class="text-gray-500">—</span>'}</td>`;
        const actionTd = document.createElement('td');
        actionTd.style.textAlign = 'right';
        actionTd.style.padding = '8px 12px';
        const addBtn = document.createElement('button'); addBtn.className='btn-small'; addBtn.textContent='+'; addBtn.title='Adicionar subcategoria'; addBtn.addEventListener('click', ()=>openCreateCategoryModal(cat.id));
    const delBtn = document.createElement('button'); delBtn.className='btn-delete'; delBtn.textContent='Apagar'; delBtn.addEventListener('click', ()=>deleteCategory(cat.id));
        actionTd.appendChild(addBtn); actionTd.appendChild(document.createTextNode(' ')); actionTd.appendChild(delBtn);
        tr.appendChild(actionTd);
        tbody.appendChild(tr);

        // also add rows for children (indented)
        if (cat.children && cat.children.length) {
            cat.children.forEach(child => {
                const ctr = document.createElement('tr');
                ctr.innerHTML = `<td class="cat-sub">↳ ${child.name}</td><td class="cat-sub">${child.children && child.children.length ? child.children.map(c=>c.name).join(', ') : '<span class="text-gray-500">—</span>'}</td>`;
                const cActionTd = document.createElement('td');
                cActionTd.style.textAlign = 'right';
                cActionTd.style.padding = '8px 12px';
                const addS = document.createElement('button'); addS.className='btn-small'; addS.textContent='+'; addS.title='Adicionar subcategoria'; addS.addEventListener('click', ()=>openCreateCategoryModal(child.id));
                const delS = document.createElement('button'); delS.className='btn-delete'; delS.textContent='Apagar'; delS.addEventListener('click', ()=>deleteCategory(child.id));
                cActionTd.appendChild(addS); cActionTd.appendChild(document.createTextNode(' ')); cActionTd.appendChild(delS);
                ctr.appendChild(cActionTd);
                tbody.appendChild(ctr);
            });
        }
    });

    table.appendChild(tbody);
    wrapper.appendChild(table);
    container.appendChild(wrapper);
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
    // prefer the cached categories (they may include locally-added default subcats)
    if (categoriesCache && categoriesCache.length) {
        cats = categoriesCache;
    } else {
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
    }

    if (!cats || cats.length === 0) return;
    // cache for other UI pieces
    categoriesCache = cats;
    // populate only root categories in the category select (do not add children here)
    cats.forEach(root => {
        const opt = document.createElement('option');
        opt.value = root.id;
        opt.textContent = root.name;
        sel.appendChild(opt);
    });
    // reset subcategory select to reflect currently selected category (if any)
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

    // Add Questions modal wiring
    const addModal = document.getElementById('add-questions-modal');
    const addForm = document.getElementById('add-questions-form');
    const cancelAdd = document.getElementById('cancel-add-questions');
    const addSource = document.getElementById('addSourceType');
    const addPdfInput = document.getElementById('add-pdf-input');
    const addWebInput = document.getElementById('add-web-input');
    const addStatus = document.getElementById('add-questions-status');

    function openAddQuestionsModal(themeId) {
        document.getElementById('add-theme-id').value = themeId;
        addStatus.textContent = '';
        document.getElementById('addQuestionCount').value = '5';
        // default to pdf
        if (addSource) addSource.value = 'pdf';
        if (addPdfInput) addPdfInput.style.display = 'flex';
        if (addWebInput) addWebInput.style.display = 'none';
        if (addModal) addModal.style.display = 'flex';
    }
    // expose globally so renderers that attach click handlers can call it
    window.openAddQuestionsModal = openAddQuestionsModal;

    if (cancelAdd) cancelAdd.addEventListener('click', () => { if (addModal) addModal.style.display = 'none'; });
    if (addSource) addSource.addEventListener('change', () => {
        if (addSource.value === 'web') { addPdfInput.style.display = 'none'; addWebInput.style.display = 'flex'; }
        else { addPdfInput.style.display = 'flex'; addWebInput.style.display = 'none'; }
    });

    if (addForm) {
        addForm.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const progressWrap = document.getElementById('add-questions-progress');
            const fill = document.getElementById('add-progress-fill');
            addStatus.textContent = 'Iniciando...';
            if (progressWrap) progressWrap.style.display = 'block';
            if (fill) fill.style.width = '10%';

            const themeId = document.getElementById('add-theme-id').value;
            const fd = new FormData();
            const src = document.getElementById('addSourceType').value;
            fd.append('sourceType', src);
            fd.append('questionCount', document.getElementById('addQuestionCount').value || '5');
            // include difficulty when adding questions
            const addDiff = document.getElementById('addDifficulty') ? document.getElementById('addDifficulty').value : 'easy';
            fd.append('difficulty', addDiff);
            if (src === 'pdf') {
                const f = document.getElementById('addPdfFile').files[0];
                if (!f) { addStatus.textContent = 'Selecione um arquivo PDF.'; return; }
                fd.append('pdfFile', f);
            } else {
                const q = document.getElementById('addSearchQuery').value || '';
                if (!q) { addStatus.textContent = 'Informe o termo/tópico para buscar na web.'; return; }
                fd.append('searchQuery', q);
            }

            try {
                // Preflight: check backend health to avoid posting to the wrong host (static frontend)
                addStatus.textContent = 'Verificando conexão com a API...'; if (fill) fill.style.width = '20%';
                let healthOk = false;
                try {
                    const h = await fetch(`${API_URL}/health`);
                    if (h && h.ok) healthOk = true;
                    else healthOk = false;
                } catch (he) {
                    healthOk = false;
                }
                if (!healthOk) {
                    const endpoint = `${API_URL}/admin/themes/${themeId}/add`;
                    addStatus.textContent = `Não foi possível alcançar a API em ${API_URL}. Verifique se o backend está ativo e se 'API_URL' está correto. Tentativa de endpoint: ${endpoint}`;
                    if (fill) fill.style.width = '100%';
                    return;
                }

                addStatus.textContent = 'Enviando ao servidor...'; if (fill) fill.style.width = '30%';
                const resp = await fetch(`${API_URL}/admin/themes/${themeId}/add`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: fd
                });

                addStatus.textContent = 'Gerando questões (IA)...'; if (fill) fill.style.width = '60%';

                const txt = await resp.text();
                // try to parse JSON; if server returned HTML (like Express 404 page), extract a concise message
                let json = {};
                const contentType = (resp.headers.get('content-type') || '').toLowerCase();
                if (contentType.includes('application/json')) {
                    try { json = JSON.parse(txt); } catch (e) { json = { message: txt }; }
                } else if (contentType.includes('text/html') || /cannot post/i.test(txt)) {
                    // try to extract useful message from HTML (e.g. <pre>Cannot POST /admin/themes/22/add</pre>)
                    let m = txt.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
                    if (m && m[1]) {
                        json.message = m[1].trim();
                    } else {
                        m = txt.match(/Cannot POST\s+([^<\s]+)/i) || txt.match(/Cannot POST\s*([^<\n\r]+)/i);
                        json.message = m ? (`Cannot POST ${m[1]}`) : `Rota não encontrada (status ${resp.status}). Verifique a URL da API.`;
                    }
                } else {
                    try { json = JSON.parse(txt); } catch (e) { json = { message: txt }; }
                }

                if (!resp.ok) {
                    // show a friendly message and include the endpoint used for debugging
                    const endpoint = `${API_URL}/admin/themes/${themeId}/add`;
                    throw new Error(`${json.message || 'Erro no servidor.'} — Endpoint: ${endpoint}`);
                }

                addStatus.textContent = json.message || 'Questões adicionadas com sucesso.'; if (fill) fill.style.width = '100%';
                setTimeout(() => { if (addModal) addModal.style.display = 'none'; loadThemes(); if (progressWrap) progressWrap.style.display = 'none'; if (fill) fill.style.width = '0%'; }, 1200);
            } catch (err) {
                console.error('addQuestions failed', err);
                addStatus.textContent = `Erro: ${err.message}`;
                if (fill) fill.style.width = '100%';
            }
        });
    }

    // wire report JSON modal controls
    const reportJsonModal = document.getElementById('report-json-modal');
    const closeReportJson = document.getElementById('close-report-json');
    const cancelReportJson = document.getElementById('cancel-report-json');
    const saveReportJson = document.getElementById('save-report-json');
    if (closeReportJson) closeReportJson.addEventListener('click', () => { if (reportJsonModal) reportJsonModal.style.display = 'none'; });
    if (cancelReportJson) cancelReportJson.addEventListener('click', () => { if (reportJsonModal) reportJsonModal.style.display = 'none'; });
    if (saveReportJson) saveReportJson.addEventListener('click', async () => {
        const txt = document.getElementById('report-json-text').value;
        try {
            const parsed = JSON.parse(txt);
            const qid = parsed.id;
            if (!qid) return alert('JSON inválido: campo id ausente.');
            const resp = await fetch(`${API_URL}/admin/questions/${qid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(parsed)
            });
            if (!resp.ok) {
                const bodyText = await resp.text();
                try {
                    const j = JSON.parse(bodyText);
                    if (j && j.error) return alert('Erro ao salvar: ' + j.error + '\n\nResposta completa: ' + bodyText);
                    if (j && j.message) return alert('Erro ao salvar: ' + j.message + '\n\nResposta completa: ' + bodyText);
                } catch (e) {
                    // not JSON
                }
                return alert('Erro ao salvar: ' + bodyText);
            }
            alert('Questão atualizada com sucesso.');
            if (reportJsonModal) reportJsonModal.style.display = 'none';
            // refresh reports list
            loadReports();
        } catch (err) { console.error('save report json failed', err); alert('JSON inválido ou erro de rede. Veja console.'); }
    });
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

async function addSubcategoryToThemePrompt(themeId) {
    try {
        const name = prompt('Nome da nova subcategoria para este tema:');
        if (!name) return;
        // fetch theme to find its current category
        const themeResp = await fetch(`${API_URL}/themes`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!themeResp.ok) return alert('Não foi possível buscar informações do tema.');
        const themes = await themeResp.json();
        const theme = themes.find(t => String(t.id) === String(themeId));
        const parentCategoryId = theme ? theme.category_id : null;
        if (!parentCategoryId) return alert('Este tema não pertence a uma categoria. Atribua uma categoria primeiro.');

        // create subcategory via admin endpoint
        const resp = await fetch(`${API_URL}/admin/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, parentId: parentCategoryId })
        });
        if (!resp.ok) {
            const txt = await resp.text();
            console.error('addSubcategoryToThemePrompt failed', resp.status, txt);
            return alert('Não foi possível criar subcategoria no servidor.');
        }
        const created = await resp.json();
        // assign theme to created subcategory (category_id points to child id)
        const upd = await fetch(`${API_URL}/admin/themes/${themeId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ categoryId: created.id }) });
        if (!upd.ok) {
            const txt = await upd.text();
            console.error('Failed to assign theme to new subcategory', upd.status, txt);
            return alert('Subcategoria criada, mas não foi possível atribuir ao tema.');
        }
        alert('Subcategoria criada e atribuída ao tema com sucesso.');
        await loadCategories();
        await loadThemes();
    } catch (err) {
        console.error('Erro addSubcategoryToThemePrompt:', err);
        alert('Erro ao criar subcategoria.');
    }
}