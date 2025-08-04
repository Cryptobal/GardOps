const { config } = require('dotenv');
const path = require('path');
config({ path: path.join(__dirname, '.env.local') });

const { Pool } = require('pg');

// Configurar conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function debugPuestos() {
  try {
    console.log('🔍 Debug de puestos operativos para instalación A Test...');
    
    const instalacionId = '7e05a55d-8db6-4c20-b51c-509f09d69f74';
    
    // 1. Verificar puestos operativos
    console.log('\n1️⃣ Puestos operativos:');
    const puestos = await query(`
      SELECT 
        po.id,
        po.instalacion_id,
        po.rol_id,
        po.guardia_id,
        po.nombre_puesto,
        po.es_ppc,
        po.activo,
        po.creado_en,
        rs.nombre as rol_nombre,
        rs.dias_trabajo,
        rs.dias_descanso,
        rs.horas_turno,
        rs.hora_inicio,
        rs.hora_termino,
        g.nombre || ' ' || g.apellido_paterno as guardia_nombre
      FROM as_turnos_puestos_operativos po
      LEFT JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      LEFT JOIN guardias g ON po.guardia_id = g.id
      WHERE po.instalacion_id = $1
      ORDER BY po.creado_en
    `, [instalacionId]);
    
    console.log(`Total puestos: ${puestos.rows.length}`);
    puestos.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.nombre_puesto} - Rol: ${row.rol_nombre || 'NULL'} - PPC: ${row.es_ppc} - Activo: ${row.activo} - Guardia: ${row.guardia_nombre || 'NULL'}`);
    });
    
    // 2. Verificar roles de servicio
    console.log('\n2️⃣ Roles de servicio:');
    const roles = await query(`
      SELECT id, nombre, dias_trabajo, dias_descanso, horas_turno, hora_inicio, hora_termino, estado
      FROM as_turnos_roles_servicio
      ORDER BY nombre
    `);
    
    console.log(`Total roles: ${roles.rows.length}`);
    roles.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.nombre} - ${row.dias_trabajo}x${row.dias_descanso}x${row.horas_turno} - ${row.hora_inicio}-${row.hora_termino} - ${row.estado}`);
    });
    
    // 3. Verificar guardias
    console.log('\n3️⃣ Guardias:');
    const guardias = await query(`
      SELECT id, nombre, apellido_paterno, apellido_materno, rut
      FROM guardias
      ORDER BY nombre
    `);
    
    console.log(`Total guardias: ${guardias.rows.length}`);
    guardias.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.nombre} ${row.apellido_paterno} ${row.apellido_materno || ''} - ${row.rut}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

debugPuestos(); 