const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixVistaFinal() {
  console.log('🔧 Creando vista final correcta\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // 1. Eliminar vista actual
    console.log('1️⃣ Eliminando vista actual...');
    await pool.query('DROP VIEW IF EXISTS central_v_llamados_automaticos');
    console.log('✅ Vista eliminada');

    // 2. Crear vista final
    console.log('2️⃣ Creando vista final...');
    await pool.query(`
      CREATE VIEW central_v_llamados_automaticos AS
      WITH slots_generados AS (
        SELECT 
          -- Generar ID único
          md5(concat(
            i.id::text, '|',
            pm.anio::text, '-', 
            LPAD(pm.mes::text, 2, '0'), '-', 
            LPAD(pm.dia::text, 2, '0'), '|',
            EXTRACT(HOUR FROM slot_hora)::text, ':',
            LPAD(EXTRACT(MINUTE FROM slot_hora)::text, 2, '0')
          ))::uuid as id,
          i.id as instalacion_id,
          pm.guardia_id,
          pm.id as pauta_id,
          po.id as puesto_id,
          -- Convertir a UTC para almacenamiento
          (slot_hora AT TIME ZONE 'America/Santiago') AT TIME ZONE 'UTC' as programado_para_utc,
          slot_hora as programado_para,
          'pendiente' as estado_llamado,
          'instalacion' as contacto_tipo,
          i.telefono as contacto_telefono,
          i.nombre as contacto_nombre,
          NULL as observaciones,
          i.nombre as instalacion_nombre,
          COALESCE(CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre), 'Sin asignar') as guardia_nombre,
          po.nombre_puesto,
          rs.nombre as rol_nombre,
          cci.intervalo_minutos,
          cci.ventana_inicio,
          cci.ventana_fin,
          cci.modo,
          cci.mensaje_template,
          -- Calcular flags
          CASE 
            WHEN slot_hora < (now() AT TIME ZONE 'America/Santiago') - interval '30 minutes'
            THEN true ELSE false 
          END as es_urgente,
          CASE 
            WHEN date_trunc('hour', slot_hora) = date_trunc('hour', now() AT TIME ZONE 'America/Santiago')
            THEN true ELSE false 
          END as es_actual,
          CASE 
            WHEN slot_hora > (now() AT TIME ZONE 'America/Santiago')
            THEN true ELSE false 
          END as es_proximo,
          CASE 
            WHEN slot_hora < (now() AT TIME ZONE 'America/Santiago')
            THEN true ELSE false 
          END as es_no_realizado,
          pm.tenant_id,
          ROW_NUMBER() OVER (
            PARTITION BY i.id, date_trunc('hour', slot_hora)
            ORDER BY pm.created_at DESC
          ) as rn
        FROM as_turnos_pauta_mensual pm
        INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id AND po.activo = true
        INNER JOIN instalaciones i ON i.id = po.instalacion_id
        INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
        INNER JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
        LEFT JOIN guardias g ON g.id = pm.guardia_id
        CROSS JOIN LATERAL generate_series(
          (pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + cci.ventana_inicio,
          (pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + interval '1 day' + cci.ventana_fin,
          make_interval(mins => cci.intervalo_minutos)
        ) as slot_hora
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
      slots_unicos AS (
        SELECT *
        FROM slots_generados
        WHERE rn = 1
      ),
      llamados_con_rn AS (
        SELECT
          cl.id,
          cl.instalacion_id,
          cl.programado_para,
          cl.estado,
          cl.observaciones,
          cl.ejecutado_en,
          ROW_NUMBER() OVER (
            PARTITION BY cl.instalacion_id, 
                         date_trunc('hour', cl.programado_para AT TIME ZONE 'America/Santiago') 
            ORDER BY cl.created_at DESC
          ) as rn
        FROM central_llamados cl
        WHERE cl.tenant_id IS NOT NULL
      ),
      unidos_con_estado AS (
        SELECT
          su.id,
          su.instalacion_id,
          su.guardia_id,
          su.pauta_id,
          su.puesto_id,
          su.programado_para_utc as programado_para,
          COALESCE(lcrn.estado, su.estado_llamado) as estado_llamado,
          su.contacto_tipo,
          su.contacto_telefono,
          su.contacto_nombre,
          COALESCE(lcrn.observaciones, su.observaciones) as observaciones,
          lcrn.ejecutado_en,
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
        LEFT JOIN llamados_con_rn lcrn ON lcrn.instalacion_id = su.instalacion_id
          AND date_trunc('hour', (lcrn.programado_para AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') = 
              date_trunc('hour', su.programado_para)
          AND lcrn.rn = 1
        WHERE su.tenant_id IS NOT NULL
      )
      SELECT * FROM unidos_con_estado
      ORDER BY programado_para ASC;
    `);
    console.log('✅ Vista final creada');

    // 3. Verificar resultados
    console.log('3️⃣ Verificando resultados...');
    const result = await pool.query(`
      SELECT 
        programado_para AT TIME ZONE 'America/Santiago' as hora_chile,
        EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') as hora,
        EXTRACT(MINUTE FROM programado_para AT TIME ZONE 'America/Santiago') as minuto,
        estado_llamado,
        es_actual,
        es_proximo,
        es_urgente
      FROM central_v_llamados_automaticos
      WHERE tenant_id = '1397e653-a702-4020-9702-3ae4f3f8b337'
        AND (
          (DATE(programado_para AT TIME ZONE 'America/Santiago') = '2025-09-16' 
           AND EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') >= 12)
          OR
          (DATE(programado_para AT TIME ZONE 'America/Santiago') = '2025-09-17' 
           AND EXTRACT(HOUR FROM programado_para AT TIME ZONE 'America/Santiago') < 12)
        )
      ORDER BY programado_para
    `);
    
    console.log(`📊 Llamados generados para el 16 de septiembre:`);
    console.log(`   Total: ${result.rows.length}`);
    result.rows.forEach(row => {
      console.log(`   - ${row.hora_chile} (Hora: ${row.hora}, Minuto: ${row.minuto}) - Estado: ${row.estado_llamado} - Actual: ${row.es_actual} - Próximo: ${row.es_proximo} - Urgente: ${row.es_urgente}`);
    });

    console.log('\n✅ Vista final creada exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

fixVistaFinal();
