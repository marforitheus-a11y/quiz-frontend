// ==================================================================
// ARQUIVO quiz.js (ATUALIZADO COM FEEDBACK VISUAL E GRID DE TEMAS)
// ==================================================================

const token = localStorage.getItem('token');
const username = localStorage.getItem('username');
const API_URL = (typeof window !== 'undefined' && window.location && window.location.origin)
    ? (window.location.origin.includes('vercel.app') ? 'https://quiz-api-z4ri.onrender.com' : window.location.origin)
    : 'http://localhost:3000';

if (!token) {
    // no token => redirect to login
    window.location.href = 'index.html';
}

let questionsToAsk = [];
let userAnswers = [];
let currentQuestionIndex = 0;
let score = 0;
let lastMessageTimestamp = null;

document.addEventListener('DOMContentLoaded', () => {
    // --- SELETORES DE ELEMENTOS ---
    const mainContent = document.getElementById('main-content');
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const sidebarMenu = document.getElementById('sidebar-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    const logoutBtnMenu = document.getElementById('logout-btn-menu');
    const modal = document.getElementById('global-message-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');

    // --- LÓGICA DO MENU LATERAL ---
    if (menuToggleBtn) menuToggleBtn.addEventListener('click', () => { 
        sidebarMenu.classList.add('active'); 
        menuOverlay.classList.add('active'); 
    });
    if (menuOverlay) menuOverlay.addEventListener('click', () => { 
        sidebarMenu.classList.remove('active'); 
        menuOverlay.classList.remove('active'); 
    });
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

    // --- LÓGICA DO MODAL DE MENSAGEM ---
    if (modal && closeModalBtn) {
        closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
        setInterval(() => checkForMessages(modal), 15000);
    }

    // --- CARREGAMENTO INICIAL DO CONTEÚDO ---
    loadThemes(mainContent);
});


// --- FUNÇÕES DE LÓGICA DO QUIZ ---

async function loadThemes(mainContent) {
    mainContent.innerHTML = '<p>Carregando simulado...</p>';
    try {
        const response = await fetch(`${API_URL}/themes`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.clear();
                window.location.href = 'index.html';
            }
            throw new Error(`Erro do servidor: ${response.status}`);
        }
        const themes = await response.json();
        displaySetupScreen(mainContent, themes);
    } catch (error) {
        mainContent.innerHTML = `<p class="error">Não foi possível carregar os temas.</p>`;
        console.error("Erro em loadThemes:", error);
    }
}

function displaySetupScreen(mainContent, themes = []) {
        // group themes by category
        const grouped = {};
        const uncategorized = { id: '__uncategorized__', name: 'Sem categoria', themes: [] };
        themes.forEach(t => {
            const cid = t.category_id || uncategorized.id;
            if (!cid || cid === '__uncategorized__') {
                uncategorized.themes.push(t);
            } else {
                if (!grouped[cid]) grouped[cid] = { id: cid, name: t.category_name || 'Categoria', themes: [] };
                grouped[cid].themes.push(t);
            }
        });

        const groups = Object.values(grouped);
        if (uncategorized.themes.length) groups.push(uncategorized);

        // build category checkboxes (one per group)
    // category checkboxes start unchecked so themes are only shown when a category is selected
    const categoryControls = groups.map(g => `<label class="category-filter"><input type="checkbox" class="cat-checkbox" data-cat-id="${g.id}"> ${g.name} <span class="muted">(${g.themes.length})</span></label>`).join(' ');

        let themeHTML = '';
        if (groups.length === 0) {
            themeHTML = '<p>Nenhum tema encontrado. Adicione um tema no Painel de Admin.</p>';
        } else {
            themeHTML = `<div class="controls-row">${categoryControls}</div>`;
            // render each group as a folder with its themes
            themeHTML += '<div class="theme-list">';
            groups.forEach(g => {
                themeHTML += `<div class="category-folder-quiz">`;
                themeHTML += `<div class="folder-header"><strong>${g.name}</strong> <span class="folder-count muted">(${g.themes.length})</span></div>`;
                themeHTML += `<div class="folder-list-quiz" data-cat-id="${g.id}">`;
                g.themes.forEach(theme => {
                    themeHTML += `<label class="theme-item" data-category-id="${g.id}"><input type="checkbox" name="theme" value="${theme.id}"><div class="theme-info"><div class="theme-name">${theme.name}</div><div class="theme-meta">${theme.description || ''}</div></div></label>`;
                });
                themeHTML += `</div></div>`;
            });
            themeHTML += '</div>';
        }

    mainContent.innerHTML = `
        <div id="setup-screen">
            <h2>Crie seu Simulado</h2>
            <div id="theme-selection">
                <h3>1. Selecione os Temas</h3>
                ${themeHTML}
            </div>
            <div class="controls-row">
              <input type="number" id="question-count" value="5" min="1" class="input">
              <button id="start-btn" class="btn-main">Iniciar Simulado</button>
            </div>
        </div>
    `;
    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.addEventListener('click', () => startQuiz(mainContent));
    // allow Enter key on question count to start
    const questionCountInput = document.getElementById('question-count');
    if (questionCountInput) questionCountInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') startBtn.click();
    });
    // category filter behavior: only show themes for selected categories
    document.querySelectorAll('.cat-checkbox').forEach(cb => cb.addEventListener('change', () => {
        const activeCats = Array.from(document.querySelectorAll('.cat-checkbox:checked')).map(x => x.getAttribute('data-cat-id'));
        // show/hide folder groups
        document.querySelectorAll('.folder-list-quiz').forEach(list => {
            const cid = list.getAttribute('data-cat-id');
            if (activeCats.includes(cid)) list.style.display = '';
            else list.style.display = 'none';
        });
        // if none selected, hide all groups (so nothing appears until a selection is made)
        if (activeCats.length === 0) document.querySelectorAll('.folder-list-quiz').forEach(l => l.style.display = 'none');
    }));

    // hide all theme groups by default so user must explicitly select categories to reveal themes
    document.querySelectorAll('.folder-list-quiz').forEach(l => l.style.display = 'none');
}

