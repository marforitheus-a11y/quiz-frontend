// arquivo: quiz.js (VERSÃO FINAL COMPLETA)

// --- CONFIGURAÇÃO E VARIÁVEIS GLOBAIS ---
const token = localStorage.getItem('token');
const API_URL = 'https://seu-quiz-api.onrender.com'; // ⚠️ LEMBRE-SE DE VERIFICAR SE ESTA É SUA URL CORRETA
const mainContent = document.getElementById('main-content');
const logoutBtn = document.getElementById('logout-btn');

let questionsToAsk = [];
let userAnswers = [];
let currentQuestionIndex = 0;
let score = 0;

// --- FLUXO PRINCIPAL ---

// Esta linha é o gatilho que inicia tudo assim que a página carrega.
window.onload = loadThemes;

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});

// --- FUNÇÕES DE LÓGICA ---

/**
 * 1. Busca os temas na API.
 * 2. Chama a função para desenhar a tela de setup.
 */
async function loadThemes() {
    try {
        const response = await fetch(`${API_URL}/themes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Falha ao carregar temas.');
        
        const themes = await response.json();
        displaySetupScreen(themes); // Passa os temas para a próxima função

    } catch (error) {
        mainContent.innerHTML = `<p class="error">Erro ao carregar temas. Tente novamente mais tarde.</p>`;
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

    // Adiciona o event listener ao botão que acabamos de criar
    document.getElementById('start-btn').addEventListener('click', startQuiz);
}

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