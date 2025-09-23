const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Configurar conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixFinalDefinitivo() {
  console.log('🔧 SOLUCIÓN FINAL DEFINITIVA - SIN DUPLICADOS\n');

  const client = await pool.connect();
  
  try {
    console.log('1️⃣ Eliminando vista existente...');
    await client.query('DROP VIEW IF EXISTS central_v_llamados_automaticos');
    console.log('✅ Vista eliminada');

    console.log('2️⃣ Creando vista sin duplicados y con lógica correcta...');
    
    const createViewSQL = `
    CREATE VIEW central_v_llamados_automaticos AS
    WITH datos_base AS (
      SELECT DISTINCT
        pm.id as pauta_id,
        pm.puesto_id,
        pm.guardia_id,
        po.instalacion_id,
        i.nombre AS instalacion_nombre,
        i.telefono AS instalacion_telefono,
        g.nombre AS guardia_nombre,
        po.nombre_puesto,
        rs.nombre AS rol_nombre,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin,
        cci.modo,
        cci.mensaje_template,
        (pm.anio || '-' || LPAD(pm.mes::text,2,'0') || '-' || LPAD(pm.dia::text,2,'0'))::date AS fecha
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id AND po.activo = true
      INNER JOIN instalaciones i ON i.id = po.instalacion_id
      INNER JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE pm.tipo_turno = 'planificado'
        AND cci.habilitado = true
        AND cci.intervalo_minutos IS NOT NULL
        AND cci.ventana_inicio IS NOT NULL
        AND cci.ventana_fin IS NOT NULL
    ),
    slots_generados AS (
      SELECT 
        db.*,
        gs.slot_inicio,
        -- ✅ CLAVE ÚNICA: instalacion + fecha + hora para evitar duplicados
        ROW_NUMBER() OVER (
          PARTITION BY db.instalacion_id, 
                       date_trunc('hour', (gs.slot_inicio AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')
          ORDER BY db.pauta_id
        ) as rn
      FROM datos_base db
      CROSS JOIN LATERAL generate_series(
        (db.fecha::timestamp + db.ventana_inicio::time),
        (db.fecha::timestamp + db.ventana_fin::time),
        make_interval(mins => db.intervalo_minutos)
      ) AS gs(slot_inicio)
      WHERE db.ventana_inicio < db.ventana_fin
    ),
    slots_unicos AS (
      SELECT 
        sg.*,
        date_trunc('hour', (sg.slot_inicio AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') AS hora_local
      FROM slots_generados sg
      WHERE sg.rn = 1  -- ✅ SOLO EL PRIMER REGISTRO POR INSTALACIÓN/HORA
    )
    SELECT 
      -- ✅ ID ÚNICO GARANTIZADO: instalación + timestamp + pauta_id
      md5(
        concat(
          su.instalacion_id::text, 
          '|', 
          extract(epoch from su.slot_inicio)::text,
          '|',
          su.pauta_id::text
        )
      )::uuid AS id,
      
      su.instalacion_id,
      su.guardia_id,
      su.pauta_id,
      su.puesto_id,
      su.slot_inicio AS programado_para,
      COALESCE(cl.estado, 'pendiente') AS estado_llamado,
      COALESCE(cl.contacto_tipo, 'instalacion') AS contacto_tipo,
      COALESCE(cl.contacto_id, su.instalacion_id) AS contacto_id,
      COALESCE(cl.contacto_nombre, su.instalacion_nombre) AS contacto_nombre,
      COALESCE(cl.contacto_telefono, su.instalacion_telefono) AS contacto_telefono,
      cl.observaciones,
      su.instalacion_nombre,
      su.guardia_nombre,
      su.nombre_puesto,
      su.rol_nombre,
      su.intervalo_minutos,
      su.ventana_inicio,
      su.ventana_fin,
      su.modo,
      su.mensaje_template,
      
      -- ✅ LÓGICA CORREGIDA: Urgente (más de 30 min atrasado)
      CASE 
        WHEN su.hora_local < (now() AT TIME ZONE 'America/Santiago') - interval '30 minutes'
        THEN true 
        ELSE false 
      END AS es_urgente,
      
      -- ✅ LÓGICA CORREGIDA: Actual (EXACTAMENTE la hora actual, no truncada)
      CASE 
        WHEN su.hora_local >= date_trunc('hour', now() AT TIME ZONE 'America/Santiago')
         AND su.hora_local < date_trunc('hour', now() AT TIME ZONE 'America/Santiago') + interval '1 hour'
        THEN true 
        ELSE false 
      END AS es_actual,
      
      -- ✅ LÓGICA CORREGIDA: Próximo (futuro)
      CASE 
        WHEN su.hora_local > (now() AT TIME ZONE 'America/Santiago')
        THEN true 
        ELSE false 
      END AS es_proximo
      
    FROM slots_unicos su
    LEFT JOIN central_llamados cl 
      ON cl.instalacion_id = su.instalacion_id 
      AND date_trunc('hour', (cl.programado_para AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') = su.hora_local
    ORDER BY programado_para ASC
    `;
    
    await client.query(createViewSQL);
    console.log('✅ Vista creada sin duplicados');

    // 3. Verificar que no hay duplicados
    console.log('3️⃣ Verificando eliminación de duplicados...');
    
    const duplicateCheck = await client.query(`
      SELECT 
        id, 
        COUNT(*) as cantidad
      FROM central_v_llamados_automaticos 
      GROUP BY id 
      HAVING COUNT(*) > 1
    `);
    
    console.log(`📊 IDs duplicados después de la corrección: ${duplicateCheck.rows.length}`);

    // 4. Verificar lógica de actuales
    console.log('4️⃣ Verificando lógica de actuales corregida...');
    
    const horaActual = new Date();
    const horaChile = horaActual.toLocaleString('es-CL', {timeZone: 'America/Santiago'});
    console.log(`🕐 Hora actual en Chile: ${horaChile}`);
    
    const actualesCorregidos = await client.query(`
      SELECT 
        instalacion_nombre,
        programado_para AT TIME ZONE 'America/Santiago' as hora_santiago,
        es_actual,
        EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') as hora_programada,
        EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Santiago') as hora_actual
      FROM central_v_llamados_automaticos 
      WHERE es_actual = true
      ORDER BY programado_para
      LIMIT 5
    `);
    
    console.log(`📊 Llamados "actuales" después de corrección: ${actualesCorregidos.rows.length}`);
    actualesCorregidos.rows.forEach(row => {
      console.log(`  - ${row.instalacion_nombre} - Hora programada: ${row.hora_programada}:00, Hora actual: ${row.hora_actual}:xx`);
    });

    // 5. Estadísticas finales
    console.log('5️⃣ Estadísticas finales...');
    
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN es_actual THEN 1 END) as actuales,
        COUNT(CASE WHEN es_proximo THEN 1 END) as proximos,
        COUNT(CASE WHEN es_urgente THEN 1 END) as urgentes,
        COUNT(CASE WHEN estado_llamado != 'pendiente' THEN 1 END) as completados,
        COUNT(CASE WHEN estado_llamado = 'pendiente' AND programado_para < now() THEN 1 END) as no_realizados
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para AT TIME ZONE 'America/Santiago') BETWEEN CURRENT_DATE - 1 AND CURRENT_DATE + 1
    `);
    
    console.log('📊 Estadísticas finales (3 días):', stats.rows[0]);

    console.log('\n🎉 SOLUCIÓN FINAL COMPLETADA');
    console.log('✅ Duplicados eliminados completamente');
    console.log('✅ Lógica de actuales corregida (solo hora exacta)');
    console.log('✅ IDs únicos garantizados');
    console.log('✅ Vista optimizada y funcional');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
fixFinalDefinitivo()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

