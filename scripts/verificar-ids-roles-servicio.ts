import { query } from '../src/lib/database';

// Función para validar UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

async function verificarIdsRolesServicio() {
  try {
    console.log('🔍 Verificando IDs de roles de servicio...');
    
    // Obtener todos los roles de servicio
    const result = await query(`
      SELECT id, nombre, estado, created_at 
      FROM as_turnos_roles_servicio 
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 Total de roles encontrados: ${result.rows.length}`);
    
    const rolesInvalidos = [];
    const rolesValidos = [];
    
    for (const rol of result.rows) {
      if (isValidUUID(rol.id)) {
        rolesValidos.push(rol);
      } else {
        rolesInvalidos.push(rol);
      }
    }
    
    console.log(`✅ Roles con IDs válidos: ${rolesValidos.length}`);
    console.log(`❌ Roles con IDs inválidos: ${rolesInvalidos.length}`);
    
    if (rolesInvalidos.length > 0) {
      console.log('\n🚨 Roles con IDs inválidos:');
      rolesInvalidos.forEach(rol => {
        console.log(`  - ID: "${rol.id}" | Nombre: "${rol.nombre}" | Estado: ${rol.estado}`);
      });
      
      console.log('\n💡 Recomendaciones:');
      console.log('  1. Revisar si estos roles fueron creados durante pruebas');
      console.log('  2. Si son datos de prueba, eliminarlos');
      console.log('  3. Si son datos importantes, migrar a UUIDs válidos');
    }
    
    if (rolesValidos.length > 0) {
      console.log('\n✅ Ejemplos de roles válidos:');
      rolesValidos.slice(0, 3).forEach(rol => {
        console.log(`  - ID: ${rol.id} | Nombre: "${rol.nombre}" | Estado: ${rol.estado}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error verificando roles de servicio:', error);
  }
}

// Ejecutar la verificación
verificarIdsRolesServicio()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en la verificación:', error);
    process.exit(1);
  });
