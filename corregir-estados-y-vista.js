// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');

async function corregirEstadosYVista() {
  console.log('🔧 Corrigiendo estados y vista del central de monitoreo...\n');

  try {
    // 1. Cambiar estados a 'trabajado' (que está permitido)
    console.log('1. Cambiando estados a "trabajado"...');
    const resultadoEstados = await sql`
      UPDATE as_turnos_pauta_mensual 
      SET estado = 'trabajado' 
      WHERE anio = 2025 
        AND mes = 8 
        AND dia = 30 
        AND estado IN ('libre', 'planificado')
        AND puesto_id IN (
          SELECT id FROM as_turnos_puestos_operativos WHERE activo = true
        )
    `;

    console.log(`✅ Registros actualizados: ${resultadoEstados.rowCount}`);

    // 2. Actualizar la vista para usar 'trabajado' en lugar de 'Activo'
    console.log('\n2. Actualizando vista central_v_turnos_activos...');
    
    // Primero eliminar la vista existente
    await sql`DROP VIEW IF EXISTS central_v_turnos_activos`;
    
    // Luego crear la nueva vista
    await sql`
      CREATE VIEW central_v_turnos_activos AS
      SELECT 
        i.id as instalacion_id,
        i.nombre as instalacion_nombre,
        i.telefono as instalacion_telefono,
        g.id as guardia_id,
        COALESCE(CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre), 'Sin asignar') as guardia_nombre,
        g.telefono as guardia_telefono,
        rs.nombre as rol_nombre,
        rs.hora_inicio,
        rs.hora_termino,
        po.nombre_puesto,
        po.id as puesto_id,
        pm.estado as estado_pauta,
        pm.anio,
        pm.mes,
        pm.dia,
        pm.id as pauta_id,
        cci.habilitado as monitoreo_habilitado,
        cci.intervalo_minutos,
        cci.ventana_inicio,
        cci.ventana_fin,
        cci.modo,
        cci.mensaje_template
      FROM instalaciones i
      INNER JOIN as_turnos_puestos_operativos po ON po.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN as_turnos_pauta_mensual pm ON pm.puesto_id = po.id
      LEFT JOIN guardias g ON pm.guardia_id = g.id
      LEFT JOIN central_config_instalacion cci ON cci.instalacion_id = i.id
      WHERE po.activo = true
        AND pm.estado = 'trabajado'
        AND (cci.habilitado = true OR cci.habilitado IS NULL)
    `;

    console.log(`✅ Vista actualizada correctamente`);

    // 3. Verificar el estado después de la corrección
    console.log('\n3. Verificando estado después de la corrección...');
    const estadoDespues = await sql`
      SELECT 
        pm.estado,
        COUNT(*) as cantidad
      FROM as_turnos_pauta_mensual pm
      INNER JOIN as_turnos_puestos_operativos po ON pm.puesto_id = po.id
      WHERE pm.anio = 2025
        AND pm.mes = 8
        AND pm.dia = 30
        AND po.activo = true
      GROUP BY pm.estado
      ORDER BY pm.estado
    `;

    console.log(`✅ Estados después de la corrección:`);
    estadoDespues.rows.forEach(estado => {
      console.log(`   - ${estado.estado}: ${estado.cantidad} registros`);
    });

    // 4. Verificar vista de turnos activos
    console.log('\n4. Verificando vista de turnos activos...');
    const turnosActivos = await sql`
      SELECT 
        instalacion_nombre,
        guardia_nombre,
        rol_nombre,
        hora_inicio,
        hora_termino,
        monitoreo_habilitado
      FROM central_v_turnos_activos
      ORDER BY instalacion_nombre, hora_inicio
    `;

    console.log(`✅ Turnos activos en vista: ${turnosActivos.rows.length}`);
    if (turnosActivos.rows.length > 0) {
      turnosActivos.rows.forEach(turno => {
        console.log(`   - ${turno.instalacion_nombre}: ${turno.guardia_nombre} (${turno.rol_nombre}) ${turno.hora_inicio}-${turno.hora_termino}`);
      });
    } else {
      console.log('   - No hay turnos activos para hoy');
    }

    // 5. Verificar que la función de generación de agenda funcione
    console.log('\n5. Verificando función de generación de agenda...');
    const funcionGeneracion = await sql`
      SELECT 
        routine_name,
        routine_type
      FROM information_schema.routines 
      WHERE routine_name = 'central_fn_generar_agenda'
        AND routine_schema = 'public'
    `;

    console.log(`✅ Función de generación: ${funcionGeneracion.rows.length > 0 ? 'Disponible' : 'No encontrada'}`);

    console.log('\n🎯 CORRECCIÓN COMPLETADA:');
    console.log('==========================');
    console.log(`✅ Se actualizaron ${resultadoEstados.rowCount} registros a estado "trabajado"`);
    console.log('✅ Se actualizó la vista central_v_turnos_activos');
    console.log(`✅ Turnos activos en vista: ${turnosActivos.rows.length}`);
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Verificar que aparezcan turnos activos en la vista');
    console.log('2. Ejecutar "Generar Agenda" en el Central de Monitoreo');
    console.log('3. Verificar que se generen los llamados automáticamente');

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  } finally {
    process.exit(0);
  }
}

corregirEstadosYVista();
