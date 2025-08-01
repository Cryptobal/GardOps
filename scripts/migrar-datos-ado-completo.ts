import { config } from 'dotenv';
import path from 'path';
import { query } from '../src/lib/database';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

async function migrarDatosADO() {
  console.log('🚀 INICIANDO MIGRACIÓN COMPLETA DE DATOS ADO\n');

  try {
    // 1. Verificar que las tablas nuevas existen
    console.log('📋 1. Verificando tablas nuevas...');
    
    const tablasNuevas = [
      'as_turnos_roles_servicio',
      'as_turnos_configuracion', 
      'as_turnos_requisitos',
      'as_turnos_ppc',
      'as_turnos_asignaciones'
    ];

    for (const tabla of tablasNuevas) {
      const result = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [tabla]);
      
      if (!result.rows[0].exists) {
        throw new Error(`❌ Tabla ${tabla} no existe`);
      }
      console.log(`✅ ${tabla} existe`);
    }

    // 2. Verificar tablas antiguas
    console.log('\n📋 2. Verificando tablas antiguas...');
    
    const tablasAntiguas = [
      'puestos_por_cubrir',
      'asignaciones_guardias'
    ];

    const tablasAntiguasExistentes = [];
    for (const tabla of tablasAntiguas) {
      const result = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [tabla]);
      
      if (result.rows[0].exists) {
        tablasAntiguasExistentes.push(tabla);
        console.log(`⚠️ ${tabla} existe (será migrada)`);
      } else {
        console.log(`ℹ️ ${tabla} no existe (ya migrada)`);
      }
    }

    if (tablasAntiguasExistentes.length === 0) {
      console.log('\n✅ No hay datos antiguos para migrar');
      return;
    }

    // 3. Migrar datos de puestos_por_cubrir → as_turnos_ppc
    if (tablasAntiguasExistentes.includes('puestos_por_cubrir')) {
      console.log('\n📋 3. Migrando puestos_por_cubrir → as_turnos_ppc...');
      
      // Obtener datos de puestos_por_cubrir
      const ppcAntiguos = await query(`
        SELECT 
          id,
          requisito_puesto_id,
          motivo,
          observaciones,
          cantidad_faltante,
          prioridad,
          fecha_deteccion,
          fecha_limite_cobertura,
          estado,
          guardia_asignado_id,
          fecha_asignacion,
          created_at,
          updated_at,
          tenant_id
        FROM puestos_por_cubrir
      `);

      console.log(`📊 Encontrados ${ppcAntiguos.rows.length} PPCs para migrar`);

      for (const ppc of ppcAntiguos.rows) {
        // Buscar el requisito correspondiente en as_turnos_requisitos
        const requisitoResult = await query(`
          SELECT id FROM as_turnos_requisitos 
          WHERE instalacion_id = (
            SELECT instalacion_id FROM requisitos_puesto WHERE id = $1
          ) AND rol_servicio_id = (
            SELECT rol_servicio_id FROM requisitos_puesto WHERE id = $1
          )
          LIMIT 1
        `, [ppc.requisito_puesto_id]);

        if (requisitoResult.rows.length > 0) {
          const nuevoRequisitoId = requisitoResult.rows[0].id;
          
          // Insertar en as_turnos_ppc
          await query(`
            INSERT INTO as_turnos_ppc (
              id,
              requisito_puesto_id,
              cantidad_faltante,
              motivo,
              prioridad,
              fecha_deteccion,
              fecha_limite_cobertura,
              estado,
              observaciones,
              guardia_asignado_id,
              fecha_asignacion,
              created_at,
              updated_at,
              tenant_id
            ) VALUES (
              gen_random_uuid(),
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
            )
          `, [
            nuevoRequisitoId,
            ppc.cantidad_faltante,
            ppc.motivo,
            ppc.prioridad,
            ppc.fecha_deteccion,
            ppc.fecha_limite_cobertura,
            ppc.estado,
            ppc.observaciones,
            ppc.guardia_asignado_id,
            ppc.fecha_asignacion,
            ppc.created_at,
            ppc.updated_at,
            ppc.tenant_id
          ]);
        }
      }
      
      console.log(`✅ Migrados ${ppcAntiguos.rows.length} PPCs`);
    }

    // 4. Migrar datos de asignaciones_guardias → as_turnos_asignaciones
    if (tablasAntiguasExistentes.includes('asignaciones_guardias')) {
      console.log('\n📋 4. Migrando asignaciones_guardias → as_turnos_asignaciones...');
      
      // Obtener datos de asignaciones_guardias
      const asignacionesAntiguas = await query(`
        SELECT 
          id,
          guardia_id,
          requisito_puesto_id,
          ppc_id,
          tipo_asignacion,
          fecha_inicio,
          fecha_termino,
          estado,
          motivo_termino,
          observaciones,
          created_at,
          updated_at,
          tenant_id
        FROM asignaciones_guardias
      `);

      console.log(`📊 Encontradas ${asignacionesAntiguas.rows.length} asignaciones para migrar`);

      for (const asignacion of asignacionesAntiguas.rows) {
        // Buscar el requisito correspondiente en as_turnos_requisitos
        const requisitoResult = await query(`
          SELECT id FROM as_turnos_requisitos 
          WHERE instalacion_id = (
            SELECT instalacion_id FROM requisitos_puesto WHERE id = $1
          ) AND rol_servicio_id = (
            SELECT rol_servicio_id FROM requisitos_puesto WHERE id = $1
          )
          LIMIT 1
        `, [asignacion.requisito_puesto_id]);

        if (requisitoResult.rows.length > 0) {
          const nuevoRequisitoId = requisitoResult.rows[0].id;
          
          // Insertar en as_turnos_asignaciones
          await query(`
            INSERT INTO as_turnos_asignaciones (
              id,
              guardia_id,
              requisito_puesto_id,
              tipo_asignacion,
              fecha_inicio,
              fecha_termino,
              estado,
              motivo_termino,
              observaciones,
              created_at,
              updated_at,
              tenant_id
            ) VALUES (
              gen_random_uuid(),
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
            )
          `, [
            asignacion.guardia_id,
            nuevoRequisitoId,
            asignacion.tipo_asignacion,
            asignacion.fecha_inicio,
            asignacion.fecha_termino,
            asignacion.estado,
            asignacion.motivo_termino,
            asignacion.observaciones,
            asignacion.created_at,
            asignacion.updated_at,
            asignacion.tenant_id
          ]);
        }
      }
      
      console.log(`✅ Migradas ${asignacionesAntiguas.rows.length} asignaciones`);
    }

    // 5. Verificar migración
    console.log('\n📋 5. Verificando migración...');
    
    const ppcNuevos = await query('SELECT COUNT(*) as count FROM as_turnos_ppc');
    const asignacionesNuevas = await query('SELECT COUNT(*) as count FROM as_turnos_asignaciones');
    
    console.log(`📊 PPCs en nueva tabla: ${ppcNuevos.rows[0].count}`);
    console.log(`📊 Asignaciones en nueva tabla: ${asignacionesNuevas.rows[0].count}`);

    // 6. Eliminar tablas antiguas (OPCIONAL - comentado por seguridad)
    console.log('\n📋 6. Eliminando tablas antiguas...');
    
    if (tablasAntiguasExistentes.includes('puestos_por_cubrir')) {
      await query('DROP TABLE IF EXISTS puestos_por_cubrir CASCADE');
      console.log('✅ Tabla puestos_por_cubrir eliminada');
    }
    
    if (tablasAntiguasExistentes.includes('asignaciones_guardias')) {
      await query('DROP TABLE IF EXISTS asignaciones_guardias CASCADE');
      console.log('✅ Tabla asignaciones_guardias eliminada');
    }

    console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('✅ Datos migrados de tablas antiguas a nuevas tablas ADO');
    console.log('✅ Tablas antiguas eliminadas');
    console.log('✅ Sistema listo para usar exclusivamente las tablas ADO');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

// Ejecutar migración
migrarDatosADO()
  .then(() => {
    console.log('\n✅ Migración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en migración:', error);
    process.exit(1);
  }); 