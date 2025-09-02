// desempenho.js
const API_URL = 'https://quiz-api-z4ri.onrender.com';
const token = localStorage.getItem('token');

async function fetchJSON(url) {
  const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${await resp.text()}`);
  return resp.json();
}

async function init() {
  try {
    const histories = await fetchJSON(`${API_URL}/history`);
    const historySelect = document.getElementById('history-select');
    historySelect.innerHTML = '';
    if (!histories || histories.length === 0) {
      document.getElementById('summary-text').textContent = 'Nenhuma tentativa encontrada.';
      return;
    }
    histories.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h.id;
      opt.textContent = `${new Date(h.created_at).toLocaleString()} — ${h.score}/${h.total_questions} (${h.percentage}%)`;
      historySelect.appendChild(opt);
    });
    // load themes for mapping
    const themes = await fetchJSON(`${API_URL}/themes`);
    const themeMap = {}; themes.forEach(t => { themeMap[t.id] = t.name || t.name; });

    // setup chart
    const ctx = document.getElementById('themesChart').getContext('2d');
    let chart = new Chart(ctx, { type: 'bar', data: { labels: [], datasets: [{ label: 'Perguntas respondidas', data: [], backgroundColor: [], borderRadius:6 }] }, options: { responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} } });

    async function loadHistory(id) {
      document.getElementById('summary-text').textContent = 'Carregando tentativa...';
      const rows = await fetchJSON(`${API_URL}/history/${id}`);
      // group by theme_id
      const grouped = {};
      rows.forEach(r => {
        const tid = r.theme_id || 'sem_tema';
        if (!grouped[tid]) grouped[tid] = { total:0, correct:0 };
        grouped[tid].total += 1;
        if (r.is_correct) grouped[tid].correct += 1;
      });
      const labels = [];
      const counts = [];
      const colors = [];
      const groupsEl = document.getElementById('groups'); groupsEl.innerHTML = '';
      // prepare array sorted by most answered
      const arr = Object.keys(grouped).map(tid => ({ tid, name: themeMap[tid] || 'Sem Tema', ...grouped[tid], pct: Math.round((grouped[tid].correct / grouped[tid].total) * 100) }));
      arr.sort((a,b)=> b.total - a.total);
      arr.forEach((g,i)=>{
        labels.push(g.name);
        counts.push(g.total);
        const c = `hsl(${(i*37)%360} 70% 55% / 0.85)`;
        colors.push(c);

        // build group card
        const card = document.createElement('div');
        card.className = 'quiz-card';
        card.style.display = 'flex';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';
        card.style.marginBottom = '10px';

        const left = document.createElement('div');
        left.style.flex='1';
        const title = document.createElement('div'); title.style.fontWeight='700'; title.textContent = g.name;
        const meta = document.createElement('div'); meta.style.color='var(--muted)'; meta.style.fontSize='0.95rem'; meta.textContent = `${g.total} questões — ${g.pct}% acertos`;
        left.appendChild(title); left.appendChild(meta);

        const right = document.createElement('div'); right.style.minWidth='140px'; right.style.textAlign='right';
        const pct = document.createElement('div'); pct.style.fontWeight='800'; pct.textContent = `${g.pct}%`;
        const countsText = document.createElement('div'); countsText.style.color='var(--muted)'; countsText.textContent = `${g.correct} acertos • ${g.total - g.correct} erros`;
        right.appendChild(pct); right.appendChild(countsText);

        card.appendChild(left); card.appendChild(right);
        // click expands details (simple toggle)
        card.addEventListener('click', ()=>{
          alert(`${g.name}\nAcertos: ${g.correct}\nErros: ${g.total - g.correct}\nPercentual: ${g.pct}%`);
        });

        groupsEl.appendChild(card);
      });

      // update chart
      chart.data.labels = labels;
      chart.data.datasets[0].data = counts;
      chart.data.datasets[0].backgroundColor = colors;
      chart.update();

      document.getElementById('summary-text').textContent = `Temas presentes: ${arr.length} — total de questões: ${rows.length}`;
    }

    // initial load: most recent
    loadHistory(histories[0].id);
    historySelect.addEventListener('change', (e)=> loadHistory(e.target.value));

  } catch (err) {
    console.error('Desempenho init failed', err);
    document.getElementById('summary-text').textContent = 'Erro ao carregar desempenho.';
  }
}

window.addEventListener('DOMContentLoaded', init);
