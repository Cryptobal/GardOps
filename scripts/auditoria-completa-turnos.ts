import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function auditoriaCompletaTurnos() {
  console.log('🔍 AUDITORÍA COMPLETA DEL SISTEMA DE TURNOS');
  console.log('===========================================\n');

  try {
    // 1. Verificar tablas existentes
    console.log('1️⃣ TABLAS EXISTENTES:');
    const tablas = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'as_turnos_%'
      ORDER BY table_name
    `);
    
    tablas.rows.forEach((row: any) => console.log(`  ✅ ${row.table_name}`));

    // 2. Verificar datos en as_turnos_puestos_operativos
    console.log('\n2️⃣ DATOS EN as_turnos_puestos_operativos:');
    const puestos = await query(`
      SELECT 
        id,
        instalacion_id,
        rol_id,
        guardia_id,
        nombre_puesto,
        es_ppc,
        activo,
        creado_en,
        tipo_puesto_id
      FROM as_turnos_puestos_operativos
      ORDER BY instalacion_id, rol_id, nombre_puesto
    `);
    
    console.log(`Total puestos: ${puestos.rows.length}`);
    puestos.rows.forEach((row: any) => {
      console.log(`  - ${row.nombre_puesto} (Inst: ${row.instalacion_id.substring(0,8)}..., Rol: ${row.rol_id.substring(0,8)}..., PPC: ${row.es_ppc}, Activo: ${row.activo})`);
    });

    // 3. Verificar instalación A-Test33 específicamente
    console.log('\n3️⃣ INSTALACIÓN A-TEST33:');
    const instalacion = await query(`
      SELECT id, nombre FROM instalaciones WHERE nombre LIKE '%A TEST 33%'
    `);
    
    if (instalacion.rows.length > 0) {
      const instId = instalacion.rows[0].id;
      console.log(`Instalación encontrada: ${instalacion.rows[0].nombre} (ID: ${instId})`);
      
      const puestosInst = await query(`
        SELECT 
          po.id,
          po.nombre_puesto,
          po.es_ppc,
          po.activo,
          rs.nombre as rol_nombre
        FROM as_turnos_puestos_operativos po
        LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
        WHERE po.instalacion_id = $1
        ORDER BY po.nombre_puesto
      `, [instId]);
      
      console.log(`Puestos en A-Test33: ${puestosInst.rows.length}`);
      puestosInst.rows.forEach((row: any) => {
        console.log(`  - ${row.nombre_puesto} (${row.rol_nombre}) - PPC: ${row.es_ppc}, Activo: ${row.activo}`);
      });
    } else {
      console.log('❌ Instalación A-Test33 no encontrada');
    }

    // 4. Verificar roles de servicio
    console.log('\n4️⃣ ROLES DE SERVICIO:');
    const roles = await query(`
      SELECT id, nombre, estado FROM as_turnos_roles_servicio ORDER BY nombre
    `);
    
    console.log(`Total roles: ${roles.rows.length}`);
    roles.rows.forEach((row: any) => {
      console.log(`  - ${row.nombre} (Estado: ${row.estado})`);
    });

    // 5. Verificar endpoint de turnos
    console.log('\n5️⃣ VERIFICANDO ENDPOINT DE TURNOS:');
    const turnosEndpoint = await query(`
      SELECT 
        rs.id as rol_id,
        rs.nombre as rol_nombre,
        COUNT(*) as total_puestos,
        COUNT(CASE WHEN po.guardia_id IS NOT NULL THEN 1 END) as guardias_asignados,
        COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as ppc_pendientes
      FROM as_turnos_puestos_operativos po
      INNER JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1 AND po.activo = true
      GROUP BY rs.id, rs.nombre
      ORDER BY rs.nombre
    `, [instalacion.rows[0]?.id || '00000000-0000-0000-0000-000000000000']);
    
    console.log(`Turnos encontrados por endpoint: ${turnosEndpoint.rows.length}`);
    turnosEndpoint.rows.forEach((row: any) => {
      console.log(`  - ${row.rol_nombre}: ${row.total_puestos} puestos, ${row.guardias_asignados} asignados, ${row.ppc_pendientes} PPC`);
    });

    // 6. Verificar página de instalaciones
    console.log('\n6️⃣ VERIFICANDO PÁGINA DE INSTALACIONES:');
    const instalacionesPage = await query(`
      SELECT 
        i.id,
        i.nombre,
        COUNT(DISTINCT po.rol_id) as turnos_activos,
        COUNT(po.id) as total_puestos,
        COUNT(CASE WHEN po.es_ppc = true THEN 1 END) as ppc_activos
      FROM instalaciones i
      LEFT JOIN as_turnos_puestos_operativos po ON i.id = po.instalacion_id AND po.activo = true
      WHERE i.nombre LIKE '%A TEST%'
      GROUP BY i.id, i.nombre
      ORDER BY i.nombre
    `);
    
    console.log(`Instalaciones A-Test encontradas: ${instalacionesPage.rows.length}`);
    instalacionesPage.rows.forEach((row: any) => {
      console.log(`  - ${row.nombre}: ${row.turnos_activos} turnos, ${row.total_puestos} puestos, ${row.ppc_activos} PPC`);
    });

  } catch (error) {
    console.error('❌ Error en auditoría:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  auditoriaCompletaTurnos().then(() => {
    console.log('\n✅ Auditoría completada');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { auditoriaCompletaTurnos }; 