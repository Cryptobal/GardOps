#!/bin/bash

echo "🧪 Probando con datos completos del frontend..."

# Crear un archivo JSON temporal con los datos del frontend
cat > /tmp/frontend-data.json << 'EOF'
{
  "instalacion_id": "7e05a55d-8db6-4c20-b51c-509f09d69f74",
  "anio": 2025,
  "mes": 8,
  "actualizaciones": [
    {
      "puesto_id": "909eda4a-e2d7-4ac4-8b66-6f82b276345d",
      "guardia_id": null,
      "anio": 2025,
      "mes": 8,
      "dia": 1,
      "estado": "planificado"
    },
    {
      "puesto_id": "909eda4a-e2d7-4ac4-8b66-6f82b276345d",
      "guardia_id": null,
      "anio": 2025,
      "mes": 8,
      "dia": 2,
      "estado": "libre"
    },
    {
      "puesto_id": "909eda4a-e2d7-4ac4-8b66-6f82b276345d",
      "guardia_id": null,
      "anio": 2025,
      "mes": 8,
      "dia": 3,
      "estado": "libre"
    },
    {
      "puesto_id": "909eda4a-e2d7-4ac4-8b66-6f82b276345d",
      "guardia_id": null,
      "anio": 2025,
      "mes": 8,
      "dia": 4,
      "estado": "libre"
    },
    {
      "puesto_id": "909eda4a-e2d7-4ac4-8b66-6f82b276345d",
      "guardia_id": null,
      "anio": 2025,
      "mes": 8,
      "dia": 5,
      "estado": "planificado"
    },
    {
      "puesto_id": "909eda4a-e2d7-4ac4-8b66-6f82b276345d",
      "guardia_id": null,
      "anio": 2025,
      "mes": 8,
      "dia": 6,
      "estado": "planificado"
    },
    {
      "puesto_id": "909eda4a-e2d7-4ac4-8b66-6f82b276345d",
      "guardia_id": null,
      "anio": 2025,
      "mes": 8,
      "dia": 7,
      "estado": "planificado"
    },
    {
      "puesto_id": "909eda4a-e2d7-4ac4-8b66-6f82b276345d",
      "guardia_id": null,
      "anio": 2025,
      "mes": 8,
      "dia": 8,
      "estado": "planificado"
    },
    {
      "puesto_id": "909eda4a-e2d7-4ac4-8b66-6f82b276345d",
      "guardia_id": null,
      "anio": 2025,
      "mes": 8,
      "dia": 9,
      "estado": "libre"
    },
    {
      "puesto_id": "909eda4a-e2d7-4ac4-8b66-6f82b276345d",
      "guardia_id": null,
      "anio": 2025,
      "mes": 8,
      "dia": 10,
      "estado": "libre"
    }
  ]
}
EOF

curl -X POST http://localhost:3000/api/pauta-mensual/guardar \
  -H "Content-Type: application/json" \
  -d @/tmp/frontend-data.json

echo ""
echo "🧹 Limpiando archivo temporal..."
rm /tmp/frontend-data.json
