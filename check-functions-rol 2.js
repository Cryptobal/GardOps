const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

(async () => {
  try {
    console.log('🔍 BUSCANDO OTRAS FUNCIONES QUE USEN CAMPO ROL...\n');
    
    // Buscar todas las funciones que contengan 'rol' en su definición
    const functionsWithRol = await sql`
      SELECT 
        routine_name,
        routine_definition
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
      AND routine_definition ILIKE '%rol%'
      AND routine_definition ILIKE '%usuarios%'
      ORDER BY routine_name
    `;
    
    console.log('🔧 FUNCIONES QUE MENCIONAN "rol" Y "usuarios":');
    if (functionsWithRol.rows.length === 0) {
      console.log('✅ No se encontraron más funciones problemáticas');
    } else {
      functionsWithRol.rows.forEach(f => {
        console.log(`\n📋 ${f.routine_name}:`);
        // Solo mostrar líneas que contengan 'rol' para ver el problema
        const lines = f.routine_definition.split('\n');
        const problematicLines = lines.filter(line => {
          const lower = line.toLowerCase();
          return lower.includes('rol') && 
                 !lower.includes('color') &&
                 !lower.includes('control') &&
                 !lower.includes('scroll');
        });
        if (problematicLines.length > 0) {
          console.log('  ⚠️ Líneas problemáticas:');
          problematicLines.forEach(line => {
            console.log(`    ${line.trim()}`);
          });
        }
      });
    }
    
    // Verificar vistas que puedan usar el campo rol
    const viewsWithRol = await sql`
      SELECT 
        table_name,
        view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
      AND view_definition ILIKE '%rol%'
      AND view_definition ILIKE '%usuarios%'
      ORDER BY table_name
    `;
    
    console.log('\n👁️ VISTAS QUE MENCIONAN "rol" Y "usuarios":');
    if (viewsWithRol.rows.length === 0) {
      console.log('✅ No se encontraron vistas problemáticas');
    } else {
      viewsWithRol.rows.forEach(v => {
        console.log(`\n📋 Vista: ${v.table_name}`);
        console.log('  ⚠️ Definición contiene referencias a rol');
      });
    }
    
    await sql.end();
  } catch (error) {
    console.error('Error:', error);
  }
})();
