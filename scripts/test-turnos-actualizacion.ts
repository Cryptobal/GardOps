import { query } from '../src/lib/database';

async function testTurnosActualizacion() {
  try {
    console.log('🧪 Iniciando prueba de actualización de turnos...');
    
    // Obtener una instalación de prueba
    const instalacionResult = await query(`
      SELECT id, nombre FROM instalaciones 
      WHERE estado = 'Activo' 
      LIMIT 1
    `);
    
    if (instalacionResult.rows.length === 0) {
      console.log('❌ No se encontraron instalaciones activas para la prueba');
      return;
    }
    
    const instalacion = instalacionResult.rows[0];
    console.log(`📋 Instalación de prueba: ${instalacion.nombre} (${instalacion.id})`);
    
    // Obtener un rol de servicio activo
    const rolResult = await query(`
      SELECT id, nombre FROM as_turnos_roles_servicio 
      WHERE estado = 'Activo' 
      LIMIT 1
    `);
    
    if (rolResult.rows.length === 0) {
      console.log('❌ No se encontraron roles de servicio activos para la prueba');
      return;
    }
    
    const rol = rolResult.rows[0];
    console.log(`👥 Rol de servicio: ${rol.nombre} (${rol.id})`);
    
    // Verificar estado actual de turnos
    console.log('\n📊 Estado actual de turnos:');
    const turnosActuales = await query(`
      SELECT 
        tc.id,
        tc.cantidad_guardias,
        rs.nombre as rol_nombre,
        COALESCE(ag_count.count, 0) as guardias_asignados,
        COALESCE(ppc_count.count, 0) as ppc_pendientes
      FROM as_turnos_configuracion tc
      INNER JOIN as_turnos_roles_servicio rs ON tc.rol_servicio_id = rs.id
      LEFT JOIN (
        SELECT 
          tr.rol_servicio_id,
          COUNT(*) as count
        FROM as_turnos_asignaciones ta
        INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
        WHERE tr.instalacion_id = $1 AND ta.estado = 'Activa'
        GROUP BY tr.rol_servicio_id
      ) ag_count ON ag_count.rol_servicio_id = tc.rol_servicio_id
      LEFT JOIN (
        SELECT 
          tr.rol_servicio_id,
          COUNT(*) as count
        FROM as_turnos_ppc ppc
        INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
        WHERE tr.instalacion_id = $1 AND ppc.estado = 'Pendiente'
        GROUP BY tr.rol_servicio_id
      ) ppc_count ON ppc_count.rol_servicio_id = tc.rol_servicio_id
      WHERE tc.instalacion_id = $1
    `, [instalacion.id]);
    
    turnosActuales.rows.forEach((turno: any) => {
      console.log(`  - ${turno.rol_nombre}: ${turno.cantidad_guardias} puestos, ${turno.guardias_asignados} asignados, ${turno.ppc_pendientes} PPCs pendientes`);
    });
    
    // Verificar PPCs existentes
    console.log('\n📋 PPCs existentes:');
    const ppcsExistentes = await query(`
      SELECT 
        ppc.id,
        ppc.cantidad_faltante,
        ppc.estado,
        rs.nombre as rol_nombre
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      WHERE tr.instalacion_id = $1
      ORDER BY ppc.created_at DESC
    `, [instalacion.id]);
    
    ppcsExistentes.rows.forEach((ppc: any) => {
      console.log(`  - PPC ${ppc.id.slice(-4)}: ${ppc.cantidad_faltante} faltantes, estado: ${ppc.estado}, rol: ${ppc.rol_nombre}`);
    });
    
    console.log('\n✅ Prueba completada. Verifica que los números coincidan con la interfaz.');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba
testTurnosActualizacion().then(() => {
  console.log('🏁 Prueba finalizada');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
}); 