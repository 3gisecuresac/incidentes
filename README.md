# Incidentes de Seguridad – Perú & Mundo (GitHub Pages, v2)
- Un **archivo JSON por incidente** en `data/incidents/`.
- La app carga `data/manifest.json` para saber qué archivos leer.

## Agregar un incidente nuevo
1. Crea `data/incidents/004.json` con los campos requeridos.
2. Edita `data/manifest.json` y agrega `"incidents/004.json"` al arreglo `files`.
3. Sube los cambios.

## Campos del JSON por incidente
{id, title, date, country, region, type, actor, impact, source, summary, color (opcional), logo (opcional URL)}

## Personaliza
- Color de marca: `styles.css` → variable `--brand`.
- Logo del header: `assets/logo.svg`.
- El header enlaza a https://3gisecure.com.pe
