#!/usr/bin/env tsx

/**
 * Script de prueba rápida del sistema de auditoría
 * Verifica que todas las dependencias estén instaladas y el sistema funcione
 */

import * as fs from 'fs/promises'
import * as path from 'path'

async function testSystem() {
  console.log('🧪 Probando sistema de auditoría de responsividad...\n')
  
  let errors = 0
  
  // 1. Verificar archivos del sistema
  const requiredFiles = [
    'scripts/responsive-audit.ts',
    'scripts/responsive-fixes.ts',
    'scripts/install-audit-deps.sh',
    'playwright.config.ts',
    'reports/README.md',
    'RESPONSIVE_AUDIT_SYSTEM.md'
  ]
  
  console.log('📁 Verificando archivos del sistema...')
  for (const file of requiredFiles) {
    try {
      await fs.access(file)
      console.log(`  ✅ ${file}`)
    } catch {
      console.log(`  ❌ ${file} - FALTANTE`)
      errors++
    }
  }
  
  // 2. Verificar package.json
  console.log('\n📦 Verificando configuración en package.json...')
  try {
    const pkg = JSON.parse(await fs.readFile('package.json', 'utf-8'))
    
    const requiredScripts = [
      'audit:responsive',
      'audit:responsive:report', 
      'audit:fixes-only',
      'audit:install'
    ]
    
    for (const script of requiredScripts) {
      if (pkg.scripts[script]) {
        console.log(`  ✅ Script: ${script}`)
      } else {
        console.log(`  ❌ Script: ${script} - FALTANTE`)
        errors++
      }
    }
    
    const requiredDevDeps = [
      '@playwright/test',
      'tsx',
      '@types/glob',
      'glob'
    ]
    
    for (const dep of requiredDevDeps) {
      if (pkg.devDependencies[dep]) {
        console.log(`  ✅ Dependencia: ${dep}`)
      } else {
        console.log(`  ❌ Dependencia: ${dep} - FALTANTE`)
        errors++
      }
    }
    
  } catch (error) {
    console.log(`  ❌ Error leyendo package.json: ${error}`)
    errors++
  }
  
  // 3. Verificar directorio reports
  console.log('\n📊 Verificando directorio de reportes...')
  try {
    await fs.access('reports')
    console.log('  ✅ Directorio reports existe')
    
    await fs.access('reports/.gitignore')
    console.log('  ✅ .gitignore configurado')
    
  } catch {
    console.log('  ❌ Directorio reports no configurado correctamente')
    errors++
  }
  
  // 4. Verificar que Next.js no esté corriendo (para evitar conflictos en testing)
  console.log('\n🌐 Verificando estado del servidor...')
  try {
    const response = await fetch('http://localhost:3000', { 
      signal: AbortSignal.timeout(1000) 
    })
    console.log('  ⚠️  Next.js está corriendo en puerto 3000')
    console.log('     (Esto es bueno para ejecutar auditorías reales)')
  } catch {
    console.log('  ℹ️  Next.js no está corriendo')
    console.log('     (Ejecuta "npm run dev" antes de auditar)')
  }
  
  // 5. Resumen final
  console.log('\n' + '='.repeat(60))
  if (errors === 0) {
    console.log('🎉 SISTEMA DE AUDITORÍA INSTALADO CORRECTAMENTE')
    console.log('='.repeat(60))
    console.log('\n📋 Comandos disponibles:')
    console.log('  npm run audit:install          - Instalar dependencias')
    console.log('  npm run audit:responsive        - Auditoría completa')
    console.log('  npm run audit:responsive:report - Auditoría + abrir reporte')
    console.log('  npm run audit:fixes-only        - Solo aplicar correcciones')
    console.log('\n🚀 Para empezar:')
    console.log('  1. npm run audit:install')
    console.log('  2. npm run dev (en otra terminal)')
    console.log('  3. npm run audit:responsive')
    
  } else {
    console.log('❌ ERRORES ENCONTRADOS EN EL SISTEMA')
    console.log('='.repeat(60))
    console.log(`\n📊 Total de errores: ${errors}`)
    console.log('\n🔧 Para corregir:')
    console.log('  1. Ejecuta: npm run audit:install')
    console.log('  2. Verifica que todos los archivos estén en su lugar')
    console.log('  3. Ejecuta este test nuevamente: tsx scripts/test-audit-system.ts')
  }
  console.log('='.repeat(60))
}

// Manejar errores
process.on('unhandledRejection', (error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})

if (require.main === module) {
  testSystem().catch(console.error)
} 