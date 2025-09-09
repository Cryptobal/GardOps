import { query } from '../src/lib/database';

async function checkRequisitosStructure() {
  console.log('🔍 VERIFICANDO ESTRUCTURA DE as_turnos_requisitos\n');

  try {
    // Verificar estructura
    const structure = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_requisitos'
      ORDER BY ordinal_position
    `);
    
    console.log('   Campos encontrados:');
    structure.rows.forEach((col: any) => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
    });

    // Verificar datos
    const data = await query(`
      SELECT COUNT(*) as total_requisitos
      FROM as_turnos_requisitos
    `);
    console.log(`\n   Total requisitos: ${data.rows[0].total_requisitos}`);

    // Verificar algunos datos de ejemplo
    const sampleData = await query(`
      SELECT tr.id, tr.instalacion_id, tr.rol_servicio_id, rs.nombre as rol_nombre, i.nombre as instalacion_nombre
      FROM as_turnos_requisitos tr
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      INNER JOIN instalaciones i ON tr.instalacion_id = i.id
      LIMIT 3
    `);

    console.log('\n   Datos de ejemplo:');
    sampleData.rows.forEach((row: any) => {
      console.log(`   - ${row.instalacion_nombre}: ${row.rol_nombre}`);
    });

  } catch (error) {
    console.error('Error verificando estructura:', error);
  }
}

checkRequisitosStructure();