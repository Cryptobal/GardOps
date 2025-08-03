import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function verificarPuestosOperativos() {
  console.log('🔍 VERIFICANDO PUESTOS OPERATIVOS EN LA BASE DE DATOS');
  console.log('=====================================================\n');

  try {
    // 1. Verificar datos en as_turnos_puestos_operativos
    console.log('1️⃣ CONSULTANDO as_turnos_puestos_operativos...');
    
    const puestosResult = await query(`
      SELECT 
        po.id,
        po.instalacion_id,
        po.rol_id,
        po.guardia_id,
        po.nombre_puesto,
        po.es_ppc,
        po.creado_en,
        po.tenant_id,
        rs.nombre as rol_nombre,
        g.nombre || ' ' || g.apellido_paterno || ' ' || COALESCE(g.apellido_materno, '') as guardia_nombre
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      ORDER BY po.instalacion_id, po.nombre_puesto, po.creado_en
    `);
    
    console.log(`✅ Total puestos operativos encontrados: ${puestosResult.rows.length}`);
    
    if (puestosResult.rows.length > 0) {
      console.log('\n📋 Detalles de los puestos:');
      puestosResult.rows.forEach((puesto: any, index: number) => {
        console.log(`  ${index + 1}. ID: ${puesto.id}`);
        console.log(`     Instalación: ${puesto.instalacion_id}`);
        console.log(`     Rol: ${puesto.rol_nombre || 'Sin nombre'}`);
        console.log(`     Nombre puesto: ${puesto.nombre_puesto}`);
        console.log(`     Es PPC: ${puesto.es_ppc}`);
        console.log(`     Guardia asignado: ${puesto.guardia_id ? puesto.guardia_nombre : 'Ninguno'}`);
        console.log(`     Creado: ${puesto.creado_en}`);
        console.log('');
      });
    } else {
      console.log('❌ No se encontraron puestos operativos');
    }

    // 2. Verificar instalaciones disponibles
    console.log('2️⃣ CONSULTANDO INSTALACIONES...');
    
    const instalacionesResult = await query(`
      SELECT id, nombre, estado
      FROM instalaciones
      ORDER BY nombre
    `);
    
    console.log(`✅ Total instalaciones: ${instalacionesResult.rows.length}`);
    
    if (instalacionesResult.rows.length > 0) {
      console.log('\n📋 Instalaciones disponibles:');
      instalacionesResult.rows.forEach((instalacion: any) => {
        console.log(`  - ${instalacion.nombre} (${instalacion.id}) - Estado: ${instalacion.estado}`);
      });
    }

    // 3. Verificar roles de servicio
    console.log('\n3️⃣ CONSULTANDO ROLES DE SERVICIO...');
    
    const rolesResult = await query(`
      SELECT id, nombre, estado
      FROM as_turnos_roles_servicio
      ORDER BY nombre
    `);
    
    console.log(`✅ Total roles de servicio: ${rolesResult.rows.length}`);
    
    if (rolesResult.rows.length > 0) {
      console.log('\n📋 Roles de servicio disponibles:');
      rolesResult.rows.forEach((rol: any) => {
        console.log(`  - ${rol.nombre} (${rol.id}) - Estado: ${rol.estado}`);
      });
    }

    // 4. Verificar guardias disponibles
    console.log('\n4️⃣ CONSULTANDO GUARDIAS...');
    
    const guardiasResult = await query(`
      SELECT id, nombre, apellido_paterno, apellido_materno, rut
      FROM guardias
      ORDER BY nombre
      LIMIT 10
    `);
    
    console.log(`✅ Total guardias (mostrando primeros 10): ${guardiasResult.rows.length}`);
    
    if (guardiasResult.rows.length > 0) {
      console.log('\n📋 Primeros 10 guardias:');
      guardiasResult.rows.forEach((guardia: any) => {
        const nombreCompleto = `${guardia.nombre} ${guardia.apellido_paterno} ${guardia.apellido_materno || ''}`.trim();
        console.log(`  - ${nombreCompleto} (${guardia.rut})`);
      });
    }

    // 5. Verificar puestos por instalación específica (si hay datos)
    if (puestosResult.rows.length > 0) {
      const primeraInstalacion = puestosResult.rows[0].instalacion_id;
      console.log(`\n5️⃣ CONSULTANDO PUESTOS PARA INSTALACIÓN: ${primeraInstalacion}`);
      
      const puestosPorInstalacion = await query(`
        SELECT 
          po.id,
          po.instalacion_id,
          po.rol_id,
          po.guardia_id,
          po.nombre_puesto,
          po.es_ppc,
          po.creado_en,
          rs.nombre as rol_nombre,
          g.nombre || ' ' || g.apellido_paterno || ' ' || COALESCE(g.apellido_materno, '') as guardia_nombre
        FROM as_turnos_puestos_operativos po
        LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
        LEFT JOIN guardias g ON po.guardia_id = g.id
        WHERE po.instalacion_id = $1
        ORDER BY po.nombre_puesto, po.creado_en
      `, [primeraInstalacion]);
      
      console.log(`✅ Puestos para instalación ${primeraInstalacion}: ${puestosPorInstalacion.rows.length}`);
      
      if (puestosPorInstalacion.rows.length > 0) {
        console.log('\n📋 Puestos de esta instalación:');
        puestosPorInstalacion.rows.forEach((puesto: any, index: number) => {
          console.log(`  ${index + 1}. ${puesto.nombre_puesto} (${puesto.rol_nombre})`);
          console.log(`     Estado: ${puesto.es_ppc ? 'PPC' : 'Asignado'}`);
          console.log(`     Guardia: ${puesto.guardia_nombre || 'Sin asignar'}`);
          console.log('');
        });
      }
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

// Ejecutar la verificación
verificarPuestosOperativos()
  .then(() => {
    console.log('\n🎉 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  }); 