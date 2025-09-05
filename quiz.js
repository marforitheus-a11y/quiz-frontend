// ==================================================================
// ARQUIVO quiz.js (VERSÃO FINAL COM MENU E CORREÇÕES)
// ==================================================================

const token = localStorage.getItem('token');
const username = localStorage.getItem('username');
const API_URL = 'https://quiz-api-z4ri.onrender.com'; // ⚠️ VERIFIQUE SUA URL AQUI

// Proteção da página: executada imediatamente
if (!token) {
    window.location.href = 'index.html';
}

// Variáveis de estado do quiz
let questionsToAsk = [];
let userAnswers = [];
let currentQuestionIndex = 0;
let score = 0;

// O CÓDIGO ABAIXO SÓ EXECUTA DEPOIS QUE O HTML DA PÁGINA ESTIVER PRONTO
document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES DE ELEMENTOS ---
    const mainContent = document.getElementById('main-content');
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const sidebarMenu = document.getElementById('sidebar-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    const logoutBtnMenu = document.getElementById('logout-btn-menu');

    // --- LÓGICA DO MENU LATERAL ---
    function openMenu() {
        if (sidebarMenu) sidebarMenu.classList.add('active');
        if (menuOverlay) menuOverlay.classList.add('active');
    }

    function closeMenu() {
        if (sidebarMenu) sidebarMenu.classList.remove('active');
        if (menuOverlay) menuOverlay.classList.remove('active');
    }

    if (menuToggleBtn) {
        menuToggleBtn.addEventListener('click', openMenu);
    }
    if (menuOverlay) {
        menuOverlay.addEventListener('click', closeMenu);
    }

    if (logoutBtnMenu) {
        logoutBtnMenu.addEventListener('click', async () => {
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

    // --- CARREGAMENTO INICIAL DO CONTEÚDO ---
    loadThemes(mainContent);
});


// --- FUNÇÕES DE LÓGICA DO QUIZ ---

async function loadThemes(mainContent) {
    mainContent.innerHTML = '<p>Carregando simulado...</p>';
    try {
        const response = await fetch(`${API_URL}/themes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                window.location.href = 'index.html';
            }
            throw new Error(`Erro do servidor: ${response.status}`);
        }
        const themes = await response.json();
        displaySetupScreen(mainContent, themes);
    } catch (error) {
        mainContent.innerHTML = `<p class="error">Não foi possível carregar os temas. Verifique se a API está no ar e se há temas cadastrados.</p>`;
        console.error("Erro em loadThemes:", error);
    }
}

function displaySetupScreen(mainContent, themes = []) {
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
    document.getElementById('start-btn').addEventListener('click', () => startQuiz(mainContent));
}

async function startQuiz(mainContent) {
    const selectedThemeIds = Array.from(document.querySelectorAll('input[name="theme"]:checked')).map(cb => parseInt(cb.value));
    const numQuestions = parseInt(document.getElementById('question-count').value, 10);

    if (selectedThemeIds.length === 0) {
        alert("Por favor, selecione pelo menos um tema.");
        return;
    }
    if (isNaN(numQuestions) || numQuestions <= 0) {
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
            alert('Não foi possível buscar questões para os temas selecionados.');
            return;
        }

        currentQuestionIndex = 0;
        score = 0;
        userAnswers = [];
        displayQuestion(mainContent);

    } catch (error) {
        alert('Erro ao buscar questões.');
        console.error(error);
    }
}

function displayQuestion(mainContent) {
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
        optionElement.addEventListener('click', (e) => selectAnswer(e.target, mainContent));
    });
}

function selectAnswer(selectedElement, mainContent) {
    const selectedOption = selectedElement.textContent;
    const currentQuestion = questionsToAsk[currentQuestionIndex];
    const isCorrect = selectedOption === currentQuestion.answer;

    document.querySelectorAll('.option').forEach(opt => opt.style.pointerEvents = 'none');

    if (isCorrect) {
        score++;
        selectedElement.classList.add('correct');
    } else {
        selectedElement.classList.add('incorrect');
        document.querySelectorAll('.option').forEach(opt => {
            if (opt.textContent === currentQuestion.answer) {
                opt.classList.add('correct');
            }
        });
    }

    userAnswers.push({
        questionId: currentQuestion.id,
        selectedOption: selectedOption,
        isCorrect: isCorrect
    });

    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < questionsToAsk.length) {
            displayQuestion(mainContent);
        } else {
            showResults(mainContent);
        }
    }, 2000);
}

async function showResults(mainContent) {
    mainContent.innerHTML = `<h2>Finalizando simulado...</h2>`;
    try {
        const response = await fetch(`${API_URL}/quiz/finish`, {
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
        const result = await response.json();
        
        sessionStorage.setItem('lastQuizResults', JSON.stringify({
            score: score,
            total: questionsToAsk.length,
            questions: questionsToAsk,
            userAnswers: userAnswers
        }));
        window.location.href = 'resultados.html';
    } catch (error) {
        mainContent.innerHTML = `<p class="error">Não foi possível salvar seu resultado.</p>`;
        console.error(error);
    }
}
