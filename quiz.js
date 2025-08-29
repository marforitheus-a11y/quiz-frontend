function displayQuestion(mainContent) {
    const currentQuestion = questionsToAsk[currentQuestionIndex];
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const optionsHTML = currentQuestion.options.map((option, index) => 
        `<li class="option">
            <span class="option-letter">${letters[index]}</span>
            <span class="option-text">${option}</span>
        </li>`
    ).join('');

    mainContent.innerHTML = `
        <div id="quiz-screen" class="quiz-card">
            <p class="question-text">${currentQuestion.question}</p>
            <ul class="options">${optionsHTML}</ul>
            <p class="progress-text">Questão ${currentQuestionIndex + 1} de ${questionsToAsk.length}</p>
        </div>
    `;

    document.querySelectorAll('.option').forEach(optionElement => {
        optionElement.addEventListener('click', (e) => selectAnswer(e.currentTarget, mainContent));
    });
}

function selectAnswer(selectedElement, mainContent) {
    const selectedOptionText = selectedElement.querySelector('.option-text').textContent;
    const currentQuestion = questionsToAsk[currentQuestionIndex];
    const isCorrect = selectedOptionText === currentQuestion.answer;

    document.querySelectorAll('.option').forEach(opt => opt.style.pointerEvents = 'none');

    if (isCorrect) {
        score++;
        selectedElement.classList.add('correct');
    } else {
        selectedElement.classList.add('incorrect');
        document.querySelectorAll('.option').forEach(opt => {
            if (opt.querySelector('.option-text').textContent === currentQuestion.answer) {
                opt.classList.add('correct');
            }
        });
    }

    userAnswers.push({
        questionId: currentQuestion.id,
        selectedOption: selectedOptionText,
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