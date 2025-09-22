/* app.js (root-paths) — usa manifest.json e incidents.bundle.json en la RAÍZ del sitio
   Estructura esperada:
   /index.html
   /app.js  (este archivo)
   /manifest.json
   /incidents.bundle.json
   /incidents/001.json, 002.json, ...
*/

const state = {
  data: [],
  filtered: [],
  query: "",
  region: "all",
  page: 1,
  pageSize: 20,
  view: "table",
  sort: { key: "date", dir: "desc" },
};

function debounce(fn, ms = 150) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
function formatDate(d){ if(!d) return ""; const dt=(d instanceof Date)?d:new Date(d); return isNaN(dt)? "": dt.toISOString().slice(0,10); }
function toText(v){ if(v==null) return ""; if(typeof v==="string") return v; try{return JSON.stringify(v)}catch{return String(v)} }

function normalize(list){
  const arr = Array.isArray(list) ? list : [list];
  return arr.map((x, i) => {
    const o = { ...x };
    o.id = o.id ?? o.ID ?? o.codigo ?? `row_${i+1}`;
    o.title = o.title ?? o.titulo ?? o.asunto ?? o.name ?? "(Sin título)";
    o.region = o.region ?? o["región"] ?? o.zona ?? o.departamento ?? "N/A";
    o.status = o.status ?? o.estado ?? "N/A";
    o.severity = o.severity ?? o.severidad ?? o.gravedad ?? "N/A";
    const dt = o.date ?? o.fecha ?? o.fechahora ?? o.created_at ?? o.createdAt;
    o.date = dt ? new Date(dt) : null;
    o.description = o.description ?? o.descripcion ?? o.detalle ?? "";
    return o;
  });
}

async function fetchWithConcurrency(urls, limit = 12){
  const results = new Array(urls.length);
  let i = 0;
  async function worker(){
    while(i < urls.length){
      const idx = i++; const u = urls[idx];
      try{
        const r = await fetch(u, { cache: "no-store" });
        if(!r.ok) throw new Error("HTTP " + r.status);
        results[idx] = await r.json();
      }catch(e){
        console.warn("Fetch fail", u, e);
        results[idx] = null;
      }
    }
  }
  await Promise.all(Array.from({length: Math.min(limit, urls.length||1)}, worker));
  return results.filter(Boolean).flat();
}

async function loadData(){
  initTheme();
  if (window.matchMedia && window.matchMedia("(max-width: 640px)").matches) {
    state.view = "cards";
    document.getElementById("btnTable")?.classList.remove("active");
    document.getElementById("btnCards")?.classList.add("active");
  }
  try {
    // LEE DESDE LA RAÍZ
    const res = await fetch("./manifest.json", { cache: "no-store" });
    const manifest = await res.json();

    let loaded = false;

    if (manifest.bundle) {
      try {
        const r = await fetch("./" + manifest.bundle, { cache: "no-store" });
        if (r.ok) {
          const list = await r.json();
          state.data = normalize(list);
          loaded = true;
        } else {
          console.warn("Bundle no disponible:", r.status);
        }
      } catch (e) {
        console.warn("Error leyendo bundle, fallback a files:", e);
      }
    }

    if (!loaded) {
      const files = Array.isArray(manifest.files) ? manifest.files : [];
      if (files.length) {
        const urls = files.map(f => "./" + f);
        const loadedList = await fetchWithConcurrency(urls, 12);
        state.data = normalize(loadedList);
      } else {
        state.data = [];
      }
    }
  } catch (e) {
    console.error("Error leyendo datos", e);
    state.data = [];
  }

  buildRegionFilters();
  applyFilters();
  render();
}

