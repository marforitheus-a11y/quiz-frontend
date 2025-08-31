/* Theme Toggle Logic */
document.addEventListener('DOMContentLoaded', () => {
    // Check for saved user preference, first in localStorage, then system setting
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    // Set initial theme
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    // Add toggle switch handler
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
            
            // Trigger a custom event that other parts of the app can listen to
            document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: newTheme } }));
        });
    }
});

// Update theme toggle icon
function updateThemeIcon(theme) {
    const iconContainer = document.querySelector('.theme-toggle span');
    if (iconContainer) {
        iconContainer.className = theme === 'dark' ? 'icon-moon' : 'icon-sun';
    }
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        updateThemeIcon(newTheme);
    }
});
