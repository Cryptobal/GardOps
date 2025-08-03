import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function limpiezaTotalModeloTurnos() {
  console.log('🧼 LIMPIEZA TOTAL DEL MODELO DE ASIGNACIÓN DE TURNOS\n');
  console.log('🎯 Objetivo: Centralizar todo en as_turnos_puestos_operativos\n');

  try {
    // PASO 1: Verificar estructura actual
    console.log('1️⃣ VERIFICANDO ESTRUCTURA ACTUAL...\n');
    
    const tablasActuales = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'as_turnos_%'
      ORDER BY table_name
    `);
    
    console.log('Tablas existentes:');
    tablasActuales.rows.forEach((row: any) => {
      console.log(`  - ${row.table_name}`);
    });

    // PASO 2: Crear nueva estructura de as_turnos_puestos_operativos
    console.log('\n2️⃣ CREANDO NUEVA ESTRUCTURA DE as_turnos_puestos_operativos...\n');
    
    // Eliminar tabla existente si existe
    await query('DROP TABLE IF EXISTS as_turnos_puestos_operativos CASCADE');
    
    // Crear nueva tabla central
    await query(`
      CREATE TABLE as_turnos_puestos_operativos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        instalacion_id UUID NOT NULL REFERENCES instalaciones(id),
        rol_id UUID NOT NULL REFERENCES as_turnos_roles_servicio(id),
        guardia_id UUID REFERENCES guardias(id),
        nombre_puesto VARCHAR(255) NOT NULL,
        es_ppc BOOLEAN NOT NULL DEFAULT true,
        creado_en TIMESTAMP DEFAULT NOW(),
        tenant_id UUID,
        CONSTRAINT fk_instalacion FOREIGN KEY (instalacion_id) REFERENCES instalaciones(id),
        CONSTRAINT fk_rol FOREIGN KEY (rol_id) REFERENCES as_turnos_roles_servicio(id),
        CONSTRAINT fk_guardia FOREIGN KEY (guardia_id) REFERENCES guardias(id)
      )
    `);
    
    console.log('✅ Nueva tabla as_turnos_puestos_operativos creada');

    // Crear índices para optimización
    await query('CREATE INDEX idx_puestos_operativos_instalacion ON as_turnos_puestos_operativos(instalacion_id)');
    await query('CREATE INDEX idx_puestos_operativos_rol ON as_turnos_puestos_operativos(rol_id)');
    await query('CREATE INDEX idx_puestos_operativos_guardia ON as_turnos_puestos_operativos(guardia_id)');
    await query('CREATE INDEX idx_puestos_operativos_ppc ON as_turnos_puestos_operativos(es_ppc)');
    
    console.log('✅ Índices creados');

    // PASO 3: Migrar datos existentes
    console.log('\n3️⃣ MIGRANDO DATOS EXISTENTES...\n');
    
    // Migrar desde as_turnos_configuracion
    console.log('📋 Migrando desde as_turnos_configuracion...');
    
    const configuraciones = await query(`
      SELECT 
        tc.instalacion_id,
        tc.rol_servicio_id::UUID as rol_servicio_id,
        tc.cantidad_guardias
      FROM as_turnos_configuracion tc
      WHERE tc.estado = 'Activo'
    `);
    
    let puestosCreados = 0;
    
          for (const config of configuraciones.rows) {
        const { instalacion_id, rol_servicio_id, cantidad_guardias } = config;
        
        // Crear puestos según la cantidad de guardias
        for (let i = 1; i <= cantidad_guardias; i++) {
          await query(`
            INSERT INTO as_turnos_puestos_operativos 
            (instalacion_id, rol_id, guardia_id, nombre_puesto, es_ppc)
            VALUES ($1, $2, NULL, $3, true)
          `, [instalacion_id, rol_servicio_id, `Puesto #${i}`]);
          
          puestosCreados++;
        }
      }
    
    console.log(`✅ ${puestosCreados} puestos creados desde configuraciones`);

    // PASO 4: Migrar asignaciones existentes
    console.log('\n4️⃣ MIGRANDO ASIGNACIONES EXISTENTES...\n');
    
    // Verificar si existe la tabla as_turnos_asignaciones
    const asignacionesExiste = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'as_turnos_asignaciones'
      )
    `);
    
    if (asignacionesExiste.rows[0].exists) {
      console.log('📋 Migrando asignaciones activas...');
      
      const asignaciones = await query(`
        SELECT 
          ta.guardia_id,
          tr.instalacion_id,
          tr.rol_servicio_id::UUID as rol_servicio_id
        FROM as_turnos_asignaciones ta
        INNER JOIN as_turnos_requisitos tr ON ta.requisito_puesto_id = tr.id
        WHERE ta.estado = 'Activa'
      `);
      
      let asignacionesMigradas = 0;
      
      for (const asig of asignaciones.rows) {
        // Buscar un puesto disponible para asignar
        const puestoDisponible = await query(`
          SELECT id 
          FROM as_turnos_puestos_operativos 
          WHERE instalacion_id = $1 
          AND rol_id = $2 
          AND es_ppc = true
          LIMIT 1
        `, [asig.instalacion_id, asig.rol_servicio_id]);
        
        if (puestoDisponible.rows.length > 0) {
          await query(`
            UPDATE as_turnos_puestos_operativos 
            SET guardia_id = $1, es_ppc = false
            WHERE id = $2
          `, [asig.guardia_id, puestoDisponible.rows[0].id]);
          
          asignacionesMigradas++;
        }
      }
      
      console.log(`✅ ${asignacionesMigradas} asignaciones migradas`);
    } else {
      console.log('ℹ️ Tabla as_turnos_asignaciones no existe, saltando migración');
    }

    // PASO 5: Eliminar tablas redundantes
    console.log('\n5️⃣ ELIMINANDO TABLAS REDUNDANTES...\n');
    
    const tablasAEliminar = [
      'as_turnos_configuracion',
      'as_turnos_requisitos', 
      'as_turnos_ppc',
      'as_turnos_asignaciones'
    ];
    
    for (const tabla of tablasAEliminar) {
      const existe = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tabla]);
      
      if (existe.rows[0].exists) {
        console.log(`🗑️ Eliminando ${tabla}...`);
        await query(`DROP TABLE IF EXISTS ${tabla} CASCADE`);
        console.log(`✅ ${tabla} eliminada`);
      } else {
        console.log(`ℹ️ ${tabla} no existe, saltando`);
      }
    }

    // PASO 6: Verificar resultado final
    console.log('\n6️⃣ VERIFICANDO RESULTADO FINAL...\n');
    
    const tablasFinales = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'as_turnos_%'
      ORDER BY table_name
    `);
    
    console.log('Tablas finales del sistema de turnos:');
    tablasFinales.rows.forEach((row: any) => {
      console.log(`  ✅ ${row.table_name}`);
    });

    // Estadísticas finales
    const estadisticas = await query(`
      SELECT 
        COUNT(*) as total_puestos,
        COUNT(CASE WHEN guardia_id IS NOT NULL THEN 1 END) as puestos_asignados,
        COUNT(CASE WHEN es_ppc = true THEN 1 END) as ppcs_activos
      FROM as_turnos_puestos_operativos
    `);
    
    const stats = estadisticas.rows[0];
    console.log('\n📊 ESTADÍSTICAS FINALES:');
    console.log(`  • Total de puestos: ${stats.total_puestos}`);
    console.log(`  • Puestos asignados: ${stats.puestos_asignados}`);
    console.log(`  • PPCs activos: ${stats.ppcs_activos}`);

    // PASO 7: Crear funciones de utilidad
    console.log('\n7️⃣ CREANDO FUNCIONES DE UTILIDAD...\n');
    
    // Función para crear puestos al crear un turno
    await query(`
      CREATE OR REPLACE FUNCTION crear_puestos_turno(
        p_instalacion_id UUID,
        p_rol_id UUID,
        p_cantidad_guardias INTEGER,
        p_tenant_id UUID DEFAULT NULL
      ) RETURNS VOID AS $$
      DECLARE
        i INTEGER;
      BEGIN
        FOR i IN 1..p_cantidad_guardias LOOP
          INSERT INTO as_turnos_puestos_operativos 
          (instalacion_id, rol_id, guardia_id, nombre_puesto, es_ppc, tenant_id)
          VALUES (p_instalacion_id, p_rol_id, NULL, 'Puesto #' || i, true, p_tenant_id);
        END LOOP;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Función para eliminar puestos al eliminar un turno
    await query(`
      CREATE OR REPLACE FUNCTION eliminar_puestos_turno(
        p_instalacion_id UUID,
        p_rol_id UUID
      ) RETURNS VOID AS $$
      BEGIN
        DELETE FROM as_turnos_puestos_operativos 
        WHERE instalacion_id = p_instalacion_id AND rol_id = p_rol_id;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Función para asignar guardia
    await query(`
      CREATE OR REPLACE FUNCTION asignar_guardia_puesto(
        p_puesto_id UUID,
        p_guardia_id UUID
      ) RETURNS VOID AS $$
      BEGIN
        UPDATE as_turnos_puestos_operativos
        SET guardia_id = p_guardia_id, es_ppc = false
        WHERE id = p_puesto_id;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Función para desasignar guardia
    await query(`
      CREATE OR REPLACE FUNCTION desasignar_guardia_puesto(
        p_puesto_id UUID
      ) RETURNS VOID AS $$
      BEGIN
        UPDATE as_turnos_puestos_operativos
        SET guardia_id = NULL, es_ppc = true
        WHERE id = p_puesto_id;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Funciones de utilidad creadas');

    console.log('\n🎉 ¡LIMPIEZA TOTAL COMPLETADA!');
    console.log('\n📋 RESUMEN DE CAMBIOS:');
    console.log('  ✅ Eliminadas tablas redundantes');
    console.log('  ✅ Centralizada lógica en as_turnos_puestos_operativos');
    console.log('  ✅ Migrados datos existentes');
    console.log('  ✅ Creadas funciones de utilidad');
    console.log('  ✅ Sistema simplificado y optimizado');

  } catch (error) {
    console.error('❌ Error en limpieza total:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  limpiezaTotalModeloTurnos()
    .then(() => {
      console.log('\n✅ Proceso completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en el proceso:', error);
      process.exit(1);
    });
}

export { limpiezaTotalModeloTurnos }; 