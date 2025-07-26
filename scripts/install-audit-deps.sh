#!/bin/bash

echo "🚀 Instalando dependencias para auditoría de responsividad..."

# Instalar dependencias principales
npm install --save-dev @playwright/test tsx @types/glob glob

# Instalar navegadores de Playwright
echo "📦 Instalando navegadores de Playwright..."
npx playwright install

# Verificar instalación
echo "✅ Verificando instalación..."
if command -v npx playwright --version &> /dev/null; then
    echo "✅ Playwright instalado correctamente"
else
    echo "❌ Error instalando Playwright"
    exit 1
fi

echo "🎉 Instalación completada!"
echo ""
echo "Comandos disponibles:"
echo "  npm run audit:responsive       - Ejecutar auditoría completa"
echo "  npm run audit:responsive:report - Ejecutar auditoría y abrir reporte"
echo "  tsx scripts/responsive-fixes.ts - Solo aplicar correcciones"
echo ""
echo "Para ejecutar la auditoría, asegúrate de que Next.js esté corriendo:"
echo "  npm run dev" 