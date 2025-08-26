// ==================================================================
// ARQUIVO login.js (VERSÃO FINAL COM TODA A LÓGICA INTEGRADA)
// ==================================================================
const API_URL = 'https://quiz-api-z4ri.onrender.com'; // ⚠️ VERIFIQUE SE ESTA É SUA URL CORRETA

document.addEventListener('DOMContentLoaded', () => {
    // Seletores de elementos da página
    const loginToggle = document.getElementById('login-toggle');
    const signupToggle = document.getElementById('signup-toggle');
    const nameGroup = document.getElementById('name-group');
    const forgotPasswordLink = document.querySelector('.forgot-password');
    const submitBtn = document.getElementById('submit-btn');
    const legalText = document.querySelector('.legal-text');
    const authForm = document.getElementById('auth-form');
    const errorMessage = document.getElementById('error-message');

    let isLoginMode = true;

    // --- LÓGICA PARA ALTERNAR ENTRE LOGIN E CADASTRO ---
    loginToggle.addEventListener('click', () => {
        if (isLoginMode) return;
        isLoginMode = true;
        loginToggle.classList.add('active');
        signupToggle.classList.remove('active');
        nameGroup.style.display = 'none';
        nameGroup.querySelector('input').required = false;
        forgotPasswordLink.style.display = 'block';
        submitBtn.textContent = 'Login';
        legalText.style.display = 'none';
        authForm.reset();
        errorMessage.textContent = '';
    });

    signupToggle.addEventListener('click', () => {
        if (!isLoginMode) return;
        isLoginMode = false;
        signupToggle.classList.add('active');
        loginToggle.classList.remove('active');
        nameGroup.style.display = 'block';
        nameGroup.querySelector('input').required = true;
        forgotPasswordLink.style.display = 'none';
        submitBtn.textContent = 'Cadastrar-se';
        legalText.style.display = 'block';
        authForm.reset();
        errorMessage.textContent = '';
    });

    // --- LÓGICA DE ENVIO DO FORMULÁRIO ---
    authForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        if (isLoginMode) {
            handleLogin();
        } else {
            handleSignup();
        }
    });

    // --- FUNÇÕES DE LÓGICA ---
    function parseJwt(token) {
        try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
    }

    async function handleLogin() {
        errorMessage.textContent = 'Entrando...';
        errorMessage.style.color = 'var(--text-secondary)';
        const email = authForm.email.value;
        const password = authForm.password.value;

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: email, password: password }), // O backend espera 'username'
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
            } else {
                throw new Error("Servidor não retornou um token.");
            }
        } catch (error) {
            errorMessage.textContent = error.message || 'Erro ao fazer login.';
            errorMessage.style.color = 'var(--danger-color)';
        }
    }

    async function handleSignup() {
        errorMessage.textContent = 'Criando conta...';
        errorMessage.style.color = 'var(--text-secondary)';
        const name = authForm.name.value;
        const email = authForm.email.value;
        const password = authForm.password.value;

        try {
            // A ser implementado: fetch para a rota /signup no backend
            // const response = await fetch(`${API_URL}/signup`, { ... });
            // const data = await response.json();
            // if (!response.ok) throw new Error(data.message);
            
            // Simulação de sucesso por enquanto
            errorMessage.textContent = 'Funcionalidade de cadastro em desenvolvimento.';
            errorMessage.style.color = 'var(--primary-color)';
            
            // Volta para a tela de login após um tempo
            setTimeout(() => {
                loginToggle.click();
            }, 3000);

        } catch (error) {
            errorMessage.textContent = error.message || 'Erro ao criar conta.';
            errorMessage.style.color = 'var(--danger-color)';
        }
    }
});
