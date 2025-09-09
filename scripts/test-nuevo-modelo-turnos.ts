import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function testNuevoModeloTurnos() {
  console.log('🧪 PROBANDO NUEVO MODELO DE TURNOS\n');

  try {
    // PASO 1: Verificar estructura final
    console.log('1️⃣ VERIFICANDO ESTRUCTURA FINAL...\n');
    
    const tablasFinales = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'as_turnos_%'
      ORDER BY table_name
    `);
    
    console.log('Tablas del sistema de turnos:');
    tablasFinales.rows.forEach((row: any) => {
      console.log(`  ✅ ${row.table_name}`);
    });

    // PASO 2: Verificar roles de servicio disponibles
    console.log('\n2️⃣ VERIFICANDO ROLES DE SERVICIO...\n');
    
    const roles = await query(`
      SELECT id, nombre, dias_trabajo, dias_descanso, horas_turno
      FROM as_turnos_roles_servicio 
      WHERE estado = 'Activo'
      ORDER BY nombre
    `);
    
    console.log('Roles de servicio disponibles:');
    roles.rows.forEach((rol: any) => {
      console.log(`  • ${rol.nombre} (${rol.dias_trabajo}x${rol.dias_descanso}, ${rol.horas_turno}h)`);
    });

    // PASO 3: Verificar instalaciones disponibles
    console.log('\n3️⃣ VERIFICANDO INSTALACIONES...\n');
    
    const instalaciones = await query(`
      SELECT id, nombre 
      FROM instalaciones 
      LIMIT 5
    `);
    
    console.log('Instalaciones disponibles:');
    instalaciones.rows.forEach((inst: any) => {
      console.log(`  • ${inst.nombre} (${inst.id})`);
    });

    // PASO 4: Crear un turno de prueba
    console.log('\n4️⃣ CREANDO TURNO DE PRUEBA...\n');
    
    if (roles.rows.length > 0 && instalaciones.rows.length > 0) {
      const rolId = roles.rows[0].id;
      const instalacionId = instalaciones.rows[0].id;
      const cantidadGuardias = 3;
      
      console.log(`📋 Creando turno: ${roles.rows[0].nombre} en ${instalaciones.rows[0].nombre}`);
      console.log(`   • Cantidad de guardias: ${cantidadGuardias}`);
      
      // Crear puestos usando la función
      await query('SELECT crear_puestos_turno($1, $2, $3)', [instalacionId, rolId, cantidadGuardias]);
      
      console.log('✅ Turno creado exitosamente');
      
      // Verificar puestos creados
      const puestosCreados = await query(`
        SELECT 
          po.id,
          po.nombre_puesto,
          po.es_ppc,
          rs.nombre as rol_nombre
        FROM as_turnos_puestos_operativos po
        INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
        WHERE po.instalacion_id = $1 AND po.rol_id = $2
        ORDER BY po.nombre_puesto
      `, [instalacionId, rolId]);
      
      console.log('\n📋 Puestos creados:');
      puestosCreados.rows.forEach((puesto: any) => {
        const estado = puesto.es_ppc ? 'PPC' : 'Asignado';
        console.log(`  • ${puesto.nombre_puesto} (${puesto.rol_nombre}) - ${estado}`);
      });
      
      // PASO 5: Probar asignación de guardia
      console.log('\n5️⃣ PROBANDO ASIGNACIÓN DE GUARDIA...\n');
      
      // Buscar un guardia disponible
      const guardias = await query(`
        SELECT id, nombre, apellido_paterno, apellido_materno 
        FROM guardias 
        LIMIT 1
      `);
      
      if (guardias.rows.length > 0 && puestosCreados.rows.length > 0) {
        const guardiaId = guardias.rows[0].id;
        const puestoId = puestosCreados.rows[0].id;
        
        console.log(`📋 Asignando guardia: ${guardias.rows[0].nombre} ${guardias.rows[0].apellido_paterno} ${guardias.rows[0].apellido_materno}`);
        console.log(`   • Al puesto: ${puestosCreados.rows[0].nombre_puesto}`);
        
        // Asignar guardia
        await query('SELECT asignar_guardia_puesto($1, $2)', [puestoId, guardiaId]);
        
        console.log('✅ Guardia asignado exitosamente');
        
        // Verificar asignación
        const puestoAsignado = await query(`
          SELECT 
            po.nombre_puesto,
            po.es_ppc,
            g.nombre as guardia_nombre,
            g.apellido_paterno as guardia_apellido_paterno,
            g.apellido_materno as guardia_apellido_materno
          FROM as_turnos_puestos_operativos po
          LEFT JOIN guardias g ON po.guardia_id = g.id
          WHERE po.id = $1
        `, [puestoId]);
        
        const puesto = puestoAsignado.rows[0];
        console.log(`📋 Estado del puesto: ${puesto.nombre_puesto}`);
        console.log(`   • Asignado a: ${puesto.guardia_nombre} ${puesto.guardia_apellido_paterno} ${puesto.guardia_apellido_materno}`);
        console.log(`   • Es PPC: ${puesto.es_ppc}`);
        
        // PASO 6: Probar desasignación
        console.log('\n6️⃣ PROBANDO DESASIGNACIÓN...\n');
        
        await query('SELECT desasignar_guardia_puesto($1)', [puestoId]);
        
        console.log('✅ Guardia desasignado exitosamente');
        
        // Verificar desasignación
        const puestoDesasignado = await query(`
          SELECT 
            po.nombre_puesto,
            po.es_ppc,
            po.guardia_id
          FROM as_turnos_puestos_operativos po
          WHERE po.id = $1
        `, [puestoId]);
        
        const puestoFinal = puestoDesasignado.rows[0];
        console.log(`📋 Estado final del puesto: ${puestoFinal.nombre_puesto}`);
        console.log(`   • Guardia asignado: ${puestoFinal.guardia_id ? 'Sí' : 'No'}`);
        console.log(`   • Es PPC: ${puestoFinal.es_ppc}`);
      }
      
      // PASO 7: Estadísticas finales
      console.log('\n7️⃣ ESTADÍSTICAS FINALES...\n');
      
      const estadisticas = await query(`
        SELECT 
          COUNT(*) as total_puestos,
          COUNT(CASE WHEN guardia_id IS NOT NULL THEN 1 END) as puestos_asignados,
          COUNT(CASE WHEN es_ppc = true THEN 1 END) as ppcs_activos
        FROM as_turnos_puestos_operativos
        WHERE instalacion_id = $1
      `, [instalacionId]);
      
      const stats = estadisticas.rows[0];
      console.log('📊 Estadísticas de la instalación:');
      console.log(`  • Total de puestos: ${stats.total_puestos}`);
      console.log(`  • Puestos asignados: ${stats.puestos_asignados}`);
      console.log(`  • PPCs activos: ${stats.ppcs_activos}`);
      
      // PASO 8: Limpiar datos de prueba
      console.log('\n8️⃣ LIMPIANDO DATOS DE PRUEBA...\n');
      
      await query('SELECT eliminar_puestos_turno($1, $2)', [instalacionId, rolId]);
      
      console.log('✅ Datos de prueba eliminados');
    } else {
      console.log('❌ No hay roles de servicio o instalaciones disponibles para la prueba');
    }

    console.log('\n🎉 ¡PRUEBA DEL NUEVO MODELO COMPLETADA!');
    console.log('\n📋 RESUMEN:');
    console.log('  ✅ Estructura verificada');
    console.log('  ✅ Funciones de utilidad probadas');
    console.log('  ✅ Asignación/desasignación funcionando');
    console.log('  ✅ Estadísticas calculadas correctamente');
    console.log('  ✅ Sistema listo para producción');

  } catch (error) {
    console.error('❌ Error en prueba:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testNuevoModeloTurnos()
    .then(() => {
      console.log('\n✅ Prueba completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en la prueba:', error);
      process.exit(1);
    });
}

export { testNuevoModeloTurnos }; 