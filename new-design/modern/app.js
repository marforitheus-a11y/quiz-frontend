// Minimal JS to toggle theme and act as light SPA shell for preview
(function(){
  const root = document.documentElement;
  const btn = document.getElementById('theme-toggle');
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  if (btn) {
    btn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', cur === 'dark' ? 'dark' : '');
      localStorage.setItem('theme', cur === 'dark' ? 'dark' : 'light');
      btn.setAttribute('aria-pressed', cur === 'dark');
    });
  }
})();
