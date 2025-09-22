/* app.js — versión escalable para 10k+ registros
   Mantiene el esquema y UI (tabla / tarjetas / filtros / búsqueda / paginación)
   Claves:
   - Usa un único bundle (data/incidents.bundle.json) si está en manifest.json -> { "bundle": "incidents.bundle.json" }
   - Fallback: carga con concurrencia limitada si solo hay lista de archivos
   - Debounce en el buscador para suavizar UX con grandes volúmenes
*/

// --------------------------- Estado global ---------------------------
const state = {
  data: [],        // todos los incidentes normalizados
  filtered: [],    // datos tras filtros/búsqueda/orden
  query: "",
  region: "all",
  page: 1,
  pageSize: 20,    // puedes subir a 25-50 si quieres
  view: "table",   // 'table' | 'cards' (se cambia por móvil automáticamente)
  sort: { key: "date", dir: "desc" }, // orden por defecto
};

// --------------------------- Utilidades ---------------------------
function debounce(fn, ms = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function formatDate(d) {
  if (!d) return "";
  try {
    const dt = (d instanceof Date) ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10); // YYYY-MM-DD
  } catch {
    return "";
  }
}

function toText(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  try { return JSON.stringify(v); } catch { return String(v); }
}

// Asegura campos comunes sin cambiar tu esquema de origen
function normalize(list) {
  // list puede ser arreglo de objetos o anidado
  const arr = Array.isArray(list) ? list : [list];
  return arr.map((x, idx) => {
    const o = { ...x };

    // alias/comunes esperados
    o.id = o.id ?? o.ID ?? o.codigo ?? `row_${idx+1}`;
    o.title = o.title ?? o.titulo ?? o.asunto ?? o.name ?? "(Sin título)";
    o.region = o.region ?? o.región ?? o.zona ?? o.departamento ?? "N/A";
    o.status = o.status ?? o.estado ?? "N/A";
    o.severity = o.severity ?? o.severidad ?? o.gravedad ?? "N/A";
    // intenta mapear fecha
    const dt = o.date ?? o.fecha ?? o.fechahora ?? o.created_at ?? o.createdAt;
    o.date = dt ? new Date(dt) : null;
    o.description = o.description ?? o.descripcion ?? o.detalle ?? "";

    return o;
  });
}