function applyFilters(){
  const q = state.query.trim().toLowerCase();
  const reg = state.region;
  let arr = state.data;
  if (reg && reg !== "all") {
    arr = arr.filter(r => String(r.region).toLowerCase() === String(reg).toLowerCase());
  }
  if (q) {
    arr = arr.filter(r => {
      const hay = [r.id, r.title, r.description, r.region, r.status, r.severity, formatDate(r.date)]
        .map(toText).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }
  const {key, dir} = state.sort; const mul = dir==="desc" ? -1 : 1;
  arr = arr.slice().sort((a,b)=>{
    if (key==="date") {
      const ta = a.date ? a.date.getTime():0;
      const tb = b.date ? b.date.getTime():0;
      return (ta - tb) * mul;
    }
    const va = toText(a[key]).toLowerCase();
    const vb = toText(b[key]).toLowerCase();
    return va<vb ? -1*mul : va>vb ? 1*mul : 0;
  });
  state.filtered = arr;
  const maxPage = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
  if (state.page > maxPage) state.page = maxPage;
  updateCounters();
}

function setQuery(q){ state.query=q; state.page=1; applyFilters(); render(); }
function setRegion(r){ state.region=r; state.page=1; applyFilters(); render(); }
function setView(v){ if(state.view===v) return; state.view=v;
  document.getElementById("btnTable")?.classList.toggle("active", v==="table");
  document.getElementById("btnCards")?.classList.toggle("active", v==="cards");
  render();
}
function setPage(p){ const maxPage = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
  state.page = Math.min(Math.max(1, p), maxPage); render();
}
function setSort(key){ if(state.sort.key===key){ state.sort.dir = state.sort.dir==="asc"?"desc":"asc"; }
  else { state.sort.key=key; state.sort.dir="asc"; } applyFilters(); render(); }

function render(){
  const container = document.getElementById("results"); if(!container) return;
  container.innerHTML = "";
  const start = (state.page - 1) * state.pageSize;
  const end = start + state.pageSize;
  const slice = state.filtered.slice(start, end);
  if (state.view==="table") container.appendChild(renderTable(slice));
  else container.appendChild(renderCards(slice));
  renderPagination();
}

function renderTable(rows){
  const table = document.createElement("table"); table.className="incidents-table";
  const thead = document.createElement("thead"); const trh = document.createElement("tr");
  [
    { key: "id", label: "ID" },
    { key: "title", label: "Título" },
    { key: "region", label: "Región" },
    { key: "status", label: "Estado" },
    { key: "severity", label: "Severidad" },
    { key: "date", label: "Fecha" },
  ].forEach(col=>{
    const th=document.createElement("th"); th.textContent=col.label; th.style.cursor="pointer";
    th.addEventListener("click",()=>setSort(col.key));
    if(state.sort.key===col.key){ th.textContent = col.label + (state.sort.dir==="asc"?" ▲":" ▼"); }
    trh.appendChild(th);
  }); thead.appendChild(trh); table.appendChild(thead);
  const tbody=document.createElement("tbody");
  rows.forEach(r=>{
    const tr=document.createElement("tr");
    tr.innerHTML = `<td>${toText(r.id)}</td>
      <td>${toText(r.title)}</td>
      <td>${toText(r.region)}</td>
      <td>${toText(r.status)}</td>
      <td>${toText(r.severity)}</td>
      <td>${formatDate(r.date)}</td>`;
    tbody.appendChild(tr);
  }); table.appendChild(tbody); return table;
}

function renderCards(rows){
  const wrap=document.createElement("div"); wrap.className="cards-wrap";
  rows.forEach(r=>{
    const card=document.createElement("article"); card.className="card";
    card.innerHTML = `<header class="card-header">
        <h3>${toText(r.title)}</h3>
        <div class="badges">
          <span class="badge region">${toText(r.region)}</span>
          <span class="badge status">${toText(r.status)}</span>
          <span class="badge severity">${toText(r.severity)}</span>
          <span class="badge date">${formatDate(r.date)}</span>
        </div>
      </header>
      <div class="card-body"><p>${toText(r.description)}</p></div>
      <footer class="card-footer"><small>ID: ${toText(r.id)}</small></footer>`;
    wrap.appendChild(card);
  }); return wrap;
}

function renderPagination(){
  const el=document.getElementById("pagination"); if(!el) return;
  const total=state.filtered.length; const maxPage=Math.max(1, Math.ceil(total/state.pageSize)); const p=state.page;
  el.innerHTML=""; const mk=(txt,to,dis=false)=>{const b=document.createElement("button"); b.textContent=txt; b.disabled=dis; b.onclick=()=>setPage(to); return b;};
  el.appendChild(mk("« Primero",1,p===1));
  el.appendChild(mk("‹ Anterior",p-1,p===1));
  const info=document.createElement("span"); info.className="page-info";
  const start=(p-1)*state.pageSize+1; const end=Math.min(p*state.pageSize,total);
  info.textContent = total ? `${start}–${end} de ${total}` : "0 resultados";
  el.appendChild(info);
  el.appendChild(mk("Siguiente ›",p+1,p>=maxPage));
  el.appendChild(mk("Último »",maxPage,p>=maxPage));
  const sel=document.createElement("select");
  [10,20,25,50,100].forEach(n=>{const o=document.createElement("option"); o.value=String(n); o.textContent=`${n}/página`; if(n===state.pageSize) o.selected=true; sel.appendChild(o);});
  sel.onchange=(e)=>{ state.pageSize=parseInt(e.target.value,10); state.page=1; render(); };
  el.appendChild(sel);
}

function updateCounters(){ const total=state.filtered.length; const el=document.getElementById("totalCount"); if(el) el.textContent=String(total); }

function buildRegionFilters(){
  const box=document.getElementById("regionButtons"); if(!box) return;
  box.innerHTML="";
  const set=new Set(state.data.map(r=>String(r.region||"N/A")));
  const regions=["all", ...Array.from(set).sort((a,b)=>a.localeCompare(b))];
  regions.forEach(r=>{
    const btn=document.createElement("button");
    btn.className="region-btn"; btn.dataset.value=r;
    btn.textContent = r==="all" ? "Todas" : r;
    btn.classList.toggle("active", state.region===r);
    btn.onclick=()=>{
      document.querySelectorAll("#regionButtons .region-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active"); setRegion(r);
    }; box.appendChild(btn);
  });
}

function initTheme(){ try{ const saved=localStorage.getItem("theme") || "auto"; applyTheme(saved);}catch{} }
function toggleTheme(){ const cur=document.documentElement.dataset.theme||"auto";
  const next = cur==="light" ? "dark" : (cur==="dark" ? "auto" : "light");
  applyTheme(next); try{localStorage.setItem("theme", next);}catch{} }
function applyTheme(mode){ document.documentElement.dataset.theme=mode; const btn=document.getElementById("themeToggle");
  if(btn) btn.textContent = mode==="dark"?"🌙":(mode==="light"?"☀️":"🌓"); }

document.addEventListener("DOMContentLoaded", ()=>{
  document.getElementById("btnTable")?.addEventListener("click", ()=>setView("table"));
  document.getElementById("btnCards")?.addEventListener("click", ()=>setView("cards"));
  document.getElementById("searchInput")?.addEventListener("input", debounce(e=>setQuery(e.target.value),150));
  document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);
  loadData();
});
