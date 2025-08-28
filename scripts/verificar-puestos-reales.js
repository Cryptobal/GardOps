const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function verificarPuestosReales() {
  console.log('🔍 VERIFICANDO PUESTOS REALES EN LA BASE DE DATOS');
  console.log('================================================\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const instalacionId = '0e8ba906-e64b-4d4d-a104-ba29f21f48a9';
    
    console.log('🔍 Instalación:', instalacionId);

    // 1. Verificar todos los puestos en la base de datos
    const todosPuestos = await pool.query(`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.es_ppc,
        po.activo,
        po.guardia_id,
        po.rol_id,
        po.instalacion_id,
        rs.nombre as rol_nombre
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      ORDER BY po.rol_id, po.nombre_puesto
    `);
    
    console.log(`📊 Total de puestos en la base de datos: ${todosPuestos.rows.length}\n`);
    
    todosPuestos.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   Nombre: ${row.nombre_puesto}`);
      console.log(`   Instalación: ${row.instalacion_id}`);
      console.log(`   Rol: ${row.rol_nombre} (${row.rol_id})`);
      console.log(`   PPC: ${row.es_ppc}`);
      console.log(`   Activo: ${row.activo}`);
      console.log(`   Guardia: ${row.guardia_id ? 'Sí' : 'No'}`);
      console.log('');
    });

    // 2. Verificar puestos de la instalación específica
    console.log('\n2️⃣ PUESTOS DE LA INSTALACIÓN ESPECÍFICA:');
    const puestosInstalacion = await pool.query(`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.es_ppc,
        po.activo,
        po.guardia_id,
        po.rol_id,
        rs.nombre as rol_nombre
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1
      ORDER BY po.rol_id, po.nombre_puesto
    `, [instalacionId]);
    
    console.log(`📊 Puestos de la instalación: ${puestosInstalacion.rows.length}\n`);
    
    puestosInstalacion.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   Nombre: ${row.nombre_puesto}`);
      console.log(`   Rol: ${row.rol_nombre} (${row.rol_id})`);
      console.log(`   PPC: ${row.es_ppc}`);
      console.log(`   Activo: ${row.activo}`);
      console.log(`   Guardia: ${row.guardia_id ? 'Sí' : 'No'}`);
      console.log('');
    });

    // 3. Verificar puestos con filtro activo
    console.log('\n3️⃣ PUESTOS CON FILTRO ACTIVO:');
    const puestosActivos = await pool.query(`
      SELECT 
        po.id,
        po.nombre_puesto,
        po.es_ppc,
        po.activo,
        po.guardia_id,
        po.rol_id,
        rs.nombre as rol_nombre
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1 AND (po.activo = true OR po.activo IS NULL)
      ORDER BY po.rol_id, po.nombre_puesto
    `, [instalacionId]);
    
    console.log(`📊 Puestos activos: ${puestosActivos.rows.length}\n`);
    
    puestosActivos.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   Nombre: ${row.nombre_puesto}`);
      console.log(`   Rol: ${row.rol_nombre} (${row.rol_id})`);
      console.log(`   PPC: ${row.es_ppc}`);
      console.log(`   Activo: ${row.activo}`);
      console.log(`   Guardia: ${row.guardia_id ? 'Sí' : 'No'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

verificarPuestosReales().then(() => {
  console.log('\n✅ Verificación completada');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
