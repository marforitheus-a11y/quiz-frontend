// ==================================================================
// ARQUIVO admin.js (VERSÃO FINAL COMPLETA E CORRIGIDA)
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
    }
})();

// --- CÓDIGO PRINCIPAL DO PAINEL DE ADMIN ---
const token = localStorage.getItem('token');
const username = localStorage.getItem('username');
const API_URL = 'https://quiz-api-z4ri.onrender.com'; // ⚠️ VERIFIQUE SUA URL AQUI

// O CÓDIGO ABAIXO SÓ EXECUTA DEPOIS QUE O HTML ESTIVER PRONTO
document.addEventListener('DOMContentLoaded', () => {
    // Seletores dos elementos
    const themeForm = document.getElementById('theme-form');
    const userForm = document.getElementById('user-form');
    const sessionsTableBody = document.getElementById('sessions-table-body');
    const usersTableBody = document.getElementById('users-table-body');
    const logoutBtn = document.getElementById('logout-btn');

    // Carrega os dados do painel assim que a página abre
    // loadActiveSessions();
    // loadUsers();
    // loadReports();

    // Lógica do botão de Sair
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch(`${API_URL}/logout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: username })
                });
            } finally {
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                window.location.href = 'index.html';
            }
        });
    }

    // Lógica do formulário de criar TEMA (COM A CORREÇÃO)
    if (themeForm) {
        themeForm.addEventListener('submit', async (e) => {
            // ESTA LINHA ESTAVA FALTANDO!
            e.preventDefault(); // Impede o envio padrão que coloca os dados na URL
            const themeStatus = document.getElementById('theme-status');
            themeStatus.textContent = 'Enviando PDF e gerando questões...';
            
            const formData = new FormData();
            formData.append('themeName', e.target.themeName.value);
            formData.append('pdfFile', e.target.pdfFile.files[0]);

            try {
                const response = await fetch(`${API_URL}/admin/themes`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);

                themeStatus.textContent = result.message;
                themeStatus.style.color = 'var(--success-color)';
                themeForm.reset();

            } catch (error) {
                themeStatus.textContent = `Erro: ${error.message}`;
                themeStatus.style.color = 'var(--danger-color)';
            }
        });
    }

    // Lógica do formulário de criar USUÁRIO
    if (userForm) {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Impede o envio padrão
            const userStatus = document.getElementById('user-status');
            userStatus.textContent = 'Criando usuário...';

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
                
                userStatus.textContent = result.message;
                userStatus.style.color = 'var(--success-color)';
                userForm.reset();
                // loadUsers(); // Se quiser que a lista atualize automaticamente
            } catch (error) {
                userStatus.textContent = `Erro: ${error.message}`;
                userStatus.style.color = 'var(--danger-color)';
            }
        });
    }

    // --- FUNÇÕES DE CARREGAMENTO DE DADOS (Exemplo, se precisar) ---
    // async function loadUsers() { ... }
});