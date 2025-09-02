import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function fixConstraintIssue() {
  console.log('🔧 CORRIGIENDO RESTRICCIÓN PROBLEMÁTICA DE GUARDIAS\n');

  try {
    // 1. Verificar la restricción problemática
    console.log('📝 1. Verificando restricción problemática...');
    const constraintCheck = await query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conname = 'guardias_temp_tenant_id_fkey'
    `);
    
    if (constraintCheck.rows.length > 0) {
      console.log('❌ Restricción problemática encontrada:');
      console.log(`   • ${constraintCheck.rows[0].conname}: ${constraintCheck.rows[0].definition}`);
      
      // 2. Eliminar la restricción problemática
      console.log('\n📝 2. Eliminando restricción problemática...');
      await query(`
        ALTER TABLE guardias 
        DROP CONSTRAINT IF EXISTS guardias_temp_tenant_id_fkey
      `);
      console.log('✅ Restricción problemática eliminada');
      
      // 3. Crear la restricción correcta
      console.log('\n📝 3. Creando restricción correcta...');
      await query(`
        ALTER TABLE guardias 
        ADD CONSTRAINT guardias_tenant_id_fkey 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      `);
      console.log('✅ Restricción correcta creada');
    } else {
      console.log('✅ No se encontró la restricción problemática');
    }

    // 4. Verificar que la restricción correcta existe
    console.log('\n📝 4. Verificando restricciones actuales...');
    const currentConstraints = await query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'guardias')
      AND contype = 'f'
    `);
    
    console.log('🔗 Restricciones actuales:');
    currentConstraints.rows.forEach((constraint: any) => {
      console.log(`   • ${constraint.conname}: ${constraint.definition}`);
    });

    console.log('\n🎉 ¡RESTRICCIÓN CORREGIDA EXITOSAMENTE!');
    console.log('✅ El formulario de postulación ahora debería funcionar sin errores 500');

  } catch (error) {
    console.error('❌ Error corrigiendo restricción:', error);
    process.exit(1);
  }
}

fixConstraintIssue();
