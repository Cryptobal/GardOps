import { createTurnosInstalacionTable } from '../src/lib/database-migrations';

async function main() {
  console.log('🚀 Iniciando migración de tabla turnos_instalacion...');
  
  try {
    const result = await createTurnosInstalacionTable();
    
    if (result.success) {
      console.log('✅ Migración completada exitosamente');
      console.log(result.message);
      
      if (result.warnings.length > 0) {
        console.log('\n⚠️ Advertencias:');
        result.warnings.forEach(warning => console.log(`  - ${warning}`));
      }
    } else {
      console.error('❌ Error en la migración:');
      result.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

main(); 