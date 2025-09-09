import { query } from '../src/lib/database';

async function verificarEstructuraRoles() {
  try {
    console.log('🔍 Verificando estructura de as_turnos_roles_servicio...');
    
    // Verificar si la tabla existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'as_turnos_roles_servicio'
      );
    `);
    
    console.log('Tabla existe:', tableExists.rows[0].exists);

    if (!tableExists.rows[0].exists) {
      console.log('❌ La tabla as_turnos_roles_servicio no existe');
      return;
    }

    // Verificar la estructura de la tabla
    const structure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_roles_servicio'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Estructura de la tabla as_turnos_roles_servicio:');
    structure.rows.forEach((column: any) => {
      console.log(`  - ${column.column_name}: ${column.data_type} ${column.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

    // Verificar si hay datos
    const countData = await query(`
      SELECT COUNT(*) as count FROM as_turnos_roles_servicio
    `);
    
    console.log('Total de registros:', countData.rows[0].count);

    if (parseInt(countData.rows[0].count) > 0) {
      // Mostrar algunos registros de ejemplo
      const sampleData = await query(`
        SELECT * FROM as_turnos_roles_servicio LIMIT 3
      `);
      
      console.log('📋 Registros de ejemplo:');
      sampleData.rows.forEach((row: any, index: number) => {
        console.log(`  Registro ${index + 1}:`, JSON.stringify(row, null, 2));
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verificarEstructuraRoles()
    .then(() => {
      console.log('✅ Verificación completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { verificarEstructuraRoles }; 