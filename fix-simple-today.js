const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixSimpleToday() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 CORRIGIENDO HORARIOS SIMPLES PARA HOY\n');
    
    // 1. Eliminar vista existente
    console.log('1️⃣ Eliminando vista existente...');
    await client.query('DROP VIEW IF EXISTS central_v_llamados_automaticos');
    console.log('✅ Vista eliminada');
    
    // 2. Crear nueva vista simple solo para hoy
    console.log('2️⃣ Creando vista simple para hoy...');
    
    const createViewSQL = `
    CREATE VIEW central_v_llamados_automaticos AS
    WITH instalaciones_con_monitoreo AS (
      SELECT 
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        i.telefono as instalacion_telefono,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin,
        cci.modo,
        cci.mensaje_template,
        cci.tenant_id
      FROM instalaciones i
      INNER JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE cci.habilitado = true
        AND cci.intervalo_minutos IS NOT NULL
        AND cci.ventana_inicio IS NOT NULL
        AND cci.ventana_fin IS NOT NULL
        AND cci.tenant_id IS NOT NULL
    ),
    slots_hoy AS (
      -- Para ventanas nocturnas: desde ventana_inicio hasta 23:59
      SELECT 
        icm.instalacion_id,
        icm.instalacion_nombre,
        icm.instalacion_telefono,
        icm.intervalo_minutos,
        icm.ventana_inicio,
        icm.ventana_fin,
        icm.modo,
        icm.mensaje_template,
        icm.tenant_id,
        generate_series(
          date_trunc('day', now()) + icm.ventana_inicio,
          date_trunc('day', now()) + '23:59:59'::time,
          make_interval(mins => icm.intervalo_minutos)
        ) as slot_llamada
      FROM instalaciones_con_monitoreo icm
      WHERE icm.ventana_inicio >= icm.ventana_fin
      
      UNION ALL
      
      -- Para ventanas nocturnas: desde 00:00 hasta ventana_fin
      SELECT 
        icm.instalacion_id,
        icm.instalacion_nombre,
        icm.instalacion_telefono,
        icm.intervalo_minutos,
        icm.ventana_inicio,
        icm.ventana_fin,
        icm.modo,
        icm.mensaje_template,
        icm.tenant_id,
        generate_series(
          date_trunc('day', now()) + '00:00:00'::time,
          date_trunc('day', now()) + icm.ventana_fin,
          make_interval(mins => icm.intervalo_minutos)
        ) as slot_llamada
      FROM instalaciones_con_monitoreo icm
      WHERE icm.ventana_inicio >= icm.ventana_fin
      
      UNION ALL
      
      -- Para ventanas diurnas
      SELECT 
        icm.instalacion_id,
        icm.instalacion_nombre,
        icm.instalacion_telefono,
        icm.intervalo_minutos,
        icm.ventana_inicio,
        icm.ventana_fin,
        icm.modo,
        icm.mensaje_template,
        icm.tenant_id,
        generate_series(
          date_trunc('day', now()) + icm.ventana_inicio,
          date_trunc('day', now()) + icm.ventana_fin,
          make_interval(mins => icm.intervalo_minutos)
        ) as slot_llamada
      FROM instalaciones_con_monitoreo icm
      WHERE icm.ventana_inicio < icm.ventana_fin
    ),
    llamados_calculados AS (
      SELECT 
        -- ID determinístico basado en instalación + timestamp
        md5(
          concat(
            sh.instalacion_id::text, 
            '|', 
            extract(epoch from sh.slot_llamada)::text
          )
        )::uuid as id,
        
        sh.instalacion_id,
        NULL::uuid as guardia_id,
        NULL::uuid as pauta_id,
        NULL::uuid as puesto_id,
        
        sh.slot_llamada as programado_para,
        'pendiente' as estado_llamado,
        'instalacion' as contacto_tipo,
        sh.instalacion_id as contacto_id,
        sh.instalacion_nombre as contacto_nombre,
        sh.instalacion_telefono as contacto_telefono,
        NULL as observaciones,
        sh.instalacion_nombre,
        NULL::text as guardia_nombre,
        NULL::text as nombre_puesto,
        'Monitoreo General'::text as rol_nombre,
        sh.intervalo_minutos,
        sh.ventana_inicio,
        sh.ventana_fin,
        sh.modo,
        sh.mensaje_template,
        
        -- Calcular si es urgente (más de 30 minutos atrasado)
        CASE 
          WHEN sh.slot_llamada < (now() - interval '30 minutes')
          THEN true
          ELSE false
        END as es_urgente,
        
        -- Calcular si es actual (hora actual)
        CASE 
          WHEN EXTRACT(HOUR FROM sh.slot_llamada) = EXTRACT(HOUR FROM now())
          THEN true
          ELSE false
        END as es_actual,
        
        -- Calcular si es próximo (futuro)
        CASE 
          WHEN sh.slot_llamada > now()
          THEN true
          ELSE false
        END as es_proximo,
        
        -- Calcular si es no realizado (pendiente y atrasado)
        CASE 
          WHEN sh.slot_llamada < (now() - interval '30 minutes')
          THEN true
          ELSE false
        END as es_no_realizado,
        
        sh.tenant_id
      FROM slots_hoy sh
      WHERE sh.slot_llamada >= now() - interval '1 day'
        AND sh.slot_llamada <= now() + interval '1 day'
    )
    SELECT * FROM llamados_calculados
    ORDER BY programado_para ASC;
    `;
    
    await client.query(createViewSQL);
    console.log('✅ Vista simple creada');
    
    // 3. Verificar que la vista funciona
    console.log('3️⃣ Verificando vista...');
    const count = await client.query('SELECT COUNT(*) as total FROM central_v_llamados_automaticos');
    console.log('📞 Total llamados en vista:', count.rows[0].total);
    
    // 4. Verificar llamados para hoy por instalación
    const hoy = await client.query(`
      SELECT 
        instalacion_nombre,
        COUNT(*) as total_llamados,
        MIN(programado_para) as primer_llamado,
        MAX(programado_para) as ultimo_llamado
      FROM central_v_llamados_automaticos 
      WHERE DATE(programado_para) = CURRENT_DATE
        AND tenant_id = '1397e653-a702-4020-9702-3ae4f3f8b337'
      GROUP BY instalacion_nombre
      ORDER BY instalacion_nombre
    `);
    
    console.log('\n📅 Llamados para hoy por instalación:');
    hoy.rows.forEach(row => {
      console.log(`  - ${row.instalacion_nombre}: ${row.total_llamados} llamados`);
      console.log(`    * Primer: ${row.primer_llamado}`);
      console.log(`    * Último: ${row.ultimo_llamado}`);
    });
    
    // 5. Mostrar todos los llamados para hoy
    const sample = await client.query(`
      SELECT 
        instalacion_nombre,
        programado_para,
        ventana_inicio,
        ventana_fin,
        EXTRACT(HOUR FROM programado_para) as hora,
        EXTRACT(MINUTE FROM programado_para) as minuto
      FROM central_v_llamados_automaticos 
      WHERE DATE(programado_para) = CURRENT_DATE
        AND tenant_id = '1397e653-a702-4020-9702-3ae4f3f8b337'
      ORDER BY instalacion_nombre, programado_para
    `);
    
    console.log('\n📋 Llamados para hoy:');
    sample.rows.forEach(row => {
      console.log(`  - ${row.instalacion_nombre} | ${row.programado_para} | Hora: ${row.hora}:${row.minuto.toString().padStart(2, '0')} | Ventana: ${row.ventana_inicio}-${row.ventana_fin}`);
    });
    
    console.log('\n✅ HORARIOS SIMPLES CORREGIDOS');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixSimpleToday();
