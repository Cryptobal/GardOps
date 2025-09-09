// Script para probar el rendimiento de las APIs optimizadas
// Ejecutar con: node scripts/test-performance.js

const API_BASE = 'http://localhost:3000/api';

async function testPerformance() {
  console.log('🚀 Iniciando pruebas de rendimiento...\n');

  const tests = [
    { name: 'Instalaciones API', endpoint: '/instalaciones' },
    { name: 'Comunas API', endpoint: '/comunas' },
    { name: 'Clientes API', endpoint: '/clientes' }
  ];

  for (const test of tests) {
    console.log(`📊 Probando ${test.name}...`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${API_BASE}${test.endpoint}`);
      const data = await response.json();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ ${test.name}: ${duration}ms - ${data.data?.length || 0} registros`);
      
      if (duration > 1000) {
        console.log(`⚠️  ${test.name} es lento (${duration}ms)`);
      }
    } catch (error) {
      console.log(`❌ Error en ${test.name}:`, error.message);
    }
  }

  console.log('\n🎯 Pruebas de rendimiento completadas');
}

// Ejecutar pruebas
testPerformance().catch(console.error); 