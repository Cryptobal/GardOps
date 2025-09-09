import { query } from '../src/lib/database';

async function migrarDatosAntiguosADO() {
  console.log('🔄 INICIANDO MIGRACIÓN DE DATOS ANTIGUOS A ADO\n');

  // =====================================================
  // 1. MIGRAR DATOS DE puestos_por_cubrir A as_turnos_ppc
  // =====================================================
  console.log('📋 1. MIGRANDO DATOS DE puestos_por_cubrir...');
  
  try {
    // Verificar si hay datos para migrar
    const countAntiguo = await query('SELECT COUNT(*) as total FROM puestos_por_cubrir');
    const countNuevo = await query('SELECT COUNT(*) as total FROM as_turnos_ppc');
    
    console.log(`   - puestos_por_cubrir: ${countAntiguo.rows[0].total} registros`);
    console.log(`   - as_turnos_ppc: ${countNuevo.rows[0].total} registros`);
    
    if (countAntiguo.rows[0].total > 0) {
      // Obtener datos de la tabla antigua
      const datosAntiguos = await query(`
        SELECT 
          id,
          requisito_puesto_id,
          cantidad_faltante,
          motivo,
          prioridad,
          fecha_deteccion,
          estado,
          observaciones,
          guardia_asignado_id,
          fecha_asignacion,
          tenant_id,
          created_at,
          updated_at
        FROM puestos_por_cubrir
        WHERE id NOT IN (SELECT id FROM as_turnos_ppc)
      `);
      
      console.log(`   - Registros a migrar: ${datosAntiguos.rows.length}`);
      
      if (datosAntiguos.rows.length > 0) {
        for (const registro of datosAntiguos.rows) {
          await query(`
            INSERT INTO as_turnos_ppc (
              id,
              requisito_puesto_id,
              cantidad_faltante,
              motivo,
              prioridad,
              fecha_deteccion,
              estado,
              observaciones,
              guardia_asignado_id,
              fecha_asignacion,
              tenant_id,
              created_at,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id) DO NOTHING
          `, [
            registro.id,
            registro.requisito_puesto_id,
            registro.cantidad_faltante,
            registro.motivo,
            registro.prioridad,
            registro.fecha_deteccion,
            registro.estado,
            registro.observaciones,
            registro.guardia_asignado_id,
            registro.fecha_asignacion,
            registro.tenant_id,
            registro.created_at,
            registro.updated_at
          ]);
        }
        console.log('   ✅ Datos migrados correctamente');
      } else {
        console.log('   ℹ️ No hay datos nuevos para migrar');
      }
    } else {
      console.log('   ℹ️ Tabla antigua está vacía');
    }
  } catch (error) {
    console.log(`❌ Error migrando puestos_por_cubrir: ${error}`);
  }

  // =====================================================
  // 2. MIGRAR DATOS DE asignaciones_guardias A as_turnos_asignaciones
  // =====================================================
  console.log('\n📋 2. MIGRANDO DATOS DE asignaciones_guardias...');
  
  try {
    // Verificar si hay datos para migrar
    const countAntiguo = await query('SELECT COUNT(*) as total FROM asignaciones_guardias');
    const countNuevo = await query('SELECT COUNT(*) as total FROM as_turnos_asignaciones');
    
    console.log(`   - asignaciones_guardias: ${countAntiguo.rows[0].total} registros`);
    console.log(`   - as_turnos_asignaciones: ${countNuevo.rows[0].total} registros`);
    
    if (countAntiguo.rows[0].total > 0) {
      // Obtener datos de la tabla antigua
      const datosAntiguos = await query(`
        SELECT 
          id,
          guardia_id,
          requisito_puesto_id,
          tipo_asignacion,
          fecha_inicio,
          estado,
          observaciones,
          tenant_id,
          created_at,
          updated_at
        FROM asignaciones_guardias
        WHERE id NOT IN (SELECT id FROM as_turnos_asignaciones)
      `);
      
      console.log(`   - Registros a migrar: ${datosAntiguos.rows.length}`);
      
      if (datosAntiguos.rows.length > 0) {
        for (const registro of datosAntiguos.rows) {
          await query(`
            INSERT INTO as_turnos_asignaciones (
              id,
              guardia_id,
              requisito_puesto_id,
              tipo_asignacion,
              fecha_inicio,
              estado,
              observaciones,
              tenant_id,
              created_at,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO NOTHING
          `, [
            registro.id,
            registro.guardia_id,
            registro.requisito_puesto_id,
            registro.tipo_asignacion,
            registro.fecha_inicio,
            registro.estado,
            registro.observaciones,
            registro.tenant_id,
            registro.created_at,
            registro.updated_at
          ]);
        }
        console.log('   ✅ Datos migrados correctamente');
      } else {
        console.log('   ℹ️ No hay datos nuevos para migrar');
      }
    } else {
      console.log('   ℹ️ Tabla antigua está vacía');
    }
  } catch (error) {
    console.log(`❌ Error migrando asignaciones_guardias: ${error}`);
  }

  // =====================================================
  // 3. VERIFICAR MIGRACIÓN
  // =====================================================
  console.log('\n✅ 3. VERIFICANDO MIGRACIÓN...');
  
  const tablasNuevas = [
    'as_turnos_ppc',
    'as_turnos_asignaciones'
  ];
  
  for (const tabla of tablasNuevas) {
    const count = await query(`SELECT COUNT(*) as total FROM ${tabla}`);
    console.log(`   - ${tabla}: ${count.rows[0].total} registros`);
  }

  // =====================================================
  // 4. VERIFICAR INTEGRIDAD DE DATOS
  // =====================================================
  console.log('\n🔍 4. VERIFICANDO INTEGRIDAD DE DATOS...');
  
  try {
    // Verificar que las asignaciones tienen guardias válidos
    const asignacionesInvalidas = await query(`
      SELECT COUNT(*) as total
      FROM as_turnos_asignaciones ta
      LEFT JOIN guardias g ON ta.guardia_id = g.id
      WHERE g.id IS NULL
    `);
    
    if (asignacionesInvalidas.rows[0].total > 0) {
      console.log(`   ⚠️ ${asignacionesInvalidas.rows[0].total} asignaciones con guardias inválidos`);
    } else {
      console.log('   ✅ Todas las asignaciones tienen guardias válidos');
    }

    // Verificar que los PPCs tienen requisitos válidos
    const ppcInvalidos = await query(`
      SELECT COUNT(*) as total
      FROM as_turnos_ppc tp
      LEFT JOIN as_turnos_requisitos tr ON tp.requisito_puesto_id = tr.id
      WHERE tr.id IS NULL
    `);
    
    if (ppcInvalidos.rows[0].total > 0) {
      console.log(`   ⚠️ ${ppcInvalidos.rows[0].total} PPCs con requisitos inválidos`);
    } else {
      console.log('   ✅ Todos los PPCs tienen requisitos válidos');
    }
  } catch (error) {
    console.log(`❌ Error verificando integridad: ${error}`);
  }

  console.log('\n🎯 MIGRACIÓN COMPLETADA');
  console.log('✅ Análisis ADO completado');
}

// Ejecutar la migración
migrarDatosAntiguosADO().catch(console.error); 