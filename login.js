// ==================================================================
// ARQUIVO login.js (VERSÃO FINAL COMPLETA)
// ==================================================================
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const API_URL = 'https://quiz-api-z4ri.onrender.com'; // ⚠️ VERIFIQUE SE ESTA É SUA URL CORRETA

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessage.textContent = 'Entrando...';

    const username = event.target.username.value;
    const password = event.target.password.value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Erro ao fazer login.');
        }

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
        errorMessage.textContent = error.message;
    }
});