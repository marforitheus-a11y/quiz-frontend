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
                    <td>${user.username}</td>
                    <td>${activeIcon}</td>
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