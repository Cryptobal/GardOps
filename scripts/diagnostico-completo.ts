import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function diagnosticoCompleto() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 DIAGNÓSTICO COMPLETO DE LA BASE DE DATOS');
    console.log('=============================================\n');

    // 1. Verificar conexión
    console.log('1️⃣ Verificando conexión...');
    const result = await client.query('SELECT NOW() as tiempo, current_database() as db');
    console.log('✅ Conexión exitosa:', result.rows[0]);
    console.log('');

    // 2. Verificar si existe la tabla guardias
    console.log('2️⃣ Verificando tabla guardias...');
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'guardias'
      );
    `);
    console.log('Tabla guardias existe:', tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      const tableInfo = await client.query(`
        SELECT 
          table_name,
          table_type,
          is_insertable_into
        FROM information_schema.tables 
        WHERE table_name = 'guardias';
      `);
      console.log('Información de la tabla:', tableInfo.rows[0]);
    }
    console.log('');

    // 3. Verificar estructura de la tabla guardias
    if (tableExists.rows[0].exists) {
      console.log('3️⃣ Estructura de la tabla guardias...');
      const columns = await client.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'guardias'
        ORDER BY ordinal_position;
      `);
      console.log('Columnas encontradas:', columns.rows.length);
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      console.log('');
    }

    // 4. Verificar si existe guardias_temp
    console.log('4️⃣ Verificando si existe guardias_temp...');
    const tempTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'guardias_temp'
      );
    `);
    console.log('Tabla guardias_temp existe:', tempTableExists.rows[0].exists);
    console.log('');

    // 5. Verificar triggers en guardias
    console.log('5️⃣ Verificando triggers en guardias...');
    const triggers = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_statement
      FROM information_schema.triggers 
      WHERE event_object_table = 'guardias';
    `);
    console.log('Triggers encontrados:', triggers.rows.length);
    triggers.rows.forEach(trigger => {
      console.log(`  - ${trigger.trigger_name}: ${trigger.event_manipulation}`);
    });
    console.log('');

    // 6. Verificar reglas en guardias
    console.log('6️⃣ Verificando reglas en guardias...');
    const rules = await client.query(`
      SELECT 
        rule_name,
        definition
      FROM pg_rewrite 
      WHERE ev_class = 'guardias'::regclass;
    `);
    console.log('Reglas encontradas:', rules.rows.length);
    rules.rows.forEach(rule => {
      console.log(`  - ${rule.rule_name}: ${rule.definition}`);
    });
    console.log('');

    // 7. Verificar vistas que referencien guardias
    console.log('7️⃣ Verificando vistas que referencien guardias...');
    const views = await client.query(`
      SELECT 
        viewname,
        definition
      FROM pg_views 
      WHERE definition LIKE '%guardias%';
    `);
    console.log('Vistas encontradas:', views.rows.length);
    views.rows.forEach(view => {
      console.log(`  - ${view.viewname}`);
    });
    console.log('');

    // 8. Intentar un INSERT de prueba simple
    console.log('8️⃣ Probando INSERT simple...');
    try {
      const testInsert = await client.query(`
        INSERT INTO guardias (rut, nombre, email, tenant_id, activo, created_at, updated_at)
        VALUES ('TEST-123', 'Test User', 'test@test.com', '00000000-0000-0000-0000-000000000000', true, NOW(), NOW())
        RETURNING id;
      `);
      console.log('✅ INSERT de prueba exitoso, ID:', testInsert.rows[0].id);
      
      // Limpiar el registro de prueba
      await client.query('DELETE FROM guardias WHERE rut = $1', ['TEST-123']);
      console.log('🧹 Registro de prueba eliminado');
      
    } catch (error: any) {
      console.log('❌ Error en INSERT de prueba:', error.message);
      console.log('Código de error:', error.code);
      console.log('Detalle:', error.detail);
      console.log('Hint:', error.hint);
    }
    console.log('');

    // 9. Verificar permisos del usuario de la base de datos
    console.log('9️⃣ Verificando permisos del usuario actual...');
    const currentUser = await client.query('SELECT current_user, session_user;');
    console.log('Usuario actual:', currentUser.rows[0]);
    
    const permissions = await client.query(`
      SELECT 
        grantee,
        privilege_type,
        is_grantable
      FROM information_schema.role_table_grants 
      WHERE table_name = 'guardias';
    `);
    console.log('Permisos en guardias:', permissions.rows.length);
    permissions.rows.forEach(perm => {
      console.log(`  - ${perm.grantee}: ${perm.privilege_type} (grantable: ${perm.is_grantable})`);
    });

  } catch (error: any) {
    console.error('❌ Error durante el diagnóstico:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

diagnosticoCompleto().catch(console.error);
