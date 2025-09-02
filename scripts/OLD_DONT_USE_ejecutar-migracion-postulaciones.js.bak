#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 EJECUTANDO MIGRACIÓN DE POSTULACIONES');
console.log('==========================================\n');

try {
  // Verificar que existe el archivo de migración
  const migrationFile = path.join(__dirname, 'migrate-add-postulacion-fields.sql');
  
  if (!fs.existsSync(migrationFile)) {
    console.error('❌ No se encontró el archivo de migración');
    process.exit(1);
  }

  console.log('📋 Archivo de migración encontrado');
  console.log('🔧 Ejecutando migración en la base de datos...\n');

  // Ejecutar la migración usando psql
  // Asegúrate de tener las variables de entorno configuradas
  const command = `psql $DATABASE_URL -f "${migrationFile}"`;
  
  console.log('💻 Comando a ejecutar:', command);
  console.log('⏳ Ejecutando...\n');

  const output = execSync(command, { 
    encoding: 'utf8',
    stdio: 'inherit'
  });

  console.log('\n✅ Migración completada exitosamente!');
  console.log('\n📊 RESUMEN DE CAMBIOS:');
  console.log('• Campos agregados a la tabla guardias');
  console.log('• Tabla tenant_webhooks creada');
  console.log('• Tabla tipos_documentos_postulacion creada');
  console.log('• Tabla documentos_postulacion creada');
  console.log('• Tabla webhook_logs creada');
  console.log('• Tabla notificaciones_postulaciones creada');
  console.log('• Índices y constraints agregados');
  
  console.log('\n🎯 PRÓXIMOS PASOS:');
  console.log('1. Reiniciar el servidor de desarrollo');
  console.log('2. Probar el formulario en: /postulacion/{tenant-id}');
  console.log('3. Configurar webhooks en: /configuracion/postulaciones');
  console.log('4. Verificar que los nuevos campos aparecen en la ficha de guardias');

} catch (error) {
  console.error('\n❌ Error ejecutando la migración:', error.message);
  
  if (error.message.includes('psql: command not found')) {
    console.error('\n💡 SOLUCIÓN: Instalar PostgreSQL client o usar Docker');
    console.error('   Docker: docker run --rm -v $(pwd):/workspace postgres:15 psql -h host.docker.internal -U postgres -d gardops -f /workspace/scripts/migrate-add-postulacion-fields.sql');
  }
  
  if (error.message.includes('DATABASE_URL')) {
    console.error('\n💡 SOLUCIÓN: Configurar variable de entorno DATABASE_URL');
    console.error('   Ejemplo: export DATABASE_URL="postgresql://usuario:password@localhost:5432/gardops"');
  }
  
  process.exit(1);
}
