require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function activarDocumentos() {
  try {
    console.log('\n🔧 ACTIVANDO TODOS LOS DOCUMENTOS\n');
    
    const tenant = await pool.query(`SELECT id, nombre FROM tenants WHERE nombre = 'Gard'`);
    const tenantId = tenant.rows[0].id;
    
    console.log('🏢 Tenant:', tenant.rows[0].nombre);
    
    const result = await pool.query(`
      UPDATE documentos_tipos 
      SET activo = true 
      WHERE modulo = 'guardias' AND tenant_id = $1
      RETURNING nombre, activo
    `, [tenantId]);
    
    console.log(`\n✅ ${result.rows.length} documentos activados:\n`);
    result.rows.forEach((d, i) => {
      console.log(`  ${i + 1}. ${d.nombre} → Activo: ${d.activo}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

activarDocumentos();

