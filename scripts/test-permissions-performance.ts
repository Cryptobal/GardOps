#!/usr/bin/env tsx

/**
 * Script para probar el rendimiento de la carga de permisos
 * Compara el tiempo de carga con y sin el contexto global
 */

import { performance } from 'perf_hooks';

// Simular la función fetchCan
async function mockFetchCan(perm: string): Promise<boolean> {
  // Simular latencia de red
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
  return Math.random() > 0.5; // 50% de probabilidad de tener permiso
}

// Simular el sistema actual (sin contexto global)
async function testCurrentSystem() {
  console.log('🔍 Probando sistema actual (sin contexto global)...');
  
  const permissions = [
    'home.view',
    'clientes.view',
    'instalaciones.view',
    'guardias.view',
    'pautas.view',
    'pauta-diaria.view',
    'pauta-mensual.view',
    'turnos.view',
    'payroll.view',
    'sueldos.view',
    'ppc.view',
    'documentos.view',
    'reportes.view',
    'asignaciones.view',
    'config.view'
  ];

  const start = performance.now();
  
  // Simular múltiples componentes cargando permisos en paralelo
  const promises = permissions.map(perm => mockFetchCan(perm));
  const results = await Promise.all(promises);
  
  const end = performance.now();
  const duration = end - start;
  
  console.log(`⏱️  Tiempo total: ${duration.toFixed(2)}ms`);
  console.log(`📊 Permisos cargados: ${results.filter(r => r).length}/${results.length}`);
  console.log(`🚀 Promedio por permiso: ${(duration / permissions.length).toFixed(2)}ms`);
  
  return duration;
}

// Simular el sistema optimizado (con contexto global)
async function testOptimizedSystem() {
  console.log('\n🔍 Probando sistema optimizado (con contexto global)...');
  
  const permissions = [
    'home.view',
    'clientes.view',
    'instalaciones.view',
    'guardias.view',
    'pautas.view',
    'pauta-diaria.view',
    'pauta-mensual.view',
    'turnos.view',
    'payroll.view',
    'sueldos.view',
    'ppc.view',
    'documentos.view',
    'reportes.view',
    'asignaciones.view',
    'config.view'
  ];

  const start = performance.now();
  
  // Simular precarga en contexto global
  const preloadStart = performance.now();
  const preloadPromises = permissions.map(perm => mockFetchCan(perm));
  const preloadResults = await Promise.all(preloadPromises);
  const preloadEnd = performance.now();
  
  // Simular acceso rápido desde contexto
  const accessStart = performance.now();
  const accessResults = permissions.map(perm => {
    // Simular acceso instantáneo desde contexto
    return preloadResults[permissions.indexOf(perm)];
  });
  const accessEnd = performance.now();
  
  const totalDuration = accessEnd - start;
  const preloadDuration = preloadEnd - preloadStart;
  const accessDuration = accessEnd - accessStart;
  
  console.log(`⏱️  Tiempo total: ${totalDuration.toFixed(2)}ms`);
  console.log(`📦 Tiempo de precarga: ${preloadDuration.toFixed(2)}ms`);
  console.log(`⚡ Tiempo de acceso: ${accessDuration.toFixed(2)}ms`);
  console.log(`📊 Permisos cargados: ${accessResults.filter(r => r).length}/${accessResults.length}`);
  console.log(`🚀 Promedio por permiso: ${(totalDuration / permissions.length).toFixed(2)}ms`);
  
  return totalDuration;
}

// Función principal
async function main() {
  console.log('🚀 Iniciando prueba de rendimiento de permisos...\n');
  
  try {
    const currentTime = await testCurrentSystem();
    const optimizedTime = await testOptimizedSystem();
    
    const improvement = ((currentTime - optimizedTime) / currentTime) * 100;
    
    console.log('\n📈 Resultados de la comparación:');
    console.log(`🔴 Sistema actual: ${currentTime.toFixed(2)}ms`);
    console.log(`🟢 Sistema optimizado: ${optimizedTime.toFixed(2)}ms`);
    console.log(`📈 Mejora: ${improvement.toFixed(1)}% más rápido`);
    
    if (improvement > 0) {
      console.log('✅ El sistema optimizado es más rápido');
    } else {
      console.log('❌ El sistema optimizado no muestra mejora en esta prueba');
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main().catch(console.error);
}
