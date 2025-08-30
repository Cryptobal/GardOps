require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkPermissionsStructure() {
  console.log('🔍 Verificando estructura de permisos...');

  try {
    // 1. Verificar estructura de tabla permisos
    console.log('\n1. Estructura de tabla permisos:');
    const { rows: permCols } = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'permisos' 
      ORDER BY ordinal_position
    `;
    console.log(permCols);

    // 2. Verificar estructura de tabla roles
    console.log('\n2. Estructura de tabla roles:');
    const { rows: roleCols } = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'roles' 
      ORDER BY ordinal_position
    `;
    console.log(roleCols);

    // 3. Verificar estructura de tabla roles_permisos
    console.log('\n3. Estructura de tabla roles_permisos:');
    const { rows: rpCols } = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'roles_permisos' 
      ORDER BY ordinal_position
    `;
    console.log(rpCols);

    // 4. Verificar datos en permisos
    console.log('\n4. Datos en tabla permisos:');
    const { rows: permData } = await sql`
      SELECT * FROM public.permisos LIMIT 5
    `;
    console.log(permData);

    // 5. Verificar datos en roles
    console.log('\n5. Datos en tabla roles:');
    const { rows: roleData } = await sql`
      SELECT * FROM public.roles LIMIT 5
    `;
    console.log(roleData);

    // 6. Verificar datos en roles_permisos
    console.log('\n6. Datos en tabla roles_permisos:');
    const { rows: rpData } = await sql`
      SELECT * FROM public.roles_permisos LIMIT 5
    `;
    console.log(rpData);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPermissionsStructure();
