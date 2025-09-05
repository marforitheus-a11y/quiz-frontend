document.addEventListener('DOMContentLoaded', () => {
    const resultDetails = document.getElementById('result-details');
    const lastQuizData = JSON.parse(sessionStorage.getItem('lastQuizResults'));

    if (!lastQuizData) {
        resultDetails.innerHTML = '<p>Nenhum resultado de simulado encontrado.</p>';
        return;
    }

    const { score, total, questions, userAnswers } = lastQuizData;
    const percentage = total > 0 ? ((score / total) * 100).toFixed(1) : 0;
    
    let reviewHTML = `
        <div class="score-summary">
            <h2>Você acertou ${score} de ${total} questões (${percentage}%)</h2>
        </div>
        <h3>Revisão do Gabarito:</h3>
    `;

    questions.forEach((q, index) => {
        const userAnswer = userAnswers[index];
        reviewHTML += `<div class="review-question">`;
        reviewHTML += `<h4>Questão ${index + 1}: ${q.question}</h4>`;
        reviewHTML += `<ul class="options">`;
        q.options.forEach(option => {
            let className = '';
            if (option === q.answer) {
                className = 'correct'; // Resposta correta
            }
            if (option === userAnswer.selectedOption && !userAnswer.isCorrect) {
                className = 'incorrect'; // Resposta errada do usuário
            }
            reviewHTML += `<li class="${className}">${option}</li>`;
        });
        reviewHTML += `</ul>`;
        if (!userAnswer.isCorrect) {
            reviewHTML += `<p class="feedback"><strong>Sua resposta:</strong> ${userAnswer.selectedOption}</p>`;
        }
        reviewHTML += `</div>`;
    });

    resultDetails.innerHTML = reviewHTML;
    sessionStorage.removeItem('lastQuizResults'); // Limpa os dados após exibir
});