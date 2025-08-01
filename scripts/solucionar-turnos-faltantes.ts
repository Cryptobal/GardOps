import { query } from '../src/lib/database';

async function solucionarTurnosFaltantes() {
  console.log('🔧 Solucionando turnos faltantes en todas las instalaciones...\n');

  try {
    // 1. Buscar todas las instalaciones con requisitos pero sin configuraciones de turnos
    console.log('1. Buscando instalaciones con requisitos pero sin turnos configurados...');
    const instalacionesProblematicas = await query(`
      SELECT DISTINCT
        i.id,
        i.nombre,
        i.cliente_id,
        c.nombre as cliente_nombre,
        COUNT(tr.id) as requisitos_count,
        COUNT(tc.id) as turnos_count
      FROM instalaciones i
      INNER JOIN as_turnos_requisitos tr ON i.id = tr.instalacion_id
      LEFT JOIN as_turnos_configuracion tc ON i.id = tc.instalacion_id
      LEFT JOIN clientes c ON i.cliente_id = c.id
      WHERE i.estado = 'Activo'
      GROUP BY i.id, i.nombre, i.cliente_id, c.nombre
      HAVING COUNT(tr.id) > 0 AND COUNT(tc.id) = 0
      ORDER BY i.nombre
    `);

    if (instalacionesProblematicas.rows.length === 0) {
      console.log('✅ No se encontraron instalaciones con este problema');
      return;
    }

    console.log(`📊 Instalaciones problemáticas encontradas: ${instalacionesProblematicas.rows.length}`);
    instalacionesProblematicas.rows.forEach(inst => {
      console.log(`   - ${inst.nombre} (${inst.cliente_nombre}): ${inst.requisitos_count} requisitos, ${inst.turnos_count} turnos`);
    });
    console.log('');

    // 2. Procesar cada instalación problemática
    let instalacionesSolucionadas = 0;
    
    for (const instalacion of instalacionesProblematicas.rows) {
      console.log(`🔧 Procesando instalación: ${instalacion.nombre}`);
      
      try {
        // Obtener requisitos de esta instalación
        const requisitosResult = await query(`
          SELECT tr.id, tr.rol_servicio_id, rs.nombre as rol_nombre
          FROM as_turnos_requisitos tr
          INNER JOIN as_turnos_roles_servicio rs ON tr.rol_servicio_id = rs.id
          WHERE tr.instalacion_id = $1
        `, [instalacion.id]);

        // Crear configuraciones de turnos para cada requisito
        for (const requisito of requisitosResult.rows) {
          // Contar PPC para este requisito
          const ppcCountResult = await query(`
            SELECT COUNT(*) as count
            FROM as_turnos_ppc ppc
            WHERE ppc.requisito_puesto_id = $1
          `, [requisito.id]);
          
          const cantidadGuardias = parseInt(ppcCountResult.rows[0].count) || 1;
          
          // Crear configuración de turno
          await query(`
            INSERT INTO as_turnos_configuracion (
              instalacion_id, 
              rol_servicio_id, 
              cantidad_guardias, 
              estado, 
              created_at, 
              updated_at
            ) VALUES ($1, $2, $3, $4, NOW(), NOW())
          `, [
            instalacion.id,
            requisito.rol_servicio_id,
            cantidadGuardias,
            'Activo'
          ]);

          console.log(`   ✅ Creado turno para ${requisito.rol_nombre}: ${cantidadGuardias} guardias`);
        }
        
        instalacionesSolucionadas++;
        console.log(`   ✅ Instalación ${instalacion.nombre} procesada correctamente\n`);
        
      } catch (error) {
        console.error(`   ❌ Error procesando instalación ${instalacion.nombre}:`, error);
      }
    }

    // 3. Verificar resultado final
    console.log('3. Verificando resultado final...');
    const instalacionesFinales = await query(`
      SELECT DISTINCT
        i.id,
        i.nombre,
        c.nombre as cliente_nombre,
        COUNT(tr.id) as requisitos_count,
        COUNT(tc.id) as turnos_count
      FROM instalaciones i
      INNER JOIN as_turnos_requisitos tr ON i.id = tr.instalacion_id
      LEFT JOIN as_turnos_configuracion tc ON i.id = tc.instalacion_id
      LEFT JOIN clientes c ON i.cliente_id = c.id
      WHERE i.estado = 'Activo'
      GROUP BY i.id, i.nombre, c.nombre
      HAVING COUNT(tr.id) > 0
      ORDER BY i.nombre
    `);

    console.log(`📊 Resumen final de instalaciones con requisitos:`);
    instalacionesFinales.rows.forEach(inst => {
      const estado = inst.turnos_count > 0 ? '✅' : '❌';
      console.log(`   ${estado} ${inst.nombre} (${inst.cliente_nombre}): ${inst.requisitos_count} requisitos, ${inst.turnos_count} turnos`);
    });

    // 4. Estadísticas generales
    console.log('\n4. Estadísticas generales...');
    const statsResult = await query(`
      SELECT 
        COUNT(DISTINCT i.id) as total_instalaciones,
        COUNT(DISTINCT CASE WHEN tc.id IS NOT NULL THEN i.id END) as instalaciones_con_turnos,
        COUNT(DISTINCT CASE WHEN tc.id IS NULL AND tr.id IS NOT NULL THEN i.id END) as instalaciones_sin_turnos,
        COUNT(tr.id) as total_requisitos,
        COUNT(tc.id) as total_turnos_configurados
      FROM instalaciones i
      LEFT JOIN as_turnos_requisitos tr ON i.id = tr.instalacion_id
      LEFT JOIN as_turnos_configuracion tc ON i.id = tc.instalacion_id
      WHERE i.estado = 'Activo'
    `);

    if (statsResult.rows.length > 0) {
      const stats = statsResult.rows[0];
      console.log(`📊 Total instalaciones activas: ${stats.total_instalaciones}`);
      console.log(`📊 Instalaciones con turnos configurados: ${stats.instalaciones_con_turnos}`);
      console.log(`📊 Instalaciones sin turnos configurados: ${stats.instalaciones_sin_turnos}`);
      console.log(`📊 Total requisitos de puestos: ${stats.total_requisitos}`);
      console.log(`📊 Total turnos configurados: ${stats.total_turnos_configurados}`);
    }

    console.log(`\n✅ Proceso completado!`);
    console.log(`📊 Instalaciones solucionadas: ${instalacionesSolucionadas}`);
    console.log(`💡 Ahora todas las instalaciones deberían mostrar sus turnos correctamente.`);

  } catch (error) {
    console.error('❌ Error durante el proceso:', error);
  }
}

// Ejecutar el script
solucionarTurnosFaltantes()
  .then(() => {
    console.log('\n🏁 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }); 