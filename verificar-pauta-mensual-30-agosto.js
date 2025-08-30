// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');

async function verificarPautaMensual30Agosto() {
  console.log('🔍 Verificando pauta mensual del 30 de agosto...\n');

  try {
    const fecha = '2025-08-30';
    console.log(`📅 Fecha a verificar: ${fecha}`);

    // 1. Verificar todos los registros de la pauta mensual para el 30 de agosto
    console.log('1. Verificando registros de pauta mensual...');
    const pautaMensual = await sql`
      SELECT 
        pm.id,
        pm.anio,
        pm.mes,
        pm.dia,
        pm.estado,
        pm.guardia_id,
        i.nombre as instalacion_nombre,
        po.nombre_puesto,
        rs.nombre as rol_nombre,
        rs.hora_inicio,
        rs.hora_termino,
        g.nombre as guardia_nombre
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      WHERE pm.anio = EXTRACT(YEAR FROM ${fecha}::date)
        AND pm.mes = EXTRACT(MONTH FROM ${fecha}::date)
        AND pm.dia = EXTRACT(DAY FROM ${fecha}::date)
        AND po.activo = true
      ORDER BY i.nombre, rs.hora_inicio
    `;

    console.log(`✅ Registros en pauta mensual: ${pautaMensual.rows.length}`);
    pautaMensual.rows.forEach((registro, index) => {
      console.log(`   ${index + 1}. ${registro.instalacion_nombre} - ${registro.nombre_puesto} (${registro.rol_nombre}) - Estado: ${registro.estado} - Guardia: ${registro.guardia_nombre || 'Sin asignar'}`);
    });

    // 2. Verificar cuántos están activos vs inactivos
    console.log('\n2. Verificando estados de los registros...');
    const estadosPauta = await sql`
      SELECT 
        pm.estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.anio = EXTRACT(YEAR FROM ${fecha}::date)
        AND pm.mes = EXTRACT(MONTH FROM ${fecha}::date)
        AND pm.dia = EXTRACT(DAY FROM ${fecha}::date)
        AND po.activo = true
      GROUP BY pm.estado
      ORDER BY pm.estado
    `;

    console.log(`✅ Distribución de estados:`);
    estadosPauta.rows.forEach(estado => {
      console.log(`   - ${estado.estado}: ${estado.cantidad} registros`);
    });

    // 3. Verificar si hay registros pero están inactivos
    console.log('\n3. Verificando registros inactivos...');
    const registrosInactivos = await sql`
      SELECT 
        pm.id,
        i.nombre as instalacion_nombre,
        po.nombre_puesto,
        rs.nombre as rol_nombre,
        pm.estado
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE pm.anio = EXTRACT(YEAR FROM ${fecha}::date)
        AND pm.mes = EXTRACT(MONTH FROM ${fecha}::date)
        AND pm.dia = EXTRACT(DAY FROM ${fecha}::date)
        AND po.activo = true
        AND pm.estado != 'Activo'
      ORDER BY i.nombre, rs.hora_inicio
    `;

    console.log(`✅ Registros inactivos: ${registrosInactivos.rows.length}`);
    registrosInactivos.rows.forEach((registro, index) => {
      console.log(`   ${index + 1}. ${registro.instalacion_nombre} - ${registro.nombre_puesto} (${registro.rol_nombre}) - Estado: ${registro.estado}`);
    });

    // 4. Verificar datos del día anterior para comparar
    console.log('\n4. Verificando datos del día anterior (29 de agosto)...');
    const pautaAnterior = await sql`
      SELECT 
        pm.estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.anio = 2025
        AND pm.mes = 8
        AND pm.dia = 29
        AND po.activo = true
      GROUP BY pm.estado
      ORDER BY pm.estado
    `;

    console.log(`✅ Estados del 29 de agosto:`);
    pautaAnterior.rows.forEach(estado => {
      console.log(`   - ${estado.estado}: ${estado.cantidad} registros`);
    });

    // 5. Proponer corrección si es necesario
    console.log('\n🎯 DIAGNÓSTICO Y SOLUCIÓN:');
    console.log('============================');
    
    if (registrosInactivos.rows.length > 0) {
      console.log('❌ PROBLEMA: Hay registros pero están inactivos');
      console.log(`   - Registros inactivos: ${registrosInactivos.rows.length}`);
      console.log('   - SOLUCIÓN: Activar los registros inactivos');
      
      console.log('\n🔧 CORRECCIÓN PROPUESTA:');
      console.log('========================');
      console.log('Ejecutar la siguiente consulta SQL para activar los registros:');
      console.log(`
UPDATE as_turnos_pauta_mensual 
SET estado = 'Activo' 
WHERE anio = 2025 
  AND mes = 8 
  AND dia = 30 
  AND estado != 'Activo'
  AND puesto_id IN (
    SELECT id FROM as_turnos_puestos_operativos WHERE activo = true
  );
      `);
    } else if (pautaMensual.rows.length === 0) {
      console.log('❌ PROBLEMA: No hay registros en la pauta mensual para el 30 de agosto');
      console.log('   - SOLUCIÓN: Crear registros en la pauta mensual');
    } else {
      console.log('✅ ÉXITO: Los registros están activos');
      console.log('   - Verificar que la función de generación de agenda esté funcionando');
    }

  } catch (error) {
    console.error('❌ Error en la verificación:', error);
  } finally {
    process.exit(0);
  }
}

verificarPautaMensual30Agosto();
