// ==================================================================
// ARQUIVO login.js (VERSÃO FINAL COM LOGIN FLEXÍVEL)
// ==================================================================
const API_URL = 'https://quiz-api-z4ri.onrender.com'; // ⚠️ VERIFIQUE SUA URL AQUI

document.addEventListener('DOMContentLoaded', () => {
    const loginToggle = document.getElementById('login-toggle');
    const signupToggle = document.getElementById('signup-toggle');
    const nameGroup = document.getElementById('name-group');
    const emailInput = document.getElementById('email');
    const submitBtn = document.getElementById('submit-btn');
    const authForm = document.getElementById('auth-form');
    const errorMessage = document.getElementById('error-message');
    // ... (outros seletores)

    let isLoginMode = true;

    loginToggle.addEventListener('click', () => {
        if (isLoginMode) return;
        isLoginMode = true;
        // ... (lógica de toggle)
        emailInput.placeholder = "E-mail ou Usuário"; // Muda o placeholder
    });

    signupToggle.addEventListener('click', () => {
        if (!isLoginMode) return;
        isLoginMode = false;
        // ... (lógica de toggle)
        emailInput.placeholder = "E-mail"; // Muda o placeholder
    });

    authForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (isLoginMode) {
            handleLogin();
        } else {
            handleSignup();
        }
    });

    function parseJwt(token) { /* ... (código completo) ... */ }

    async function handleLogin() {
        errorMessage.textContent = 'Entrando...';
        const loginIdentifier = authForm.email.value; // Pega o que foi digitado
        const password = authForm.password.value;

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loginIdentifier, password }), // Envia como 'loginIdentifier'
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
        }
    }

    async function handleSignup() {
        errorMessage.textContent = 'Criando conta...';
        const name = authForm.name.value;
        const email = authForm.email.value;
        const password = authForm.password.value;

        try {
            const response = await fetch(`${API_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            
            errorMessage.textContent = 'Conta criada com sucesso! Faça o login para continuar.';
            errorMessage.style.color = 'var(--success-color)';
            
            setTimeout(() => {
                loginToggle.click();
            }, 2000);

        } catch (error) {
            errorMessage.textContent = error.message || 'Erro ao criar conta.';
        }
    }
});
