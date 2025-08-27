// ==================================================================
// ARQUIVO resultados.js (VERSÃO FINAL COMPLETA E CORRIGIDA)
// ==================================================================
document.addEventListener('DOMContentLoaded', () => {
    const resultDetails = document.getElementById('result-details');
    // Pega os dados do último quiz, que foram salvos na sessão do navegador
    const lastQuizData = JSON.parse(sessionStorage.getItem('lastQuizResults'));

    if (!lastQuizData) {
        resultDetails.innerHTML = '<p class="error">Nenhum resultado de simulado recente encontrado. Tente fazer um novo simulado.</p>';
        return;
    }

    const { score, total, questions, userAnswers } = lastQuizData;
    const percentage = total > 0 ? ((score / total) * 100).toFixed(1) : 0;
    
    // Constrói o HTML do resumo do placar
    let reviewHTML = `
        <div class="score-summary">
            <h1>Resultado Final</h1>
            <p>Você acertou <strong>${score} de ${total}</strong> questões (${percentage}%)</p>
        </div>
        <h3 class="review-title">Revisão do Gabarito:</h3>
    `;

    // Constrói a revisão de cada questão
    questions.forEach((q, index) => {
        const userAnswer = userAnswers[index];
        reviewHTML += `<div class="review-question">`;
        reviewHTML += `<h4>Questão ${index + 1}: ${q.question}</h4>`;
        reviewHTML += `<ul class="options">`;
        
        const letters = ['A', 'B', 'C', 'D', 'E'];
        q.options.forEach((option, optionIndex) => {
            let className = '';
            
            // LÓGICA CORRIGIDA:
            // 1. Marca a resposta correta (gabarito) em verde
            if (option === q.answer) {
                className = 'correct';
            }
            // 2. Se a resposta do usuário foi esta E estava errada, sobrescreve para marcar como incorreta em vermelho
            if (option === userAnswer.selectedOption && !userAnswer.isCorrect) {
                className = 'incorrect';
            }

            reviewHTML += `
                <li class="${className}">
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
    // Limpa os dados da sessão para não serem exibidos novamente por engano
    sessionStorage.removeItem('lastQuizResults');
});
