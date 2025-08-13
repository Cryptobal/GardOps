#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(__dirname, '../.env.local') });
import { sql } from '@vercel/postgres';

async function testApiPermisos() {
  console.log('🧪 Probando API de permisos de roles...\n');

  try {
    // Obtener un rol con permisos
    const rolConPermisos = await sql`
      SELECT r.id, r.nombre, COUNT(rp.permiso_id) as total_permisos
      FROM roles r
      LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
      WHERE r.nombre LIKE '%Platform Admin%'
      GROUP BY r.id, r.nombre
      ORDER BY total_permisos DESC
      LIMIT 1
    `;

    if (rolConPermisos.rows.length === 0) {
      console.log('❌ No se encontró ningún rol Platform Admin');
      return;
    }

    const rol = rolConPermisos.rows[0];
    console.log(`🎯 Probando rol: ${rol.nombre}`);
    console.log(`   ID: ${rol.id}`);
    console.log(`   Permisos asignados: ${rol.total_permisos}`);

    // Obtener los permisos directamente de la base de datos
    const permisos = await sql`
      SELECT 
        p.id,
        p.clave,
        p.descripcion
      FROM roles_permisos rp
      JOIN permisos p ON p.id = rp.permiso_id
      WHERE rp.rol_id = ${rol.id}
      ORDER BY p.clave
      LIMIT 10
    `;

    console.log('\n📋 Primeros 10 permisos del rol:');
    for (const permiso of permisos.rows) {
      console.log(`   • ${permiso.clave} - ${permiso.descripcion || 'Sin descripción'}`);
    }

    // Verificar la estructura de datos que espera el frontend
    console.log('\n🔍 Estructura de datos esperada por el frontend:');
    console.log('   - items: Array<{id: string, clave: string, descripcion: string}>');
    
    const estructuraEjemplo = {
      ok: true,
      items: permisos.rows.map(p => ({
        id: p.id,
        clave: p.clave,
        descripcion: p.descripcion
      }))
    };

    console.log('\n📊 Ejemplo de respuesta correcta:');
    console.log(JSON.stringify(estructuraEjemplo, null, 2));

  } catch (error) {
    console.error('❌ Error al probar API de permisos:', error);
    process.exit(1);
  }
}

testApiPermisos().then(() => {
  console.log('\n🏁 Prueba completada');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
