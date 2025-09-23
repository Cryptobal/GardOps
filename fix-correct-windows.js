const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixCorrectWindows() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 CORRIGIENDO VENTANAS DE MONITOREO (VERSIÓN CORRECTA)\n');
    
    // 1. Eliminar vista existente
    console.log('1️⃣ Eliminando vista existente...');
    await client.query('DROP VIEW IF EXISTS central_v_llamados_automaticos');
    console.log('✅ Vista eliminada');
    
    // 2. Crear nueva vista con lógica correcta para ventanas nocturnas
    console.log('2️⃣ Creando vista con lógica correcta...');
    
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
    llamados_calculados AS (
      SELECT 
        -- ID determinístico basado en instalación + timestamp
        md5(
          concat(
            icm.instalacion_id::text, 
            '|', 
            extract(epoch from gs.slot_llamada)::text
          )
        )::uuid as id,
        
        icm.instalacion_id,
        NULL::uuid as guardia_id,
        NULL::uuid as pauta_id,
        NULL::uuid as puesto_id,
        
        gs.slot_llamada as programado_para,
        'pendiente' as estado_llamado,
        'instalacion' as contacto_tipo,
        icm.instalacion_id as contacto_id,
        icm.instalacion_nombre as contacto_nombre,
        icm.instalacion_telefono as contacto_telefono,
        NULL as observaciones,
        icm.instalacion_nombre,
        NULL::text as guardia_nombre,
        NULL::text as nombre_puesto,
        'Monitoreo General'::text as rol_nombre,
        icm.intervalo_minutos,
        icm.ventana_inicio,
        icm.ventana_fin,
        icm.modo,
        icm.mensaje_template,
        
        -- Calcular si es urgente (más de 30 minutos atrasado)
        CASE 
          WHEN gs.slot_llamada < (now() - interval '30 minutes')
          THEN true
          ELSE false
        END as es_urgente,
        
        -- Calcular si es actual (hora actual)
        CASE 
          WHEN EXTRACT(HOUR FROM gs.slot_llamada) = EXTRACT(HOUR FROM now())
          THEN true
          ELSE false
        END as es_actual,
        
        -- Calcular si es próximo (futuro)
        CASE 
          WHEN gs.slot_llamada > now()
          THEN true
          ELSE false
        END as es_proximo,
        
        -- Calcular si es no realizado (pendiente y atrasado)
        CASE 
          WHEN gs.slot_llamada < (now() - interval '30 minutes')
          THEN true
          ELSE false
        END as es_no_realizado,
        
        icm.tenant_id
      FROM instalaciones_con_monitoreo icm
      CROSS JOIN LATERAL (
        -- Generar slots para los próximos 7 días
        SELECT generate_series(
          date_trunc('day', now()) + icm.ventana_inicio,
          date_trunc('day', now()) + interval '7 days' + icm.ventana_fin,
          make_interval(mins => icm.intervalo_minutos)
        ) as slot_llamada
      ) gs
      WHERE gs.slot_llamada >= now() - interval '1 day'
        AND gs.slot_llamada <= now() + interval '7 days'
        -- Filtrar solo slots dentro de la ventana de monitoreo
        AND (
          -- Para ventanas diurnas (inicio < fin)
          (icm.ventana_inicio < icm.ventana_fin AND 
           EXTRACT(HOUR FROM gs.slot_llamada) >= EXTRACT(HOUR FROM icm.ventana_inicio) AND
           EXTRACT(HOUR FROM gs.slot_llamada) <= EXTRACT(HOUR FROM icm.ventana_fin))
          OR
          -- Para ventanas nocturnas (inicio >= fin) - CORREGIDO
          (icm.ventana_inicio >= icm.ventana_fin AND 
           (EXTRACT(HOUR FROM gs.slot_llamada) >= EXTRACT(HOUR FROM icm.ventana_inicio) OR
            EXTRACT(HOUR FROM gs.slot_llamada) <= EXTRACT(HOUR FROM icm.ventana_fin)))
        )
    )
    SELECT * FROM llamados_calculados
    ORDER BY programado_para ASC;
    `;
    
    await client.query(createViewSQL);
    console.log('✅ Vista corregida creada');
    
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
    
    // 5. Mostrar algunos llamados de ejemplo
    const sample = await client.query(`
      SELECT 
        instalacion_nombre,
        programado_para,
        ventana_inicio,
        ventana_fin
      FROM central_v_llamados_automaticos 
      WHERE DATE(programado_para) = CURRENT_DATE
        AND tenant_id = '1397e653-a702-4020-9702-3ae4f3f8b337'
      ORDER BY instalacion_nombre, programado_para
      LIMIT 15
    `);
    
    console.log('\n📋 Muestra de llamados para hoy:');
    sample.rows.forEach(row => {
      console.log(`  - ${row.instalacion_nombre} | ${row.programado_para} | Ventana: ${row.ventana_inicio}-${row.ventana_fin}`);
    });
    
    console.log('\n✅ VENTANAS DE MONITOREO CORREGIDAS');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixCorrectWindows();
