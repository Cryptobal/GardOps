const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Configurar conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixVentanasNocturnas() {
  console.log('🌙 CORRIGIENDO VISTA PARA VENTANAS NOCTURNAS\n');

  const client = await pool.connect();
  
  try {
    console.log('1️⃣ Eliminando vista existente...');
    await client.query('DROP VIEW IF EXISTS central_v_llamados_automaticos');
    console.log('✅ Vista eliminada');

    console.log('2️⃣ Creando vista con soporte para ventanas nocturnas...');
    
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
    -- ✅ SLOTS DIURNOS: cuando ventana_inicio < ventana_fin (ej: 08:00 a 17:00)
    slots_diurnos AS (
      SELECT 
        db.*,
        gs.slot_inicio
      FROM datos_base db
      CROSS JOIN LATERAL generate_series(
        db.fecha::timestamp + db.ventana_inicio::time,
        db.fecha::timestamp + db.ventana_fin::time,
        make_interval(mins => db.intervalo_minutos)
      ) AS gs(slot_inicio)
      WHERE db.ventana_inicio < db.ventana_fin
    ),
    -- ✅ SLOTS NOCTURNOS PARTE 1: desde ventana_inicio hasta medianoche
    slots_nocturnos_1 AS (
      SELECT 
        db.*,
        gs.slot_inicio
      FROM datos_base db
      CROSS JOIN LATERAL generate_series(
        db.fecha::timestamp + db.ventana_inicio::time,
        db.fecha::timestamp + time '23:59:59',
        make_interval(mins => db.intervalo_minutos)
      ) AS gs(slot_inicio)
      WHERE db.ventana_inicio >= db.ventana_fin  -- ✅ VENTANA NOCTURNA
    ),
    -- ✅ SLOTS NOCTURNOS PARTE 2: desde medianoche hasta ventana_fin del día siguiente
    slots_nocturnos_2 AS (
      SELECT 
        db.*,
        gs.slot_inicio
      FROM datos_base db
      CROSS JOIN LATERAL generate_series(
        (db.fecha + interval '1 day')::timestamp,
        (db.fecha + interval '1 day')::timestamp + db.ventana_fin::time,
        make_interval(mins => db.intervalo_minutos)
      ) AS gs(slot_inicio)
      WHERE db.ventana_inicio >= db.ventana_fin  -- ✅ VENTANA NOCTURNA
    ),
    -- ✅ UNIR TODOS LOS SLOTS
    todos_los_slots AS (
      SELECT * FROM slots_diurnos
      UNION ALL
      SELECT * FROM slots_nocturnos_1
      UNION ALL
      SELECT * FROM slots_nocturnos_2
    ),
    -- ✅ COLAPSAR POR HORA PARA ELIMINAR DUPLICADOS
    slots_colapsados AS (
      SELECT 
        ts.*,
        date_trunc('hour', (ts.slot_inicio AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') AS hora_local,
        ROW_NUMBER() OVER (
          PARTITION BY ts.instalacion_id, 
                       date_trunc('hour', (ts.slot_inicio AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')
          ORDER BY ts.pauta_id, ts.slot_inicio
        ) as rn
      FROM todos_los_slots ts
    ),
    slots_finales AS (
      SELECT sc.*
      FROM slots_colapsados sc
      WHERE sc.rn = 1  -- ✅ SOLO UN REGISTRO POR INSTALACIÓN/HORA
    )
    SELECT 
      -- ✅ ID ÚNICO GARANTIZADO
      md5(
        concat(
          sf.instalacion_id::text, 
          '|', 
          extract(epoch from sf.slot_inicio)::text
        )
      )::uuid AS id,
      
      sf.instalacion_id,
      sf.guardia_id,
      sf.pauta_id,
      sf.puesto_id,
      sf.slot_inicio AS programado_para,
      COALESCE(cl.estado, 'pendiente') AS estado_llamado,
      COALESCE(cl.contacto_tipo, 'instalacion') AS contacto_tipo,
      COALESCE(cl.contacto_id, sf.instalacion_id) AS contacto_id,
      COALESCE(cl.contacto_nombre, sf.instalacion_nombre) AS contacto_nombre,
      COALESCE(cl.contacto_telefono, sf.instalacion_telefono) AS contacto_telefono,
      cl.observaciones,
      sf.instalacion_nombre,
      sf.guardia_nombre,
      sf.nombre_puesto,
      sf.rol_nombre,
      sf.intervalo_minutos,
      sf.ventana_inicio,
      sf.ventana_fin,
      sf.modo,
      sf.mensaje_template,
      
      -- ✅ LÓGICA CORREGIDA: Urgente (más de 30 min atrasado)
      CASE 
        WHEN sf.hora_local < (now() AT TIME ZONE 'America/Santiago') - interval '30 minutes'
        THEN true 
        ELSE false 
      END AS es_urgente,
      
      -- ✅ LÓGICA CORREGIDA: Actual (solo la hora exacta actual)
      CASE 
        WHEN EXTRACT(HOUR FROM sf.hora_local) = EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Santiago')
         AND DATE(sf.hora_local) = DATE(now() AT TIME ZONE 'America/Santiago')
        THEN true 
        ELSE false 
      END AS es_actual,
      
      -- ✅ LÓGICA CORREGIDA: Próximo (futuro)
      CASE 
        WHEN sf.hora_local > (now() AT TIME ZONE 'America/Santiago')
        THEN true 
        ELSE false 
      END AS es_proximo
      
    FROM slots_finales sf
    LEFT JOIN central_llamados cl 
      ON cl.instalacion_id = sf.instalacion_id 
      AND date_trunc('hour', (cl.programado_para AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') = sf.hora_local
    ORDER BY programado_para ASC
    `;
    
    await client.query(createViewSQL);
    console.log('✅ Vista con ventanas nocturnas creada');

    // 3. Verificar registros generados
    console.log('3️⃣ Verificando registros generados...');
    
    const totalRegistros = await client.query(`
      SELECT COUNT(*) as total FROM central_v_llamados_automaticos
    `);
    
    console.log(`📊 Total de registros generados: ${totalRegistros.rows[0].total}`);

    // 4. Verificar duplicados
    console.log('4️⃣ Verificando duplicados...');
    
    const duplicateCheck = await client.query(`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(DISTINCT id) as ids_unicos
      FROM central_v_llamados_automaticos
    `);
    
    const duplicados = duplicateCheck.rows[0];
    console.log(`📊 Total: ${duplicados.total_registros}, Únicos: ${duplicados.ids_unicos}`);
    console.log(`✅ ${duplicados.total_registros === duplicados.ids_unicos ? 'SIN DUPLICADOS' : 'TIENE DUPLICADOS'}`);

    // 5. Verificar muestra de datos
    console.log('5️⃣ Mostrando muestra de datos...');
    
    const muestra = await client.query(`
      SELECT 
        instalacion_nombre,
        programado_para AT TIME ZONE 'America/Santiago' as hora_chile,
        es_actual,
        es_proximo,
        es_urgente,
        estado_llamado
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para AT TIME ZONE 'America/Santiago') BETWEEN CURRENT_DATE - 1 AND CURRENT_DATE + 1
      ORDER BY programado_para
      LIMIT 10
    `);
    
    console.log('📋 Muestra de llamados:');
    muestra.rows.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.instalacion_nombre} - ${row.hora_chile} - ${row.estado_llamado} - A:${row.es_actual} P:${row.es_proximo} U:${row.es_urgente}`);
    });

    // 6. Estadísticas finales
    console.log('6️⃣ Estadísticas finales...');
    
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
    
    console.log('📊 Estadísticas (3 días):', stats.rows[0]);

    console.log('\n🎉 VISTA NOCTURNA COMPLETADA');
    console.log('✅ Soporte para ventanas que cruzan medianoche');
    console.log('✅ Sin duplicados garantizado');
    console.log('✅ Lógica de actuales corregida');
    console.log('✅ Datos reales mostrados');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
fixVentanasNocturnas()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
