import { query } from '@/lib/database';

async function main() {
  try {
    console.log('🔍 Verificando estructura de tabla tenants...\n');

    // Verificar estructura de tenants
    console.log('📋 Estructura de tabla tenants:');
    const tenantColumns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' 
      ORDER BY ordinal_position
    `);
    if (tenantColumns.rows && Array.isArray(tenantColumns.rows)) {
      tenantColumns.rows.forEach((col: any) => console.log(`   ${col.column_name}: ${col.data_type}`));
    } else {
      console.log('   Error: respuesta no es array');
    }

    // Verificar datos de ejemplo
    console.log('\n📊 Datos de ejemplo:');
    const tenantCount = await query('SELECT COUNT(*) as count FROM tenants');
    console.log(`   Tenants: ${tenantCount.rows[0]?.count || 'Error'}`);

    // Verificar algunos registros
    const tenants = await query('SELECT * FROM tenants LIMIT 3');
    if (tenants.rows && tenants.rows.length > 0) {
      console.log('\n👥 Tenants existentes:');
      tenants.rows.forEach((tenant: any, index: number) => {
        console.log(`   ${index + 1}. ${tenant.nombre || tenant.slug || 'Sin nombre'} (${tenant.id})`);
      });
    } else {
      console.log('\n❌ No hay tenants en la base de datos');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
