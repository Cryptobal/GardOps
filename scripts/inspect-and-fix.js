const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Configurar conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function inspectAndFix() {
  console.log('🔍 INSPECCIONANDO ESTRUCTURA DE TABLAS\n');

  const client = await pool.connect();
  
  try {
    // 1. Inspeccionar estructura de as_turnos_pauta_mensual
    console.log('1️⃣ Inspeccionando as_turnos_pauta_mensual...');
    const pautaColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_pauta_mensual' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Columnas encontradas:');
    pautaColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // 2. Verificar algunos registros de ejemplo
    console.log('\n2️⃣ Verificando registros de ejemplo...');
    const sampleData = await client.query(`
      SELECT * FROM as_turnos_pauta_mensual 
      LIMIT 3
    `);
    
    console.log('📋 Registros de ejemplo:');
    if (sampleData.rows.length > 0) {
      console.log('Columnas disponibles:', Object.keys(sampleData.rows[0]));
      sampleData.rows.forEach((row, i) => {
        console.log(`Registro ${i + 1}:`, JSON.stringify(row, null, 2));
      });
    } else {
      console.log('No hay registros en la tabla');
    }

    // 3. Crear vista simplificada usando solo columnas que sabemos que existen
    console.log('\n3️⃣ Creando vista simplificada...');
    
    await client.query('DROP VIEW IF EXISTS central_v_llamados_automaticos');
    
    // Usar una consulta más simple que no dependa de columnas específicas de estado
    const createSimpleView = `
    CREATE VIEW central_v_llamados_automaticos AS
    WITH instalaciones_activas AS (
      SELECT DISTINCT
        i.id AS instalacion_id,
        i.nombre AS instalacion_nombre,
        i.telefono AS instalacion_telefono,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin,
        cci.modo,
        cci.mensaje_template,
        CURRENT_DATE as fecha
      FROM instalaciones i
      INNER JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE cci.habilitado = true
        AND cci.intervalo_minutos IS NOT NULL
        AND cci.ventana_inicio IS NOT NULL
        AND cci.ventana_fin IS NOT NULL
    ),
    slots_generados AS (
      SELECT
        ia.instalacion_id,
        ia.instalacion_nombre,
        ia.instalacion_telefono,
        ia.intervalo_minutos,
        ia.ventana_inicio,
        ia.ventana_fin,
        ia.modo,
        ia.mensaje_template,
        gs.slot_inicio
      FROM instalaciones_activas ia
      CROSS JOIN LATERAL generate_series(
        (ia.fecha::timestamp + ia.ventana_inicio::time),
        (ia.fecha::timestamp + ia.ventana_fin::time),
        make_interval(mins => ia.intervalo_minutos)
      ) AS gs(slot_inicio)
      WHERE ia.ventana_inicio < ia.ventana_fin
    ),
    colapsado_hora AS (
      SELECT 
        sg.instalacion_id,
        sg.instalacion_nombre,
        sg.instalacion_telefono,
        sg.intervalo_minutos,
        sg.ventana_inicio,
        sg.ventana_fin,
        sg.modo,
        sg.mensaje_template,
        date_trunc('hour', (sg.slot_inicio AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') AS hora_local,
        MIN(sg.slot_inicio) AS slot_representativo
      FROM slots_generados sg
      GROUP BY 
        sg.instalacion_id,
        sg.instalacion_nombre,
        sg.instalacion_telefono,
        sg.intervalo_minutos,
        sg.ventana_inicio,
        sg.ventana_fin,
        sg.modo,
        sg.mensaje_template,
        date_trunc('hour', (sg.slot_inicio AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')
    )
    SELECT 
      -- ✅ ID único basado en instalación + timestamp
      md5(
        concat(
          ch.instalacion_id::text, 
          '|', 
          extract(epoch from ch.slot_representativo)::text
        )
      )::uuid AS id,
      
      ch.instalacion_id,
      NULL::uuid AS guardia_id,
      NULL::uuid AS pauta_id,
      NULL::uuid AS puesto_id,
      ch.slot_representativo AS programado_para,
      COALESCE(cl.estado, 'pendiente') AS estado_llamado,
      COALESCE(cl.contacto_tipo, 'instalacion') AS contacto_tipo,
      COALESCE(cl.contacto_id, ch.instalacion_id) AS contacto_id,
      COALESCE(cl.contacto_nombre, ch.instalacion_nombre) AS contacto_nombre,
      COALESCE(cl.contacto_telefono, ch.instalacion_telefono) AS contacto_telefono,
      cl.observaciones,
      ch.instalacion_nombre,
      NULL::text AS guardia_nombre,
      NULL::text AS nombre_puesto,
      NULL::text AS rol_nombre,
      ch.intervalo_minutos,
      ch.ventana_inicio,
      ch.ventana_fin,
      ch.modo,
      ch.mensaje_template,
      
      -- ✅ LÓGICA CORREGIDA: Urgente (más de 30 min atrasado)
      CASE 
        WHEN ch.hora_local < (now() AT TIME ZONE 'America/Santiago') - interval '30 minutes'
        THEN true 
        ELSE false 
      END AS es_urgente,
      
      -- ✅ LÓGICA CORREGIDA: Actual (hora exacta actual)
      CASE 
        WHEN date_trunc('hour', ch.hora_local) = date_trunc('hour', now() AT TIME ZONE 'America/Santiago')
        THEN true 
        ELSE false 
      END AS es_actual,
      
      -- ✅ LÓGICA CORREGIDA: Próximo (futuro)
      CASE 
        WHEN ch.hora_local > (now() AT TIME ZONE 'America/Santiago')
        THEN true 
        ELSE false 
      END AS es_proximo
      
    FROM colapsado_hora ch
    LEFT JOIN central_llamados cl 
      ON cl.instalacion_id = ch.instalacion_id 
      AND date_trunc('hour', (cl.programado_para AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') = ch.hora_local
    ORDER BY programado_para ASC
    `;
    
    await client.query(createSimpleView);
    console.log('✅ Vista simplificada creada exitosamente');

    // 4. Verificar estadísticas
    console.log('\n4️⃣ Verificando estadísticas...');
    
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_llamados,
        COUNT(CASE WHEN es_actual THEN 1 END) as actuales,
        COUNT(CASE WHEN es_proximo THEN 1 END) as proximos,
        COUNT(CASE WHEN es_urgente THEN 1 END) as urgentes,
        COUNT(CASE WHEN estado_llamado != 'pendiente' THEN 1 END) as completados,
        COUNT(CASE WHEN estado_llamado = 'pendiente' AND programado_para < now() THEN 1 END) as no_realizados
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para AT TIME ZONE 'America/Santiago') = CURRENT_DATE
    `);
    
    console.log('📊 Estadísticas del día actual:', stats.rows[0]);

    console.log('\n🎉 SOLUCIÓN APLICADA EXITOSAMENTE');
    console.log('✅ Vista central_v_llamados_automaticos creada');
    console.log('✅ IDs únicos implementados');
    console.log('✅ Lógica de KPIs corregida');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
inspectAndFix()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
