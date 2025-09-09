import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function verificarPPCDatos() {
  console.log('🔍 VERIFICACIÓN DE DATOS PPC');
  console.log('=============================\n');

  try {
    // 1. Verificar estructura de la tabla
    console.log('📋 1. VERIFICANDO ESTRUCTURA DE as_turnos_puestos_operativos...');
    
    const estructura = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'as_turnos_puestos_operativos'
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas encontradas:');
    estructura.rows.forEach((col: any) => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });

    // 2. Verificar datos existentes (sin usar columna estado que no existe)
    console.log('\n📊 2. VERIFICANDO DATOS EXISTENTES...');
    
    const datosExistentes = await query(`
      SELECT 
        COUNT(*) as total_ppc,
        COUNT(CASE WHEN guardia_id IS NULL THEN 1 END) as sin_guardia,
        COUNT(CASE WHEN guardia_id IS NOT NULL THEN 1 END) as con_guardia
      FROM as_turnos_puestos_operativos
      WHERE es_ppc = true
    `);
    
    const stats = datosExistentes.rows[0];
    console.log(`Total PPC: ${stats.total_ppc}`);
    console.log(`Sin guardia asignado: ${stats.sin_guardia}`);
    console.log(`Con guardia asignado: ${stats.con_guardia}`);

    // 3. Verificar instalaciones disponibles
    console.log('\n🏢 3. VERIFICANDO INSTALACIONES DISPONIBLES...');
    
    const instalaciones = await query(`
      SELECT id, nombre
      FROM instalaciones
      ORDER BY nombre
    `);
    
    console.log(`Total instalaciones: ${instalaciones.rows.length}`);
    if (instalaciones.rows.length > 0) {
      console.log('Instalaciones disponibles:');
      instalaciones.rows.forEach((inst: any) => {
        console.log(`  - ${inst.nombre} (${inst.id})`);
      });
    }

    // 4. Verificar roles de servicio disponibles
    console.log('\n👥 4. VERIFICANDO ROLES DE SERVICIO...');
    
    const roles = await query(`
      SELECT id, nombre, hora_inicio, hora_termino
      FROM as_turnos_roles_servicio
      ORDER BY nombre
    `);
    
    console.log(`Total roles: ${roles.rows.length}`);
    if (roles.rows.length > 0) {
      console.log('Roles disponibles:');
      roles.rows.forEach((rol: any) => {
        console.log(`  - ${rol.nombre} (${rol.hora_inicio} - ${rol.hora_termino})`);
      });
    }

    // 5. Verificar guardias disponibles
    console.log('\n👮 5. VERIFICANDO GUARDIAS DISPONIBLES...');
    
    const guardias = await query(`
      SELECT id, nombre, apellido_paterno, rut
      FROM guardias
      ORDER BY nombre
      LIMIT 10
    `);
    
    console.log(`Total guardias: ${guardias.rows.length}`);
    if (guardias.rows.length > 0) {
      console.log('Primeros 10 guardias:');
      guardias.rows.forEach((guardia: any) => {
        console.log(`  - ${guardia.nombre} ${guardia.apellido_paterno} (${guardia.rut})`);
      });
    }

    // 6. Si no hay datos, generar datos de prueba
    if (parseInt(stats.total_ppc) === 0) {
      console.log('\n⚠️ NO HAY DATOS PPC. GENERANDO DATOS DE PRUEBA...');
      
      if (instalaciones.rows.length === 0) {
        console.log('❌ No hay instalaciones disponibles. Creando instalación de prueba...');
        await query(`
          INSERT INTO instalaciones (id, nombre, direccion, tipo, estado)
          VALUES (gen_random_uuid(), 'Instalación de Prueba', 'Dirección de prueba', 'Comercial', 'Activo')
        `);
      }
      
      if (roles.rows.length === 0) {
        console.log('❌ No hay roles de servicio disponibles. Creando roles de prueba...');
        await query(`
          INSERT INTO as_turnos_roles_servicio (id, nombre, hora_inicio, hora_termino, guardias_requeridos)
          VALUES 
            (gen_random_uuid(), 'Guardia Diurno', '08:00', '20:00', 1),
            (gen_random_uuid(), 'Guardia Nocturno', '20:00', '08:00', 1),
            (gen_random_uuid(), 'Supervisor', '08:00', '18:00', 1)
        `);
      }
      
      // Obtener instalación y roles para crear PPC
      const instalacion = await query('SELECT id FROM instalaciones LIMIT 1');
      const rolesDisponibles = await query('SELECT id FROM as_turnos_roles_servicio LIMIT 3');
      
      if (instalacion.rows.length > 0 && rolesDisponibles.rows.length > 0) {
        console.log('✅ Creando PPC de prueba...');
        
        for (let i = 0; i < 5; i++) {
          const rolId = rolesDisponibles.rows[i % rolesDisponibles.rows.length].id;
          const instalacionId = instalacion.rows[0].id;
          
          await query(`
            INSERT INTO as_turnos_puestos_operativos (
              id, instalacion_id, rol_id, nombre_puesto, es_ppc, creado_en
            )
            VALUES (
              gen_random_uuid(), 
              $1, 
              $2, 
              $3, 
              true, 
              NOW() - INTERVAL '${i} days'
            )
          `, [instalacionId, rolId, `PPC de prueba ${i + 1}`]);
        }
        
        console.log('✅ 5 PPC de prueba creados exitosamente');
      }
    }

    // 7. Mostrar PPC actuales
    console.log('\n📋 6. PPC ACTUALES EN EL SISTEMA...');
    
    const ppcsActuales = await query(`
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
      LIMIT 10
    `);
    
    console.log(`Total PPC encontrados: ${ppcsActuales.rows.length}`);
    if (ppcsActuales.rows.length > 0) {
      console.log('Últimos PPC:');
      ppcsActuales.rows.forEach((ppc: any, index: number) => {
        console.log(`  ${index + 1}. ${ppc.nombre_puesto} - ${ppc.instalacion} - ${ppc.rol} - ${ppc.estado}`);
        if (ppc.guardia_asignado) {
          console.log(`     Guardia: ${ppc.guardia_asignado}`);
        }
      });
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

verificarPPCDatos().then(() => {
  console.log('\n🎯 Verificación de datos PPC finalizada');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
}); 