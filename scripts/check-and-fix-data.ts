import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function checkAndFixData() {
  console.log('🔧 Verificando y corrigiendo datos en las tablas...\n');

  try {
    // 1. Verificar datos en las tablas
    console.log('📋 Verificando datos en tablas...');
    
    const tables = [
      'as_turnos_roles_servicio',
      'as_turnos_configuracion', 
      'as_turnos_requisitos',
      'as_turnos_ppc',
      'as_turnos_asignaciones'
    ];
    
    for (const table of tables) {
      try {
        const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  - ${table}: ${result.rows[0].count} registros`);
      } catch (error: any) {
        console.log(`  - ${table}: ERROR - ${error.message}`);
      }
    }

    // 2. Verificar instalaciones
    console.log('\n📋 Verificando instalaciones...');
    const instalaciones = await query('SELECT id, nombre FROM instalaciones LIMIT 3');
    console.log('Instalaciones encontradas:');
    instalaciones.rows.forEach((inst: any) => {
      console.log(`  - ${inst.id}: ${inst.nombre}`);
    });

    if (instalaciones.rows.length === 0) {
      console.log('❌ No hay instalaciones. No se puede continuar.');
      return;
    }

    const instalacionId = instalaciones.rows[0].id;

    // 3. Verificar roles de servicio
    console.log('\n📋 Verificando roles de servicio...');
    const roles = await query('SELECT id, nombre FROM as_turnos_roles_servicio WHERE estado = $1', ['Activo']);
    console.log('Roles activos:');
    roles.rows.forEach((rol: any) => {
      console.log(`  - ${rol.id}: ${rol.nombre}`);
    });

    // 4. Crear datos de ejemplo si no existen
    if (roles.rows.length === 0) {
      console.log('\n📋 Creando roles de servicio de ejemplo...');
      await query(`
        INSERT INTO as_turnos_roles_servicio (nombre, descripcion, dias_trabajo, dias_descanso, horas_turno, hora_inicio, hora_termino, estado)
        VALUES 
        ('4x4 Diurno', 'Turno de 4 días trabajados por 4 días libres en horario diurno', 4, 4, 12, '08:00', '20:00', 'Activo'),
        ('4x4 Nocturno', 'Turno de 4 días trabajados por 4 días libres en horario nocturno', 4, 4, 12, '20:00', '08:00', 'Activo'),
        ('6x2 Diurno', 'Turno de 6 días trabajados por 2 días libres en horario diurno', 6, 2, 8, '08:00', '16:00', 'Activo')
        ON CONFLICT (nombre) DO NOTHING
      `);
      console.log('✅ Roles de servicio creados');
    }

    // 5. Crear puesto operativo para la instalación si no existe
    console.log('\n📋 Verificando puestos operativos...');
    const puestoExistente = await query(`
      SELECT id FROM as_turnos_puestos_operativos 
      WHERE instalacion_id = $1 AND estado = 'Activo'
      LIMIT 1
    `, [instalacionId]);

    let puestoId;
    if (puestoExistente.rows.length === 0) {
      console.log('Creando puesto operativo...');
      const nuevoPuesto = await query(`
        INSERT INTO as_turnos_puestos_operativos (instalacion_id, nombre, estado)
        VALUES ($1, 'Puesto Principal', 'Activo')
        RETURNING id
      `, [instalacionId]);
      puestoId = nuevoPuesto.rows[0].id;
      console.log(`✅ Puesto operativo creado: ${puestoId}`);
    } else {
      puestoId = puestoExistente.rows[0].id;
      console.log(`✅ Puesto operativo ya existe: ${puestoId}`);
    }

    // 6. Crear configuración de turno si no existe
    console.log('\n📋 Verificando configuración de turnos...');
    const configExistente = await query(`
      SELECT id FROM as_turnos_configuracion 
      WHERE instalacion_id = $1 AND estado = 'Activo'
      LIMIT 1
    `, [instalacionId]);

    if (configExistente.rows.length === 0) {
      console.log('Creando configuración de turno...');
      
      // Obtener el primer rol activo
      const primerRol = await query('SELECT id FROM as_turnos_roles_servicio WHERE estado = $1 LIMIT 1', ['Activo']);
      
      if (primerRol.rows.length > 0) {
        await query(`
          INSERT INTO as_turnos_configuracion (instalacion_id, rol_servicio_id, cantidad_guardias, estado)
          VALUES ($1, $2, 2, 'Activo')
        `, [instalacionId, primerRol.rows[0].id]);
        console.log('✅ Configuración de turno creada');
      }
    } else {
      console.log('✅ Configuración de turno ya existe');
    }

    // 7. Crear requisito si no existe
    console.log('\n📋 Verificando requisitos...');
    const requisitoExistente = await query(`
      SELECT id FROM as_turnos_requisitos 
      WHERE instalacion_id = $1 AND estado = 'Activo'
      LIMIT 1
    `, [instalacionId]);

    if (requisitoExistente.rows.length === 0) {
      console.log('Creando requisito...');
      
      const primerRol = await query('SELECT id FROM as_turnos_roles_servicio WHERE estado = $1 LIMIT 1', ['Activo']);
      
      if (primerRol.rows.length > 0) {
        await query(`
          INSERT INTO as_turnos_requisitos (
            instalacion_id, 
            rol_servicio_id, 
            cantidad_guardias, 
            estado
          ) VALUES ($1, $2, 1, 'Activo')
        `, [instalacionId, primerRol.rows[0].id]);
        console.log('✅ Requisito creado');
      }
    } else {
      console.log('✅ Requisito ya existe');
    }

    // 8. Verificación final de datos
    console.log('\n📊 Verificación final de datos...');
    
    for (const table of tables) {
      try {
        const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ✅ ${table}: ${result.rows[0].count} registros`);
      } catch (error: any) {
        console.log(`  ❌ ${table}: ERROR - ${error.message}`);
      }
    }

    // 9. Probar query de PPCs
    console.log('\n🧪 Probando query de PPCs...');
    try {
      const testPPC = await query(`
        SELECT 
          ppc.id,
          rp.instalacion_id,
          rp.rol_servicio_id,
          ppc.motivo,
          ppc.observaciones,
          ppc.created_at,
          rs.nombre as rol_servicio_nombre,
          rs.hora_inicio,
          rs.hora_termino,
          ppc.cantidad_faltante,
          ppc.estado,
          ppc.guardia_asignado_id
        FROM as_turnos_ppc ppc
        INNER JOIN as_turnos_requisitos rp ON ppc.requisito_puesto_id = rp.id
        LEFT JOIN as_turnos_roles_servicio rs ON rp.rol_servicio_id = rs.id
        WHERE rp.instalacion_id = $1
        ORDER BY ppc.created_at DESC
        LIMIT 5
      `, [instalacionId]);
      
      console.log(`✅ Query de PPCs funciona: ${testPPC.rows.length} resultados`);
    } catch (error: any) {
      console.log(`❌ Error en query de PPCs: ${error.message}`);
    }

    // 10. Probar query de turnos
    console.log('\n🧪 Probando query de turnos...');
    try {
      const testTurnos = await query(`
        SELECT 
          ti.id,
          ti.instalacion_id,
          ti.rol_servicio_id,
          ti.cantidad_guardias,
          ti.estado,
          rs.nombre as rol_nombre
        FROM as_turnos_configuracion ti
        INNER JOIN as_turnos_roles_servicio rs ON ti.rol_servicio_id = rs.id
        WHERE ti.instalacion_id = $1
        ORDER BY ti.created_at
        LIMIT 5
      `, [instalacionId]);
      
      console.log(`✅ Query de turnos funciona: ${testTurnos.rows.length} resultados`);
    } catch (error: any) {
      console.log(`❌ Error en query de turnos: ${error.message}`);
    }

    console.log('\n✅ Verificación y corrección de datos completada');

  } catch (error) {
    console.error('❌ Error verificando datos:', error);
    throw error;
  }
}

// Ejecutar verificación
checkAndFixData()
  .then(() => {
    console.log('\n🎉 Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });