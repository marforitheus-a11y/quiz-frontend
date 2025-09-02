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
            // use parent category as top-level group when available, and keep subcategory info on the theme
            const topId = t.parent_cat_id || t.category_id || uncategorized.id;
            const topName = t.parent_cat_name || t.category_name || 'Sem categoria';
            if (!grouped[topId]) grouped[topId] = { id: topId, name: topName, themes: [] };
            // attach subcategory info to theme object for later grouping in UI
            t._subcategory_id = t.category_id || null;
            t._subcategory_name = (t.category_id && t.category_name) ? t.category_name : 'Sem subcategoria';
            grouped[topId].themes.push(t);
        });

        const groups = Object.values(grouped);
        if (uncategorized.themes.length) groups.push(uncategorized);

        // build category checkboxes (one per group)
    // compute category map and subcategories for selects
    const categoryMap = {};
    groups.forEach(g => { categoryMap[g.id] = { id: g.id, name: g.name, themes: g.themes, subcats: {} }; });
    // try to infer subcategory_id from themes and group them
    groups.forEach(g => {
        g.themes.forEach(t => {
            // use the _subcategory_* fields we attached earlier (was mistakenly using non-underscored props)
            const subId = t._subcategory_id || '__uncat__';
            const subName = t._subcategory_name || (subId === '__uncat__' ? 'Sem subcategoria' : 'Subcategoria');
            if (!categoryMap[g.id].subcats[subId]) categoryMap[g.id].subcats[subId] = { id: subId, name: subName, themes: [] };
            categoryMap[g.id].subcats[subId].themes.push(t);
        });
    });

    // build discipline (category) select options
    const disciplineOptions = Object.values(categoryMap).map(g => `<option value="${g.id}">${g.name} (${g.themes.length})</option>`).join('\n');

        let themeHTML = '';
        if (groups.length === 0) {
            themeHTML = '<p>Nenhum tema encontrado. Adicione um tema no Painel de Admin.</p>';
        } else {
            // controls row with discipline/subject selects
            themeHTML = `<div class="select-pair"><div class="select-box"><label class="select-label">Disciplina</label><select id="discipline-select"><option value="">Selecione a disciplina</option>${disciplineOptions}</select></div><div class="select-box secondary"><label class="select-label">Assunto</label><select id="subject-select"><option value="">Escolha uma disciplina primeiro</option></select></div></div>`;
            // build flattened rows for table: only theme, question_count and description (keep catId for filtering)
            const rows = [];
            Object.values(categoryMap).forEach(cat => {
                const seen = new Set();
                Object.values(cat.subcats).forEach(sub => {
                    sub.themes.forEach(theme => {
                        if (seen.has(theme.id)) return;
                        seen.add(theme.id);
                        rows.push({ catId: cat.id, subId: theme._subcategory_id || '', themeId: theme.id, themeName: theme.name, desc: theme.description || '', question_count: theme.question_count || 0 });
                    });
                });
            });

                                    // render as a flex-based list with two columns: Tema (checkbox + title/desc) and Quantidade de questões
                                    // header uses id #themes-table-head so JS can toggle visibility when no discipline selected
                                    themeHTML += `<div class="scroll-table" style="margin-top:12px"><div class="themes-table"><div id="themes-table-head" class="themes-head"><div class="head-left">Tema</div><div class="head-count">Quantidade de questões</div></div><div class="themes-body">`;
                                    rows.forEach(r => {
                                            const subAttr = r.subId ? ` data-sub-id="${r.subId}"` : '';
                                            themeHTML += `
                                                <div class="theme-row" data-cat-id="${r.catId}"${subAttr}>
                                                    <label class="theme-left">
                                                        <input type="checkbox" name="theme" value="${r.themeId}">
                                                        <div>
                                                            <div class="theme-name">${r.themeName}</div>
                                                            <div class="theme-desc">${r.desc}</div>
                                                        </div>
                                                    </label>
                                                    <div class="theme-count">${r.question_count}</div>
                                                </div>`;
                                    });
                                    themeHTML += `</div></div></div>`;
        }

        mainContent.innerHTML = `
        <div id="setup-screen">
            <h2>Crie seu Simulado</h2>
            <div id="theme-selection">
                <h3>1. Selecione os Temas</h3>
                ${themeHTML}
            </div>
                        <div class="controls-row">
                            <div style="display:flex;gap:8px;align-items:center">
                                <label style="font-weight:600">Dificuldades:</label>
                                <label><input type="checkbox" name="difficulty" value="easy" checked> Fácil</label>
                                <label><input type="checkbox" name="difficulty" value="medium"> Média</label>
                                <label><input type="checkbox" name="difficulty" value="hard"> Difícil</label>
                            </div>
                            <input type="number" id="question-count" value="5" min="1" class="input" style="width:120px">
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
    // when difficulty checkboxes change or themes change, update available counts
    function getSelectedDifficulties() {
        return Array.from(document.querySelectorAll('input[name="difficulty"]:checked')).map(cb => cb.value);
    }
    async function refreshCountsForSelectedThemes() {
        const selectedThemes = Array.from(document.querySelectorAll('input[name="theme"]:checked')).map(cb => parseInt(cb.value));
        const difficulties = getSelectedDifficulties();
        const countInput = document.getElementById('question-count');
        if (selectedThemes.length === 0) return;
        try {
            const resp = await fetch(`${API_URL}/questions/counts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ themeIds: selectedThemes })
            });
            if (!resp.ok) return;
            const data = await resp.json();
            // sum counts for selected difficulties
            let total = 0;
            difficulties.forEach(d => { if (data[d]) total += Number(data[d]); });
            if (total > 0) countInput.value = Math.min(total, parseInt(countInput.min || '1', 10) || total) || total;
        } catch (err) { console.warn('refreshCounts failed', err); }
    }
    // wire difficulty and theme checkboxes to refresh counts
    document.querySelectorAll('input[name="difficulty"]').forEach(cb => cb.addEventListener('change', refreshCountsForSelectedThemes));
    // also refresh when theme checkboxes change
    document.addEventListener('change', (e) => { if (e.target && e.target.name === 'theme') refreshCountsForSelectedThemes(); });
    // discipline / subject select behavior: populate subject select and filter rows
    const disciplineSelect = document.getElementById('discipline-select');
    const subjectSelect = document.getElementById('subject-select');

    // helper: build subject options for a discipline
    function populateSubjectsForDiscipline(did) {
        subjectSelect.innerHTML = '';
        if (!did) {
            subjectSelect.innerHTML = `<option value="">Escolha uma disciplina primeiro</option>`;
            updateThemeRowsVisibility();
            return;
        }
        const subcats = categoryMap[did].subcats || {};
        const opts = Object.values(subcats).map(s => `<option value="${s.id}">${s.name} (${s.themes.length})</option>`).join('\n');
        subjectSelect.innerHTML = `<option value="">Todos os assuntos</option>${opts}`;
        subjectSelect.value = '';
        updateThemeRowsVisibility();
    }

    // show/hide table header when a discipline is selected
    function toggleTableHeader() {
        const thead = document.getElementById('themes-table-head');
        if (!thead) return;
        // header is a flex-based div now; show when a discipline is selected
        if (disciplineSelect.value) thead.style.display = 'flex';
        else thead.style.display = 'none';
    }

    function updateThemeRowsVisibility() {
        const did = disciplineSelect.value;
        const sid = subjectSelect.value;
        // select the div-based theme rows (refactor from table -> flex rows)
        const rows = Array.from(document.querySelectorAll('.theme-row[data-cat-id]'));
        rows.forEach(r => {
            const cid = r.getAttribute('data-cat-id');
            const rowSub = r.getAttribute('data-sub-id');
            // hide if no discipline selected
            if (!did) { r.style.display = 'none'; return; }
            // hide rows that don't belong to the selected discipline
            if (cid !== did) { r.style.display = 'none'; return; }
            // if a specific subject is selected, only show rows matching that sub-id
            if (sid && rowSub !== sid) { r.style.display = 'none'; return; }
            // otherwise show
            r.style.display = '';
        });
    }

    disciplineSelect.addEventListener('change', (e) => populateSubjectsForDiscipline(e.target.value));
    subjectSelect.addEventListener('change', updateThemeRowsVisibility);
    // initially hide all rows until selection
    updateThemeRowsVisibility();
    // initialize header visibility
    toggleTableHeader();

    disciplineSelect.addEventListener('change', toggleTableHeader);
}

