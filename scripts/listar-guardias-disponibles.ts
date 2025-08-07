import { query } from '../src/lib/database';

async function listarGuardiasDisponibles() {
  try {
    console.log('👥 Listando guardias disponibles para pruebas...\n');
    
    // Obtener guardias activos con sus IDs
    const resultado = await query(`
      SELECT 
        id,
        nombre,
        apellido_paterno,
        apellido_materno,
        activo,
        created_at
      FROM guardias 
      WHERE activo = true
      ORDER BY nombre, apellido_paterno
      LIMIT 10
    `);
    
    if (resultado.rows.length === 0) {
      console.log('❌ No hay guardias activos en la base de datos');
      return;
    }
    
    console.log('📋 Guardias disponibles para pruebas:');
    console.log('=====================================\n');
    
    resultado.rows.forEach((guardia: any, index: number) => {
      const nombreCompleto = `${guardia.nombre} ${guardia.apellido_paterno} ${guardia.apellido_materno || ''}`.trim();
      console.log(`${index + 1}. ID: ${guardia.id}`);
      console.log(`   Nombre: ${nombreCompleto}`);
      console.log(`   Activo: ${guardia.activo ? 'Sí' : 'No'}`);
      console.log(`   Creado: ${guardia.created_at}`);
      console.log('');
    });
    
    console.log('💡 Para usar en el script de verificación:');
    console.log('   - Copia el ID del guardia que quieras verificar');
    console.log('   - Reemplaza REEMPLAZAR_ID_GUARDIA en verificar-asistencia-guardia.ts');
    console.log('   - O usa el ID directamente en ejemplo-verificar-asistencia.ts');
    
  } catch (error) {
    console.error('❌ Error listando guardias:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  listarGuardiasDisponibles();
}

export { listarGuardiasDisponibles };
