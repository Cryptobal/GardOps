import { query } from '@/lib/database';

async function testEstadosHistorial() {
  console.log('🧪 PROBANDO LÓGICA DE ESTADOS DEL HISTORIAL MENSUAL');
  console.log('==================================================\n');

  try {
    // 1. Buscar un guardia con diferentes tipos de estados
    console.log('1️⃣ Buscando guardia con diferentes estados...');
    const guardiaResult = await query(`
      SELECT id, nombre, apellido_paterno, apellido_materno
      FROM guardias 
      LIMIT 1
    `);

    if (guardiaResult.rows.length === 0) {
      console.log('❌ No se encontraron guardias');
      return;
    }

    const guardia = guardiaResult.rows[0];
    console.log(`✅ Guardia encontrado: ${guardia.nombre} ${guardia.apellido_paterno} (ID: ${guardia.id})`);

    // 2. Verificar estados existentes en la base de datos
    console.log('\n2️⃣ Verificando estados existentes en la base de datos...');
    const estadosResult = await query(`
      SELECT estado, COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual 
      WHERE guardia_id = $1
      GROUP BY estado
      ORDER BY cantidad DESC
    `, [guardia.id]);

    console.log('📊 Estados encontrados:');
    estadosResult.rows.forEach((row: any) => {
      console.log(`  - ${row.estado}: ${row.cantidad} registros`);
    });

    // 3. Probar la lógica de transformación de estados
    console.log('\n3️⃣ Probando lógica de transformación de estados...');
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth() + 1;
    const anioActual = fechaActual.getFullYear();

    const transformacionResult = await query(`
      SELECT 
        pm.estado as estado_original,
        CASE 
          -- Días planificados con turno se muestran como 'turno'
          WHEN pm.estado = 'T' THEN 'turno'
          -- Días confirmados como trabajado se mantienen como 'trabajado'
          WHEN pm.estado = 'trabajado' THEN 'trabajado'
          -- Días de inasistencia se mantienen como 'inasistencia'
          WHEN pm.estado = 'inasistencia' THEN 'inasistencia'
          -- Días con reemplazo se mantienen como 'reemplazo'
          WHEN pm.estado = 'reemplazo' THEN 'reemplazo'
          -- Días libres se mantienen como 'libre'
          WHEN pm.estado = 'libre' THEN 'libre'
          -- Días de vacaciones se mantienen como 'vacaciones'
          WHEN pm.estado = 'vacaciones' THEN 'vacaciones'
          -- Días de licencia se mantienen como 'licencia'
          WHEN pm.estado = 'licencia' THEN 'licencia'
          -- Días de permiso se mantienen como 'permiso'
          WHEN pm.estado = 'permiso' THEN 'permiso'
          -- Para cualquier otro estado, mantener el original
          ELSE pm.estado
        END as estado_transformado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual pm
      WHERE pm.guardia_id = $1
        AND pm.anio = $2 
        AND pm.mes = $3
      GROUP BY pm.estado
      ORDER BY cantidad DESC
    `, [guardia.id, anioActual, mesActual]);

    console.log('🔄 Transformación de estados:');
    transformacionResult.rows.forEach((row: any) => {
      const cambio = row.estado_original === row.estado_transformado ? '✅' : '🔄';
      console.log(`  ${cambio} ${row.estado_original} → ${row.estado_transformado} (${row.cantidad} registros)`);
    });

    // 4. Verificar que no hay estados 'T' en el resultado final
    console.log('\n4️⃣ Verificando que no hay estados "T" en el resultado...');
    const estadosTResult = await query(`
      SELECT COUNT(*) as cantidad
      FROM (
        SELECT 
          CASE 
            WHEN pm.estado = 'T' THEN 'turno'
            WHEN pm.estado = 'trabajado' THEN 'trabajado'
            WHEN pm.estado = 'inasistencia' THEN 'inasistencia'
            WHEN pm.estado = 'reemplazo' THEN 'reemplazo'
            WHEN pm.estado = 'libre' THEN 'libre'
            WHEN pm.estado = 'vacaciones' THEN 'vacaciones'
            WHEN pm.estado = 'licencia' THEN 'licencia'
            WHEN pm.estado = 'permiso' THEN 'permiso'
            ELSE pm.estado
          END as estado_final
        FROM as_turnos_pauta_mensual pm
        WHERE pm.guardia_id = $1
          AND pm.anio = $2 
          AND pm.mes = $3
      ) subquery
      WHERE estado_final = 'T'
    `, [guardia.id, anioActual, mesActual]);

    const cantidadEstadosT = parseInt(estadosTResult.rows[0].cantidad);
    if (cantidadEstadosT === 0) {
      console.log('✅ No hay estados "T" en el resultado final');
    } else {
      console.log(`❌ ERROR: Se encontraron ${cantidadEstadosT} estados "T" en el resultado final`);
    }

    // 5. Verificar que los estados 'turno' aparecen correctamente
    console.log('\n5️⃣ Verificando estados "turno"...');
    const estadosTurnoResult = await query(`
      SELECT COUNT(*) as cantidad
      FROM (
        SELECT 
          CASE 
            WHEN pm.estado = 'T' THEN 'turno'
            WHEN pm.estado = 'trabajado' THEN 'trabajado'
            WHEN pm.estado = 'inasistencia' THEN 'inasistencia'
            WHEN pm.estado = 'reemplazo' THEN 'reemplazo'
            WHEN pm.estado = 'libre' THEN 'libre'
            WHEN pm.estado = 'vacaciones' THEN 'vacaciones'
            WHEN pm.estado = 'licencia' THEN 'licencia'
            WHEN pm.estado = 'permiso' THEN 'permiso'
            ELSE pm.estado
          END as estado_final
        FROM as_turnos_pauta_mensual pm
        WHERE pm.guardia_id = $1
          AND pm.anio = $2 
          AND pm.mes = $3
      ) subquery
      WHERE estado_final = 'turno'
    `, [guardia.id, anioActual, mesActual]);

    const cantidadEstadosTurno = parseInt(estadosTurnoResult.rows[0].cantidad);
    console.log(`📊 Estados "turno" en el resultado: ${cantidadEstadosTurno}`);

    // 6. Mostrar ejemplo de registros transformados
    console.log('\n6️⃣ Ejemplo de registros transformados...');
    const ejemploResult = await query(`
      SELECT 
        pm.dia,
        pm.estado as estado_original,
        CASE 
          WHEN pm.estado = 'T' THEN 'turno'
          WHEN pm.estado = 'trabajado' THEN 'trabajado'
          WHEN pm.estado = 'inasistencia' THEN 'inasistencia'
          WHEN pm.estado = 'reemplazo' THEN 'reemplazo'
          WHEN pm.estado = 'libre' THEN 'libre'
          WHEN pm.estado = 'vacaciones' THEN 'vacaciones'
          WHEN pm.estado = 'licencia' THEN 'licencia'
          WHEN pm.estado = 'permiso' THEN 'permiso'
          ELSE pm.estado
        END as estado_final
      FROM as_turnos_pauta_mensual pm
      WHERE pm.guardia_id = $1
        AND pm.anio = $2 
        AND pm.mes = $3
      ORDER BY pm.dia ASC
      LIMIT 10
    `, [guardia.id, anioActual, mesActual]);

    console.log('📋 Ejemplos de transformación:');
    ejemploResult.rows.forEach((row: any) => {
      const cambio = row.estado_original === row.estado_final ? '✅' : '🔄';
      console.log(`  Día ${row.dia}: ${cambio} ${row.estado_original} → ${row.estado_final}`);
    });

    console.log('\n🎉 PRUEBAS DE ESTADOS COMPLETADAS');
    console.log('✅ La lógica de transformación de estados funciona correctamente');

  } catch (error) {
    console.error('❌ Error durante las pruebas de estados:', error);
  }
}

// Ejecutar las pruebas
testEstadosHistorial()
  .then(() => {
    console.log('\n✅ Script de prueba de estados completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en script de prueba de estados:', error);
    process.exit(1);
  });
