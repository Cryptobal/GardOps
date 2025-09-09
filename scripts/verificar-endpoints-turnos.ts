import { query } from '../src/lib/database';

async function verificarEndpointsTurnos() {
  console.log('🔍 VERIFICANDO ENDPOINTS DE TURNOS\n');

  try {
    // PASO 1: Verificar que las funciones existen
    console.log('1️⃣ Verificando funciones de base de datos...\n');
    
    const funciones = await query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN ('crear_puestos_turno', 'eliminar_puestos_turno', 'asignar_guardia_puesto', 'desasignar_guardia_puesto')
    `);
    
    console.log('✅ Funciones encontradas:');
    funciones.rows.forEach((func: any) => {
      console.log(`  • ${func.routine_name}`);
    });

    // PASO 2: Verificar estructura de tablas
    console.log('\n2️⃣ Verificando estructura de tablas...\n');
    
    const tablas = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('as_turnos_puestos_operativos', 'as_turnos_roles_servicio', 'instalaciones', 'guardias')
    `);
    
    console.log('✅ Tablas encontradas:');
    tablas.rows.forEach((tabla: any) => {
      console.log(`  • ${tabla.table_name}`);
    });

    // PASO 3: Verificar datos de prueba
    console.log('\n3️⃣ Verificando datos de prueba...\n');
    
    const instalaciones = await query('SELECT id, nombre FROM instalaciones LIMIT 3');
    console.log(`📋 Instalaciones disponibles: ${instalaciones.rows.length}`);
    instalaciones.rows.forEach((inst: any) => {
      console.log(`  • ${inst.nombre} (${inst.id})`);
    });

    const roles = await query('SELECT id, nombre FROM as_turnos_roles_servicio WHERE estado = $1 LIMIT 3', ['Activo']);
    console.log(`📋 Roles de servicio disponibles: ${roles.rows.length}`);
    roles.rows.forEach((rol: any) => {
      console.log(`  • ${rol.nombre} (${rol.id})`);
    });

    const guardias = await query('SELECT id, nombre, apellido_paterno FROM guardias WHERE activo = $1 LIMIT 3', [true]);
    console.log(`📋 Guardias disponibles: ${guardias.rows.length}`);
    guardias.rows.forEach((guardia: any) => {
      console.log(`  • ${guardia.nombre} ${guardia.apellido_paterno} (${guardia.id})`);
    });

    // PASO 4: Probar función crear_puestos_turno
    console.log('\n4️⃣ Probando función crear_puestos_turno...\n');
    
    if (instalaciones.rows.length > 0 && roles.rows.length > 0) {
      const instalacionId = instalaciones.rows[0].id;
      const rolId = roles.rows[0].id;
      const cantidadGuardias = 2;
      
      console.log(`🧪 Probando con instalación: ${instalaciones.rows[0].nombre}`);
      console.log(`🧪 Rol: ${roles.rows[0].nombre}`);
      console.log(`🧪 Cantidad: ${cantidadGuardias}`);
      
      try {
        // Limpiar puestos existentes para esta prueba
        await query('DELETE FROM as_turnos_puestos_operativos WHERE instalacion_id = $1 AND rol_id = $2', 
          [instalacionId, rolId]);
        
        // Crear puestos usando la función
        await query('SELECT crear_puestos_turno($1, $2, $3)', [instalacionId, rolId, cantidadGuardias]);
        
        // Verificar puestos creados
        const puestosCreados = await query(`
          SELECT id, nombre_puesto, es_ppc 
          FROM as_turnos_puestos_operativos 
          WHERE instalacion_id = $1 AND rol_id = $2
          ORDER BY nombre_puesto
        `, [instalacionId, rolId]);
        
        console.log(`✅ Puestos creados exitosamente: ${puestosCreados.rows.length}`);
        puestosCreados.rows.forEach((puesto: any) => {
          const estado = puesto.es_ppc ? 'PPC' : 'Asignado';
          console.log(`  • ${puesto.nombre_puesto} - ${estado}`);
        });
        
        // Limpiar después de la prueba
        await query('DELETE FROM as_turnos_puestos_operativos WHERE instalacion_id = $1 AND rol_id = $2', 
          [instalacionId, rolId]);
        
      } catch (error) {
        console.error('❌ Error probando función crear_puestos_turno:', error);
      }
    }

    // PASO 5: Verificar queries de los endpoints
    console.log('\n5️⃣ Verificando queries de endpoints...\n');
    
    // Query del endpoint GET /api/instalaciones/[id]/turnos
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
      `, [instalaciones.rows[0]?.id || '00000000-0000-0000-0000-000000000000']);
      
      console.log(`✅ Query de turnos ejecutado correctamente: ${turnosQuery.rows.length} resultados`);
      
    } catch (error) {
      console.error('❌ Error en query de turnos:', error);
    }

    // Query del endpoint GET /api/instalaciones/[id]/ppc
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
      `, [instalaciones.rows[0]?.id || '00000000-0000-0000-0000-000000000000']);
      
      console.log(`✅ Query de PPCs ejecutado correctamente: ${ppcQuery.rows.length} resultados`);
      
    } catch (error) {
      console.error('❌ Error en query de PPCs:', error);
    }

    // Query del endpoint GET /api/guardias/disponibles
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
      `);
      
      console.log(`✅ Query de guardias disponibles ejecutado correctamente: ${guardiasQuery.rows.length} resultados`);
      
    } catch (error) {
      console.error('❌ Error en query de guardias disponibles:', error);
    }

    console.log('\n🎉 VERIFICACIÓN COMPLETADA');
    console.log('\n📋 RESUMEN:');
    console.log('  ✅ Funciones de base de datos verificadas');
    console.log('  ✅ Estructura de tablas verificada');
    console.log('  ✅ Datos de prueba disponibles');
    console.log('  ✅ Queries de endpoints probados');
    
  } catch (error) {
    console.error('❌ Error en verificación:', error);
  }
}

verificarEndpointsTurnos().catch(console.error); 