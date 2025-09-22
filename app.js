const state={
  region:'Todos', view:'table', q:'', data:[],
  page:1, pageSize:10,
  sortKey:'date', sortDir:'desc',
  typeFilter:null,
  theme:'dark'
};

const SORTERS={
  date:(a,b)=> a.date<b.date?1:-1,
  title:(a,b)=> a.title.localeCompare(b.title),
  country:(a,b)=> a.country.localeCompare(b.country),
  region:(a,b)=> a.region.localeCompare(b.region),
  type:(a,b)=> a.type.localeCompare(b.type),
  actor:(a,b)=> a.actor.localeCompare(b.actor),
  impact:(a,b)=> (a.impact||'').localeCompare(b.impact||'')
};

async function loadData(){
  initTheme();
  if(window.matchMedia && window.matchMedia('(max-width: 640px)').matches){
    state.view='cards';
    document.getElementById('btnTable').classList.remove('active');
    document.getElementById('btnCards').classList.add('active');
  }
 /* try{
    const res=await fetch('./data/manifest.json',{cache:'no-store'});
    const manifest=await res.json();
    const files=Array.isArray(manifest.files)?manifest.files:[];
    const loaded=[];
    for(const f of files){
      try{
        const r=await fetch('./data/'+f,{cache:'no-store'});
        if(!r.ok) throw new Error('HTTP '+r.status);
        const j=await r.json();
        loaded.push(j);
      }catch(e){ console.warn('No se pudo cargar',f,e); }
    }
    state.data=normalize(loaded);
  }catch(e){
    console.error('Error leyendo manifest.json',e);
    state.data=[];
  }*/

  try {
  // Lee el manifest (en la RAÍZ)
  const res = await fetch('./data/manifest.json',{cache:'no-store'});
  const manifest = await res.json();

  // Carga el bundle indicado en el manifest (1 sola petición)
  const r = await fetch('./data/' + manifest.bundle, { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);

  const list = await r.json();      // <- aquí viene tu arreglo de incidentes
  state.data = normalize(list);     // <- lo dejas tal cual

} catch (e) {
  console.error('Error cargando bundle', e);
  state.data = [];
}

  
  buildRegionButtons();
  render();
}

function normalize(items){
  const out=items.map((i,idx)=>({
    id:i.id||idx+1,title:i.title||'Incidente sin título',date:i.date||'1970-01-01',
    country:i.country||'Mundo',region:i.region||'Mundo',type:i.type||'Otro',actor:i.actor||'Desconocido',
    impact:i.impact||'',source:i.source||'#',summary:i.summary||'',color:i.color||null,logo:i.logo||null
  }));
  return sortData(out);
}

function sortData(arr){
  const cmp=SORTERS[state.sortKey] || SORTERS.date;
  const sorted=[...arr].sort(cmp);
  if(state.sortDir==='asc') sorted.reverse();
  return sorted;
}

function setRegion(r){ state.region=r; state.page=1; document.querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('active',b.textContent===r)); render(); }
function setView(view){ state.view=view; document.getElementById('btnTable').classList.toggle('active',view==='table'); document.getElementById('btnCards').classList.toggle('active',view==='cards'); render(); }
function setQuery(q){ state.q=q; state.page=1; render(); }
function setPage(p){ state.page=p; render(); }
function setPageSize(sz){ state.pageSize=Number(sz)||10; state.page=1; render(); }
function setTypeFilter(t){ state.typeFilter = (state.typeFilter===t? null : t); state.page=1; render(); }

function formatDate(iso){ try{ const d=new Date(iso+'T00:00:00'); return d.toLocaleDateString('es-PE',{year:'numeric',month:'short',day:'2-digit'});}catch{ return iso; } }

function filtered(){
  let arr=state.data;
  arr = arr.filter(i=> state.region==='Todos' ? true : i.region===state.region);
  arr = arr.filter(i=> state.typeFilter ? i.type===state.typeFilter : true);
  arr = arr.filter(i=>{ if(!state.q.trim()) return true; const s=[i.title,i.type,i.country,i.region,i.summary||'',i.impact||'',i.actor||''].join(' ').toLowerCase(); return s.includes(state.q.toLowerCase()); });
  arr = sortData(arr);
  return arr;
}

function computeStats(items){ const total=items.length, byType={}, byRegion={}; for(const it of items){ byType[it.type]=(byType[it.type]||0)+1; byRegion[it.region]=(byRegion[it.region]||0)+1; } return {total,byType,byRegion}; }
function applyBadgeColor(el,color){ if(!color) return; el.style.background=color+'1A'; el.style.borderColor=color; el.style.color='inherit'; }

