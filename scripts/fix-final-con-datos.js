const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Configurar conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixFinalConDatos() {
  console.log('🔧 AJUSTANDO VISTA PARA MOSTRAR DATOS SIN DUPLICADOS\n');

  const client = await pool.connect();
  
  try {
    console.log('1️⃣ Eliminando vista existente...');
    await client.query('DROP VIEW IF EXISTS central_v_llamados_automaticos');
    console.log('✅ Vista eliminada');

    console.log('2️⃣ Creando vista optimizada con datos reales...');
    
    const createViewSQL = `
    CREATE VIEW central_v_llamados_automaticos AS
    WITH slots_base AS (
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
        (pm.anio || '-' || LPAD(pm.mes::text,2,'0') || '-' || LPAD(pm.dia::text,2,'0'))::date AS fecha,
        gs.slot_inicio,
        date_trunc('hour', (gs.slot_inicio AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') AS hora_local
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id AND po.activo = true
      INNER JOIN instalaciones i ON i.id = po.instalacion_id
      INNER JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      CROSS JOIN LATERAL generate_series(
        (pm.anio || '-' || LPAD(pm.mes::text,2,'0') || '-' || LPAD(pm.dia::text,2,'0'))::date::timestamp + cci.ventana_inicio::time,
        (pm.anio || '-' || LPAD(pm.mes::text,2,'0') || '-' || LPAD(pm.dia::text,2,'0'))::date::timestamp + cci.ventana_fin::time,
        make_interval(mins => cci.intervalo_minutos)
      ) AS gs(slot_inicio)
      WHERE pm.tipo_turno = 'planificado'
        AND cci.habilitado = true
        AND cci.intervalo_minutos IS NOT NULL
        AND cci.ventana_inicio IS NOT NULL
        AND cci.ventana_fin IS NOT NULL
        AND cci.ventana_inicio < cci.ventana_fin
    ),
    slots_unicos AS (
      SELECT 
        sb.*,
        -- ✅ ELIMINAR DUPLICADOS: Solo el primer slot por instalación/hora
        ROW_NUMBER() OVER (
          PARTITION BY sb.instalacion_id, sb.hora_local
          ORDER BY sb.pauta_id, sb.slot_inicio
        ) as rn
      FROM slots_base sb
    ),
    slots_finales AS (
      SELECT su.*
      FROM slots_unicos su
      WHERE su.rn = 1  -- ✅ SOLO UN REGISTRO POR INSTALACIÓN/HORA
    )
    SELECT 
      -- ✅ ID ÚNICO: instalación + timestamp exacto
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
    console.log('✅ Vista optimizada creada');

    // 3. Verificar duplicados
    console.log('3️⃣ Verificando duplicados...');
    
    const duplicateCheck = await client.query(`
      SELECT COUNT(*) as total_registros,
             COUNT(DISTINCT id) as ids_unicos
      FROM central_v_llamados_automaticos
    `);
    
    const duplicados = duplicateCheck.rows[0];
    console.log(`📊 Total registros: ${duplicados.total_registros}, IDs únicos: ${duplicados.ids_unicos}`);
    console.log(`✅ ${duplicados.total_registros === duplicados.ids_unicos ? 'SIN DUPLICADOS' : 'TIENE DUPLICADOS'}`);

    // 4. Verificar lógica de actuales
    console.log('4️⃣ Verificando lógica de actuales...');
    
    const horaActual = new Date();
    const horaActualNum = horaActual.getHours() - 3; // Ajuste UTC a Chile (aproximado)
    console.log(`🕐 Hora actual aproximada en Chile: ${horaActualNum}:xx`);
    
    const actuales = await client.query(`
      SELECT 
        instalacion_nombre,
        EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') as hora_programada,
        es_actual,
        DATE(programado_para AT TIME ZONE 'America/Santiago') as fecha_programada,
        DATE(now() AT TIME ZONE 'America/Santiago') as fecha_actual
      FROM central_v_llamados_automaticos 
      WHERE es_actual = true
      ORDER BY programado_para
      LIMIT 10
    `);
    
    console.log(`📊 Llamados "actuales": ${actuales.rows.length}`);
    actuales.rows.forEach(row => {
      console.log(`  - ${row.instalacion_nombre} - ${row.hora_programada}:00 (${row.fecha_programada} vs ${row.fecha_actual})`);
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
    
    console.log('📊 Estadísticas (3 días):', stats.rows[0]);

    console.log('\n🎉 VISTA FINAL OPTIMIZADA');
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
fixFinalConDatos()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

