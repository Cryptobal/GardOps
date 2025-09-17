require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function fixVistaFinalCorrecto() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creando vista final correcta');
    
    // 1. Eliminar vista actual
    console.log('1️⃣ Eliminando vista actual...');
    await client.query('DROP VIEW IF EXISTS central_v_llamados_automaticos CASCADE');
    console.log('✅ Vista eliminada');
    
    // 2. Crear vista final correcta
    console.log('2️⃣ Creando vista final correcta...');
    await client.query(`
      CREATE VIEW central_v_llamados_automaticos AS
      WITH slots_base AS (
        SELECT
          -- Generar ID único basado en instalación y timestamp final
          md5(concat(pm.instalacion_id::text, '|', timestamp_final::text))::uuid as id,
          pm.instalacion_id,
          pm.guardia_id,
          pm.id as pauta_id,
          po.id as puesto_id,
          -- Usar el timestamp final directamente (ya en UTC)
          timestamp_final as programado_para,
          'pendiente' as estado_llamado,
          'instalacion' as contacto_tipo,
          i.telefono as contacto_telefono,
          i.nombre as contacto_nombre,
          NULL as observaciones,
          NULL as ejecutado_en,
          i.nombre as instalacion_nombre,
          COALESCE(CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre), 'Sin asignar') as guardia_nombre,
          po.nombre_puesto,
          rs.nombre as rol_nombre,
          cci.intervalo_minutos,
          cci.ventana_inicio,
          cci.ventana_fin,
          cci.modo,
          cci.mensaje_template,
          -- Calcular flags usando el timestamp final
          CASE 
            WHEN timestamp_final < now() - interval '30 minutes'
            THEN true ELSE false 
          END as es_urgente,
          CASE 
            WHEN date_trunc('hour', timezone('America/Santiago', timestamp_final)) = 
                 date_trunc('hour', timezone('America/Santiago', now()))
            THEN true ELSE false 
          END as es_actual,
          CASE 
            WHEN timestamp_final > now()
            THEN true ELSE false 
          END as es_proximo,
          CASE 
            WHEN timestamp_final < now()
            THEN true ELSE false 
          END as es_no_realizado,
          pm.tenant_id,
          pm.id as pauta_id_orden
        FROM as_turnos_pauta_mensual pm
        INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id AND po.activo = true
        INNER JOIN instalaciones i ON i.id = po.instalacion_id
        INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
        LEFT JOIN guardias g ON g.id = pm.guardia_id
        LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
        CROSS JOIN LATERAL (
          -- Generar timestamps directos para cada hora específica
          SELECT timestamp_final FROM (
            -- Horas del mismo día: 19:00, 20:00, 21:00, 22:00, 23:00
            -- Crear timestamp en Chile y convertir a UTC para almacenamiento
            SELECT timezone('America/Santiago', (pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0') || ' 19:00:00')::timestamp) as timestamp_final
            UNION ALL
            SELECT timezone('America/Santiago', (pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0') || ' 20:00:00')::timestamp)
            UNION ALL
            SELECT timezone('America/Santiago', (pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0') || ' 21:00:00')::timestamp)
            UNION ALL
            SELECT timezone('America/Santiago', (pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0') || ' 22:00:00')::timestamp)
            UNION ALL
            SELECT timezone('America/Santiago', (pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0') || ' 23:00:00')::timestamp)
            UNION ALL
            -- Horas del día siguiente: 00:00, 01:00, 02:00, 03:00, 04:00, 05:00, 06:00, 07:00
            SELECT timezone('America/Santiago', ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + interval '1 day' + time '00:00:00')::timestamp)
            UNION ALL
            SELECT timezone('America/Santiago', ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + interval '1 day' + time '01:00:00')::timestamp)
            UNION ALL
            SELECT timezone('America/Santiago', ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + interval '1 day' + time '02:00:00')::timestamp)
            UNION ALL
            SELECT timezone('America/Santiago', ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + interval '1 day' + time '03:00:00')::timestamp)
            UNION ALL
            SELECT timezone('America/Santiago', ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + interval '1 day' + time '04:00:00')::timestamp)
            UNION ALL
            SELECT timezone('America/Santiago', ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + interval '1 day' + time '05:00:00')::timestamp)
            UNION ALL
            SELECT timezone('America/Santiago', ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + interval '1 day' + time '06:00:00')::timestamp)
            UNION ALL
            SELECT timezone('America/Santiago', ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + interval '1 day' + time '07:00:00')::timestamp)
          ) timestamps
        ) slots
        WHERE pm.tipo_turno = 'planificado'
          AND cci.habilitado = true
          AND cci.intervalo_minutos IS NOT NULL
          AND cci.ventana_inicio IS NOT NULL
          AND cci.ventana_fin IS NOT NULL
          AND pm.tenant_id IS NOT NULL
          AND i.tenant_id = pm.tenant_id
          AND po.tenant_id = pm.tenant_id
          AND rs.tenant_id = pm.tenant_id
          AND (g.tenant_id = pm.tenant_id OR g.tenant_id IS NULL)
          AND (cci.tenant_id = pm.tenant_id OR cci.tenant_id IS NULL)
      ),
      slots_con_rn AS (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY instalacion_id, date_trunc('hour', programado_para)
            ORDER BY pauta_id_orden DESC
          ) as rn
        FROM slots_base
      ),
      slots_unicos AS (
        SELECT *
        FROM slots_con_rn
        WHERE rn = 1
      ),
      llamados_existentes AS (
        SELECT
          cl.id,
          cl.instalacion_id,
          cl.programado_para,
          cl.estado,
          cl.observaciones,
          cl.ejecutado_en,
          ROW_NUMBER() OVER (
            PARTITION BY cl.instalacion_id, date_trunc('hour', timezone('America/Santiago', cl.programado_para))
            ORDER BY cl.created_at DESC
          ) as rn
        FROM central_llamados cl
        WHERE cl.tenant_id IS NOT NULL
      ),
      llamados_unicos AS (
        SELECT *
        FROM llamados_existentes
        WHERE rn = 1
      ),
      resultado_final AS (
        SELECT
          su.id,
          su.instalacion_id,
          su.guardia_id,
          su.pauta_id,
          su.puesto_id,
          su.programado_para,
          COALESCE(lu.estado, su.estado_llamado) as estado_llamado,
          su.contacto_tipo,
          su.contacto_telefono,
          su.contacto_nombre,
          COALESCE(lu.observaciones, su.observaciones) as observaciones,
          lu.ejecutado_en,
          su.instalacion_nombre,
          su.guardia_nombre,
          su.nombre_puesto,
          su.rol_nombre,
          su.intervalo_minutos,
          su.ventana_inicio,
          su.ventana_fin,
          su.modo,
          su.mensaje_template,
          su.es_urgente,
          su.es_actual,
          su.es_proximo,
          su.es_no_realizado,
          su.tenant_id
        FROM slots_unicos su
        LEFT JOIN llamados_unicos lu ON lu.instalacion_id = su.instalacion_id
          AND date_trunc('hour', timezone('America/Santiago', lu.programado_para)) = 
              date_trunc('hour', timezone('America/Santiago', su.programado_para))
      )
      SELECT * FROM resultado_final
      ORDER BY 
        DATE(timezone('America/Santiago', programado_para)),
        CASE 
          WHEN EXTRACT(HOUR FROM timezone('America/Santiago', programado_para)) >= 19 THEN EXTRACT(HOUR FROM timezone('America/Santiago', programado_para))
          ELSE EXTRACT(HOUR FROM timezone('America/Santiago', programado_para)) + 24
        END;
    `);
    console.log('✅ Vista final correcta creada');
    
    // 3. Verificar resultados
    console.log('3️⃣ Verificando resultados...');
    const { rows } = await client.query(`
      SELECT 
        programado_para,
        timezone('America/Santiago', programado_para) as chile_time,
        EXTRACT(HOUR FROM timezone('America/Santiago', programado_para)) as hora_chile,
        EXTRACT(MINUTE FROM timezone('America/Santiago', programado_para)) as minuto_chile,
        estado_llamado,
        es_actual,
        es_proximo,
        es_urgente
      FROM central_v_llamados_automaticos
      WHERE DATE(timezone('America/Santiago', programado_para)) = '2025-09-16'
      ORDER BY 
        DATE(timezone('America/Santiago', programado_para)),
        CASE 
          WHEN EXTRACT(HOUR FROM timezone('America/Santiago', programado_para)) >= 19 THEN EXTRACT(HOUR FROM timezone('America/Santiago', programado_para))
          ELSE EXTRACT(HOUR FROM timezone('America/Santiago', programado_para)) + 24
        END
    `);
    
    console.log('📊 Llamados generados para el 16 de septiembre:');
    console.log(`   Total: ${rows.length}`);
    
    const horasGeneradas = rows.map(r => parseInt(r.hora_chile));
    const horasEsperadas = [19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7];
    
    rows.forEach(row => {
      console.log(`   - UTC: ${row.programado_para} -> Chile: ${row.chile_time} (Hora: ${row.hora_chile}, Minuto: ${row.minuto_chile}) - Estado: ${row.estado_llamado} - Actual: ${row.es_actual} - Próximo: ${row.es_proximo} - Urgente: ${row.es_urgente}`);
    });
    
    console.log('✅ Verificación de horarios:');
    console.log(`   Horas esperadas: ${horasEsperadas.join(', ')}`);
    console.log(`   Horas generadas: ${horasGeneradas.join(', ')}`);
    console.log(`   Tipos esperadas: ${horasEsperadas.map(h => typeof h).join(', ')}`);
    console.log(`   Tipos generadas: ${horasGeneradas.map(h => typeof h).join(', ')}`);
    console.log(`   JSON esperado: ${JSON.stringify(horasEsperadas)}`);
    console.log(`   JSON generado: ${JSON.stringify(horasGeneradas)}`);
    console.log(`   ¿Son correctas? ${JSON.stringify(horasGeneradas) === JSON.stringify(horasEsperadas) ? '✅ SÍ' : '❌ NO'}`);
    
    console.log('✅ Vista final correcta creada exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixVistaFinalCorrecto().catch(console.error);
