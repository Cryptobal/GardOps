#!/usr/bin/env tsx

import { addActivoPautasMensuales } from '../src/lib/migrations/add-activo-pautas-mensuales';

async function main() {
  console.log('🚀 Ejecutando migración: add-activo-pautas-mensuales');
  console.log('=====================================');
  
  try {
    const result = await addActivoPautasMensuales();
    
    if (result.success) {
      console.log('\n✅ MIGRACIÓN EXITOSA');
      console.log(result.message);
      
      if (result.warnings.length > 0) {
        console.log('\n⚠️ ADVERTENCIAS:');
        result.warnings.forEach(warning => console.log(`  - ${warning}`));
      }
    } else {
      console.log('\n❌ MIGRACIÓN FALLÓ');
      console.log(result.message);
      
      if (result.errors.length > 0) {
        console.log('\n🔴 ERRORES:');
        result.errors.forEach(error => console.log(`  - ${error}`));
      }
    }
  } catch (error) {
    console.error('\n💥 ERROR EJECUTANDO MIGRACIÓN:', error);
    process.exit(1);
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  main().then(() => {
    console.log('\n🏁 Migración completada');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
}
