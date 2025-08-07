import { query } from '../src/lib/database';

async function testEndpointHistorialMensual() {
  console.log('🧪 PROBANDO ENDPOINT HISTORIAL MENSUAL');
  console.log('========================================\n');

  try {
    // 1. Obtener un guardia de prueba
    console.log('1️⃣ Buscando guardia de prueba...');
    const guardiaResult = await query(`
      SELECT id, nombre, apellido_paterno, apellido_materno
      FROM guardias 
      LIMIT 1
    `);

    if (guardiaResult.rows.length === 0) {
      console.log('❌ No hay guardias en la base de datos');
      return;
    }

    const guardia = guardiaResult.rows[0];
    console.log(`✅ Guardia encontrado: ${guardia.nombre} ${guardia.apellido_paterno} (ID: ${guardia.id})`);

    // 2. Verificar estructura de la tabla as_turnos_pauta_mensual
    console.log('\n2️⃣ Verificando estructura de as_turnos_pauta_mensual...');
    const estructuraResult = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_pauta_mensual'
      ORDER BY ordinal_position
    `);

    console.log('📋 Estructura de la tabla:');
    estructuraResult.rows.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });

    // 3. Verificar si hay datos para este guardia
    console.log('\n3️⃣ Verificando datos existentes...');
    const datosResult = await query(`
      SELECT COUNT(*) as total
      FROM as_turnos_pauta_mensual 
      WHERE guardia_id = $1
    `, [guardia.id]);

    const totalRegistros = parseInt(datosResult.rows[0].total);
    console.log(`📊 Total de registros para el guardia: ${totalRegistros}`);

    if (totalRegistros > 0) {
      // Mostrar algunos registros de ejemplo
      const ejemplosResult = await query(`
        SELECT 
          id,
          puesto_id,
          guardia_id,
          anio,
          mes,
          dia,
          estado,
          created_at
        FROM as_turnos_pauta_mensual 
        WHERE guardia_id = $1
        ORDER BY anio DESC, mes DESC, dia DESC
        LIMIT 5
      `, [guardia.id]);

      console.log('\n📋 Ejemplos de registros:');
      ejemplosResult.rows.forEach((reg: any, index: number) => {
        console.log(`  ${index + 1}. ${reg.dia}/${reg.mes}/${reg.anio} - ${reg.estado} (ID: ${reg.id})`);
      });
    }

    // 4. Probando consulta del endpoint...
    console.log('\n4️⃣ Probando consulta del endpoint...');
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth() + 1;
    const anioActual = fechaActual.getFullYear();
    
    const historialResult = await query(`
      SELECT 
        pm.id, pm.dia, 
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
        END as estado,
        pm.observaciones, pm.reemplazo_guardia_id, pm.created_at, pm.updated_at,
        po.nombre_puesto, po.es_ppc,
        i.nombre as instalacion_nombre,
        rg.nombre as reemplazo_nombre, rg.apellido_paterno as reemplazo_apellido_paterno, rg.apellido_materno as reemplazo_apellido_materno
      FROM as_turnos_pauta_mensual pm
      LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias rg ON pm.reemplazo_guardia_id::uuid = rg.id
      WHERE pm.guardia_id = $1 
        AND pm.anio = $2 
        AND pm.mes = $3
      ORDER BY pm.dia ASC
    `, [guardia.id, anioActual, mesActual]);

    console.log(`✅ Consulta ejecutada exitosamente`);
    console.log(`📊 Registros encontrados para ${mesActual}/${anioActual}: ${historialResult.rows.length}`);

    if (historialResult.rows.length > 0) {
      console.log('\n📋 Primeros registros del resultado:');
      historialResult.rows.slice(0, 3).forEach((reg: any, index: number) => {
        console.log(`  ${index + 1}. Día ${reg.dia} - ${reg.estado}`);
        console.log(`     Puesto: ${reg.nombre_puesto || 'Sin puesto'}`);
        console.log(`     Instalación: ${reg.instalacion_nombre || 'Sin instalación'}`);
        console.log(`     Reemplazo: ${reg.reemplazo_nombre || 'Ninguno'}`);
      });
    }

    // 5. Probar con un mes/año que probablemente no tenga datos
    console.log('\n5️⃣ Probando con mes/año sin datos...');
    const historialVacioResult = await query(`
      SELECT COUNT(*) as total
      FROM as_turnos_pauta_mensual pm
      LEFT JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      LEFT JOIN instalaciones i ON po.instalacion_id = i.id
      LEFT JOIN guardias rg ON pm.reemplazo_guardia_id::uuid = rg.id
      
      WHERE pm.guardia_id = $1
        AND pm.anio = $2 
        AND pm.mes = $3
    `, [guardia.id, 2020, 1]);

    console.log(`✅ Consulta con datos inexistentes ejecutada`);
    console.log(`📊 Registros encontrados para 1/2020: ${historialVacioResult.rows[0].total}`);

    console.log('\n🎉 PRUEBAS COMPLETADAS EXITOSAMENTE');
    console.log('✅ El endpoint debería funcionar correctamente');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  }
}

// Ejecutar las pruebas
testEndpointHistorialMensual()
  .then(() => {
    console.log('\n✅ Script de prueba completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en script de prueba:', error);
    process.exit(1);
  });
