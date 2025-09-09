#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

(async () => {
  try {
    // Verificar constraint
    const constraint = await sql`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'usuarios'::regclass
      AND conname = 'usuarios_rol_check'
    `;
    
    console.log('Constraint usuarios_rol_check:');
    console.log(constraint.rows[0]?.definition || 'No encontrado');
    
    // Ver valores únicos actuales
    const valores = await sql`
      SELECT DISTINCT rol FROM usuarios WHERE rol IS NOT NULL
    `;
    
    console.log('\nValores actuales en campo rol:');
    valores.rows.forEach(v => console.log('  -', v.rol));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
})();
