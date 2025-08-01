import { query } from '../src/lib/database';

async function diagnosticarInconsistenciaEstadisticas() {
  console.log('🔍 Diagnosticando inconsistencia en estadísticas de instalación "A Test"...\n');

  try {
    // 1. Buscar la instalación "A Test"
    console.log('1. Buscando instalación "A Test"...');
    const instalacionResult = await query(`
      SELECT id, nombre, estado
      FROM instalaciones 
      WHERE nombre ILIKE '%test%' OR nombre ILIKE '%A Test%'
      ORDER BY nombre
    `);

    if (instalacionResult.rows.length === 0) {
      console.log('❌ No se encontró la instalación "A Test"');
      return;
    }

    const instalacion = instalacionResult.rows[0];
    console.log(`✅ Instalación encontrada: ${instalacion.nombre} (ID: ${instalacion.id})`);

    // 2. Verificar turnos de la instalación
    console.log('\n2. Verificando turnos de la instalación...');
    const turnosResult = await query(`
      SELECT 
        tr.id as turno_id,
        tr.rol_servicio_id,
        tr.cantidad_guardias,
        tr.vigente_desde,
        tr.vigente_hasta,
        tr.estado,
        rs.nombre as rol_nombre,
        COUNT(ppc.id) as ppc_count
      FROM as_turnos_requisitos tr
      LEFT JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      LEFT JOIN as_turnos_ppc ppc ON tr.id = ppc.requisito_puesto_id
      WHERE tr.instalacion_id = $1
      GROUP BY tr.id, tr.rol_servicio_id, tr.cantidad_guardias, tr.vigente_desde, tr.vigente_hasta, tr.estado, rs.nombre
      ORDER BY tr.vigente_desde
    `, [instalacion.id]);

    console.log(`📊 Turnos encontrados: ${turnosResult.rows.length}`);
    turnosResult.rows.forEach((turno: any, index: number) => {
      console.log(`   Turno ${index + 1}: ${turno.cantidad_guardias} guardias, ${turno.rol_nombre || 'Sin rol'}, ${turno.vigente_desde} - ${turno.vigente_hasta || 'Sin fin'}, ${turno.ppc_count} PPC`);
    });

    // 3. Verificar puestos (requisitos) por turno
    console.log('\n3. Verificando puestos por turno...');
    const puestosResult = await query(`
      SELECT 
        tr.id as requisito_id,
        tr.rol_servicio_id,
        tr.cantidad_guardias,
        tr.vigente_desde,
        tr.vigente_hasta,
        tr.estado,
        rs.nombre as rol_nombre
      FROM as_turnos_requisitos tr
      LEFT JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      WHERE tr.instalacion_id = $1
      ORDER BY tr.vigente_desde
    `, [instalacion.id]);

    console.log(`📋 Puestos (requisitos) encontrados: ${puestosResult.rows.length}`);
    puestosResult.rows.forEach((puesto: any, index: number) => {
      console.log(`   Puesto ${index + 1}: ${puesto.cantidad_guardias} guardias, ${puesto.rol_nombre || 'Sin rol'}, ${puesto.vigente_desde} - ${puesto.vigente_hasta || 'Sin fin'}`);
    });

    // 4. Verificar PPC por turno
    console.log('\n4. Verificando PPC por turno...');
    const ppcResult = await query(`
      SELECT 
        ppc.id as ppc_id,
        ppc.estado,
        ppc.cantidad_faltante,
        ppc.motivo,
        ppc.created_at,
        tr.cantidad_guardias,
        tr.vigente_desde,
        tr.vigente_hasta,
        rs.nombre as rol_nombre
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      LEFT JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      WHERE tr.instalacion_id = $1
      ORDER BY tr.vigente_desde, ppc.created_at
    `, [instalacion.id]);

    console.log(`🚨 PPC encontrados: ${ppcResult.rows.length}`);
    const ppcPorEstado = ppcResult.rows.reduce((acc: Record<string, number>, ppc: any) => {
      acc[ppc.estado] = (acc[ppc.estado] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('   Estados de PPC:', ppcPorEstado);

    // 5. Verificar asignaciones activas
    console.log('\n5. Verificando asignaciones activas...');
    const asignacionesResult = await query(`
      SELECT 
        ta.id as asignacion_id,
        ta.estado,
        ta.tipo_asignacion,
        ta.fecha_inicio,
        ta.fecha_termino,
        ta.created_at,
        tr.cantidad_guardias,
        tr.vigente_desde,
        tr.vigente_hasta,
        rs.nombre as rol_nombre
      FROM as_turnos_asignaciones ta
      INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      LEFT JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      WHERE tr.instalacion_id = $1
      ORDER BY tr.vigente_desde, ta.created_at
    `, [instalacion.id]);

    console.log(`👥 Asignaciones encontradas: ${asignacionesResult.rows.length}`);
    const asignacionesPorEstado = asignacionesResult.rows.reduce((acc: Record<string, number>, asig: any) => {
      acc[asig.estado] = (acc[asig.estado] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('   Estados de asignaciones:', asignacionesPorEstado);

    // 6. Ejecutar la consulta actual del endpoint de estadísticas
    console.log('\n6. Ejecutando consulta actual del endpoint de estadísticas...');
    const estadisticasResult = await query(`
      SELECT 
        -- Puestos creados (requisitos de puestos)
        COALESCE(puestos_creados.count, 0) as puestos_creados,
        
        -- Puestos asignados (asignaciones activas)
        COALESCE(puestos_asignados.count, 0) as puestos_asignados,
        
        -- PPC pendientes
        COALESCE(ppc_pendientes.count, 0) as ppc_pendientes,
        
        -- PPC totales
        COALESCE(ppc_totales.count, 0) as ppc_totales
        
      FROM instalaciones i
      
      -- Puestos creados (requisitos de puestos)
      LEFT JOIN (
        SELECT 
          tr.instalacion_id,
          COUNT(*) as count
        FROM as_turnos_requisitos tr
        GROUP BY tr.instalacion_id
      ) puestos_creados ON puestos_creados.instalacion_id = i.id
      
      -- Puestos asignados (asignaciones activas)
      LEFT JOIN (
        SELECT 
          tr.instalacion_id,
          COUNT(*) as count
        FROM as_turnos_asignaciones ta
        INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
        WHERE ta.estado = 'Activa'
        GROUP BY tr.instalacion_id
      ) puestos_asignados ON puestos_asignados.instalacion_id = i.id
      
      -- PPC pendientes
      LEFT JOIN (
        SELECT 
          tr.instalacion_id,
          COUNT(*) as count
        FROM as_turnos_ppc ppc
        INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
        WHERE ppc.estado = 'Pendiente'
        GROUP BY tr.instalacion_id
      ) ppc_pendientes ON ppc_pendientes.instalacion_id = i.id
      
      -- PPC totales
      LEFT JOIN (
        SELECT 
          tr.instalacion_id,
          COUNT(*) as count
        FROM as_turnos_ppc ppc
        INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
        GROUP BY tr.instalacion_id
      ) ppc_totales ON ppc_totales.instalacion_id = i.id
      
      WHERE i.id = $1
    `, [instalacion.id]);

    let stats = null;
    if (estadisticasResult.rows.length > 0) {
      stats = estadisticasResult.rows[0];
      console.log('📈 Estadísticas actuales del endpoint:');
      console.log(`   Puestos creados: ${stats.puestos_creados}`);
      console.log(`   Puestos asignados: ${stats.puestos_asignados}`);
      console.log(`   PPC pendientes: ${stats.ppc_pendientes}`);
      console.log(`   PPC totales: ${stats.ppc_totales}`);
    }

    // 7. Calcular estadísticas reales manualmente
    console.log('\n7. Calculando estadísticas reales manualmente...');
    
    // Total de puestos (suma de cantidad_guardias de todos los requisitos)
    const totalPuestos = puestosResult.rows.reduce((acc: number, puesto: any) => acc + puesto.cantidad_guardias, 0);
    
    // Total de PPC
    const totalPPC = ppcResult.rows.length;
    
    // PPC pendientes
    const ppcPendientes = ppcResult.rows.filter((ppc: any) => ppc.estado === 'Pendiente').length;
    
    // Asignaciones activas
    const asignacionesActivas = asignacionesResult.rows.filter((asig: any) => asig.estado === 'Activa').length;

    console.log('📊 Estadísticas reales calculadas:');
    console.log(`   Total puestos (suma de guardias): ${totalPuestos}`);
    console.log(`   Total PPC: ${totalPPC}`);
    console.log(`   PPC pendientes: ${ppcPendientes}`);
    console.log(`   Asignaciones activas: ${asignacionesActivas}`);

    // 8. Identificar el problema
    console.log('\n8. Análisis del problema...');
    
    if (stats) {
      if (totalPuestos !== stats.puestos_creados) {
        console.log(`❌ PROBLEMA: Los puestos creados no coinciden`);
        console.log(`   Real (suma de guardias): ${totalPuestos}, Endpoint (conteo de requisitos): ${stats.puestos_creados}`);
        console.log(`   El endpoint está contando requisitos (${stats.puestos_creados}) en lugar de la suma de guardias (${totalPuestos})`);
      }
      
      if (totalPPC !== stats.ppc_totales) {
        console.log(`❌ PROBLEMA: Los PPC totales no coinciden`);
        console.log(`   Real: ${totalPPC}, Endpoint: ${stats.ppc_totales}`);
      }
      
      if (ppcPendientes !== stats.ppc_pendientes) {
        console.log(`❌ PROBLEMA: Los PPC pendientes no coinciden`);
        console.log(`   Real: ${ppcPendientes}, Endpoint: ${stats.ppc_pendientes}`);
      }
    }

    console.log('\n✅ Diagnóstico completado');

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  }
}

// Ejecutar el diagnóstico
diagnosticarInconsistenciaEstadisticas()
  .then(() => {
    console.log('\n🎯 Diagnóstico finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }); 