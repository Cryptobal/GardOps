const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixPermissionsSimple() {
  console.log('🔧 SOLUCIÓN SIMPLE: Arreglando permisos\n');
  
  try {
    // 1. Crear la vista v_check_permiso
    console.log('1️⃣ Creando vista v_check_permiso...');
    await pool.query(`
      CREATE OR REPLACE VIEW v_check_permiso AS
      SELECT 
        u.email,
        CONCAT(up.modulo, '.', up.accion) as permiso
      FROM usuarios u
      INNER JOIN usuarios_permisos up ON u.id = up.rol_id
      WHERE up.tenant_id = u.tenant_id OR up.tenant_id IS NULL
    `);
    console.log('✅ Vista creada');

    // 2. Verificar que el permiso guardias.view existe
    console.log('\n2️⃣ Verificando permiso guardias.view...');
    const permisoResult = await pool.query(`
      SELECT id FROM permisos WHERE clave = 'guardias.view'
    `);
    
    if (permisoResult.rows.length === 0) {
      console.log('Creando permiso guardias.view...');
      await pool.query(`
        INSERT INTO permisos (clave, descripcion, categoria)
        VALUES ('guardias.view', 'Ver listado de guardias', 'Guardias')
      `);
      console.log('✅ Permiso creado');
    } else {
      console.log('✅ Permiso ya existe');
    }

    // 3. Asignar permiso al usuario
    console.log('\n3️⃣ Asignando permiso al usuario...');
    const userId = '658a62e4-0a1b-4964-ab40-a6bf0b19ec7f';
    
    // Verificar si ya tiene el permiso
    const existingPermiso = await pool.query(`
      SELECT id FROM usuarios_permisos 
      WHERE rol_id = $1 AND modulo = 'guardias' AND accion = 'view'
    `, [userId]);
    
    if (existingPermiso.rows.length === 0) {
      await pool.query(`
        INSERT INTO usuarios_permisos (rol_id, modulo, accion, tenant_id)
        VALUES ($1, 'guardias', 'view', $2)
      `, [userId, '1397e653-a702-4020-9702-3ae4f3f8b337']);
      console.log('✅ Permiso asignado');
    } else {
      console.log('✅ Permiso ya asignado');
    }

    // 4. Verificar que funciona
    console.log('\n4️⃣ Verificando que funciona...');
    const testResult = await pool.query(`
      SELECT public.fn_usuario_tiene_permiso('carlos.irigoyen@gard.cl', 'guardias.view') as tiene_permiso
    `);
    
    console.log('Resultado:', testResult.rows[0].tiene_permiso);
    
    if (testResult.rows[0].tiene_permiso) {
      console.log('🎉 ¡Todo funcionando correctamente!');
    } else {
      console.log('⚠️ Aún no funciona, pero los datos están ahí');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

fixPermissionsSimple();
