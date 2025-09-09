import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function testTurnosQuery() {
  console.log('🧪 PROBANDO CONSULTA SQL DE TURNOS');
  console.log('=====================================\n');

  const instalacionId = '7e05a55d-8db6-4c20-b51c-509f09d69f74';

  try {
    console.log('1️⃣ Probando consulta simple...');
    
    const simpleResult = await query(`
      SELECT COUNT(*) as total
      FROM as_turnos_puestos_operativos po
      WHERE po.instalacion_id = $1
    `, [instalacionId]);
    
    console.log(`✅ Total puestos: ${simpleResult.rows[0].total}`);

    console.log('\n2️⃣ Probando JOIN con roles...');
    
    const joinResult = await query(`
      SELECT 
        po.id,
        po.rol_id,
        rs.nombre as rol_nombre
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1
      LIMIT 5
    `, [instalacionId]);
    
    console.log(`✅ JOIN exitoso: ${joinResult.rows.length} registros`);
    joinResult.rows.forEach((row: any, index: number) => {
      console.log(`   ${index + 1}. Rol: ${row.rol_nombre} (${row.rol_id})`);
    });

    console.log('\n3️⃣ Probando consulta completa...');
    
    const fullResult = await query(`
      SELECT 
        rs.id as rol_id,
        rs.nombre as rol_nombre,
        COUNT(*) as total_puestos,
        COUNT(CASE WHEN po.guardia_id IS NOT NULL THEN 1 END) as guardias_asignados,
        COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as ppc_pendientes
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1
      GROUP BY rs.id, rs.nombre
      ORDER BY rs.nombre
    `, [instalacionId]);
    
    console.log(`✅ Consulta completa exitosa: ${fullResult.rows.length} turnos`);
    fullResult.rows.forEach((row: any) => {
      console.log(`   • ${row.rol_nombre}: ${row.total_puestos} puestos, ${row.guardias_asignados} asignados, ${row.ppc_pendientes} PPCs`);
    });

  } catch (error) {
    console.error('❌ Error en la consulta:', error);
  }
}

testTurnosQuery().then(() => {
  console.log('\n🎉 Script completado');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
}); 