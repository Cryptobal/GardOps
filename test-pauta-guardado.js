const { Pool } = require('pg');

// Configuración de la conexión
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_TPizlICq5N6D@ep-gentle-bush-ad6zia51-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function testPautaGuardado() {
  console.log('🧪 Probando guardado de pauta mensual...');
  
  try {
    // Simular los datos que envía el frontend
    const actualizaciones = [
      {
        puesto_id: "7e05a55d-8db6-4c20-b51c-509f09d69f74", // ID de la instalación
        guardia_id: null,
        anio: 2025,
        mes: 8,
        dia: 1,
        estado: "planificado"
      },
      {
        puesto_id: "7e05a55d-8db6-4c20-b51c-509f09d69f74",
        guardia_id: null,
        anio: 2025,
        mes: 8,
        dia: 2,
        estado: "libre"
      }
    ];

    console.log('📝 Datos de prueba:', JSON.stringify(actualizaciones, null, 2));

    // Procesar cada actualización
    let guardados = 0;
    let eliminados = 0;
    const errores = [];

    for (const turno of actualizaciones) {
      const {
        puesto_id,
        guardia_id,
        anio,
        mes,
        dia,
        estado,
        observaciones,
        reemplazo_guardia_id,
      } = turno;

      console.log(`\n🔄 Procesando turno:`, { puesto_id, anio, mes, dia, estado });

      // Validación de campos requeridos
      if (!puesto_id || !anio || !mes || !dia) {
        const error = `Turno inválido: faltan campos requeridos - puesto_id: ${puesto_id}, anio: ${anio}, mes: ${mes}, dia: ${dia}`;
        console.error('❌', error);
        errores.push(error);
        continue;
      }

      try {
        // Validación de estado
        if (!['trabajado', 'libre', 'planificado'].includes(estado)) {
          const error = `Estado inválido: ${estado} - debe ser 'trabajado', 'libre', 'planificado', o null para eliminar`;
          console.error('❌', error);
          errores.push(error);
          continue;
        }

        console.log('✅ Estado válido, procediendo con INSERT/UPDATE...');

        const result = await query(
          `
          INSERT INTO as_turnos_pauta_mensual (
            puesto_id, guardia_id, anio, mes, dia, estado, estado_ui,
            observaciones, reemplazo_guardia_id, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          ON CONFLICT (puesto_id, anio, mes, dia)
          DO UPDATE SET
            guardia_id = EXCLUDED.guardia_id,
            estado = EXCLUDED.estado,
            estado_ui = EXCLUDED.estado_ui,
            observaciones = EXCLUDED.observaciones,
            reemplazo_guardia_id = EXCLUDED.reemplazo_guardia_id,
            updated_at = NOW()
          WHERE 
            COALESCE(as_turnos_pauta_mensual.estado_ui, '') <> 'te'
            AND COALESCE(as_turnos_pauta_mensual.meta->>'tipo', '') <> 'turno_extra'
            AND COALESCE(as_turnos_pauta_mensual.estado, '') NOT IN ('trabajado', 'inasistencia', 'permiso', 'vacaciones')
            AND COALESCE(as_turnos_pauta_mensual.meta->>'cobertura_guardia_id', '') = ''
        `,
          [
            puesto_id,
            guardia_id || null,
            anio,
            mes,
            dia,
            estado,
            // Establecer estado_ui correctamente según el estado
            estado === 'planificado' ? 'plan' : 
            estado === 'libre' ? 'libre' : null,
            observaciones || null,
            reemplazo_guardia_id || null,
          ]
        );

        console.log('✅ Query ejecutada exitosamente');
        guardados++;
        
      } catch (dbError) {
        console.error('❌ Error en turno específico:', { turno, error: dbError });
        errores.push(`Error procesando turno para puesto ${puesto_id}, día ${dia}: ${dbError instanceof Error ? dbError.message : 'Error desconocido'}`);
      }
    }

    console.log(`\n📊 Resultado final:`);
    console.log(`✅ Guardados: ${guardados}`);
    console.log(`🗑️ Eliminados: ${eliminados}`);
    console.log(`❌ Errores: ${errores.length}`);
    
    if (errores.length > 0) {
      console.log('\n⚠️ Errores encontrados:');
      errores.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await pool.end();
  }
}

testPautaGuardado();