async function startQuiz(mainContent) {
    const selectedThemeIds = Array.from(document.querySelectorAll('input[name="theme"]:checked')).map(cb => parseInt(cb.value));
    const numQuestions = parseInt(document.getElementById('question-count').value, 10);
    if (selectedThemeIds.length === 0) { alert("Por favor, selecione pelo menos um tema."); return; }
    if (isNaN(numQuestions) || numQuestions <= 0) { alert(`Número de questões inválido.`); return; }

    try {
        const response = await fetch(`${API_URL}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ themeIds: selectedThemeIds, count: numQuestions })
        });
        if (!response.ok) {
            const txt = await response.text();
            console.error('startQuiz fetch questions failed', response.status, txt);
            alert('Não foi possível buscar questões do servidor.');
            return;
        }
        questionsToAsk = await response.json();
        if (!questionsToAsk || questionsToAsk.length === 0) {
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
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const optionsHTML = currentQuestion.options.map((option, index) => 
        `<li class="option">
            <span class="option-letter">
              <span class="letter">${letters[index]}</span>
              <svg class="icon icon-check" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <svg class="icon icon-cross" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            <span class="option-text">${option}</span>
        </li>`
    ).join('');

    mainContent.innerHTML = `
        <div id="quiz-screen" class="quiz-card">
            <div class="question-head"><p class="question-text">${currentQuestion.question}</p></div>
            <ul class="options">${optionsHTML}</ul>
            <p class="progress-text">Questão ${currentQuestionIndex + 1} de ${questionsToAsk.length}</p>
        </div>
    `;

    // selection flow: pick one, then press Respond
    document.querySelectorAll('.option').forEach(optionElement => {
        optionElement.addEventListener('click', (e) => {
            document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
        });
    });

    // add respond button
    const respondBtn = document.createElement('button');
    respondBtn.textContent = 'Responder';
    respondBtn.className = 'btn-respond';
    respondBtn.addEventListener('click', () => {
        const selected = document.querySelector('.option.selected');
        if (!selected) { alert('Selecione uma opção antes de responder.'); return; }
        selectAnswer(selected, mainContent);
    });
    document.getElementById('quiz-screen').appendChild(respondBtn);
}

function selectAnswer(selectedElement, mainContent) {
    const rawSelected = selectedElement.querySelector('.option-text').textContent || '';
    const selectedOptionText = String(rawSelected).trim();
    const currentQuestion = questionsToAsk[currentQuestionIndex];
    // normalize answer comparison (strings, trim, lowercase)
    const normalize = v => (v === null || v === undefined) ? '' : String(v).trim().toLowerCase();
    const correctAnswer = normalize(currentQuestion.answer);
    const isCorrect = normalize(selectedOptionText) === correctAnswer;

    // Bloqueia os outros cliques
    document.querySelectorAll('.option').forEach(opt => opt.style.pointerEvents = 'none');

    // Marca as respostas
    if (isCorrect) {
        score++;
        selectedElement.classList.add('correct');
    } else {
        selectedElement.classList.add('incorrect');
        document.querySelectorAll('.option').forEach(opt => {
            const text = opt.querySelector('.option-text').textContent || '';
            if (normalize(text) === correctAnswer) {
                opt.classList.add('correct');
            }
        });
    }

    // Guarda resposta do usuário
    userAnswers.push({
        questionId: currentQuestion.id,
        selectedOption: selectedOptionText,
        isCorrect: isCorrect
    });

    // Avança para próxima questão após delay
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
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                score: score,
                totalQuestions: questionsToAsk.length,
                answers: userAnswers
            })
        });
        if (!response.ok) {
            const t = await response.text();
            console.error('showResults finish failed', response.status, t);
        } else {
            await response.json();
        }
        
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

async function checkForMessages(modal) {
    const modalContent = document.getElementById('global-message-content');
    const modalImage = document.getElementById('global-message-image');
    try {
        const response = await fetch(`${API_URL}/message`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.status === 204) return;
        if (!response.ok) {
            const t = await response.text();
            console.error('checkForMessages failed', response.status, t);
            return;
        }
        const messageData = await response.json();
        if (messageData.timestamp !== lastMessageTimestamp) {
            modalContent.textContent = messageData.content;
            if (messageData.imageUrl) {
                modalImage.src = messageData.imageUrl;
                modalImage.style.display = 'block';
            } else {
                modalImage.style.display = 'none';
            }
            modal.style.display = 'flex';
            lastMessageTimestamp = messageData.timestamp;
        }
    } catch (error) {
        console.error("Erro ao buscar mensagem global:", error);
    }
}