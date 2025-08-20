// arquivo: quiz.js (VERSÃO FINAL COMPLETA E CORRIGIDA)

const token = localStorage.getItem('token');
const username = localStorage.getItem('username');
// ⚠️ ATENÇÃO: Verifique se esta é a URL correta da sua API na Render
const API_URL = 'https://quiz-api.onrender.com';

// Proteção da página: se não houver token, volta para o login
if (!token) {
    window.location.href = 'index.html';
}

const mainContent = document.getElementById('main-content');
const logoutBtn = document.getElementById('logout-btn');

let questionsToAsk = [];
let userAnswers = [];
let currentQuestionIndex = 0;
let score = 0;

// Gatilho que inicia tudo assim que a página é carregada
document.addEventListener('DOMContentLoaded', () => {
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch(`${API_URL}/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username })
            });
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            window.location.href = 'index.html';
        });
    }
    loadThemes();
});

async function loadThemes() {
    console.log("Iniciando carregamento de temas...");
    try {
        const response = await fetch(`${API_URL}/themes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            throw new Error(`Falha ao carregar temas. Status: ${response.status}`);
        }
        
        const themes = await response.json();
        console.log("Temas recebidos:", themes);
        displaySetupScreen(themes);

    } catch (error) {
        mainContent.innerHTML = `<p class="error">Não foi possível carregar os temas. Verifique se sua API está no ar e se há temas cadastrados no painel de admin.</p>`;
        console.error("Erro detalhado em loadThemes:", error);
    }
}

function displaySetupScreen(themes = []) {
    console.log("Desenhando a tela de setup...");
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
    console.log("Tela de setup desenhada com sucesso.");
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
            alert('Não foi possível buscar questões para os temas selecionados. Verifique a quantidade ou tente outros temas.');
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