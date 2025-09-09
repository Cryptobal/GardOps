import { query } from '../src/lib/database';

async function testCrearTurno() {
  try {
    console.log('🧪 Probando creación de turno...\n');

    // Buscar la instalación "A Test"
    const instalacionResult = await query(`
      SELECT id, nombre FROM instalaciones 
      WHERE nombre = 'A Test'
    `);
    
    if (instalacionResult.rows.length === 0) {
      console.log('❌ No se encontró la instalación "A Test"');
      return;
    }
    
    const instalacion = instalacionResult.rows[0];
    console.log(`📋 Instalación: ${instalacion.nombre} (${instalacion.id})`);

    // Buscar un rol de servicio diferente al existente
    const turnoExistente = await query(`
      SELECT rol_servicio_id FROM as_turnos_configuracion 
      WHERE instalacion_id = $1
    `, [instalacion.id]);

    const rolExistente = turnoExistente.rows[0]?.rol_servicio_id;
    
    // Buscar un rol diferente
    const rolResult = await query(`
      SELECT id, nombre FROM as_turnos_roles_servicio 
      WHERE estado = 'Activo' AND id != $1
      LIMIT 1
    `, [rolExistente || '00000000-0000-0000-0000-000000000000']);

    if (rolResult.rows.length === 0) {
      console.log('❌ No se encontró un rol de servicio disponible');
      return;
    }

    const rol = rolResult.rows[0];
    console.log(`👥 Rol seleccionado: ${rol.nombre} (${rol.id})`);

    // Simular la creación del turno directamente en la base de datos
    console.log('🔧 Creando turno de prueba...');
    
    // 1. Crear configuración de turno
    const configResult = await query(`
      INSERT INTO as_turnos_configuracion (instalacion_id, rol_servicio_id, cantidad_guardias, estado)
      VALUES ($1, $2, $3, 'Activo')
      RETURNING *
    `, [instalacion.id, rol.id, 3]);

    const nuevoTurno = configResult.rows[0];
    console.log(`✅ Turno creado: ${nuevoTurno.id}`);

    // 2. Crear requisito
    const requisitoResult = await query(`
      INSERT INTO as_turnos_requisitos (
        instalacion_id,
        rol_servicio_id,
        cantidad_guardias,
        vigente_desde,
        vigente_hasta,
        estado
      ) VALUES ($1, $2, $3, CURRENT_DATE, NULL, 'Activo')
      RETURNING id
    `, [instalacion.id, rol.id, 3]);

    const requisitoId = requisitoResult.rows[0].id;
    console.log(`✅ Requisito creado: ${requisitoId}`);

    // 3. Crear PPC
    const ppcResult = await query(`
      INSERT INTO as_turnos_ppc (
        requisito_puesto_id,
        cantidad_faltante,
        motivo,
        prioridad,
        fecha_deteccion,
        estado
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE, 'Pendiente')
      RETURNING id
    `, [requisitoId, 3, 'falta_asignacion', 'Media']);

    const ppcId = ppcResult.rows[0].id;
    console.log(`✅ PPC creado: ${ppcId}`);

    // Verificar que todo se creó correctamente
    console.log('\n📊 Verificación final:');
    
    const turnosFinal = await query(`
      SELECT COUNT(*) as count FROM as_turnos_configuracion 
      WHERE instalacion_id = $1
    `, [instalacion.id]);
    
    const ppcsFinal = await query(`
      SELECT COUNT(*) as count FROM as_turnos_ppc ppc
      INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
      WHERE tr.instalacion_id = $1
    `, [instalacion.id]);

    console.log(`📊 Turnos totales: ${turnosFinal.rows[0].count}`);
    console.log(`📊 PPCs totales: ${ppcsFinal.rows[0].count}`);

    console.log('\n✅ Prueba completada exitosamente');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba
testCrearTurno().then(() => {
  console.log('🏁 Prueba finalizada');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
}); 