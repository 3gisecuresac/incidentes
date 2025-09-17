// Simple directory-free JS (vanilla). Designed for GitHub Pages.
const state = {
  tab: 'all',      // all | peru | global
  view: 'table',   // table | cards
  q: '',
  data: [],
};

// Fallback sample data (if fetch fails)
const SAMPLE = [
  {
    id: 1,
    title: 'Ransomware a entidad de salud',
    date: '2024-05-18',
    country: 'Perú',
    type: 'Ransomware',
    impact: 'Interrupción de servicios, datos cifrados',
    source: 'https://ejemplo.gob.pe/csirt/alerta',
    summary: 'Ataque con cifrado de servidores. Se aplicó plan de contingencia y restauración desde respaldos.',
  },
  {
    id: 2,
    title: 'Fuga de datos en plataforma global',
    date: '2024-06-10',
    country: 'Mundo',
    type: 'Data Breach',
    impact: 'Exposición de credenciales y PII',
    source: 'https://example.com/report',
    summary: 'Acceso no autorizado a base de datos en la nube. Se forzó rotación de claves y MFA.',
  },
  {
    id: 3,
    title: 'Ataque DDoS a proveedor de Internet',
    date: '2023-12-12',
    country: 'Mundo',
    type: 'DDoS',
    impact: 'Intermitencia del servicio a millones de usuarios',
    source: 'https://example.com/ddos',
    summary: 'Tráfico volumétrico sostenido contra infraestructura crítica. Mitigación con scrubbing y CDN.',
  },
  {
    id: 4,
    title: 'Phishing dirigido a universidad',
    date: '2025-02-08',
    country: 'Perú',
    type: 'Phishing',
    impact: 'Cuentas comprometidas, restablecimiento masivo',
    source: 'https://universidad.edu/alertas',
    summary: 'Campaña de spear-phishing al personal académico. Se habilitó MFA obligatorio y bloqueo de dominios.',
  },
];

async function loadData(){
  try{
    const res = await fetch('./data/incidents.json', { cache: 'no-store' });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    state.data = Array.isArray(json) ? json : SAMPLE;
  }catch(e){
    console.warn('Fallo al cargar data/incidents.json, usando muestra incorporada.', e);
    state.data = SAMPLE;
  }
  render();
}

function setTab(tab){
  state.tab = tab;
  document.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  render();
}

function setView(view){
  state.view = view;
  document.getElementById('btnTable').classList.toggle('active', view === 'table');
  document.getElementById('btnCards').classList.toggle('active', view === 'cards');
  render();
}

function setQuery(q){
  state.q = q;
  render();
}

function formatDate(iso){
  try{
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-PE', { year:'numeric', month:'short', day:'2-digit' });
  }catch{ return iso; }
}

function filtered(){
  return state.data
    .filter(i => state.tab === 'peru' ? i.country === 'Perú' : state.tab === 'global' ? i.country !== 'Perú' : true)
    .filter(i => {
      if(!state.q.trim()) return true;
      const s = [i.title, i.type, i.country, i.summary || '', i.impact || ''].join(' ').toLowerCase();
      return s.includes(state.q.toLowerCase());
    })
    .sort((a,b) => a.date < b.date ? 1 : -1);
}

function computeStats(items){
  const total = items.length;
  const byType = {};
  for(const it of items){
    byType[it.type] = (byType[it.type] || 0) + 1;
  }
  return { total, byType };
}

function render(){
  const items = filtered();
  const stats = computeStats(items);

  // Stats
  document.getElementById('statTotal').textContent = stats.total;
  const byType = document.getElementById('statByType');
  byType.innerHTML = '';
  const keys = Object.keys(stats.byType);
  if(keys.length === 0){
    const span = document.createElement('span');
    span.className = 'chip';
    span.textContent = 'Sin datos en el filtro actual';
    byType.appendChild(span);
  }else{
    for(const k of keys){
      const span = document.createElement('span');
      span.className = 'chip';
      span.textContent = `${k}: ${stats.byType[k]}`;
      byType.appendChild(span);
    }
  }

  // Content
  const container = document.getElementById('listContainer');
  container.innerHTML = '';

  if(state.view === 'table'){
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Fecha</th><th>Título</th><th>País</th><th>Tipo</th><th>Impacto</th><th>Fuente</th></tr>';
    const tbody = document.createElement('tbody');

    if(items.length === 0){
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.textContent = 'No hay incidentes con el filtro actual.';
      td.style.color = '#64748b';
      td.style.textAlign = 'center';
      td.style.padding = '24px';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }else{
      for(const i of items){
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${formatDate(i.date)}</td>
          <td><div style="font-weight:600">${i.title}</div><div style="color:#64748b;font-size:12px;">${i.summary || ''}</div></td>
          <td>${i.country}</td>
          <td><span class="badge">${i.type}</span></td>
          <td>${i.impact || ''}</td>
          <td><a class="link" href="${i.source}" target="_blank" rel="noreferrer">Ver fuente</a></td>
        `;
        tbody.appendChild(tr);
      }
    }

    table.appendChild(thead);
    table.appendChild(tbody);
    wrap.appendChild(table);
    container.appendChild(wrap);
  }else{
    // Cards
    const grid = document.createElement('div');
    grid.className = 'grid';
    if(items.length === 0){
      const card = document.createElement('div');
      card.className = 'card card-incident';
      card.innerHTML = '<p style="color:#64748b;text-align:center;">No hay incidentes con el filtro actual.</p>';
      grid.appendChild(card);
    }else{
      for(const i of items){
        const card = document.createElement('article');
        card.className = 'card card-incident';
        card.innerHTML = `
          <h3>${i.title}</h3>
          <div class="meta">${formatDate(i.date)} • ${i.country}</div>
          <p>${i.summary || ''}</p>
          <div><strong>Impacto:</strong> ${i.impact || ''}</div>
          <div style="margin-top:8px;"><a class="link" href="${i.source}" target="_blank" rel="noreferrer">Ver fuente</a></div>
        `;
        grid.appendChild(card);
      }
    }
    container.appendChild(grid);
  }
}

// Listeners
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => setTab(btn.dataset.tab));
  });
  document.getElementById('btnTable').addEventListener('click', () => setView('table'));
  document.getElementById('btnCards').addEventListener('click', () => setView('cards'));
  document.getElementById('searchInput').addEventListener('input', (e) => setQuery(e.target.value));
  loadData();
});
