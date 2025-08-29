// ==================================================================
// ARQUIVO resultados.js (ATUALIZADO COM VISUAL MELHORADO)
// ==================================================================
document.addEventListener('DOMContentLoaded', () => {
    const resultDetails = document.getElementById('result-details');
    const lastQuizData = JSON.parse(sessionStorage.getItem('lastQuizResults'));

    if (!lastQuizData) {
        resultDetails.innerHTML = `
            <div class="error-card">
                <p>Nenhum resultado de simulado recente encontrado.</p>
                <a href="quiz.html" class="btn-main">Fazer Novo Simulado</a>
            </div>
        `;
        return;
    }

    const { score, total, questions, userAnswers } = lastQuizData;
    const percentage = total > 0 ? ((score / total) * 100).toFixed(1) : 0;

    let reviewHTML = `
        <div class="score-summary">
            <h1>Resultado Final</h1>
            <p>Você acertou <strong>${score} de ${total}</strong> questões</p>
            <p class="percentage">Aproveitamento: <strong>${percentage}%</strong></p>
        </div>
        <h3 class="review-title">Revisão do Gabarito</h3>
    `;

    questions.forEach((q, index) => {
        const userAnswer = userAnswers[index];
        reviewHTML += `<div class="review-question">`;
        reviewHTML += `<h4>Questão ${index + 1}</h4>`;
        reviewHTML += `<p class="question-text">${q.question}</p>`;
        reviewHTML += `<ul class="options">`;

        const letters = ['A', 'B', 'C', 'D', 'E'];
        q.options.forEach((option, optionIndex) => {
            let className = '';

            if (option === q.answer) {
                className = 'correct';
            }
            if (option === userAnswer.selectedOption && !userAnswer.isCorrect) {
                className = 'incorrect';
            }

            reviewHTML += `
                <li class="option ${className}">
                    <span class="option-letter">${letters[optionIndex]}</span>
                    <span class="option-text">${option}</span>
                </li>
            `;
        });

        reviewHTML += `</ul>`;
        if (!userAnswer.isCorrect) {
            reviewHTML += `<p class="feedback"><strong>Sua resposta:</strong> ${userAnswer.selectedOption}</p>`;
        }
        reviewHTML += `</div>`;
    });

    resultDetails.innerHTML = reviewHTML;
    sessionStorage.removeItem('lastQuizResults');
});