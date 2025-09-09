/**
 * Script para migrar roles de servicio existentes a la nueva estructura con series
 * Este script mantiene la compatibilidad con roles existentes
 */

import { sql } from '@vercel/postgres';

async function migrarRolesServicioSeries() {
  console.log('🚀 Iniciando migración de roles de servicio a estructura con series...\n');

  try {
    // 1. Verificar que las nuevas columnas existen
    console.log('📋 Verificando estructura de base de datos...');
    
    const columnasExistentes = await sql.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'as_turnos_roles_servicio' 
        AND column_name IN ('tiene_horarios_variables', 'duracion_ciclo_dias', 'horas_turno_promedio')
    `);

    if (columnasExistentes.rows.length < 3) {
      console.log('❌ Las nuevas columnas no existen. Ejecuta primero el script SQL de creación.');
      return;
    }

    console.log('✅ Estructura de base de datos verificada');

    // 2. Obtener roles existentes que no tienen series
    console.log('\n📊 Obteniendo roles existentes...');
    
    const rolesExistentes = await sql.query(`
      SELECT 
        id, nombre, dias_trabajo, dias_descanso, 
        horas_turno, hora_inicio, hora_termino,
        tiene_horarios_variables
      FROM as_turnos_roles_servicio 
      WHERE tiene_horarios_variables IS NULL OR tiene_horarios_variables = false
      ORDER BY created_at
    `);

    console.log(`📈 Encontrados ${rolesExistentes.rows.length} roles para migrar`);

    if (rolesExistentes.rows.length === 0) {
      console.log('✅ No hay roles para migrar');
      return;
    }

    // 3. Migrar cada rol
    let rolesMigrados = 0;
    let errores = 0;

    for (const rol of rolesExistentes.rows) {
      try {
        console.log(`\n🔄 Migrando rol: ${rol.nombre}`);
        
        // Calcular duración del ciclo
        const duracionCiclo = rol.dias_trabajo + rol.dias_descanso;
        
        // Actualizar rol principal
        await sql.query(`
          UPDATE as_turnos_roles_servicio 
          SET 
            tiene_horarios_variables = false,
            duracion_ciclo_dias = $1,
            horas_turno_promedio = $2,
            updated_at = NOW()
          WHERE id = $3
        `, [duracionCiclo, rol.horas_turno, rol.id]);

        // Crear series por defecto (horarios fijos)
        for (let i = 1; i <= duracionCiclo; i++) {
          const esDiaTrabajo = i <= rol.dias_trabajo;
          
          await sql.query(`
            INSERT INTO as_turnos_series_dias (
              rol_servicio_id, posicion_en_ciclo, es_dia_trabajo,
              hora_inicio, hora_termino, observaciones
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            rol.id,
            i,
            esDiaTrabajo,
            esDiaTrabajo ? rol.hora_inicio : null,
            esDiaTrabajo ? rol.hora_termino : null,
            esDiaTrabajo ? `Día ${i}` : `Día libre ${i}`
          ]);
        }

        console.log(`  ✅ Rol migrado: ${duracionCiclo} días, ${rol.dias_trabajo} trabajo, ${rol.dias_descanso} descanso`);
        rolesMigrados++;

      } catch (error) {
        console.error(`  ❌ Error migrando rol ${rol.nombre}:`, error);
        errores++;
      }
    }

    // 4. Verificar migración
    console.log('\n🔍 Verificando migración...');
    
    const rolesConSeries = await sql.query(`
      SELECT COUNT(*) as total
      FROM as_turnos_roles_servicio 
      WHERE tiene_horarios_variables IS NOT NULL
    `);

    const seriesCreadas = await sql.query(`
      SELECT COUNT(*) as total
      FROM as_turnos_series_dias
    `);

    console.log(`📊 Resultados de la migración:`);
    console.log(`  • Roles actualizados: ${rolesConSeries.rows[0].total}`);
    console.log(`  • Series creadas: ${seriesCreadas.rows[0].total}`);
    console.log(`  • Roles migrados exitosamente: ${rolesMigrados}`);
    console.log(`  • Errores: ${errores}`);

    // 5. Verificar integridad
    console.log('\n🔍 Verificando integridad...');
    
    const rolesSinSeries = await sql.query(`
      SELECT rs.id, rs.nombre
      FROM as_turnos_roles_servicio rs
      LEFT JOIN as_turnos_series_dias sd ON rs.id = sd.rol_servicio_id
      WHERE rs.tiene_horarios_variables = false
        AND sd.id IS NULL
    `);

    if (rolesSinSeries.rows.length > 0) {
      console.log('⚠️  Advertencia: Algunos roles no tienen series:');
      rolesSinSeries.rows.forEach(rol => {
        console.log(`  • ${rol.nombre} (ID: ${rol.id})`);
      });
    } else {
      console.log('✅ Todos los roles tienen sus series correspondientes');
    }

    console.log('\n🎉 Migración completada exitosamente!');
    console.log('\n📝 Próximos pasos:');
    console.log('  1. Probar la creación de nuevos roles con series');
    console.log('  2. Verificar que los roles existentes siguen funcionando');
    console.log('  3. Actualizar la interfaz de usuario para mostrar series');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  migrarRolesServicioSeries()
    .then(() => {
      console.log('\n✅ Script de migración completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en script de migración:', error);
      process.exit(1);
    });
}

export { migrarRolesServicioSeries };
