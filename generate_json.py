import pandas as pd
import os
import json

# Ruta al Excel de entrada
input_file = "fuente_incidentes.xlsx"

# Carpeta donde se guardarán los JSON
output_folder = "data\incidents"
os.makedirs(output_folder, exist_ok=True)

# Leer Excel
df = pd.read_excel(input_file)

# Recorrer filas y exportar cada una a JSON
for idx, row in df.iterrows():
    data = {
        "id": int(row.get("id", idx+1)),   # ← usa la columna 'id' del Excel
        "title": str(row.get("title", "")),
        "date": str(row.get("date", "")),
        "country": str(row.get("country", "")),
        "region": str(row.get("region", "")),
        "type": str(row.get("type", "")),
        "actor": str(row.get("actor", "")),
        "impact": str(row.get("impact", "")),
        "source": str(row.get("source", "")),
        "summary": str(row.get("summary", "")),
        "color": str(row.get("color", "#a78bfa"))
    }

    # Nombre de archivo: usa el id del Excel, en formato 3 dígitos
    filename = f"{int(data['id']):03}.json"
    filepath = os.path.join(output_folder, filename)

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Archivos JSON generados en la carpeta: {output_folder}")