async function startQuiz(mainContent) {
    const selectedThemeIds = Array.from(document.querySelectorAll('input[name="theme"]:checked')).map(cb => parseInt(cb.value));
    const numQuestions = parseInt(document.getElementById('question-count').value, 10);
    const selectedDifficulties = Array.from(document.querySelectorAll('input[name="difficulty"]:checked')).map(cb => cb.value);
    if (selectedDifficulties.length === 0) { alert('Por favor, selecione pelo menos uma dificuldade.'); return; }
    if (selectedThemeIds.length === 0) { alert("Por favor, selecione pelo menos um tema."); return; }
    if (isNaN(numQuestions) || numQuestions <= 0) { alert(`Número de questões inválido.`); return; }

    try {
        const response = await fetch(`${API_URL}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ themeIds: selectedThemeIds, count: numQuestions, difficulties: selectedDifficulties })
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

    // add respond and report buttons inside an actions container
    const actions = document.createElement('div');
    actions.className = 'quiz-actions';

    const respondBtn = document.createElement('button');
    respondBtn.textContent = 'Responder';
    respondBtn.className = 'btn-respond';
    respondBtn.addEventListener('click', () => {
        const selected = document.querySelector('.option.selected');
        if (!selected) { alert('Selecione uma opção antes de responder.'); return; }
        selectAnswer(selected, mainContent);
    });

    const reportBtn = document.createElement('button');
    reportBtn.textContent = 'Reportar Erro';
    reportBtn.className = 'btn-report';
    reportBtn.addEventListener('click', () => openReportModal(currentQuestion));

    actions.appendChild(respondBtn);
    actions.appendChild(reportBtn);
    document.getElementById('quiz-screen').appendChild(actions);
}

function openReportModal(question) {
    const modal = document.getElementById('report-modal');
    if (!modal) return;
    document.getElementById('report-question-id').value = question.id;
    document.getElementById('report-question-text').textContent = question.question;
    document.getElementById('report-details').value = '';
    modal.style.display = 'flex';
    // wire cancel
    document.getElementById('cancel-report').onclick = () => { modal.style.display = 'none'; };
    const form = document.getElementById('report-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const qid = document.getElementById('report-question-id').value;
        const type = document.getElementById('report-type').value;
        const details = document.getElementById('report-details').value || '';
        try {
            const resp = await fetch(`${API_URL}/report-error`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ questionId: qid, errorType: type, details })
            });
            if (!resp.ok) {
                const t = await resp.text();
                alert('Erro ao enviar reporte: ' + t);
                return;
            }
            alert('Reporte enviado. Obrigado pela colaboração.');
            modal.style.display = 'none';
        } catch (err) {
            console.error('report submit failed', err);
            alert('Erro ao enviar reporte. Tente novamente mais tarde.');
        }
    };
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
    } catch (error) {
        // Log network or unexpected errors but do not block the user flow.
        console.error('Erro ao enviar resultado ao servidor:', error);
    } finally {
        // Always keep the local result and redirect so the user doesn't see a fatal error UI.
        try {
            sessionStorage.setItem('lastQuizResults', JSON.stringify({
                score: score,
                total: questionsToAsk.length,
                questions: questionsToAsk,
                userAnswers: userAnswers
            }));
        } catch (e) {
            // If sessionStorage fails, still proceed to redirect; the results page can handle no data.
            console.error('Falha ao gravar lastQuizResults localmente:', e);
        }
        window.location.href = 'resultados.html';
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