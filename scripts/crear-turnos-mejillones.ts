import { query } from '../src/lib/database';

async function crearTurnosMejillones() {
  console.log('🔧 Creando turnos para Mejillones...\n');

  try {
    // 1. Buscar la instalación Mejillones
    console.log('1. Buscando instalación Mejillones...');
    const instalacionResult = await query(`
      SELECT id, nombre, cliente_id, estado
      FROM instalaciones 
      WHERE nombre ILIKE '%mejillones%'
    `);

    if (instalacionResult.rows.length === 0) {
      console.log('❌ No se encontró instalación con nombre Mejillones');
      return;
    }

    const instalacion = instalacionResult.rows[0];
    console.log('✅ Instalación encontrada:', instalacion.nombre);
    console.log('');

    // 2. Buscar requisitos de puestos existentes
    console.log('2. Buscando requisitos de puestos existentes...');
    const requisitosResult = await query(`
      SELECT tr.id, tr.rol_servicio_id, tr.instalacion_id, rs.nombre as rol_nombre
      FROM as_turnos_requisitos tr
      INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
      WHERE tr.instalacion_id = $1
    `, [instalacion.id]);

    if (requisitosResult.rows.length === 0) {
      console.log('❌ No hay requisitos de puestos para crear turnos');
      return;
    }

    console.log(`📊 Requisitos encontrados: ${requisitosResult.rows.length}`);
    requisitosResult.rows.forEach(req => {
      console.log(`   - Rol: ${req.rol_nombre} (ID: ${req.rol_servicio_id})`);
    });
    console.log('');

    // 3. Verificar si ya existen configuraciones de turnos
    console.log('3. Verificando configuraciones de turnos existentes...');
    const turnosExistentesResult = await query(`
      SELECT tc.id, tc.rol_servicio_id, tc.cantidad_guardias, rs.nombre as rol_nombre
      FROM as_turnos_configuracion tc
      INNER JOIN as_turnos_roles_servicio rs ON tc.rol_servicio_id = rs.id
      WHERE tc.instalacion_id = $1
    `, [instalacion.id]);

    console.log(`📊 Configuraciones existentes: ${turnosExistentesResult.rows.length}`);
    if (turnosExistentesResult.rows.length > 0) {
      turnosExistentesResult.rows.forEach(turno => {
        console.log(`   - ${turno.rol_nombre}: ${turno.cantidad_guardias} guardias`);
      });
      console.log('');
    }

    // 4. Crear configuraciones de turnos faltantes
    console.log('4. Creando configuraciones de turnos faltantes...');
    
    for (const requisito of requisitosResult.rows) {
      // Verificar si ya existe configuración para este rol
      const existeConfiguracion = turnosExistentesResult.rows.some(
        turno => turno.rol_servicio_id === requisito.rol_servicio_id
      );

      if (!existeConfiguracion) {
        console.log(`   Creando configuración para rol: ${requisito.rol_nombre}`);
        
        // Contar cuántos PPC hay para este rol para determinar la cantidad de guardias
        const ppcCountResult = await query(`
          SELECT COUNT(*) as count
          FROM as_turnos_ppc ppc
          WHERE ppc.requisito_puesto_id = $1
        `, [requisito.id]);
        
        const cantidadGuardias = parseInt(ppcCountResult.rows[0].count) || 1;
        
        // Crear la configuración de turno
        const insertResult = await query(`
          INSERT INTO as_turnos_configuracion (
            instalacion_id, 
            rol_servicio_id, 
            cantidad_guardias, 
            estado, 
            created_at, 
            updated_at
          ) VALUES ($1, $2, $3, $4, NOW(), NOW())
          RETURNING id
        `, [
          instalacion.id,
          requisito.rol_servicio_id,
          cantidadGuardias,
          'Activo'
        ]);

        console.log(`   ✅ Configuración creada con ID: ${insertResult.rows[0].id}`);
        console.log(`   📊 Cantidad de guardias: ${cantidadGuardias}`);
      } else {
        console.log(`   ⏭️  Configuración ya existe para rol: ${requisito.rol_nombre}`);
      }
    }
    console.log('');

    // 5. Verificar el resultado final
    console.log('5. Verificando resultado final...');
    const turnosFinalesResult = await query(`
      SELECT tc.id, tc.rol_servicio_id, tc.cantidad_guardias, tc.estado, rs.nombre as rol_nombre
      FROM as_turnos_configuracion tc
      INNER JOIN as_turnos_roles_servicio rs ON tc.rol_servicio_id = rs.id
      WHERE tc.instalacion_id = $1
      ORDER BY rs.nombre
    `, [instalacion.id]);

    console.log(`📊 Configuraciones de turnos finales: ${turnosFinalesResult.rows.length}`);
    turnosFinalesResult.rows.forEach(turno => {
      console.log(`   - ${turno.rol_nombre}: ${turno.cantidad_guardias} guardias (${turno.estado})`);
    });
    console.log('');

    // 6. Verificar estadísticas actualizadas
    console.log('6. Verificando estadísticas actualizadas...');
    const estadisticasResult = await query(`
      SELECT 
        COALESCE(puestos_creados.count, 0) as puestos_creados,
        COALESCE(puestos_asignados.count, 0) as puestos_asignados,
        COALESCE(ppc_pendientes.count, 0) as ppc_pendientes,
        COALESCE(ppc_totales.count, 0) as ppc_totales
      FROM instalaciones i
      LEFT JOIN (
        SELECT tr.instalacion_id, COUNT(*) as count
        FROM as_turnos_requisitos tr
        GROUP BY tr.instalacion_id
      ) puestos_creados ON puestos_creados.instalacion_id = i.id
      LEFT JOIN (
        SELECT tr.instalacion_id, COUNT(*) as count
        FROM as_turnos_asignaciones ta
        INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
        WHERE ta.estado = 'Activa'
        GROUP BY tr.instalacion_id
      ) puestos_asignados ON puestos_asignados.instalacion_id = i.id
      LEFT JOIN (
        SELECT tr.instalacion_id, COUNT(*) as count
        FROM as_turnos_ppc ppc
        INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
        WHERE ppc.estado = 'Pendiente'
        GROUP BY tr.instalacion_id
      ) ppc_pendientes ON ppc_pendientes.instalacion_id = i.id
      LEFT JOIN (
        SELECT tr.instalacion_id, COUNT(*) as count
        FROM as_turnos_ppc ppc
        INNER JOIN as_turnos_requisitos tr ON ppc.requisito_puesto_id = tr.id
        GROUP BY tr.instalacion_id
      ) ppc_totales ON ppc_totales.instalacion_id = i.id
      WHERE i.id = $1
    `, [instalacion.id]);

    if (estadisticasResult.rows.length > 0) {
      const stats = estadisticasResult.rows[0];
      console.log('📊 Estadísticas finales:');
      console.log(`   Puestos creados: ${stats.puestos_creados}`);
      console.log(`   Puestos asignados: ${stats.puestos_asignados}`);
      console.log(`   PPC pendientes: ${stats.ppc_pendientes}`);
      console.log(`   PPC totales: ${stats.ppc_totales}`);
      console.log(`   Puestos disponibles: ${parseInt(stats.puestos_creados) - parseInt(stats.puestos_asignados)}`);
    }

    console.log('\n✅ Proceso completado exitosamente!');
    console.log('💡 Ahora puedes ingresar a la instalación Mejillones y deberías ver los turnos configurados.');

  } catch (error) {
    console.error('❌ Error durante el proceso:', error);
  }
}

// Ejecutar el script
crearTurnosMejillones()
  .then(() => {
    console.log('\n🏁 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }); 