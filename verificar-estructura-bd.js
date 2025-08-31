require('dotenv').config({ path: '.env.production' });
process.env.POSTGRES_URL = process.env.DATABASE_URL;

const { sql } = require('@vercel/postgres');

async function verificarEstructura() {
  console.log('🔍 Verificando estructura de la base de datos...\n');

  try {
    // Verificar estructura de la tabla roles
    console.log('1. Estructura de la tabla roles:');
    const rolesStructure = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'roles' 
      ORDER BY ordinal_position
    `;
    
    rolesStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    console.log('');

    // Verificar estructura de la tabla permisos
    console.log('2. Estructura de la tabla permisos:');
    const permisosStructure = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'permisos' 
      ORDER BY ordinal_position
    `;
    
    permisosStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    console.log('');

    // Verificar algunos datos de ejemplo
    console.log('3. Datos de ejemplo en roles:');
    const rolesData = await sql`
      SELECT * FROM roles LIMIT 3
    `;
    
    rolesData.rows.forEach(rol => {
      console.log(`   - ${JSON.stringify(rol)}`);
    });
    console.log('');

    console.log('4. Datos de ejemplo en permisos:');
    const permisosData = await sql`
      SELECT * FROM permisos WHERE clave LIKE 'central_monitoring.%' LIMIT 5
    `;
    
    permisosData.rows.forEach(permiso => {
      console.log(`   - ${JSON.stringify(permiso)}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

verificarEstructura();