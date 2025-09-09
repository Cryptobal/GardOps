import { query } from '../src/lib/database';

async function corregirEstadosPPC() {
  try {
    console.log('🔧 Iniciando corrección de estados de PPC...');

    // 1. Ver PPCs con estado 'trabajado' que deberían tener estado 'T'
    const ppcsTrabajado = await query(`
      SELECT 
        pm.id,
        pm.puesto_id,
        pm.guardia_id,
        pm.estado,
        pm.anio,
        pm.mes,
        pm.dia,
        po.nombre_puesto,
        po.es_ppc,
        i.nombre as instalacion_nombre,
        pm.created_at
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE pm.estado = 'trabajado' 
        AND po.es_ppc = true
      ORDER BY pm.created_at DESC
    `);

    console.log(`📊 Encontrados ${ppcsTrabajado.rows.length} PPCs con estado 'trabajado'`);

    if (ppcsTrabajado.rows.length > 0) {
      console.log('📋 PPCs que necesitan corrección:');
      ppcsTrabajado.rows.forEach((row: any) => {
        console.log(`  - ${row.nombre_puesto} (${row.instalacion_nombre}) - ${row.anio}-${row.mes}-${row.dia}`);
      });

      // 2. Actualizar PPCs de 'trabajado' a 'T' (Asignado)
      const resultado = await query(`
        UPDATE as_turnos_pauta_mensual
        SET estado = 'T',
            updated_at = NOW()
        WHERE estado = 'trabajado' 
          AND puesto_id IN (
            SELECT id FROM as_turnos_puestos_operativos WHERE es_ppc = true
          )
      `);

      console.log(`✅ Actualizados ${resultado.rowCount} PPCs de 'trabajado' a 'T'`);
    } else {
      console.log('✅ No se encontraron PPCs con estado incorrecto');
    }

    // 3. Verificar el resultado final
    const estadosFinalesPPC = await query(`
      SELECT 
        pm.estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE po.es_ppc = true
      GROUP BY pm.estado
      ORDER BY pm.estado
    `);

    console.log('📊 Estados finales de PPCs:');
    estadosFinalesPPC.rows.forEach((row: any) => {
      console.log(`  - ${row.estado}: ${row.cantidad} registros`);
    });

    console.log('✅ Corrección de estados de PPC completada');

  } catch (error) {
    console.error('❌ Error corrigiendo estados de PPC:', error);
  } finally {
    process.exit(0);
  }
}

corregirEstadosPPC(); 