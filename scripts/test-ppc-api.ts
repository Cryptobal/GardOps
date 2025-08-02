import { query } from '../src/lib/database';

async function testPPCApi() {
  console.log('🧪 PROBANDO API DE PPC\n');

  try {
    // Probar la consulta directamente
    const ppcs = await query(`
      SELECT 
        ppc.id,
        ppc.estado,
        ppc.created_at,
        ppc.cantidad_faltante,
        ppc.prioridad,
        ppc.guardia_asignado_id,
        rs.nombre as rol_nombre,
        rs.hora_inicio,
        rs.hora_termino,
        i.nombre as instalacion_nombre,
        i.id as instalacion_id,
        g.nombre_completo as guardia_nombre,
        g.rut as guardia_rut
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      INNER JOIN instalaciones i ON tr.instalacion_id = i.id
      LEFT JOIN guardias g ON ppc.guardia_asignado_id = g.id
      ORDER BY i.nombre, rs.nombre, ppc.created_at DESC
    `);

    console.log(`✅ Consulta exitosa. Encontrados ${ppcs.rows.length} PPCs:`);
    
    ppcs.rows.forEach((ppc: any, index: number) => {
      console.log(`   ${index + 1}. ${ppc.instalacion_nombre} - ${ppc.rol_nombre} (${ppc.estado})`);
    });

  } catch (error) {
    console.error('❌ Error en la consulta:', error);
  }
}

testPPCApi(); 