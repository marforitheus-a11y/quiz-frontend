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
    if (!histories || histories.length === 0) {
      document.getElementById('summary-text').textContent = 'Nenhuma tentativa encontrada.';
      return;
    }
    // aggregate per theme across all histories
    const themeAgg = {}; // tid -> { total, correct }
    const detailPromises = histories.map(h => fetchJSON(`${API_URL}/history/${h.id}`).catch(e => { console.warn('history detail failed', e); return []; }));
    const allDetails = await Promise.all(detailPromises);
    allDetails.forEach(rows => {
      rows.forEach(r => {
        const tid = r.theme_id || 'sem_tema';
        if (!themeAgg[tid]) themeAgg[tid] = { total:0, correct:0 };
        themeAgg[tid].total += 1;
        if (r.is_correct) themeAgg[tid].correct += 1;
      });
    });
    // load themes for mapping
    const themes = await fetchJSON(`${API_URL}/themes`);
    const themeMap = {}; themes.forEach(t => { themeMap[t.id] = t.name || t.name; });
    themeMap['sem_tema'] = 'Sem Tema';

    // setup chart
    const ctx = document.getElementById('themesChart').getContext('2d');
    let chart = new Chart(ctx, { type: 'bar', data: { labels: [], datasets: [{ label: 'Perguntas respondidas', data: [], backgroundColor: [], borderRadius:6 }] }, options: { responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} } });

    // Build aggregate array from themeAgg
    const arr = Object.keys(themeAgg).map(tid => ({ tid, name: themeMap[tid] || 'Sem Tema', ...themeAgg[tid], pct: Math.round((themeAgg[tid].correct / themeAgg[tid].total) * 100) }));
    arr.sort((a,b)=> b.total - a.total);

    // populate theme-select
    const themeSelect = document.getElementById('theme-select');
    themeSelect.innerHTML = '';
    const allOpt = document.createElement('option'); allOpt.value = '__all__'; allOpt.textContent = 'Todos os temas'; themeSelect.appendChild(allOpt);
    arr.forEach(a => { const o = document.createElement('option'); o.value = a.tid; o.textContent = `${a.name} — ${a.pct}% (${a.total})`; themeSelect.appendChild(o); });

    async function renderForTheme(selectedTid) {
      document.getElementById('summary-text').textContent = 'Carregando dados...';
      const groupsEl = document.getElementById('groups'); groupsEl.innerHTML = '';
      const labels = [];
      const counts = [];
      const colors = [];
      const displayArr = selectedTid === '__all__' ? arr : arr.filter(x => String(x.tid) === String(selectedTid));
      displayArr.forEach((g,i)=>{
        labels.push(g.name);
        counts.push(g.total);
        const c = `hsl(${(i*37)%360} 70% 55% / 0.85)`;
        colors.push(c);

        // build group card
        const card = document.createElement('div');
        card.className = 'quiz-card theme-card';
        card.style.display = 'flex';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';
        card.style.marginBottom = '10px';

        const left = document.createElement('div'); left.style.flex='1';
        const title = document.createElement('div'); title.style.fontWeight='700'; title.textContent = g.name;
        const meta = document.createElement('div'); meta.style.color='var(--muted)'; meta.style.fontSize='0.95rem'; meta.textContent = `${g.total} questões — ${g.pct}% acertos`;
        left.appendChild(title); left.appendChild(meta);

        const right = document.createElement('div'); right.style.minWidth='140px'; right.style.textAlign='right';
        const pct = document.createElement('div'); pct.style.fontWeight='800'; pct.textContent = `${g.pct}%`;
        const countsText = document.createElement('div'); countsText.style.color='var(--muted)'; countsText.textContent = `${g.correct} acertos • ${g.total - g.correct} erros`;
        right.appendChild(pct); right.appendChild(countsText);

        card.appendChild(left); card.appendChild(right);
        const details = document.createElement('div'); details.style.width='100%'; details.style.overflow='hidden'; details.style.maxHeight='0'; details.style.transition='max-height .28s ease'; details.style.padding='0 12px';
        const detailsInner = document.createElement('div'); detailsInner.style.padding='10px 0'; detailsInner.style.color='var(--muted)'; detailsInner.textContent = `Acertos: ${g.correct} — Erros: ${g.total - g.correct} — Percentual: ${g.pct}%`;
        details.appendChild(detailsInner);
        card.appendChild(details);
        let expanded=false;
        card.addEventListener('click', ()=>{
          expanded = !expanded;
          details.style.maxHeight = expanded ? '120px' : '0';
        });

        groupsEl.appendChild(card);
      });

      // update chart
      chart.data.labels = labels;
      chart.data.datasets[0].data = counts;
      chart.data.datasets[0].backgroundColor = colors;
      chart.update();

      document.getElementById('summary-text').textContent = `Temas presentes: ${arr.length} — total de questões: ${Object.values(themeAgg).reduce((s,x)=>s+x.total,0)}`;
    }

    // initial render (all themes)
    renderForTheme('__all__');
    document.getElementById('theme-select').addEventListener('change', (e)=> renderForTheme(e.target.value));

  } catch (err) {
    console.error('Desempenho init failed', err);
    document.getElementById('summary-text').textContent = 'Erro ao carregar desempenho.';
  }
}

window.addEventListener('DOMContentLoaded', init);
