// arquivo: admin.js
const token = localStorage.getItem('token');

const themeForm = document.getElementById('theme-form');
const userForm = document.getElementById('user-form');
const themeStatus = document.getElementById('theme-status');
const userStatus = document.getElementById('user-status');
const logoutBtn = document.getElementById('logout-btn');

// Lógica para o formulário de TEMA
themeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    themeStatus.textContent = 'Enviando...';

    const formData = new FormData();
    formData.append('themeName', e.target.themeName.value);
    formData.append('pdfFile', e.target.pdfFile.files[0]);

    try {
        const response = await fetch('http://localhost:3000/admin/themes', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData, // Para upload, o body é FormData
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        themeStatus.textContent = result.message;
        themeStatus.style.color = 'var(--success-color)';
        themeForm.reset();

    } catch (error) {
        themeStatus.textContent = `Erro: ${error.message}`;
        themeStatus.style.color = 'var(--danger-color)';
    }
});

// Lógica para o formulário de USUÁRIO
userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    userStatus.textContent = 'Criando usuário...';

    const userData = {
        username: e.target.username.value,
        password: e.target.password.value,
        subscription_expires_at: e.target.subscription.value || null,
    };

    try {
        const response = await fetch('http://localhost:3000/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        userStatus.textContent = result.message;
        userStatus.style.color = 'var(--success-color)';
        userForm.reset();

    } catch (error) {
        userStatus.textContent = `Erro: ${error.message}`;
        userStatus.style.color = 'var(--danger-color)';
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});