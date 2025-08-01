import { query } from '../src/lib/database';

async function diagnosticarMejillones() {
  console.log('🔍 Diagnosticando instalación Mejillones...\n');

  try {
    // 1. Buscar la instalación Mejillones
    console.log('1. Buscando instalación Mejillones...');
    const instalacionResult = await query(`
      SELECT id, nombre, cliente_id, estado, direccion, comuna
      FROM instalaciones 
      WHERE nombre ILIKE '%mejillones%'
    `);

    if (instalacionResult.rows.length === 0) {
      console.log('❌ No se encontró instalación con nombre Mejillones');
      return;
    }

    const instalacion = instalacionResult.rows[0];
    console.log('✅ Instalación encontrada:', instalacion);
    console.log('');

    // 2. Verificar requisitos de puestos (puestos creados)
    console.log('2. Verificando requisitos de puestos...');
    const requisitosResult = await query(`
      SELECT id, rol_servicio_id, instalacion_id, created_at
      FROM as_turnos_requisitos 
      WHERE instalacion_id = $1
    `, [instalacion.id]);

    console.log(`📊 Requisitos de puestos encontrados: ${requisitosResult.rows.length}`);
    if (requisitosResult.rows.length > 0) {
      console.log('   Detalles:', requisitosResult.rows);
    }
    console.log('');

    // 3. Verificar asignaciones activas (puestos asignados)
    console.log('3. Verificando asignaciones activas...');
    const asignacionesResult = await query(`
      SELECT ta.id, ta.requisito_puesto_id, ta.guardia_id, ta.estado, ta.created_at
      FROM as_turnos_asignaciones ta
      INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1 AND ta.estado = 'Activa'
    `, [instalacion.id]);

    console.log(`📊 Asignaciones activas encontradas: ${asignacionesResult.rows.length}`);
    if (asignacionesResult.rows.length > 0) {
      console.log('   Detalles:', asignacionesResult.rows);
    }
    console.log('');

    // 4. Verificar PPC pendientes
    console.log('4. Verificando PPC pendientes...');
    const ppcResult = await query(`
      SELECT ppc.id, ppc.requisito_puesto_id, ppc.estado, ppc.cantidad_faltante, ppc.created_at
      FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1
    `, [instalacion.id]);

    console.log(`📊 PPC totales encontrados: ${ppcResult.rows.length}`);
    const ppcPendientes = ppcResult.rows.filter(ppc => ppc.estado === 'Pendiente');
    console.log(`📊 PPC pendientes: ${ppcPendientes.length}`);
    if (ppcResult.rows.length > 0) {
      console.log('   Detalles:', ppcResult.rows);
    }
    console.log('');

    // 5. Verificar configuración de turnos
    console.log('5. Verificando configuración de turnos...');
    const turnosResult = await query(`
      SELECT tc.id, tc.rol_servicio_id, tc.cantidad_guardias, tc.estado
      FROM as_turnos_configuracion tc
      WHERE tc.instalacion_id = $1
    `, [instalacion.id]);

    console.log(`📊 Configuraciones de turnos encontradas: ${turnosResult.rows.length}`);
    if (turnosResult.rows.length > 0) {
      console.log('   Detalles:', turnosResult.rows);
    }
    console.log('');

    // 6. Ejecutar la misma consulta que usa el endpoint de estadísticas
    console.log('6. Ejecutando consulta del endpoint de estadísticas...');
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

    if (estadisticasResult.rows.length > 0) {
      const stats = estadisticasResult.rows[0];
      console.log('📊 Estadísticas calculadas por el endpoint:');
      console.log(`   Puestos creados: ${stats.puestos_creados}`);
      console.log(`   Puestos asignados: ${stats.puestos_asignados}`);
      console.log(`   PPC pendientes: ${stats.ppc_pendientes}`);
      console.log(`   PPC totales: ${stats.ppc_totales}`);
      console.log(`   Puestos disponibles: ${parseInt(stats.puestos_creados) - parseInt(stats.puestos_asignados)}`);
    }
    console.log('');

    // 7. Resumen del problema
    console.log('7. Resumen del diagnóstico:');
    const stats = estadisticasResult.rows[0];
    console.log(`   La interfaz muestra: 1 | 0 | 3`);
    console.log(`   Datos reales: ${stats.puestos_creados} | ${stats.puestos_asignados} | ${stats.ppc_pendientes}`);
    
    if (stats.puestos_creados > 0 && turnosResult.rows.length === 0) {
      console.log('   ⚠️  PROBLEMA DETECTADO: Hay requisitos de puestos pero no hay configuración de turnos');
      console.log('   💡 SOLUCIÓN: Se necesitan crear configuraciones de turnos para los requisitos existentes');
    } else if (stats.puestos_creados === 0) {
      console.log('   ⚠️  PROBLEMA DETECTADO: No hay requisitos de puestos creados');
      console.log('   💡 SOLUCIÓN: Se necesitan crear requisitos de puestos primero');
    } else {
      console.log('   ✅ Los datos parecen consistentes');
    }

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  }
}

// Ejecutar el diagnóstico
diagnosticarMejillones()
  .then(() => {
    console.log('\n🏁 Diagnóstico completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }); 