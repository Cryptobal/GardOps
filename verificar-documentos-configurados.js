require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function verificarDocumentos() {
  try {
    console.log('\n🔍 VERIFICANDO DOCUMENTOS CONFIGURADOS\n');
    
    // 1. Obtener tenant
    const tenant = await pool.query(`SELECT id, nombre FROM tenants WHERE nombre = 'Gard'`);
    if (tenant.rows.length === 0) {
      console.error('❌ Tenant "Gard" no encontrado');
      await pool.end();
      return;
    }
    
    console.log('🏢 Tenant:', tenant.rows[0].nombre, '→ ID:', tenant.rows[0].id);
    const tenantId = tenant.rows[0].id;
    
    // 2. Obtener documentos configurados
    const docs = await pool.query(`
      SELECT 
        id, 
        nombre, 
        modulo, 
        requiere_vencimiento, 
        dias_antes_alarma, 
        activo,
        creado_en
      FROM documentos_tipos 
      WHERE modulo = 'guardias' AND tenant_id = $1
      ORDER BY 
        CASE 
          WHEN nombre LIKE '%Carnet%' THEN 1
          WHEN nombre LIKE '%OS10%' THEN 2
          ELSE 99
        END,
        nombre
    `, [tenantId]);
    
    console.log(`\n📄 DOCUMENTOS CONFIGURADOS: ${docs.rows.length} encontrados\n`);
    
    if (docs.rows.length === 0) {
      console.log('⚠️  NO HAY DOCUMENTOS CONFIGURADOS EN LA BASE DE DATOS');
      console.log('💡 Solución: Ve a Configuración → Postulaciones → Documentos');
      console.log('   y agrega los documentos necesarios.');
    } else {
      docs.rows.forEach((d, i) => {
        console.log(`${i + 1}. ${d.nombre}`);
        console.log(`   └─ Activo: ${d.activo}`);
        console.log(`   └─ Requiere Vencimiento: ${d.requiere_vencimiento}`);
        console.log(`   └─ Días antes alarma: ${d.dias_antes_alarma || 'N/A'}`);
        console.log('');
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verificarDocumentos();

