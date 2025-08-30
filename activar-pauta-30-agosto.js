// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');

async function activarPauta30Agosto() {
  console.log('🔧 Activando registros de la pauta mensual del 30 de agosto...\n');

  try {
    // 1. Verificar estado antes de la corrección
    console.log('1. Verificando estado antes de la corrección...');
    const estadoAntes = await sql`
      SELECT 
        pm.estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.anio = 2025
        AND pm.mes = 8
        AND pm.dia = 30
        AND po.activo = true
      GROUP BY pm.estado
      ORDER BY pm.estado
    `;

    console.log(`✅ Estados antes de la corrección:`);
    estadoAntes.rows.forEach(estado => {
      console.log(`   - ${estado.estado}: ${estado.cantidad} registros`);
    });

    // 2. Ejecutar la corrección
    console.log('\n2. Ejecutando corrección...');
    const resultado = await sql`
      UPDATE as_turnos_pauta_mensual 
      SET estado = 'Activo' 
      WHERE anio = 2025 
        AND mes = 8 
        AND dia = 30 
        AND estado IN ('libre', 'planificado')
        AND puesto_id IN (
          SELECT id FROM as_turnos_puestos_operativos WHERE activo = true
        )
    `;

    console.log(`✅ Registros actualizados: ${resultado.rowCount}`);

    // 3. Verificar estado después de la corrección
    console.log('\n3. Verificando estado después de la corrección...');
    const estadoDespues = await sql`
      SELECT 
        pm.estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.anio = 2025
        AND pm.mes = 8
        AND pm.dia = 30
        AND po.activo = true
      GROUP BY pm.estado
      ORDER BY pm.estado
    `;

    console.log(`✅ Estados después de la corrección:`);
    estadoDespues.rows.forEach(estado => {
      console.log(`   - ${estado.estado}: ${estado.cantidad} registros`);
    });

    // 4. Verificar vista de turnos activos
    console.log('\n4. Verificando vista de turnos activos...');
    const turnosActivos = await sql`
      SELECT 
        instalacion_nombre,
        guardia_nombre,
        rol_nombre,
        hora_inicio,
        hora_termino,
        monitoreo_habilitado
      FROM central_v_turnos_activos
      ORDER BY instalacion_nombre, hora_inicio
    `;

    console.log(`✅ Turnos activos en vista: ${turnosActivos.rows.length}`);
    if (turnosActivos.rows.length > 0) {
      turnosActivos.rows.forEach(turno => {
        console.log(`   - ${turno.instalacion_nombre}: ${turno.guardia_nombre} (${turno.rol_nombre}) ${turno.hora_inicio}-${turno.hora_termino}`);
      });
    } else {
      console.log('   - No hay turnos activos para hoy');
    }

    console.log('\n🎯 CORRECCIÓN COMPLETADA:');
    console.log('==========================');
    console.log(`✅ Se activaron ${resultado.rowCount} registros`);
    console.log('✅ Los turnos ahora deberían aparecer en la vista de turnos activos');
    console.log('✅ El Central de Monitoreo debería generar llamados automáticamente');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Verificar que aparezcan turnos activos en la vista');
    console.log('2. Ejecutar "Generar Agenda" en el Central de Monitoreo');
    console.log('3. Verificar que se generen los llamados automáticamente');

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  } finally {
    process.exit(0);
  }
}

activarPauta30Agosto();
