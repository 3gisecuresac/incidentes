# Incidentes – v3 con paginación
- Paginación con selector de tamaño de página (5/10/20/50) y botones Anterior/Siguiente + numeración.
- Un archivo por incidente en `data/incidents/`, listado por `data/manifest.json`.

## Uso
1. Para agregar un incidente, crea `data/incidents/NNN.json` y añádelo a `data/manifest.json`.
2. Sube todo a la raíz del repo que usa GitHub Pages.

## Campos por incidente
{id, title, date, country, region, type, actor, impact, source, summary, color?, logo?}
