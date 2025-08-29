const { sql } = require('@vercel/postgres');

async function debugCentralMonitoring() {
  try {
    console.log('🔍 Debugging Central Monitoring...\n');

    // 1. Verificar tabla central_llamados
    console.log('1. Verificando tabla central_llamados...');
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'central_llamados'
      );
    `;
    console.log('Tabla central_llamados existe:', tableCheck.rows[0].exists);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ La tabla central_llamados no existe. Ejecuta el script create-central-monitoring.sql');
      return;
    }

    // 2. Verificar estructura de la tabla
    console.log('\n2. Verificando estructura de la tabla...');
    const structure = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'central_llamados'
      ORDER BY ordinal_position;
    `;
    console.log('Columnas de central_llamados:');
    structure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // 3. Verificar permisos
    console.log('\n3. Verificando permisos...');
    const permissions = await sql`
      SELECT code, description 
      FROM rbac_permisos 
      WHERE code LIKE 'central_monitoring.%';
    `;
    console.log('Permisos de central_monitoring:');
    permissions.rows.forEach(row => {
      console.log(`  - ${row.code}: ${row.description}`);
    });

    // 4. Verificar roles
    console.log('\n4. Verificando roles...');
    const roles = await sql`
      SELECT code, name, description 
      FROM rbac_roles 
      WHERE code = 'central_monitoring.operator';
    `;
    console.log('Roles de central_monitoring:');
    roles.rows.forEach(row => {
      console.log(`  - ${row.code}: ${row.name} - ${row.description}`);
    });

    // 5. Verificar datos de ejemplo
    console.log('\n5. Verificando datos de ejemplo...');
    const dataCount = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 'exitoso' THEN 1 END) as exitosos
      FROM central_llamados;
    `;
    console.log('Datos en central_llamados:', dataCount.rows[0]);

    // 6. Mostrar algunos ejemplos
    if (dataCount.rows[0].total > 0) {
      console.log('\n6. Ejemplos de datos:');
      const examples = await sql`
        SELECT id, instalacion_id, programado_para, estado, contacto_nombre
        FROM central_llamados 
        ORDER BY programado_para 
        LIMIT 3;
      `;
      examples.rows.forEach(row => {
        console.log(`  - ID: ${row.id}, Estado: ${row.estado}, Contacto: ${row.contacto_nombre}`);
      });
    } else {
      console.log('\n6. No hay datos en central_llamados. Ejecuta generate-test-data.sql');
    }

    // 7. Verificar instalaciones
    console.log('\n7. Verificando instalaciones...');
    const installations = await sql`
      SELECT COUNT(*) as total FROM instalaciones;
    `;
    console.log('Total de instalaciones:', installations.rows[0].total);

    if (installations.rows[0].total === 0) {
      console.log('❌ No hay instalaciones. Necesitas crear instalaciones primero.');
    }

    console.log('\n✅ Debug completado');

  } catch (error) {
    console.error('❌ Error en debug:', error);
  }
}

debugCentralMonitoring();
