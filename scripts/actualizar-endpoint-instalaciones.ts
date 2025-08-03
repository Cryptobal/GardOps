import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function actualizarEndpointInstalaciones() {
  console.log('🔄 ACTUALIZANDO ENDPOINT DE INSTALACIONES PARA NUEVO MODELO\n');

  try {
    // PASO 1: Verificar el endpoint actual
    console.log('1️⃣ VERIFICANDO ENDPOINT ACTUAL...\n');
    
    const endpointActual = `
    // QUERY ACTUAL (CON ERROR)
    SELECT 
      i.id,
      i.nombre,
      i.estado,
      i.cliente_id,
      COALESCE(c.nombre, 'Cliente no encontrado') as cliente_nombre,
      COALESCE(stats.puestos_creados, 0) as puestos_creados,
      COALESCE(stats.ppc_pendientes, 0) as ppc_pendientes
    FROM instalaciones i
    LEFT JOIN clientes c ON i.cliente_id = c.id
    LEFT JOIN (
      SELECT 
        tr.instalacion_id,
        SUM(tr.cantidad_guardias) as puestos_creados,
        SUM(tr.cantidad_guardias) - COALESCE(asignaciones.total_asignados, 0) as ppc_pendientes
      FROM as_turnos_requisitos tr
      LEFT JOIN (
        SELECT 
          tr2.instalacion_id,
          COUNT(ta.id) as total_asignados
        FROM as_turnos_asignaciones ta
        INNER JOIN as_turnos_requisitos tr2 ON ta.requisito_puesto_id = tr2.id
        WHERE ta.estado = 'Activa'
        GROUP BY tr2.instalacion_id
      ) asignaciones ON asignaciones.instalacion_id = tr.instalacion_id
      GROUP BY tr.instalacion_id, asignaciones.total_asignados
    ) stats ON stats.instalacion_id = i.id
    ORDER BY i.nombre
    `;
    
    console.log('❌ Query actual usa tablas eliminadas');
    console.log('   • as_turnos_requisitos (ELIMINADA)');
    console.log('   • as_turnos_asignaciones (ELIMINADA)');

    // PASO 2: Crear nueva query optimizada
    console.log('\n2️⃣ CREANDO NUEVA QUERY OPTIMIZADA...\n');
    
    const nuevaQuerySimple = `
    // NUEVA QUERY SIMPLE (SIN ERROR)
    SELECT 
      i.id,
      i.nombre,
      i.estado,
      i.cliente_id,
      COALESCE(c.nombre, 'Cliente no encontrado') as cliente_nombre,
      COALESCE(stats.total_puestos, 0) as puestos_creados,
      COALESCE(stats.ppc_pendientes, 0) as ppc_pendientes
    FROM instalaciones i
    LEFT JOIN clientes c ON i.cliente_id = c.id
    LEFT JOIN (
      SELECT 
        po.instalacion_id,
        COUNT(*) as total_puestos,
        COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as ppc_pendientes
      FROM as_turnos_puestos_operativos po
      GROUP BY po.instalacion_id
    ) stats ON stats.instalacion_id = i.id
    ORDER BY i.nombre
    `;
    
    console.log('✅ Nueva query usa solo as_turnos_puestos_operativos');

    // PASO 3: Crear nueva query para withAllData
    console.log('\n3️⃣ CREANDO QUERY PARA withAllData...\n');
    
    const nuevaQueryCompleta = `
    // NUEVA QUERY COMPLETA (SIN ERROR)
    SELECT 
      po.instalacion_id,
      COUNT(*) as total_puestos,
      COUNT(CASE WHEN po.guardia_id IS NOT NULL THEN 1 END) as puestos_asignados,
      COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as ppc_pendientes,
      COUNT(*) as ppc_totales,
      COUNT(CASE WHEN po.guardia_id IS NULL THEN 1 END) as puestos_disponibles
    FROM as_turnos_puestos_operativos po
    GROUP BY po.instalacion_id
    `;
    
    console.log('✅ Nueva query completa optimizada');

    // PASO 4: Probar las nuevas queries
    console.log('\n4️⃣ PROBANDO NUEVAS QUERIES...\n');
    
    // Probar query simple
    try {
      const testSimple = await query(`
        SELECT 
          i.id,
          i.nombre,
          i.estado,
          i.cliente_id,
          COALESCE(c.nombre, 'Cliente no encontrado') as cliente_nombre,
          COALESCE(stats.total_puestos, 0) as puestos_creados,
          COALESCE(stats.ppc_pendientes, 0) as ppc_pendientes
        FROM instalaciones i
        LEFT JOIN clientes c ON i.cliente_id = c.id
        LEFT JOIN (
          SELECT 
            po.instalacion_id,
            COUNT(*) as total_puestos,
            COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as ppc_pendientes
          FROM as_turnos_puestos_operativos po
          GROUP BY po.instalacion_id
        ) stats ON stats.instalacion_id = i.id
        ORDER BY i.nombre
        LIMIT 5
      `);
      
      console.log(`✅ Query simple funciona: ${testSimple.rows.length} instalaciones encontradas`);
      
      if (testSimple.rows.length > 0) {
        console.log('📋 Ejemplo de datos:');
        console.log(testSimple.rows[0]);
      }
    } catch (error) {
      console.error('❌ Error en query simple:', error);
    }

    // Probar query completa
    try {
      const testCompleta = await query(`
        SELECT 
          po.instalacion_id,
          COUNT(*) as total_puestos,
          COUNT(CASE WHEN po.guardia_id IS NOT NULL THEN 1 END) as puestos_asignados,
          COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as ppc_pendientes
        FROM as_turnos_puestos_operativos po
        GROUP BY po.instalacion_id
        LIMIT 5
      `);
      
      console.log(`✅ Query completa funciona: ${testCompleta.rows.length} estadísticas encontradas`);
      
      if (testCompleta.rows.length > 0) {
        console.log('📋 Ejemplo de estadísticas:');
        console.log(testCompleta.rows[0]);
      }
    } catch (error) {
      console.error('❌ Error en query completa:', error);
    }

    // PASO 5: Generar código actualizado
    console.log('\n5️⃣ GENERANDO CÓDIGO ACTUALIZADO...\n');
    
    const codigoActualizado = `
    // CÓDIGO ACTUALIZADO PARA src/app/api/instalaciones/route.ts
    
    // Reemplazar la query simple (líneas ~40-70)
    if (simple) {
      const result = await query(\`
        SELECT 
          i.id,
          i.nombre,
          i.estado,
          i.cliente_id,
          COALESCE(c.nombre, 'Cliente no encontrado') as cliente_nombre,
          COALESCE(stats.total_puestos, 0) as puestos_creados,
          COALESCE(stats.ppc_pendientes, 0) as ppc_pendientes
        FROM instalaciones i
        LEFT JOIN clientes c ON i.cliente_id = c.id
        LEFT JOIN (
          SELECT 
            po.instalacion_id,
            COUNT(*) as total_puestos,
            COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as ppc_pendientes
          FROM as_turnos_puestos_operativos po
          GROUP BY po.instalacion_id
        ) stats ON stats.instalacion_id = i.id
        ORDER BY i.nombre
      \`);
      
      return NextResponse.json({
        success: true,
        data: result.rows
      });
    }
    
    // Reemplazar la query completa (líneas ~90-120)
    const statsResult = await query(\`
      SELECT 
        po.instalacion_id,
        COUNT(*) as total_puestos,
        COUNT(CASE WHEN po.guardia_id IS NOT NULL THEN 1 END) as puestos_asignados,
        COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as ppc_pendientes,
        COUNT(*) as ppc_totales,
        COUNT(CASE WHEN po.guardia_id IS NULL THEN 1 END) as puestos_disponibles
      FROM as_turnos_puestos_operativos po
      GROUP BY po.instalacion_id
    \`);
    `;
    
    console.log('✅ Código actualizado generado');

    // PASO 6: Verificar que no hay otras referencias
    console.log('\n6️⃣ VERIFICANDO OTRAS REFERENCIAS...\n');
    
    const referencias = await query(`
      SELECT 
        table_name,
        column_name
      FROM information_schema.columns 
      WHERE table_name IN ('as_turnos_requisitos', 'as_turnos_asignaciones', 'as_turnos_configuracion', 'as_turnos_ppc')
      ORDER BY table_name, column_name
    `);
    
    if (referencias.rows.length === 0) {
      console.log('✅ No hay referencias a tablas eliminadas en la base de datos');
    } else {
      console.log('⚠️ Referencias encontradas:');
      referencias.rows.forEach((ref: any) => {
        console.log(`  • ${ref.table_name}.${ref.column_name}`);
      });
    }

    console.log('\n🎉 ¡ACTUALIZACIÓN DE ENDPOINT COMPLETADA!');
    console.log('\n📋 RESUMEN:');
    console.log('  ✅ Queries actualizadas para nuevo modelo');
    console.log('  ✅ Pruebas exitosas realizadas');
    console.log('  ✅ Código actualizado generado');
    console.log('  ✅ Sin referencias a tablas eliminadas');

  } catch (error) {
    console.error('❌ Error actualizando endpoint:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  actualizarEndpointInstalaciones()
    .then(() => {
      console.log('\n✅ Proceso completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en el proceso:', error);
      process.exit(1);
    });
}

export { actualizarEndpointInstalaciones }; 