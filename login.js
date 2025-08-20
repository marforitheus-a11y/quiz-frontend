// arquivo: login.js
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

// A URL da sua API no ar
const API_URL = 'https://quiz-api-z4ri.onrender.com'; // CONFIRA SE ESTA URL ESTÁ CORRETA

loginForm.addEventListener('submit', async (event) => {
    // ESTA LINHA É A MAIS IMPORTANTE!
    event.preventDefault(); // Impede o navegador de recarregar a página com os dados na URL.

    errorMessage.textContent = 'Entrando...';
    const username = event.target.username.value;
    const password = event.target.password.value;

    try {
        const response = await fetch(`${API_URL}/login`, { // Usa a URL da API no ar
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erro ao fazer login.');
        }

        localStorage.setItem('token', data.token);
        window.location.href = 'quiz.html';

    } catch (error) {
        errorMessage.textContent = error.message;
    }
});