function render(){
  const all=filtered();
  const stats=computeStats(all);
  const totalPages=Math.max(1, Math.ceil(all.length / state.pageSize));
  if(state.page>totalPages) state.page=totalPages;
  const start=(state.page-1)*state.pageSize;
  const items=all.slice(start, start+state.pageSize);

  document.getElementById('statTotal').textContent=stats.total;
  const byType=document.getElementById('statByType'); byType.innerHTML='';
  const currentType=state.typeFilter;
  Object.entries(stats.byType).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>{
    const span=document.createElement('span');
    span.className='chip'+(currentType===k?' active':'');
    span.textContent=`${k}: ${v}`;
    span.addEventListener('click',()=> setTypeFilter(k));
    byType.appendChild(span);
  });
  if(Object.keys(stats.byType).length===0){ const s=document.createElement('span'); s.className='chip'; s.textContent='Sin datos'; byType.appendChild(s); }

  const byRegion=document.getElementById('statByRegion'); byRegion.innerHTML='';
  Object.entries(stats.byRegion).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>{
    const span=document.createElement('span');
    span.className='chip';
    span.textContent=`${k}: ${v}`;
    byRegion.appendChild(span);
  });
  if(Object.keys(stats.byRegion).length===0){ const s=document.createElement('span'); s.className='chip'; s.textContent='Sin datos'; byRegion.appendChild(s); }

  const container=document.getElementById('listContainer'); container.innerHTML='';
  if(state.view==='table'){
    const wrap=document.createElement('div'); wrap.className='table-wrap';
    const table=document.createElement('table');
    const thead=document.createElement('thead');
    thead.appendChild(headerRow());
    const tbody=document.createElement('tbody');
    if(items.length===0){
      const tr=document.createElement('tr'); const td=document.createElement('td'); td.colSpan=8; td.textContent='No hay incidentes con el filtro actual.'; td.style.color='var(--muted)'; td.style.textAlign='center'; td.style.padding='24px'; tr.appendChild(td); tbody.appendChild(tr);
    }else{
      for(const i of items){
        const tr=document.createElement('tr');
        tr.innerHTML = `
          <td>${formatDate(i.date)}</td>
          <td><div style="font-weight:600;display:flex;align-items:center;gap:8px;">${i.logo?`<img src="${i.logo}" alt="" style="width:18px;height:18px;border-radius:4px;">`:''}${i.title}</div><div class="muted" style="font-size:12px;">${i.summary||''}</div></td>
          <td>${i.country}</td>
          <td>${i.region}</td>
          <td><span class="badge" ${i.color?`data-color="${i.color}"`:''}>${i.type}</span></td>
          <td>${i.actor}</td>
          <td>${i.impact||''}</td>
          <td><a class="link" href="${i.source}" target="_blank" rel="noreferrer">Ver fuente</a></td>`;
        tbody.appendChild(tr);
      }
    }
    table.appendChild(thead); table.appendChild(tbody); wrap.appendChild(table); container.appendChild(wrap);
    container.querySelectorAll('.badge[data-color]').forEach(el=>applyBadgeColor(el,el.getAttribute('data-color')));
  }else{
    const grid=document.createElement('div'); grid.className='grid';
    if(items.length===0){ const card=document.createElement('div'); card.className='card card-incident'; card.innerHTML='<p class="muted" style="text-align:center;">No hay incidentes con el filtro actual.</p>'; grid.appendChild(card); }
    else{
      for(const i of items){
        const card=document.createElement('article'); card.className='card card-incident';
        card.innerHTML = `
          <h3 style="display:flex;align-items:center;gap:8px;">${i.logo?`<img src="${i.logo}" alt="" style="width:18px;height:18px;border-radius:4px;">`:''}${i.title}</h3>
          <div class="meta">${formatDate(i.date)} • ${i.country} • ${i.region} • <span class="badge" ${i.color?`data-color="${i.color}"`:''}>${i.type}</span></div>
          <p>${i.summary||''}</p>
          <div><strong>Actor:</strong> ${i.actor}</div>
          <div><strong>Impacto:</strong> ${i.impact||''}</div>
          <div style="margin-top:8px;"><a class="link" href="${i.source}" target="_blank" rel="noreferrer">Ver fuente</a></div>`;
        grid.appendChild(card);
      }
    }
    container.appendChild(grid);
    container.querySelectorAll('.badge[data-color]').forEach(el=>applyBadgeColor(el,el.getAttribute('data-color')));
  }

  renderPager(all.length);
}

