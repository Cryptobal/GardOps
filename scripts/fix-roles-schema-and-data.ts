import { sql } from '@vercel/postgres';

async function fixRolesSchema() {
  try {
    console.log('🔧 Corrigiendo estructura de roles...');

    // 1. Eliminar constraint problemático si existe
    console.log('📝 Eliminando constraint problemático...');
    await sql`DROP CONSTRAINT IF EXISTS roles_nombre_unique ON roles`;
    
    // 2. Verificar que existe el constraint correcto
    console.log('✅ Verificando constraint correcto...');
    const constraints = await sql`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'roles' 
      AND constraint_type = 'UNIQUE'
    `;
    
    const hasCorrectConstraint = constraints.rows.some(row => 
      row.constraint_name === 'uk_roles_nombre_tenant'
    );
    
    if (!hasCorrectConstraint) {
      console.log('📝 Creando constraint correcto...');
      await sql`
        ALTER TABLE roles 
        ADD CONSTRAINT uk_roles_nombre_tenant 
        UNIQUE (tenant_id, nombre)
      `;
    }
    
    console.log('✅ Estructura de roles corregida exitosamente');
    
  } catch (error) {
    console.error('❌ Error corrigiendo estructura:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

fixRolesSchema();
