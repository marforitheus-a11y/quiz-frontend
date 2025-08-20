// arquivo: auth.js
const token = localStorage.getItem('token');

// Se não houver token, o usuário não está logado.
// Redireciona para a página de login.
if (!token) {
    window.location.href = 'index.html';
}