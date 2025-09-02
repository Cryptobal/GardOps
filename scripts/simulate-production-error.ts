import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function simulateProductionError() {
  console.log('🚀 SIMULANDO ERROR DE PRODUCCIÓN EN LOCAL\n');

  try {
    // 1. Verificar estructura exacta de la tabla guardias
    console.log('📝 1. Verificando estructura exacta de guardias...');
    const guardiasStructure = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estructura EXACTA de guardias:');
    guardiasStructure.rows.forEach((col: any) => {
      console.log(`   • ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
    });

    // 2. Verificar restricciones EXACTAS
    console.log('\n📝 2. Verificando restricciones EXACTAS...');
    const constraints = await query(`
      SELECT conname, pg_get_constraintdef(oid) as definition, contype
      FROM pg_constraint 
      WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'guardias')
      ORDER BY conname
    `);
    
    console.log('🔗 Restricciones EXACTAS:');
    constraints.rows.forEach((constraint: any) => {
      console.log(`   • ${constraint.conname} (${constraint.contype}): ${constraint.definition}`);
    });

    // 3. Verificar si hay algún trigger problemático
    console.log('\n📝 3. Verificando triggers...');
    const triggers = await query(`
      SELECT tgname, tgtype, tgenabled, tgdeferrable, tginitdeferred
      FROM pg_trigger 
      WHERE tgrelid = (SELECT oid FROM pg_class WHERE relname = 'guardias')
    `);
    
    if (triggers.rows.length > 0) {
      console.log('⚠️ Triggers encontrados:');
      triggers.rows.forEach((trigger: any) => {
        console.log(`   • ${trigger.tgname}: tipo=${trigger.tgtype}, enabled=${trigger.tgenabled}`);
      });
    } else {
      console.log('✅ No hay triggers en la tabla guardias');
    }

    // 4. Verificar si hay alguna regla problemática
    console.log('\n📝 4. Verificando reglas...');
    const rules = await query(`
      SELECT rulename, ev_type, ev_class::regclass as table_name
      FROM pg_rewrite 
      WHERE ev_class = (SELECT oid FROM pg_class WHERE relname = 'guardias')
    `);
    
    if (rules.rows.length > 0) {
      console.log('⚠️ Reglas encontradas:');
      rules.rows.forEach((rule: any) => {
        console.log(`   • ${rule.rulename}: ${rule.ev_type} en ${rule.table_name}`);
      });
    } else {
      console.log('✅ No hay reglas en la tabla guardias');
    }

    // 5. Verificar si hay alguna vista que esté interfiriendo
    console.log('\n📝 5. Verificando vistas...');
    const views = await query(`
      SELECT viewname, definition 
      FROM pg_views 
      WHERE schemaname = 'public' AND definition LIKE '%guardias%'
    `);
    
    if (views.rows.length > 0) {
      console.log('⚠️ Vistas que referencian guardias:');
      views.rows.forEach((view: any) => {
        console.log(`   • ${view.viewname}`);
      });
    } else {
      console.log('✅ No hay vistas que referencien guardias');
    }

    // 6. Intentar insertar un registro de prueba para ver el error exacto
    console.log('\n📝 6. Intentando inserción de prueba...');
    try {
      const testInsert = await query(`
        INSERT INTO guardias (
          tenant_id, nombre, apellido_paterno, apellido_materno, 
          rut, email, telefono, direccion, activo, tipo_guardia
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        ) RETURNING id
      `, [
        '1397e653-a702-4020-9702-3ae4f3f8b337', // tenant_id real
        'Test',
        'Apellido',
        'Test',
        '99999999-9',
        'test@test.com',
        '123456789',
        'Test Address',
        true,
        'contratado'
      ]);
      
      console.log('✅ Inserción de prueba exitosa:', testInsert.rows[0]);
      
      // Limpiar el registro de prueba
      await query('DELETE FROM guardias WHERE email = $1', ['test@test.com']);
      console.log('✅ Registro de prueba eliminado');
      
    } catch (insertError: any) {
      console.log('❌ Error en inserción de prueba:');
      console.log('   Código:', insertError.code);
      console.log('   Mensaje:', insertError.message);
      console.log('   Detalle:', insertError.detail);
      console.log('   Restricción:', insertError.constraint);
      console.log('   Tabla:', insertError.table);
      console.log('   Columna:', insertError.column);
    }

    console.log('\n🎯 DIAGNÓSTICO COMPLETO REALIZADO');

  } catch (error) {
    console.error('❌ Error durante la simulación:', error);
    process.exit(1);
  }
}

simulateProductionError();
