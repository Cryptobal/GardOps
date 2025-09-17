const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixVistaManual() {
  console.log('🔧 Creando vista con slots manuales\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // 1. Eliminar vista actual
    console.log('1️⃣ Eliminando vista actual...');
    await pool.query('DROP VIEW IF EXISTS central_v_llamados_automaticos');
    console.log('✅ Vista eliminada');

    // 2. Crear vista con slots manuales
    console.log('2️⃣ Creando vista con slots manuales...');
    await pool.query(`
      CREATE VIEW central_v_llamados_automaticos AS
      WITH slots_manuales AS (
        SELECT 
          -- ID único
          md5(concat(
            i.id::text, '|',
            pm.anio::text, '-', 
            LPAD(pm.mes::text, 2, '0'), '-', 
            LPAD(pm.dia::text, 2, '0'), '|',
            hora_slot::text, ':00'
          ))::uuid as id,
          i.id as instalacion_id,
          pm.guardia_id,
          pm.id as pauta_id,
          po.id as puesto_id,
          -- Convertir a UTC para almacenamiento
          CASE 
            WHEN hora_slot >= 19 THEN 
              ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + (hora_slot || ':00:00')::time) AT TIME ZONE 'America/Santiago' AT TIME ZONE 'UTC'
            ELSE 
              ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + interval '1 day' + (hora_slot || ':00:00')::time) AT TIME ZONE 'America/Santiago' AT TIME ZONE 'UTC'
          END as programado_para_utc,
          CASE 
            WHEN hora_slot >= 19 THEN 
              ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + (hora_slot || ':00:00')::time) AT TIME ZONE 'America/Santiago'
            ELSE 
              ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + interval '1 day' + (hora_slot || ':00:00')::time) AT TIME ZONE 'America/Santiago'
          END as programado_para,
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
            WHEN CASE 
              WHEN hora_slot >= 19 THEN 
                ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + (hora_slot || ':00:00')::time) AT TIME ZONE 'America/Santiago'
              ELSE 
                ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + interval '1 day' + (hora_slot || ':00:00')::time) AT TIME ZONE 'America/Santiago'
            END < (now() AT TIME ZONE 'America/Santiago') - interval '30 minutes'
            THEN true ELSE false 
          END as es_urgente,
          CASE 
            WHEN date_trunc('hour', CASE 
              WHEN hora_slot >= 19 THEN 
                ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + (hora_slot || ':00:00')::time) AT TIME ZONE 'America/Santiago'
              ELSE 
                ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + interval '1 day' + (hora_slot || ':00:00')::time) AT TIME ZONE 'America/Santiago'
            END) = date_trunc('hour', now() AT TIME ZONE 'America/Santiago')
            THEN true ELSE false 
          END as es_actual,
          CASE 
            WHEN CASE 
              WHEN hora_slot >= 19 THEN 
                ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + (hora_slot || ':00:00')::time) AT TIME ZONE 'America/Santiago'
              ELSE 
                ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + interval '1 day' + (hora_slot || ':00:00')::time) AT TIME ZONE 'America/Santiago'
            END > (now() AT TIME ZONE 'America/Santiago')
            THEN true ELSE false 
          END as es_proximo,
          CASE 
            WHEN CASE 
              WHEN hora_slot >= 19 THEN 
                ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + (hora_slot || ':00:00')::time) AT TIME ZONE 'America/Santiago'
              ELSE 
                ((pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date + interval '1 day' + (hora_slot || ':00:00')::time) AT TIME ZONE 'America/Santiago'
            END < (now() AT TIME ZONE 'America/Santiago')
            THEN true ELSE false 
          END as es_no_realizado,
          pm.tenant_id
        FROM as_turnos_pauta_mensual pm
        INNER JOIN as_turnos_puestos_operativos po ON po.id = pm.puesto_id AND po.activo = true
        INNER JOIN instalaciones i ON i.id = po.instalacion_id
        INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
        INNER JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
        LEFT JOIN guardias g ON g.id = pm.guardia_id
        CROSS JOIN (VALUES (19), (20), (21), (22), (23), (0), (1), (2), (3), (4), (5), (6), (7)) AS horas(hora_slot)
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
            ORDER BY pauta_id DESC
          ) as rn
        FROM slots_manuales
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
            PARTITION BY cl.instalacion_id, 
                         date_trunc('hour', cl.programado_para AT TIME ZONE 'America/Santiago') 
            ORDER BY cl.created_at DESC
          ) as rn
        FROM central_llamados cl
        WHERE cl.tenant_id IS NOT NULL
      ),
      resultado_final AS (
        SELECT
          su.id,
          su.instalacion_id,
          su.guardia_id,
          su.pauta_id,
          su.puesto_id,
          su.programado_para_utc as programado_para,
          COALESCE(le.estado, su.estado_llamado) as estado_llamado,
          su.contacto_tipo,
          su.contacto_telefono,
          su.contacto_nombre,
          COALESCE(le.observaciones, su.observaciones) as observaciones,
          le.ejecutado_en,
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
        LEFT JOIN llamados_existentes le ON le.instalacion_id = su.instalacion_id
          AND date_trunc('hour', (le.programado_para AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago') = 
              date_trunc('hour', su.programado_para)
          AND le.rn = 1
        WHERE su.tenant_id IS NOT NULL
      )
      SELECT * FROM resultado_final
      ORDER BY programado_para ASC;
    `);
    console.log('✅ Vista con slots manuales creada');

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

    // Verificar si los horarios son correctos
    const horasCorrectas = [19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7];
    const horasGeneradas = result.rows.map(row => parseInt(row.hora));
    
    console.log('\n✅ Verificación de horarios:');
    console.log(`   Horas esperadas: ${horasCorrectas.join(', ')}`);
    console.log(`   Horas generadas: ${horasGeneradas.join(', ')}`);
    
    const sonCorrectas = JSON.stringify(horasCorrectas.sort()) === JSON.stringify(horasGeneradas.sort());
    console.log(`   ¿Son correctas? ${sonCorrectas ? '✅ SÍ' : '❌ NO'}`);

    console.log('\n✅ Vista con slots manuales creada exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

fixVistaManual();
