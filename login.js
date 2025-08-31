// ARQUIVO login.js (ADAPTADO PARA NOVO index.html)
// ==================================================================
// Use same origin when frontend is served from the same host as the API (works for local testing)
const API_URL = (typeof window !== 'undefined' && window.location && window.location.origin)
    ? window.location.origin
    : 'http://localhost:3000'; // fallback

document.addEventListener('DOMContentLoaded', () => {
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    const authForm = document.getElementById('auth-form');
    const submitBtn = document.getElementById('submit-btn');
    const errorMessage = document.getElementById('error-message');

    // header selector fallbacks (some pages use these IDs for logout/menu)
    const headerLogoutBtn = document.getElementById('logout-btn') || document.getElementById('logout-btn-menu');
    const headerMenuToggle = document.getElementById('menu-toggle-btn') || document.getElementById('menu-toggle');

    const nameGroup = document.getElementById('name-group'); // campo nome (signup)
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    let isLoginMode = true;

    // Alternar entre Login Modificado pelo Assistente AI e Cadastrar-se
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (btn.textContent.includes('Login Modificado pelo Assistente AI')) {
                isLoginMode = true;
                nameGroup.style.display = 'none';
                usernameInput.placeholder = "Usuário ou E-mail";
                submitBtn.textContent = "Login Modificado pelo Assistente AI";
            } else {
                isLoginMode = false;
                nameGroup.style.display = 'block';
                usernameInput.placeholder = "Usuário";
                submitBtn.textContent = "Cadastrar";
            }
            errorMessage.textContent = '';
        });
    });

    // Submeter o formulário
    authForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (isLoginMode) {
            handleLogin();
        } else {
            handleSignup();
        }
    });

    // Decodificar JWT
    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    // Login
    async function handleLogin() {
        errorMessage.textContent = 'Entrando...';
        errorMessage.style.color = 'orange';

        const loginIdentifier = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!loginIdentifier || !password) {
            errorMessage.textContent = 'Preencha todos os campos.';
            errorMessage.style.color = 'red';
            return;
        }

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loginIdentifier, password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            if (data.token) {
                localStorage.setItem('token', data.token);
                const payload = parseJwt(data.token);
                localStorage.setItem('username', payload.username);

                if (payload && payload.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'quiz.html';
                }
            }
        } catch (error) {
            errorMessage.textContent = error.message || 'Erro ao fazer login.';
            errorMessage.style.color = 'red';
        }
    }

    // Cadastro
    async function handleSignup() {
        errorMessage.textContent = 'Criando conta...';
        errorMessage.style.color = 'orange';

        const name = document.getElementById('name').value.trim();
        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!name || !username || !email || !password) {
            errorMessage.textContent = 'Preencha todos os campos.';
            errorMessage.style.color = 'red';
            return;
        }

        try {
            const response = await fetch(`${API_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, username, email, password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            errorMessage.textContent = 'Conta criada com sucesso! Faça o login.';
            errorMessage.style.color = 'lightgreen';

            setTimeout(() => {
                toggleButtons[0].click(); // Volta para login
            }, 2000);

        } catch (error) {
            errorMessage.textContent = error.message || 'Erro ao criar conta.';
            errorMessage.style.color = 'red';
        }
    }
});