function headerRow(){
  const tr=document.createElement('tr');
  const cols=[
    ['date','Fecha'],['title','Título'],['country','País'],['region','Región'],
    ['type','Tipo'],['actor','Actor'],['impact','Impacto'],['source','Fuente']
  ];
  for(const [key,label] of cols){
    const th=document.createElement('th');
    th.textContent=label;
    if(key!=='source'){
      th.addEventListener('click',()=> onSort(key));
      const caret=document.createElement('span');
      caret.className='sort-caret';
      caret.textContent = sortCaretFor(key);
      th.appendChild(caret);
    }
    tr.appendChild(th);
  }
  return tr;
}
function onSort(key){
  if(state.sortKey===key){
    state.sortDir = (state.sortDir==='asc'?'desc':'asc');
  }else{
    state.sortKey=key;
    state.sortDir = (key==='date'?'desc':'asc');
  }
  render();
}
function sortCaretFor(key){
  if(state.sortKey!==key) return '↕';
  return state.sortDir==='asc' ? '↑' : '↓';
}

function renderPager(totalItems){
  const totalPages=Math.max(1, Math.ceil(totalItems / state.pageSize));
  const pager = document.getElementById('pagerContainer');
  pager.innerHTML='';
  const wrap=document.createElement('div'); wrap.className='pager';
  const left=document.createElement('div'); left.className='pager-left';
  const label=document.createElement('label'); label.textContent='Por página:';
  const select=document.createElement('select'); select.className='page-size';
  [5,10,20,50].forEach(n=>{ const opt=document.createElement('option'); opt.value=n; opt.textContent=n; if(n===state.pageSize) opt.selected=true; select.appendChild(opt); });
  select.addEventListener('change', e=> setPageSize(e.target.value));
  left.appendChild(label); left.appendChild(select);
  const right=document.createElement('div'); right.className='pager-right';
  const prev=document.createElement('button'); prev.className='page-btn'; prev.textContent='‹ Anterior'; prev.disabled=state.page<=1; prev.addEventListener('click',()=> setPage(state.page-1));
  right.appendChild(prev);
  const windowSize=5;
  let startPage=Math.max(1, state.page - Math.floor(windowSize/2));
  let endPage=Math.min(totalPages, startPage + windowSize - 1);
  if(endPage - startPage + 1 < windowSize){ startPage=Math.max(1, endPage - windowSize + 1); }
  for(let p=startPage; p<=endPage; p++){
    const b=document.createElement('button'); b.className='page-btn'+(p===state.page?' active':''); b.textContent=p; b.addEventListener('click',()=> setPage(p)); right.appendChild(b);
  }
  const next=document.createElement('button'); next.className='page-btn'; next.textContent='Siguiente ›'; next.disabled=state.page>=totalPages; next.addEventListener('click',()=> setPage(state.page+1));
  right.appendChild(next);
  wrap.appendChild(left); wrap.appendChild(right);
  pager.appendChild(wrap);
}

// Regions
function buildRegionButtons(){
  const parent=document.getElementById('regionButtons'); parent.innerHTML='';
  const regions=Array.from(new Set(state.data.map(i=>i.region))).sort();
  const all=['Todos',...regions];
  all.forEach(r=>{ const btn=document.createElement('button'); btn.className='seg-btn'+(r===state.region?' active':''); btn.textContent=r; btn.addEventListener('click',()=>setRegion(r)); parent.appendChild(btn); });
}

// Theme
function initTheme(){
  const saved=localStorage.getItem('theme');
  state.theme = saved || 'dark';
  applyTheme();
}
function toggleTheme(){
  state.theme = (state.theme==='dark'?'light':'dark');
  localStorage.setItem('theme', state.theme);
  applyTheme();
}
function applyTheme(){
  const root=document.documentElement;
  if(state.theme==='light'){ root.classList.add('light'); document.getElementById('themeIcon').src='./assets/sun.svg'; }
  else{ root.classList.remove('light'); document.getElementById('themeIcon').src='./assets/moon.svg'; }
}

// Listeners
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('btnTable').addEventListener('click',()=>setView('table'));
  document.getElementById('btnCards').addEventListener('click',()=>setView('cards'));
  document.getElementById('searchInput').addEventListener('input',(e)=>setQuery(e.target.value));
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  loadData();
});
