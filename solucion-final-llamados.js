#!/usr/bin/env node

const { query } = require('./src/lib/database.ts');

async function solucionFinalLlamados() {
  console.log('🔧 SOLUCIÓN FINAL LLAMADOS NOCTURNOS\n');

  try {
    const fecha = new Date().toISOString().split('T')[0];
    console.log(`📅 Fecha de corrección: ${fecha}`);

    // 1. Limpiar llamados existentes para hoy
    console.log('1️⃣ Limpiando llamados existentes para hoy...');
    await query(`
      DELETE FROM central_llamados 
      WHERE DATE(programado_para) = $1
    `, [fecha]);
    console.log('✅ Llamados existentes eliminados');

    // 2. Generar llamados nocturnos correctamente
    console.log('2️⃣ Generando llamados nocturnos...');
    
    await query(`
      -- Insertar llamados nocturnos distribuidos correctamente
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
      WITH instalaciones_config AS (
        SELECT 
          i.id as instalacion_id,
          i.nombre as instalacion_nombre,
          i.telefono as instalacion_telefono,
          cci.intervalo_minutos,
          cci.ventana_inicio,
          cci.ventana_fin,
          cci.modo,
          po.tenant_id
        FROM instalaciones i
        INNER JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
        INNER JOIN as_turnos_puestos_operativos po ON po.instalacion_id = i.id
        WHERE cci.habilitado = true
          AND po.activo = true
          AND cci.intervalo_minutos IS NOT NULL
          AND cci.ventana_inicio IS NOT NULL
          AND cci.ventana_fin IS NOT NULL
      ),
      turnos_activos AS (
        SELECT 
          pm.id as pauta_id,
          pm.instalacion_id,
          pm.guardia_id,
          pm.puesto_id,
          pm.estado,
          po.tenant_id
        FROM as_turnos_pauta_mensual pm
        INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
        WHERE pm.anio = EXTRACT(YEAR FROM $1::date)
          AND pm.mes = EXTRACT(MONTH FROM $1::date)
          AND pm.dia = EXTRACT(DAY FROM $1::date)
          AND pm.estado = 'planificado'
          AND po.activo = true
      ),
      slots_nocturnos AS (
        SELECT 
          ic.instalacion_id,
          ic.instalacion_nombre,
          ic.instalacion_telefono,
          ic.intervalo_minutos,
          ic.ventana_inicio,
          ic.ventana_fin,
          ic.modo,
          ic.tenant_id,
          ta.pauta_id,
          ta.guardia_id,
          ta.puesto_id,
          -- Generar slots nocturnos (21:00 a 07:00 del día siguiente)
          generate_series(
            ($1::date + '21:00:00'::time),
            ($1::date + '23:59:59'::time),
            (ic.intervalo_minutos || ' minutes')::interval
          ) as slot_hora
        FROM instalaciones_config ic
        INNER JOIN turnos_activos ta ON ta.instalacion_id = ic.instalacion_id
        UNION ALL
        SELECT 
          ic.instalacion_id,
          ic.instalacion_nombre,
          ic.instalacion_telefono,
          ic.intervalo_minutos,
          ic.ventana_inicio,
          ic.ventana_fin,
          ic.modo,
          ic.tenant_id,
          ta.pauta_id,
          ta.guardia_id,
          ta.puesto_id,
          -- Continuar slots en el día siguiente (00:00 a 07:00)
          generate_series(
            (($1::date + interval '1 day') + '00:00:00'::time),
            (($1::date + interval '1 day') + '07:00:00'::time),
            (ic.intervalo_minutos || ' minutes')::interval
          ) as slot_hora
        FROM instalaciones_config ic
        INNER JOIN turnos_activos ta ON ta.instalacion_id = ic.instalacion_id
      )
      SELECT DISTINCT
        ts.instalacion_id,
        ts.guardia_id,
        ts.pauta_id,
        ts.puesto_id,
        ts.slot_hora as programado_para,
        'pendiente' as estado,
        'instalacion' as contacto_tipo,
        ts.instalacion_id as contacto_id,
        ts.instalacion_nombre as contacto_nombre,
        ts.instalacion_telefono as contacto_telefono,
        ts.tenant_id
      FROM slots_nocturnos ts;
    `, [fecha]);

    console.log('✅ Llamados nocturnos generados');

    // 3. Verificar la nueva distribución
    console.log('3️⃣ Verificando nueva distribución...');
    const nuevaDistribucion = await query(`
      SELECT 
        i.nombre as instalacion,
        cl.programado_para,
        EXTRACT(HOUR FROM cl.programado_para) as hora_local,
        cl.estado
      FROM central_llamados cl
      INNER JOIN instalaciones i ON cl.instalacion_id = i.id
      WHERE DATE(cl.programado_para) = $1
      ORDER BY cl.programado_para, i.nombre
    `, [fecha]);

    console.log(`📊 Total llamados generados: ${nuevaDistribucion.rows.length}`);
    
    // Agrupar por hora
    const llamadosPorHora = {};
    nuevaDistribucion.rows.forEach(llamado => {
      const hora = llamado.hora_local;
      if (!llamadosPorHora[hora]) {
        llamadosPorHora[hora] = [];
      }
      llamadosPorHora[hora].push(llamado);
    });

    console.log('\n📅 Distribución por hora (hora local):');
    Object.keys(llamadosPorHora).sort().forEach(hora => {
      console.log(`   ${hora}:00 - ${llamadosPorHora[hora].length} llamados`);
      llamadosPorHora[hora].forEach(llamado => {
        console.log(`      - ${llamado.instalacion} (${llamado.estado})`);
      });
    });

    // 4. Verificar KPIs
    console.log('\n4️⃣ Verificando KPIs...');
    const horaActual = new Date().getHours();
    const llamadosActuales = await query(`
      SELECT COUNT(*) as actuales
      FROM central_llamados cl
      WHERE DATE(cl.programado_para) = $1
        AND EXTRACT(HOUR FROM cl.programado_para) = $2
        AND cl.estado IN ('pendiente', 'no_registrado')
    `, [fecha, horaActual]);

    const llamadosProximos = await query(`
      SELECT COUNT(*) as proximos
      FROM central_llamados cl
      WHERE DATE(cl.programado_para) = $1
        AND cl.programado_para > now()
        AND cl.estado IN ('pendiente', 'no_registrado')
    `, [fecha]);

    console.log(`🕐 Hora actual: ${horaActual}:00`);
    console.log(`📊 Llamados actuales (${horaActual}:00): ${llamadosActuales.rows[0].actuales}`);
    console.log(`📊 Llamados próximos: ${llamadosProximos.rows[0].proximos}`);

    // 5. Actualizar la vista automática
    console.log('\n5️⃣ Actualizando vista automática...');
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

    console.log('\n✅ Solución final completada exitosamente');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

solucionFinalLlamados();
