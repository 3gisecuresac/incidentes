const state={region:'Todos',view:'table',q:'',data:[]};

async function loadData(){
  try{
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
  }
  buildRegionButtons();
  render();
}
function normalize(items){
  return items.map((i,idx)=>({
    id:i.id||idx+1,title:i.title||'Incidente sin título',date:i.date||'1970-01-01',
    country:i.country||'Mundo',region:i.region||'Mundo',type:i.type||'Otro',actor:i.actor||'Desconocido',
    impact:i.impact||'',source:i.source||'#',summary:i.summary||'',color:i.color||null,logo:i.logo||null
  })).sort((a,b)=>a.date<b.date?1:-1);
}
function setRegion(r){ state.region=r; document.querySelectorAll('.seg-btn').forEach(b=>b.classList.toggle('active',b.textContent===r)); render(); }
function setView(view){ state.view=view; document.getElementById('btnTable').classList.toggle('active',view==='table'); document.getElementById('btnCards').classList.toggle('active',view==='cards'); render(); }
function setQuery(q){ state.q=q; render(); }
function formatDate(iso){ try{ const d=new Date(iso+'T00:00:00'); return d.toLocaleDateString('es-PE',{year:'numeric',month:'short',day:'2-digit'});}catch{ return iso; } }
function filtered(){
  return state.data
    .filter(i=> state.region==='Todos' ? true : i.region===state.region)
    .filter(i=>{ if(!state.q.trim()) return true; const s=[i.title,i.type,i.country,i.region,i.summary||'',i.impact||'',i.actor||''].join(' ').toLowerCase(); return s.includes(state.q.toLowerCase()); });
}
function computeStats(items){ const total=items.length, byType={}, byRegion={}; for(const it of items){ byType[it.type]=(byType[it.type]||0)+1; byRegion[it.region]=(byRegion[it.region]||0)+1; } return {total,byType,byRegion}; }
function applyBadgeColor(el,color){ if(!color) return; el.style.background=color+'1A'; el.style.borderColor=color; el.style.color='#0f172a'; }

function render(){
  const items=filtered(), stats=computeStats(items);
  document.getElementById('statTotal').textContent=stats.total;
  const byType=document.getElementById('statByType'); byType.innerHTML=''; Object.entries(stats.byType).forEach(([k,v])=>{ const span=document.createElement('span'); span.className='chip'; span.textContent=`${k}: ${v}`; byType.appendChild(span); });
  if(Object.keys(stats.byType).length===0){ const s=document.createElement('span'); s.className='chip'; s.textContent='Sin datos'; byType.appendChild(s); }
  const byRegion=document.getElementById('statByRegion'); byRegion.innerHTML=''; Object.entries(stats.byRegion).forEach(([k,v])=>{ const span=document.createElement('span'); span.className='chip'; span.textContent=`${k}: ${v}`; byRegion.appendChild(span); });
  if(Object.keys(stats.byRegion).length===0){ const s=document.createElement('span'); s.className='chip'; s.textContent='Sin datos'; byRegion.appendChild(s); }

  const container=document.getElementById('listContainer'); container.innerHTML='';
  if(state.view==='table'){
    const wrap=document.createElement('div'); wrap.className='table-wrap';
    const table=document.createElement('table');
    const thead=document.createElement('thead'); thead.innerHTML='<tr><th>Fecha</th><th>Título</th><th>País</th><th>Región</th><th>Tipo</th><th>Actor</th><th>Impacto</th><th>Fuente</th></tr>';
    const tbody=document.createElement('tbody');
    if(items.length===0){
      const tr=document.createElement('tr'); const td=document.createElement('td'); td.colSpan=8; td.textContent='No hay incidentes con el filtro actual.'; td.style.color='#64748b'; td.style.textAlign='center'; td.style.padding='24px'; tr.appendChild(td); tbody.appendChild(tr);
    }else{
      for(const i of items){
        const tr=document.createElement('tr');
        tr.innerHTML = `
          <td>${formatDate(i.date)}</td>
          <td><div style="font-weight:600;display:flex;align-items:center;gap:8px;">${i.logo?`<img src="${i.logo}" alt="" style="width:18px;height:18px;border-radius:4px;">`:''}${i.title}</div><div style="color:#64748b;font-size:12px;">${i.summary||''}</div></td>
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
    if(items.length===0){ const card=document.createElement('div'); card.className='card card-incident'; card.innerHTML='<p style="color:#64748b;text-align:center;">No hay incidentes con el filtro actual.</p>'; grid.appendChild(card); }
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
}
function buildRegionButtons(){
  const parent=document.getElementById('regionButtons'); parent.innerHTML='';
  const regions=Array.from(new Set(state.data.map(i=>i.region))).sort();
  const all=['Todos',...regions];
  all.forEach(r=>{ const btn=document.createElement('button'); btn.className='seg-btn'+(r===state.region?' active':''); btn.textContent=r; btn.addEventListener('click',()=>setRegion(r)); parent.appendChild(btn); });
}
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('btnTable').addEventListener('click',()=>setView('table'));
  document.getElementById('btnCards').addEventListener('click',()=>setView('cards'));
  document.getElementById('searchInput').addEventListener('input',(e)=>setQuery(e.target.value));
  loadData();
});
