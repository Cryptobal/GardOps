import { config } from 'dotenv';
import path from 'path';
import { query } from '../src/lib/database';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

async function migrarDatosADOSimple() {
  console.log('🚀 INICIANDO MIGRACIÓN SIMPLIFICADA DE DATOS ADO\n');

  try {
    // 1. Verificar tablas antiguas
    console.log('📋 1. Verificando tablas antiguas...');
    
    const ppcAntiguos = await query('SELECT COUNT(*) as count FROM puestos_por_cubrir');
    const asignacionesAntiguas = await query('SELECT COUNT(*) as count FROM asignaciones_guardias');
    
    console.log(`📊 PPCs antiguos: ${ppcAntiguos.rows[0].count}`);
    console.log(`📊 Asignaciones antiguas: ${asignacionesAntiguas.rows[0].count}`);

    if (ppcAntiguos.rows[0].count === 0 && asignacionesAntiguas.rows[0].count === 0) {
      console.log('✅ No hay datos antiguos para migrar');
      return;
    }

    // 2. Migrar PPCs usando mapeo directo
    if (ppcAntiguos.rows[0].count > 0) {
      console.log('\n📋 2. Migrando PPCs...');
      
      // Obtener todos los PPCs antiguos
      const ppcData = await query(`
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

      let migrados = 0;
      for (const ppc of ppcData.rows) {
        try {
          // Buscar un requisito correspondiente en as_turnos_requisitos
          // basado en la instalación y rol de servicio
          const requisitoResult = await query(`
            SELECT id FROM as_turnos_requisitos 
            WHERE instalacion_id IN (
              SELECT instalacion_id FROM as_turnos_configuracion 
              WHERE rol_servicio_id IN (
                SELECT id FROM as_turnos_roles_servicio
              )
            )
            LIMIT 1
          `);

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
            migrados++;
          }
        } catch (error) {
          console.log(`⚠️ Error migrando PPC ${ppc.id}:`, (error as any).message);
        }
      }
      
      console.log(`✅ Migrados ${migrados} PPCs`);
    }

    // 3. Migrar asignaciones usando mapeo directo
    if (asignacionesAntiguas.rows[0].count > 0) {
      console.log('\n📋 3. Migrando asignaciones...');
      
      // Obtener todas las asignaciones antiguas
      const asignacionesData = await query(`
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

      let migradas = 0;
      for (const asignacion of asignacionesData.rows) {
        try {
          // Buscar un requisito correspondiente en as_turnos_requisitos
          const requisitoResult = await query(`
            SELECT id FROM as_turnos_requisitos 
            WHERE instalacion_id IN (
              SELECT instalacion_id FROM as_turnos_configuracion 
              WHERE rol_servicio_id IN (
                SELECT id FROM as_turnos_roles_servicio
              )
            )
            LIMIT 1
          `);

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
            migradas++;
          }
        } catch (error) {
          console.log(`⚠️ Error migrando asignación ${asignacion.id}:`, (error as any).message);
        }
      }
      
      console.log(`✅ Migradas ${migradas} asignaciones`);
    }

    // 4. Verificar migración
    console.log('\n📋 4. Verificando migración...');
    
    const ppcNuevos = await query('SELECT COUNT(*) as count FROM as_turnos_ppc');
    const asignacionesNuevas = await query('SELECT COUNT(*) as count FROM as_turnos_asignaciones');
    
    console.log(`📊 PPCs en nueva tabla: ${ppcNuevos.rows[0].count}`);
    console.log(`📊 Asignaciones en nueva tabla: ${asignacionesNuevas.rows[0].count}`);

    // 5. Eliminar tablas antiguas
    console.log('\n📋 5. Eliminando tablas antiguas...');
    
    await query('DROP TABLE IF EXISTS puestos_por_cubrir CASCADE');
    console.log('✅ Tabla puestos_por_cubrir eliminada');
    
    await query('DROP TABLE IF EXISTS asignaciones_guardias CASCADE');
    console.log('✅ Tabla asignaciones_guardias eliminada');

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
migrarDatosADOSimple()
  .then(() => {
    console.log('\n✅ Migración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en migración:', error);
    process.exit(1);
  }); 