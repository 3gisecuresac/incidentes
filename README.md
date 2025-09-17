# Incidentes de Seguridad – Perú & Mundo (GitHub Pages)

Sitio estático listo para publicarse en **GitHub Pages**. Lista incidentes de seguridad con filtros (Perú/Mundo), buscador, dos vistas (tabla/tarjetas) y estadísticas rápidas por tipo.

## 🚀 Publicar en GitHub Pages

1. Crea un repositorio en GitHub, por ejemplo `incidentes-seguridad`.
2. Sube estos archivos a la raíz del repo (`index.html`, `styles.css`, `app.js`, carpeta `data/`).
3. En el repositorio, ve a **Settings → Pages** y elige:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` (o `master`) y carpeta `/ (root)`
4. Guarda. GitHub generará tu sitio en una URL como:
   `https://TU-USUARIO.github.io/incidentes-seguridad`

> ⚠️ Si usas una rama distinta o una carpeta `/docs`, ajusta la configuración en Pages.

## 🧩 Añadir/editar incidentes

Edita `data/incidents.json` con un arreglo de objetos como este:

```json
[
  {
    "id": 1001,
    "title": "Ransomware a entidad pública",
    "date": "2024-11-05",
    "country": "Perú",
    "type": "Ransomware",
    "impact": "Interrupción de servicios, cifrado de servidores",
    "source": "https://enlace-a-fuente-confiable",
    "summary": "Descripción breve del incidente."
  }
]
```

- **country**: usa `Perú` para filtrar local, cualquier otro valor contará como *Mundo*.
- **date**: formato `YYYY-MM-DD`.
- **source**: enlace verificable (CSIRT, informes técnicos, prensa seria).

## 🌐 Dominio propio (opcional)

1. Compra un dominio (Namecheap, GoDaddy, NIC.pe, etc.).
2. En DNS:
   - Para `www.tusitio.com`: crea un **CNAME** a `TU-USUARIO.github.io`.
   - Para raíz `tusitio.com`: crea **A records** a:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
3. En GitHub **Settings → Pages**, coloca tu dominio en **Custom domain**. GitHub emitirá un **SSL** gratis.

## 🧪 Desarrollo local

Puedes abrir `index.html` directamente en el navegador. En producción (GitHub Pages), los datos se leen desde `data/incidents.json`.

---

Hecho con ❤️. Mejora el sitio agregando paginación, categorías, o gráficos (p. ej., con una librería sin necesidad de build).
