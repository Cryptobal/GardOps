const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixVistaVentanaCorrecta() {
  console.log('🔧 Corrigiendo vista para respetar ventana de monitoreo 19:00-07:00\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // 1. Eliminar vista actual
    console.log('1️⃣ Eliminando vista actual...');
    await pool.query('DROP VIEW IF EXISTS central_v_llamados_automaticos');
    console.log('✅ Vista eliminada');

    // 2. Crear nueva vista con lógica correcta de ventana
    console.log('2️⃣ Creando nueva vista con ventana correcta...');
    await pool.query(`
      CREATE VIEW central_v_llamados_automaticos AS
      WITH instalaciones_con_config AS (
        SELECT DISTINCT
          i.id as instalacion_id,
          i.nombre as instalacion_nombre,
          i.telefono as contacto_telefono,
          cci.intervalo_minutos,
          cci.ventana_inicio,
          cci.ventana_fin,
          cci.modo,
          cci.mensaje_template,
          cci.tenant_id
        FROM central_config_instalacion cci
        INNER JOIN instalaciones i ON i.id = cci.instalacion_id
        WHERE cci.habilitado = true
          AND cci.intervalo_minutos IS NOT NULL
          AND cci.ventana_inicio IS NOT NULL
          AND cci.ventana_fin IS NOT NULL
          AND cci.tenant_id IS NOT NULL
      ),
      turnos_planificados AS (
        SELECT DISTINCT
          pm.instalacion_id,
          pm.guardia_id,
          pm.id as pauta_id,
          po.id as puesto_id,
          po.nombre_puesto,
          rs.nombre as rol_nombre,
          COALESCE(CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre), 'Sin asignar') as guardia_nombre,
          pm.anio,
          pm.mes,
          pm.dia,
          pm.tenant_id
        FROM as_turnos_pauta_mensual pm
        INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id AND po.activo = true
        INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
        LEFT JOIN guardias g ON g.id = pm.guardia_id
        WHERE pm.tipo_turno = 'planificado'
          AND pm.tenant_id IS NOT NULL
      ),
      slots_generados AS (
        SELECT 
          -- Generar ID único basado en instalación, fecha y hora
          md5(concat(
            icc.instalacion_id::text, '|',
            tp.anio::text, '-', 
            LPAD(tp.mes::text, 2, '0'), '-', 
            LPAD(tp.dia::text, 2, '0'), '|',
            EXTRACT(HOUR FROM slot_hora)::text, ':',
            LPAD(EXTRACT(MINUTE FROM slot_hora)::text, 2, '0')
          ))::uuid as id,
          icc.instalacion_id,
          tp.guardia_id,
          tp.pauta_id,
          tp.puesto_id,
          -- Convertir slot a UTC para almacenamiento
          (slot_hora AT TIME ZONE 'America/Santiago') AT TIME ZONE 'UTC' as programado_para_utc,
          slot_hora as programado_para,
          'pendiente' as estado_llamado,
          'instalacion' as contacto_tipo,
          icc.contacto_telefono,
          icc.instalacion_nombre as contacto_nombre,
          NULL as observaciones,
          icc.instalacion_nombre,
          tp.guardia_nombre,
          tp.nombre_puesto,
          tp.rol_nombre,
          icc.intervalo_minutos,
          icc.ventana_inicio,
          icc.ventana_fin,
          icc.modo,
          icc.mensaje_template,
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
            WHEN COALESCE(cl.estado, 'pendiente') = 'pendiente' 
                 AND slot_hora < (now() AT TIME ZONE 'America/Santiago')
            THEN true ELSE false 
          END as es_no_realizado,
          icc.tenant_id,
          ROW_NUMBER() OVER (
            PARTITION BY icc.instalacion_id, 
                         date_trunc('hour', slot_hora)
            ORDER BY pm.created_at DESC
          ) as rn
        FROM instalaciones_con_config icc
        INNER JOIN turnos_planificados tp ON tp.instalacion_id = icc.instalacion_id
        INNER JOIN as_turnos_pauta_mensual pm ON pm.instalacion_id = tp.instalacion_id 
          AND pm.anio = tp.anio AND pm.mes = tp.mes AND pm.dia = tp.dia
        CROSS JOIN LATERAL (
          -- Generar slots cada intervalo_minutos dentro de la ventana CORRECTA
          SELECT generate_series(
            -- Fecha del turno + ventana_inicio (19:00)
            (tp.anio || '-' || LPAD(tp.mes::text, 2, '0') || '-' || LPAD(tp.dia::text, 2, '0'))::date + icc.ventana_inicio,
            -- Fecha del turno + ventana_fin (07:00 del día siguiente)
            (tp.anio || '-' || LPAD(tp.mes::text, 2, '0') || '-' || LPAD(tp.dia::text, 2, '0'))::date + interval '1 day' + icc.ventana_fin,
            make_interval(mins => icc.intervalo_minutos)
          ) as slot_hora
        ) slots
        LEFT JOIN central_llamados cl ON cl.instalacion_id = icc.instalacion_id 
          AND date_trunc('hour', cl.programado_para AT TIME ZONE 'America/Santiago') = date_trunc('hour', slot_hora)
          AND cl.tenant_id = icc.tenant_id
        WHERE icc.tenant_id = tp.tenant_id
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
    console.log('✅ Nueva vista creada');

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

    console.log('\n✅ Vista corregida exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

fixVistaVentanaCorrecta();
