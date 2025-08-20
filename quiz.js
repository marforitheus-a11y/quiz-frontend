// ==================================================================
// ARQUIVO quiz.js (VERSÃO FINAL COMPLETA E CORRIGIDA)
// ==================================================================

const token = localStorage.getItem('token');
const username = localStorage.getItem('username');
const API_URL = 'https://quiz-api-z4ri.onrender.com'; // ⚠️ VERIFIQUE SE ESTA É SUA URL CORRETA

// Proteção da página: executada imediatamente
if (!token) {
    window.location.href = 'index.html';
}

// Seletores de elementos que serão inicializados após o carregamento da página
let mainContent;
let logoutBtn;

// Variáveis de estado do quiz
let questionsToAsk = [];
let userAnswers = [];
let currentQuestionIndex = 0;
let score = 0;

// Gatilho que inicia tudo depois que o HTML da página é carregado
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa os seletores de elementos
    mainContent = document.getElementById('main-content');
    logoutBtn = document.getElementById('logout-btn');

    // Liga o botão de sair
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch(`${API_URL}/logout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: username })
                });
            } catch (error) {
                console.error("Erro ao notificar logout no back-end:", error);
            } finally {
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                window.location.href = 'index.html';
            }
        });
    }
    // Inicia o processo de carregamento dos temas
    loadThemes();
});


async function loadThemes() {
    mainContent.innerHTML = '<p>Carregando simulado...</p>';
    try {
        const response = await fetch(`${API_URL}/themes`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            // Token inválido ou expirado, força o logout
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            window.location.href = 'index.html';
            return;
        }
        if (!response.ok) {
            throw new Error(`Erro do servidor: ${response.status}`);
        }
        
        const themes = await response.json();
        displaySetupScreen(themes);

    } catch (error) {
        mainContent.innerHTML = `<p class="error">Não foi possível carregar os temas. Verifique se a API está no ar e se há temas cadastrados.</p>`;
        console.error("Erro em loadThemes:", error);
    }
}

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

async function startQuiz() {
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
        displayQuestion();

    } catch (error) {
        alert('Erro ao buscar questões.');
        console.error(error);
    }
}

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
    
    if (!isCorrect) {
        document.querySelectorAll('.option').forEach(opt => {
            if (opt.textContent === currentQuestion.answer) {
                opt.classList.add('correct');
            }
        });
    }

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
    }, 2000);
}

async function showResults() {
    mainContent.innerHTML = `<h2>Finalizando simulado...</h2>`;
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
        mainContent.innerHTML = `<p class="error">Não foi possível salvar seu resultado.</p>`;
        console.error(error);
    }
}