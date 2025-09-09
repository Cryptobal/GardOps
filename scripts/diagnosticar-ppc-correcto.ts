import { query } from '../src/lib/database';

async function diagnosticarPPCCorrecto() {
  console.log('🔍 Diagnosticando correctamente qué son los PPC...\n');

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

    // 2. Verificar requisitos (puestos) por turno
    console.log('\n2. Verificando requisitos (puestos) por turno...');
    const requisitosResult = await query(`
      SELECT 
        tr.id as requisito_id,
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

    console.log(`📋 Requisitos encontrados: ${requisitosResult.rows.length}`);
    let totalPuestos = 0;
    requisitosResult.rows.forEach((req: any, index: number) => {
      console.log(`   Requisito ${index + 1}: ${req.cantidad_guardias} guardias, ${req.rol_nombre || 'Sin rol'}`);
      totalPuestos += req.cantidad_guardias;
    });
    console.log(`   Total puestos: ${totalPuestos}`);

    // 3. Verificar asignaciones activas
    console.log('\n3. Verificando asignaciones activas...');
    const asignacionesResult = await query(`
      SELECT 
        ta.id as asignacion_id,
        ta.estado,
        ta.tipo_asignacion,
        ta.fecha_inicio,
        ta.fecha_termino,
        tr.cantidad_guardias,
        rs.nombre as rol_nombre
      FROM as_turnos_asignaciones ta
      INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      LEFT JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      WHERE tr.instalacion_id = $1 AND ta.estado = 'Activa'
      ORDER BY ta.fecha_inicio
    `, [instalacion.id]);

    console.log(`👥 Asignaciones activas encontradas: ${asignacionesResult.rows.length}`);
    let totalAsignaciones = 0;
    asignacionesResult.rows.forEach((asig: any, index: number) => {
      console.log(`   Asignación ${index + 1}: ${asig.cantidad_guardias} guardias, ${asig.rol_nombre || 'Sin rol'}`);
      totalAsignaciones += asig.cantidad_guardias;
    });
    console.log(`   Total asignaciones: ${totalAsignaciones}`);

    // 4. Calcular PPC correctamente
    console.log('\n4. Calculando PPC correctamente...');
    const ppcCorrecto = totalPuestos - totalAsignaciones;
    console.log(`   Puestos totales: ${totalPuestos}`);
    console.log(`   Asignaciones activas: ${totalAsignaciones}`);
    console.log(`   PPC = Puestos - Asignaciones = ${totalPuestos} - ${totalAsignaciones} = ${ppcCorrecto}`);

    // 5. Verificar registros en tabla PPC (si existen)
    console.log('\n5. Verificando registros en tabla as_turnos_ppc...');
    const ppcRegistrosResult = await query(`
      SELECT 
        ppc.id as ppc_id,
        ppc.estado,
        ppc.cantidad_faltante,
        ppc.motivo,
        tr.cantidad_guardias,
        rs.nombre as rol_nombre
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      LEFT JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      WHERE tr.instalacion_id = $1
      ORDER BY ppc.created_at
    `, [instalacion.id]);

    console.log(`📝 Registros en tabla PPC: ${ppcRegistrosResult.rows.length}`);
    ppcRegistrosResult.rows.forEach((ppc: any, index: number) => {
      console.log(`   PPC ${index + 1}: ${ppc.cantidad_faltante} faltantes, ${ppc.estado}, ${ppc.rol_nombre || 'Sin rol'}`);
    });

    // 6. Análisis final
    console.log('\n6. Análisis final...');
    console.log(`📊 Resumen:`);
    console.log(`   Total puestos requeridos: ${totalPuestos}`);
    console.log(`   Total asignaciones activas: ${totalAsignaciones}`);
    console.log(`   PPC reales (puestos sin asignar): ${ppcCorrecto}`);
    console.log(`   Registros en tabla PPC: ${ppcRegistrosResult.rows.length}`);

    if (ppcCorrecto !== ppcRegistrosResult.rows.length) {
      console.log(`\n❌ PROBLEMA: Los PPC reales (${ppcCorrecto}) no coinciden con los registros en tabla PPC (${ppcRegistrosResult.rows.length})`);
      console.log(`   Los PPC deberían ser: ${ppcCorrecto} (todos los puestos sin asignar)`);
    } else {
      console.log(`\n✅ Los PPC están correctos`);
    }

    console.log('\n✅ Diagnóstico completado');

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  }
}

// Ejecutar el diagnóstico
diagnosticarPPCCorrecto()
  .then(() => {
    console.log('\n🎯 Diagnóstico finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }); 