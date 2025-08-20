// arquivo: quiz.js (VERSÃO FINAL SEM CONFLITOS)

// --- FUNÇÃO DE AUTENTICAÇÃO (O que antes estava no auth.js) ---
// Esta função é chamada imediatamente para proteger a página.
(function authenticatePage() {
    const token = localStorage.getItem('token');
    if (!token) {
        // Se não houver token, redireciona para o login antes de qualquer outra coisa.
        window.location.href = 'index.html';
    }
})(); // Os parênteses no final fazem a função executar a si mesma.


// --- CONFIGURAÇÃO E VARIÁVEIS GLOBAIS ---
// Agora a declaração do token é única e segura.
const token = localStorage.getItem('token');
// ⚠️ ATENÇÃO: Verifique se esta é a URL correta da sua API na Render
const API_URL = 'https://quiz-api.onrender.com'; 
const mainContent = document.getElementById('main-content');
const logoutBtn = document.getElementById('logout-btn');

let questionsToAsk = [];
let userAnswers = [];
let currentQuestionIndex = 0;
let score = 0;

// --- FLUXO PRINCIPAL ---

// O gatilho que inicia o carregamento dos temas.
document.addEventListener('DOMContentLoaded', () => {
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        });
    }
    loadThemes();
});

async function loadThemes() {
    try {
        const response = await fetch(`${API_URL}/themes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Falha ao carregar temas do servidor.');
        
        const themes = await response.json();
        displaySetupScreen(themes); // Passa os temas para a próxima função

    } catch (error) {
        mainContent.innerHTML = `<p class="error">Não foi possível carregar os temas. Verifique se sua API está no ar e se há temas cadastrados.</p>`;
        console.error(error);
    }
}

/**
 * Desenha a tela de configuração do quiz (seleção de temas, etc.) no HTML.
 */
function displaySetupScreen(themes = []) {
    let themeHTML = themes.length > 0
        ? themes.map(theme => `
            <label class="theme-option" for="theme-${theme.id}">
                <input type="checkbox" id="theme-${theme.id}" name="theme" value="${theme.id}">
                ${theme.name}
            </label>
        `).join('')
        : '<p>Nenhum tema encontrado. Adicione um tema no Painel de Admin.</p>';

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

// ... COLE AQUI O RESTANTE DAS SUAS FUNÇÕES DO quiz.js ...
// (startQuiz, displayQuestion, selectAnswer, showResults)
// É crucial que o restante do código que já funcionava seja mantido aqui.

/**
 * 1. Pega as configurações do usuário.
 * 2. Busca as questões na API.
 * 3. Inicia o quiz.
 */
async function startQuiz() {
    const selectedThemeIds = Array.from(document.querySelectorAll('input[name="theme"]:checked')).map(cb => parseInt(cb.value));
    const numQuestions = parseInt(document.getElementById('question-count').value, 10);

    if (selectedThemeIds.length === 0) {
        alert("Por favor, selecione pelo menos um tema.");
        return;
    }
    if (numQuestions <= 0) {
        alert(`Número de questões inválido.`);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ themeIds: selectedThemeIds, count: numQuestions })
        });
        
        questionsToAsk = await response.json();

        if (!response.ok || questionsToAsk.length === 0) {
            alert('Não foi possível buscar questões para os temas selecionados. Verifique a quantidade ou tente outros temas.');
            return;
        }

        // Reseta o estado do quiz e mostra a primeira questão
        currentQuestionIndex = 0;
        score = 0;
        userAnswers = [];
        displayQuestion();

    } catch (error) {
        alert('Erro ao buscar questões.');
        console.error(error);
    }
}

/**
 * Desenha a tela da questão atual.
 */
function displayQuestion() {
    const currentQuestion = questionsToAsk[currentQuestionIndex];
    const optionsHTML = currentQuestion.options.map(option => 
        `<li class="option">${option}</li>`
    ).join('');

    mainContent.innerHTML = `
        <div id="quiz-screen">
            <p class="question-text">${currentQuestion.question}</p>
            <ul class="options">${optionsHTML}</ul>
            <p class="progress-text">Questão ${currentQuestionIndex + 1} de ${questionsToAsk.length}</p>
        </div>
    `;

    document.querySelectorAll('.option').forEach(optionElement => {
        optionElement.addEventListener('click', (e) => selectAnswer(e.target));
    });
}

/**
 * Processa a resposta do usuário e avança para a próxima questão ou para os resultados.
 */
function selectAnswer(selectedElement) {
    const selectedOption = selectedElement.textContent;
    const currentQuestion = questionsToAsk[currentQuestionIndex];
    const isCorrect = selectedOption === currentQuestion.answer;

    if (isCorrect) {
        score++;
        selectedElement.classList.add('correct');
    } else {
        selectedElement.classList.add('incorrect');
    }
    
    // Mostra a resposta correta caso o usuário erre
    if (!isCorrect) {
        document.querySelectorAll('.option').forEach(opt => {
            if (opt.textContent === currentQuestion.answer) {
                opt.classList.add('correct');
            }
        });
    }

    // Desabilita todas as opções após a escolha
    document.querySelectorAll('.option').forEach(opt => opt.style.pointerEvents = 'none');

    userAnswers.push({
        questionId: currentQuestion.id,
        selectedOption: selectedOption,
        isCorrect: isCorrect
    });

    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < questionsToAsk.length) {
            displayQuestion();
        } else {
            showResults();
        }
    }, 2000); // Espera 2 segundos antes de avançar
}

/**
 * Envia o resultado final para a API e redireciona para a página de desempenho.
 */
async function showResults() {
    mainContent.innerHTML = `<h2>Finalizando simulado e salvando resultados...</h2>`;
    try {
        await fetch(`${API_URL}/quiz/finish`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                score: score,
                totalQuestions: questionsToAsk.length,
                answers: userAnswers
            })
        });
        window.location.href = 'desempenho.html';
    } catch (error) {
        mainContent.innerHTML = `<p class="error">Não foi possível salvar seu resultado. Tente novamente.</p>`;
        console.error(error);
    }
}