console.log('🔍 SISTEMA DE VERIFICACIÓN DE ASISTENCIA DIARIA');
console.log('================================================\n');

console.log('📋 SCRIPTS DISPONIBLES:\n');

console.log('1. 📝 Listar guardias disponibles:');
console.log('   npx ts-node scripts/listar-guardias-disponibles.ts');
console.log('   → Muestra todos los guardias activos con sus IDs\n');

console.log('2. 🔍 Verificar asistencia individual:');
console.log('   npx ts-node scripts/ejemplo-verificar-asistencia.ts');
console.log('   → Verifica la asistencia de un guardia específico\n');

console.log('3. 👥 Verificar asistencia múltiple:');
console.log('   npx ts-node scripts/verificar-multiples-guardias.ts');
console.log('   → Verifica la asistencia de todos los guardias del día\n');

console.log('4. 📖 Ver documentación completa:');
console.log('   cat scripts/README-verificacion-asistencia.md\n');

console.log('🚀 FLUJO RECOMENDADO:');
console.log('   1. Ejecuta "listar-guardias-disponibles" para ver IDs disponibles');
console.log('   2. Ejecuta "ejemplo-verificar-asistencia" con un ID específico');
console.log('   3. Ejecuta "verificar-multiples-guardias" para ver el panorama completo\n');

console.log('📊 EJEMPLO DE SALIDA:');
console.log('   ✅ Guardia con asistencia registrada hoy:');
console.log('   Estado: trabajado');
console.log('   Observaciones: Sin novedades');
console.log('   Reemplazado por: null\n');

console.log('❓ TROUBLESHOOTING:');
console.log('   - Si no hay guardias: Verifica que la tabla guardias tenga datos');
console.log('   - Si no hay asistencia: Verifica que as_turnos_pauta_mensual tenga registros');
console.log('   - Error de conexión: Verifica DATABASE_URL en .env\n');

console.log('💡 TIP: Los scripts usan la fecha actual automáticamente');
console.log('   Para verificar fechas específicas, modifica el código en los scripts\n');

console.log('✅ ¡Listo para usar!');
