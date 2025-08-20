// arquivo: quiz.js

// Pega o token salvo no login. auth.js já garantiu que ele existe.
const token = localStorage.getItem('token');

// Seletores dos elementos da página
const mainContent = document.querySelector('.quiz-body');
const logoutBtn = document.getElementById('logout-btn');

// Variáveis de estado do quiz
let questionsToAsk = [];
let currentQuestionIndex = 0;
let score = 0;

// --- FUNÇÕES ---

async function loadThemes() {
    try {
        const response = await fetch('http://localhost:3000/themes', {
            headers: {
                // Envia o token para rotas que possam ser protegidas no futuro
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Falha ao carregar temas.');

        const themes = await response.json();
        displaySetupScreen(themes);

    } catch (error) {
        mainContent.innerHTML = `<p class="error">Erro ao carregar temas. Tente novamente mais tarde.</p>`;
        console.error(error);
    }
}

// ... (O resto das funções como displayQuestion, selectAnswer, showResults continuam as mesmas da resposta anterior) ...
// --- COLE O RESTANTE DAS FUNÇÕES DO SCRIPT ANTERIOR AQUI ---

// Nova função para renderizar a tela de setup
function displaySetupScreen(themes = []) {
    let themeHTML = themes.map(theme => `
        <label class="theme-option" for="theme-${theme.id}">
            <input type="checkbox" id="theme-${theme.id}" name="theme" value="${theme.id}">
            ${theme.name}
        </label>
    `).join('');

    mainContent.innerHTML = `
        <div id="setup-screen">
            <h2>Crie seu Simulado</h2>
            <div id="theme-selection">
                <h3>1. Selecione os Temas</h3>
                ${themeHTML}
            </div>
            <label for="question-count" class="label"><h3>2. Número de Questões</h3></label>
            <input type="number" id="question-count" value="5" min="1" class="input">
            <button id="start-btn" class="btn">Iniciar Simulado</button>
        </div>
    `;

    document.getElementById('start-btn').addEventListener('click', startQuiz);
}

// --- EVENT LISTENERS ---

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token'); // Remove o token
    window.location.href = 'index.html'; // Volta para a página de login
});

// Inicialização
loadThemes();