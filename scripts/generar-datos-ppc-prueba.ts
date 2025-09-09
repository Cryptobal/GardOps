import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function generarDatosPPCPrueba() {
  console.log('🎯 GENERANDO DATOS DE PRUEBA PARA PPC');
  console.log('======================================\n');

  try {
    // 1. Verificar instalaciones disponibles
    console.log('📋 1. VERIFICANDO INSTALACIONES DISPONIBLES...');
    
    const instalaciones = await query(`
      SELECT id, nombre
      FROM instalaciones
      ORDER BY nombre
      LIMIT 10
    `);
    
    console.log(`Instalaciones disponibles: ${instalaciones.rows.length}`);

    // 2. Verificar roles de servicio disponibles
    console.log('\n📋 2. VERIFICANDO ROLES DE SERVICIO...');
    
    const roles = await query(`
      SELECT id, nombre, hora_inicio, hora_termino
      FROM as_turnos_roles_servicio
      ORDER BY nombre
    `);
    
    console.log(`Roles disponibles: ${roles.rows.length}`);

    // 3. Verificar guardias disponibles
    console.log('\n📋 3. VERIFICANDO GUARDIAS DISPONIBLES...');
    
    const guardias = await query(`
      SELECT id, nombre, apellido_paterno, rut
      FROM guardias
      ORDER BY nombre
      LIMIT 20
    `);
    
    console.log(`Guardias disponibles: ${guardias.rows.length}`);

    // 4. Limpiar PPC existentes
    console.log('\n🧹 4. LIMPIANDO PPC EXISTENTES...');
    
    await query(`
      DELETE FROM as_turnos_puestos_operativos 
      WHERE es_ppc = true
    `);
    
    console.log('✅ PPC existentes eliminados');

    // 5. Generar PPC de prueba
    console.log('\n🎯 5. GENERANDO PPC DE PRUEBA...');
    
    const instalacionesSeleccionadas = instalaciones.rows.slice(0, 5); // Usar 5 instalaciones
    const rolesDisponibles = roles.rows;
    const guardiasDisponibles = guardias.rows;

    let ppcCreados = 0;

    for (let i = 0; i < 15; i++) { // Crear 15 PPC
      const instalacion = instalacionesSeleccionadas[i % instalacionesSeleccionadas.length];
      const rol = rolesDisponibles[i % rolesDisponibles.length];
      
      // Determinar si asignar guardia o dejar pendiente
      const asignarGuardia = Math.random() > 0.6; // 40% de probabilidad de asignar guardia
      const guardia = asignarGuardia ? guardiasDisponibles[i % guardiasDisponibles.length] : null;
      
      // Crear PPC
      await query(`
        INSERT INTO as_turnos_puestos_operativos (
          id, instalacion_id, rol_id, guardia_id, nombre_puesto, es_ppc, creado_en
        )
        VALUES (
          gen_random_uuid(), 
          $1, 
          $2, 
          $3, 
          $4, 
          true, 
          NOW() - INTERVAL '${Math.floor(Math.random() * 30)} days'
        )
      `, [
        instalacion.id,
        rol.id,
        guardia ? guardia.id : null,
        `PPC ${i + 1} - ${instalacion.nombre} - ${rol.nombre}`
      ]);
      
      ppcCreados++;
    }

    console.log(`✅ ${ppcCreados} PPC creados exitosamente`);

    // 6. Verificar datos creados
    console.log('\n📊 6. VERIFICANDO DATOS CREADOS...');
    
    const ppcsCreados = await query(`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.creado_en,
        i.nombre as instalacion,
        rs.nombre as rol,
        CASE 
          WHEN po.guardia_id IS NOT NULL THEN 'Cubierto'
          ELSE 'Pendiente'
        END as estado,
        g.nombre || ' ' || g.apellido_paterno as guardia_asignado
      FROM as_turnos_puestos_operativos po
      INNER JOIN instalaciones i ON po.instalacion_id = i.id
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.es_ppc = true
      ORDER BY po.creado_en DESC
    `);
    
    console.log(`Total PPC creados: ${ppcsCreados.rows.length}`);
    
    // Mostrar algunos ejemplos
    console.log('\n📋 Ejemplos de PPC creados:');
    ppcsCreados.rows.slice(0, 5).forEach((ppc: any, index: number) => {
      console.log(`  ${index + 1}. ${ppc.nombre_puesto} - ${ppc.estado}`);
      if (ppc.guardia_asignado) {
        console.log(`     Guardia: ${ppc.guardia_asignado}`);
      }
    });

    // 7. Estadísticas finales
    console.log('\n📈 7. ESTADÍSTICAS FINALES...');
    
    const stats = await query(`
      SELECT 
        COUNT(*) as total_ppc,
        COUNT(CASE WHEN guardia_id IS NULL THEN 1 END) as pendientes,
        COUNT(CASE WHEN guardia_id IS NOT NULL THEN 1 END) as cubiertos
      FROM as_turnos_puestos_operativos
      WHERE es_ppc = true
    `);
    
    const estadisticas = stats.rows[0];
    console.log(`Total PPC: ${estadisticas.total_ppc}`);
    console.log(`Pendientes: ${estadisticas.pendientes}`);
    console.log(`Cubiertos: ${estadisticas.cubiertos}`);
    console.log(`Tasa de cobertura: ${estadisticas.total_ppc > 0 ? Math.round((estadisticas.cubiertos / estadisticas.total_ppc) * 100) : 0}%`);

    console.log('\n✅ Datos de prueba generados exitosamente');
    console.log('🎯 Ahora puedes visitar http://localhost:3000/ppc para ver el dashboard completo');

  } catch (error) {
    console.error('❌ Error durante la generación de datos:', error);
  }
}

generarDatosPPCPrueba().then(() => {
  console.log('\n🎯 Generación de datos PPC finalizada');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
}); 