#!/usr/bin/env node

const { query } = require('./src/lib/database.ts');

async function corregirVistaLlamadosAutomaticos() {
  console.log('🔧 CORRECCIÓN VISTA LLAMADOS AUTOMÁTICOS\n');

  try {
    // 1. Primero, generar llamados reales en la tabla central_llamados
    console.log('1️⃣ Generando llamados reales en central_llamados...');
    
    await query(`
      -- Insertar llamados reales basados en la pauta mensual
      INSERT INTO central_llamados (
        instalacion_id,
        guardia_id,
        pauta_id,
        puesto_id,
        programado_para,
        estado,
        contacto_tipo,
        contacto_id,
        contacto_nombre,
        contacto_telefono,
        tenant_id
      )
      SELECT DISTINCT
        pm.instalacion_id,
        pm.guardia_id,
        pm.id as pauta_id,
        pm.puesto_id,
        -- Calcular hora programada basada en ventana_inicio
        (pm.anio || '-' || 
         LPAD(pm.mes::text, 2, '0') || '-' || 
         LPAD(pm.dia::text, 2, '0') || ' ' || 
         cci.ventana_inicio)::timestamp as programado_para,
        'pendiente' as estado,
        'instalacion' as contacto_tipo,
        pm.instalacion_id as contacto_id,
        i.nombre as contacto_nombre,
        COALESCE(i.telefono, g.telefono) as contacto_telefono,
        po.tenant_id
      FROM as_turnos_pauta_mensual pm
      INNER JOIN instalaciones i ON pm.instalacion_id = i.id
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE po.activo = true
        AND pm.estado = 'planificado'
        AND cci.habilitado = true
        AND cci.intervalo_minutos IS NOT NULL
        AND cci.ventana_inicio IS NOT NULL
        AND cci.ventana_fin IS NOT NULL
        -- Solo para fechas futuras o hoy
        AND (pm.anio || '-' || LPAD(pm.mes::text, 2, '0') || '-' || LPAD(pm.dia::text, 2, '0'))::date >= CURRENT_DATE
        -- Evitar duplicados
        AND NOT EXISTS (
          SELECT 1 FROM central_llamados cl 
          WHERE cl.pauta_id = pm.id 
            AND cl.programado_para = (pm.anio || '-' || 
                                     LPAD(pm.mes::text, 2, '0') || '-' || 
                                     LPAD(pm.dia::text, 2, '0') || ' ' || 
                                     cci.ventana_inicio)::timestamp
        )
      ON CONFLICT DO NOTHING;
    `);

    console.log('✅ Llamados reales generados');

    // 2. Actualizar la vista automática para usar IDs reales
    console.log('2️⃣ Actualizando vista automática para usar IDs reales...');
    
    await query(`
      -- Eliminar vista existente
      DROP VIEW IF EXISTS central_v_llamados_automaticos;

      -- Crear nueva vista que use IDs reales de central_llamados
      CREATE VIEW central_v_llamados_automaticos AS
      SELECT 
        cl.id,
        cl.instalacion_id,
        cl.guardia_id,
        cl.pauta_id,
        cl.puesto_id,
        cl.programado_para,
        cl.estado as estado_llamado,
        cl.contacto_tipo,
        cl.contacto_id,
        cl.contacto_nombre,
        cl.contacto_telefono,
        cl.observaciones,
        i.nombre as instalacion_nombre,
        g.nombre as guardia_nombre,
        po.nombre_puesto,
        rs.nombre as rol_nombre,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin,
        cci.modo,
        cci.mensaje_template,
        -- Calcular si es urgente (más de 30 minutos atrasado)
        CASE 
          WHEN cl.programado_para < (now() - interval '30 minutes') THEN true
          ELSE false
        END as es_urgente,
        -- Calcular si es actual (hora actual)
        CASE 
          WHEN EXTRACT(HOUR FROM cl.programado_para) = EXTRACT(HOUR FROM now()) THEN true
          ELSE false
        END as es_actual,
        -- Calcular si es próximo (resto del día)
        CASE 
          WHEN cl.programado_para > now() THEN true
          ELSE false
        END as es_proximo
      FROM central_llamados cl
      INNER JOIN instalaciones i ON cl.instalacion_id = i.id
      LEFT JOIN guardias g ON cl.guardia_id = g.id
      LEFT JOIN as_turnos_puestos_operativos po ON cl.puesto_id = po.id
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE cl.estado IN ('pendiente', 'no_registrado')
        AND cci.habilitado = true
      ORDER BY cl.programado_para ASC;
    `);

    console.log('✅ Vista automática actualizada');

    // 3. Verificar que todo funcione
    console.log('3️⃣ Verificando funcionamiento...');
    
    const llamadosVista = await query(`
      SELECT COUNT(*) as total_llamados
      FROM central_v_llamados_automaticos
      WHERE DATE(programado_para) = CURRENT_DATE
    `);

    const llamadosTabla = await query(`
      SELECT COUNT(*) as total_llamados
      FROM central_llamados
      WHERE DATE(programado_para) = CURRENT_DATE
        AND estado IN ('pendiente', 'no_registrado')
    `);

    console.log(`📊 Llamados en vista: ${llamadosVista.rows[0].total_llamados}`);
    console.log(`📊 Llamados en tabla: ${llamadosTabla.rows[0].total_llamados}`);

    // 4. Mostrar algunos ejemplos
    console.log('\n4️⃣ Ejemplos de llamados generados:');
    const ejemplos = await query(`
      SELECT 
        cl.id,
        i.nombre as instalacion,
        cl.programado_para,
        cl.estado,
        cl.contacto_nombre
      FROM central_llamados cl
      INNER JOIN instalaciones i ON cl.instalacion_id = i.id
      WHERE DATE(cl.programado_para) = CURRENT_DATE
        AND cl.estado IN ('pendiente', 'no_registrado')
      ORDER BY cl.programado_para
      LIMIT 5
    `);

    ejemplos.rows.forEach((ejemplo, index) => {
      console.log(`   ${index + 1}. ${ejemplo.instalacion} - ${ejemplo.programado_para} (${ejemplo.estado})`);
      console.log(`      ID: ${ejemplo.id}`);
    });

    console.log('\n✅ Corrección completada exitosamente');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

corregirVistaLlamadosAutomaticos();
