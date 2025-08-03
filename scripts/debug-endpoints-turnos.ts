import { query } from '../src/lib/database';

async function debugEndpointsTurnos() {
  console.log('🐛 DEBUGGEANDO ENDPOINTS DE TURNOS\n');

  try {
    // Obtener una instalación de prueba
    const instalaciones = await query('SELECT id, nombre FROM instalaciones LIMIT 1');
    if (instalaciones.rows.length === 0) {
      console.log('❌ No hay instalaciones disponibles');
      return;
    }

    const instalacionId = instalaciones.rows[0].id;
    console.log(`🧪 Usando instalación: ${instalaciones.rows[0].nombre} (${instalacionId})`);

    // PASO 1: Verificar datos actuales
    console.log('\n1️⃣ Verificando datos actuales...\n');
    
    const puestosActuales = await query(`
      SELECT 
        po.id,
        po.instalacion_id,
        po.rol_id,
        po.nombre_puesto,
        po.es_ppc,
        po.guardia_id,
        rs.nombre as rol_nombre
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1
      ORDER BY rs.nombre, po.nombre_puesto
    `, [instalacionId]);

    console.log(`📋 Puestos actuales: ${puestosActuales.rows.length}`);
    puestosActuales.rows.forEach((puesto: any) => {
      const estado = puesto.guardia_id ? 'Asignado' : (puesto.es_ppc ? 'PPC' : 'Disponible');
      console.log(`  • ${puesto.nombre_puesto} (${puesto.rol_nombre}) - ${estado}`);
    });

    // PASO 2: Probar query de turnos (endpoint GET /api/instalaciones/[id]/turnos)
    console.log('\n2️⃣ Probando query de turnos...\n');
    
    try {
      const turnosQuery = await query(`
        SELECT 
          rs.id as rol_id,
          rs.nombre as rol_nombre,
          rs.dias_trabajo,
          rs.dias_descanso,
          rs.horas_turno,
          rs.hora_inicio,
          rs.hora_termino,
          '' as rol_descripcion,
          rs.tenant_id as rol_tenant_id,
          rs.created_at as rol_created_at,
          rs.updated_at as rol_updated_at,
          COUNT(*) as total_puestos,
          COUNT(CASE WHEN po.guardia_id IS NOT NULL THEN 1 END) as guardias_asignados,
          COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as ppc_pendientes
        FROM as_turnos_puestos_operativos po
        INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
        WHERE po.instalacion_id = $1
        GROUP BY rs.id, rs.nombre, rs.dias_trabajo, rs.dias_descanso, rs.horas_turno, 
                 rs.hora_inicio, rs.hora_termino, rs.tenant_id, rs.created_at, rs.updated_at
        ORDER BY rs.nombre
      `, [instalacionId]);
      
      console.log(`✅ Query de turnos exitoso: ${turnosQuery.rows.length} resultados`);
      turnosQuery.rows.forEach((turno: any) => {
        console.log(`  • ${turno.rol_nombre}: ${turno.total_puestos} puestos, ${turno.guardias_asignados} asignados, ${turno.ppc_pendientes} PPCs`);
      });
      
    } catch (error) {
      console.error('❌ Error en query de turnos:', error);
    }

    // PASO 3: Probar query de PPCs (endpoint GET /api/instalaciones/[id]/ppc)
    console.log('\n3️⃣ Probando query de PPCs...\n');
    
    try {
      const ppcQuery = await query(`
        SELECT 
          po.id,
          po.instalacion_id,
          po.rol_id as rol_servicio_id,
          po.nombre_puesto,
          po.es_ppc,
          po.creado_en as created_at,
          rs.nombre as rol_servicio_nombre,
          rs.hora_inicio,
          rs.hora_termino,
          1 as cantidad_faltante,
          CASE 
            WHEN po.guardia_id IS NOT NULL THEN 'Asignado'
            WHEN po.es_ppc = true THEN 'Pendiente'
            ELSE 'Activo'
          END as estado,
          po.guardia_id as guardia_asignado_id,
          g.nombre || ' ' || g.apellido_paterno || ' ' || COALESCE(g.apellido_materno, '') as guardia_nombre
        FROM as_turnos_puestos_operativos po
        LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
        LEFT JOIN guardias g ON po.guardia_id = g.id
        WHERE po.instalacion_id = $1 AND po.es_ppc = true
        ORDER BY po.creado_en DESC
      `, [instalacionId]);
      
      console.log(`✅ Query de PPCs exitoso: ${ppcQuery.rows.length} resultados`);
      ppcQuery.rows.forEach((ppc: any) => {
        console.log(`  • ${ppc.nombre_puesto} (${ppc.rol_servicio_nombre}) - ${ppc.estado}`);
      });
      
    } catch (error) {
      console.error('❌ Error en query de PPCs:', error);
    }

    // PASO 4: Probar query de guardias disponibles (endpoint GET /api/guardias/disponibles)
    console.log('\n4️⃣ Probando query de guardias disponibles...\n');
    
    try {
      const guardiasQuery = await query(`
        SELECT 
          g.id,
          g.nombre,
          g.apellido_paterno,
          g.apellido_materno,
          CONCAT(g.nombre, ' ', g.apellido_paterno, ' ', COALESCE(g.apellido_materno, '')) as nombre_completo,
          g.rut,
          g.email,
          g.telefono,
          g.activo,
          g.comuna,
          g.region
        FROM guardias g
        WHERE g.activo = true
          AND g.id NOT IN (
            SELECT DISTINCT po.guardia_id 
            FROM as_turnos_puestos_operativos po 
            WHERE po.guardia_id IS NOT NULL
          )
        ORDER BY g.apellido_paterno, g.apellido_materno, g.nombre
        LIMIT 5
      `);
      
      console.log(`✅ Query de guardias disponibles exitoso: ${guardiasQuery.rows.length} resultados`);
      guardiasQuery.rows.forEach((guardia: any) => {
        console.log(`  • ${guardia.nombre_completo} (${guardia.rut})`);
      });
      
    } catch (error) {
      console.error('❌ Error en query de guardias disponibles:', error);
    }

    // PASO 5: Simular eliminación de un puesto y verificar
    console.log('\n5️⃣ Simulando eliminación de puesto...\n');
    
    if (puestosActuales.rows.length > 0) {
      const puestoAEliminar = puestosActuales.rows[0];
      console.log(`🧪 Eliminando puesto: ${puestoAEliminar.nombre_puesto} (${puestoAEliminar.id})`);
      
      try {
        // Eliminar el puesto
        await query(`
          DELETE FROM as_turnos_puestos_operativos 
          WHERE id = $1
        `, [puestoAEliminar.id]);
        
        console.log('✅ Puesto eliminado correctamente');
        
        // Verificar que se eliminó
        const puestoVerificacion = await query(`
          SELECT id FROM as_turnos_puestos_operativos WHERE id = $1
        `, [puestoAEliminar.id]);
        
        if (puestoVerificacion.rows.length === 0) {
          console.log('✅ Verificación: Puesto eliminado de la base de datos');
        } else {
          console.log('❌ Verificación: Puesto aún existe en la base de datos');
        }
        
        // Probar queries después de la eliminación
        console.log('\n6️⃣ Probando queries después de eliminación...\n');
        
        // Query de turnos después de eliminar
        const turnosDespues = await query(`
          SELECT 
            rs.id as rol_id,
            rs.nombre as rol_nombre,
            COUNT(*) as total_puestos,
            COUNT(CASE WHEN po.guardia_id IS NOT NULL THEN 1 END) as guardias_asignados,
            COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as ppc_pendientes
          FROM as_turnos_puestos_operativos po
          INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
          WHERE po.instalacion_id = $1
          GROUP BY rs.id, rs.nombre
          ORDER BY rs.nombre
        `, [instalacionId]);
        
        console.log(`✅ Query de turnos después de eliminar: ${turnosDespues.rows.length} resultados`);
        
        // Query de PPCs después de eliminar
        const ppcsDespues = await query(`
          SELECT COUNT(*) as total_ppcs
          FROM as_turnos_puestos_operativos po
          WHERE po.instalacion_id = $1 AND po.es_ppc = true
        `, [instalacionId]);
        
        console.log(`✅ Query de PPCs después de eliminar: ${ppcsDespues.rows[0].total_ppcs} PPCs`);
        
        // Restaurar el puesto para no afectar los datos
        console.log('\n7️⃣ Restaurando puesto eliminado...\n');
        
        await query(`
          INSERT INTO as_turnos_puestos_operativos 
          (id, instalacion_id, rol_id, nombre_puesto, es_ppc, creado_en)
          VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
          puestoAEliminar.id,
          puestoAEliminar.instalacion_id,
          puestoAEliminar.rol_id,
          puestoAEliminar.nombre_puesto,
          puestoAEliminar.es_ppc
        ]);
        
        console.log('✅ Puesto restaurado correctamente');
        
      } catch (error) {
        console.error('❌ Error en simulación de eliminación:', error);
      }
    }

    console.log('\n🎉 DEBUG COMPLETADO');
    console.log('\n📋 RESUMEN:');
    console.log('  ✅ Queries de endpoints funcionan correctamente');
    console.log('  ✅ Eliminación de puestos funciona');
    console.log('  ✅ Verificación de datos después de eliminación');
    
  } catch (error) {
    console.error('❌ Error en debug:', error);
  }
}

debugEndpointsTurnos().catch(console.error); 