// Concurrencia limitada para fallback con muchos archivos
async function fetchWithConcurrency(urls, limit = 12) {
  const results = new Array(urls.length);
  let i = 0;
  async function worker() {
    while (i < urls.length) {
      const idx = i++;
      const u = urls[idx];
      try {
        const r = await fetch(u, { cache: "no-store" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        results[idx] = await r.json();
      } catch (e) {
        console.warn("Fetch fail", u, e);
        results[idx] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, urls.length || 1) }, worker));
  return results.filter(Boolean).flat();
}

// --------------------------- Carga de datos ---------------------------
async function loadData() {
  initTheme();

  // móvil → tarjetas por defecto (mantiene tu comportamiento)
  if (window.matchMedia && window.matchMedia("(max-width: 640px)").matches) {
    state.view = "cards";
    const btnTable = document.getElementById("btnTable");
    const btnCards = document.getElementById("btnCards");
    btnTable && btnTable.classList.remove("active");
    btnCards && btnCards.classList.add("active");
  }

  try {
    const res = await fetch("./data/manifest.json", { cache: "no-store" });
    const manifest = await res.json();

    // 1) Preferir bundle: 1 sola petición (escala a 10k+)
    if (manifest.bundle) {
      const r = await fetch("./data/" + manifest.bundle, { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const list = await r.json();
      state.data = normalize(list);
    } else {
      // 2) Respaldo: múltiples archivos con concurrencia limitada
      const files = Array.isArray(manifest.files) ? manifest.files : [];
      const urls = files.map((f) => "./data/" + f);
      const loaded = await fetchWithConcurrency(urls, 12);
      state.data = normalize(loaded);
    }
  } catch (e) {
    console.error("Error leyendo datos", e);
    state.data = [];
  }

  buildRegionFilters();
  applyFilters();
  render();
}

// --------------------------- Filtros / Orden ---------------------------
function applyFilters() {
  const q = state.query.trim().toLowerCase();
  const reg = state.region;

  let arr = state.data;

  if (reg && reg !== "all") {
    arr = arr.filter((r) => String(r.region).toLowerCase() === String(reg).toLowerCase());
  }

  if (q) {
    arr = arr.filter((r) => {
      const haystack = [
        r.id, r.title, r.description, r.region, r.status, r.severity, formatDate(r.date)
      ].map(toText).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }

  // Ordenar
  const { key, dir } = state.sort;
  const mul = dir === "desc" ? -1 : 1;
  arr = arr.slice().sort((a, b) => {
    let va = a[key], vb = b[key];
    if (key === "date") {
      const ta = a.date ? a.date.getTime() : 0;
      const tb = b.date ? b.date.getTime() : 0;
      return (ta - tb) * mul;
    }
    va = toText(va).toLowerCase();
    vb = toText(vb).toLowerCase();
    if (va < vb) return -1 * mul;
    if (va > vb) return  1 * mul;
    return 0;
  });

  state.filtered = arr;
  // si página actual se sale de rango, reajusta
  const maxPage = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
  if (state.page > maxPage) state.page = maxPage;

  updateCounters();
}

function setQuery(q) {
  state.query = q;
  state.page = 1;
  applyFilters();
  render();
}

function setRegion(r) {
  state.region = r;
  state.page = 1;
  applyFilters();
  render();
}

function setView(v) {
  if (state.view === v) return;
  state.view = v;
  const btnTable = document.getElementById("btnTable");
  const btnCards = document.getElementById("btnCards");
  if (btnTable && btnCards) {
    btnTable.classList.toggle("active", v === "table");
    btnCards.classList.toggle("active", v === "cards");
  }
  render();
}

function setPage(p) {
  const maxPage = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
  state.page = Math.min(Math.max(1, p), maxPage);
  render();
}

function setSort(key) {
  if (state.sort.key === key) {
    state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
  } else {
    state.sort.key = key;
    state.sort.dir = "asc";
  }
  applyFilters();
  render();
}

// --------------------------- Render ---------------------------
function render() {
  const container = document.getElementById("results");
  if (!container) return;
  container.innerHTML = "";

  const start = (state.page - 1) * state.pageSize;
  const end = start + state.pageSize;
  const pageSlice = state.filtered.slice(start, end);

  if (state.view === "table") {
    container.appendChild(renderTable(pageSlice));
  } else {
    container.appendChild(renderCards(pageSlice));
  }

  renderPagination();
}

function renderTable(rows) {
  const table = document.createElement("table");
  table.className = "incidents-table";

  const thead = document.createElement("thead");
  const hdr = document.createElement("tr");
  [
    { key: "id", label: "ID" },
    { key: "title", label: "Título" },
    { key: "region", label: "Región" },
    { key: "status", label: "Estado" },
    { key: "severity", label: "Severidad" },
    { key: "date", label: "Fecha" },
  ].forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col.label;
    th.style.cursor = "pointer";
    th.addEventListener("click", () => setSort(col.key));
    if (state.sort.key === col.key) {
      const arrow = state.sort.dir === "asc" ? " ▲" : " ▼";
      th.textContent = col.label + arrow;
    }
    hdr.appendChild(th);
  });
  thead.appendChild(hdr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${toText(r.id)}</td>
      <td>${toText(r.title)}</td>
      <td>${toText(r.region)}</td>
      <td>${toText(r.status)}</td>
      <td>${toText(r.severity)}</td>
      <td>${formatDate(r.date)}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  return table;
}

function renderCards(rows) {
  const wrap = document.createElement("div");
  wrap.className = "cards-wrap";
  rows.forEach((r) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <header class="card-header">
        <h3>${toText(r.title)}</h3>
        <div class="badges">
          <span class="badge region">${toText(r.region)}</span>
          <span class="badge status">${toText(r.status)}</span>
          <span class="badge severity">${toText(r.severity)}</span>
          <span class="badge date">${formatDate(r.date)}</span>
        </div>
      </header>
      <div class="card-body">
        <p>${toText(r.description)}</p>
      </div>
      <footer class="card-footer">
        <small>ID: ${toText(r.id)}</small>
      </footer>
    `;
    wrap.appendChild(card);
  });
  return wrap;
}

function renderPagination() {
  const el = document.getElementById("pagination");
  if (!el) return;

  const total = state.filtered.length;
  const maxPage = Math.max(1, Math.ceil(total / state.pageSize));
  const p = state.page;

  el.innerHTML = "";
  const mkBtn = (txt, toPage, disabled = false) => {
    const b = document.createElement("button");
    b.textContent = txt;
    b.disabled = disabled;
    b.addEventListener("click", () => setPage(toPage));
    return b;
    };

  el.appendChild(mkBtn("« Primero", 1, p === 1));
  el.appendChild(mkBtn("‹ Anterior", p - 1, p === 1));

  const info = document.createElement("span");
  info.className = "page-info";
  const start = (p - 1) * state.pageSize + 1;
  const end = Math.min(p * state.pageSize, total);
  info.textContent = total ? `${start}–${end} de ${total}` : "0 resultados";
  el.appendChild(info);

  el.appendChild(mkBtn("Siguiente ›", p + 1, p >= maxPage));
  el.appendChild(mkBtn("Último »", maxPage, p >= maxPage));

  // selector de tamaño de página
  const sel = document.createElement("select");
  [10, 20, 25, 50, 100].forEach(n => {
    const opt = document.createElement("option");
    opt.value = String(n);
    opt.textContent = `${n}/página`;
    if (n === state.pageSize) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener("change", (e) => {
    state.pageSize = parseInt(e.target.value, 10);
    state.page = 1;
    render();
  });
  el.appendChild(sel);
}

function updateCounters() {
  const total = state.filtered.length;
  const totalEl = document.getElementById("totalCount");
  if (totalEl) totalEl.textContent = String(total);
}

// --------------------------- Filtros de región ---------------------------
function buildRegionFilters() {
  const box = document.getElementById("regionButtons");
  if (!box) return;
  box.innerHTML = "";

  const set = new Set(state.data.map(r => String(r.region || "N/A")));
  const regions = ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];

  regions.forEach((r) => {
    const btn = document.createElement("button");
    btn.className = "region-btn";
    btn.dataset.value = r;
    btn.textContent = r === "all" ? "Todas" : r;
    btn.classList.toggle("active", state.region === r);
    btn.addEventListener("click", () => {
      document.querySelectorAll("#regionButtons .region-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      setRegion(r);
    });
    box.appendChild(btn);
  });
}

// --------------------------- Tema (claro/oscuro) ---------------------------
function initTheme() {
  try {
    const saved = localStorage.getItem("theme") || "auto";
    applyTheme(saved);
  } catch {}
}

function toggleTheme() {
  const cur = document.documentElement.dataset.theme || "auto";
  const next = cur === "light" ? "dark" : (cur === "dark" ? "auto" : "light");
  applyTheme(next);
  try { localStorage.setItem("theme", next); } catch {}
}

function applyTheme(mode) {
  document.documentElement.dataset.theme = mode;
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = mode === "dark" ? "🌙" : (mode === "light" ? "☀️" : "🌓");
}

// --------------------------- Bootstrap ---------------------------
document.addEventListener("DOMContentLoaded", () => {
  const btnTable = document.getElementById("btnTable");
  const btnCards = document.getElementById("btnCards");
  const search = document.getElementById("searchInput");
  const theme = document.getElementById("themeToggle");

  btnTable && btnTable.addEventListener("click", () => setView("table"));
  btnCards && btnCards.addEventListener("click", () => setView("cards"));
  search && search.addEventListener("input", debounce((e) => setQuery(e.target.value), 150));
  theme && theme.addEventListener("click", toggleTheme);

  loadData();
});
