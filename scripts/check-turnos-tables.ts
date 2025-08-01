import { query } from '../src/lib/database';

async function checkTurnosTables() {
  try {
    console.log('🔍 Verificando tablas de turnos...\n');

    // 1. Verificar tabla as_turnos_configuracion
    console.log('1️⃣ Verificando tabla as_turnos_configuracion...');
    try {
      const configResult = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'as_turnos_configuracion'
        ORDER BY ordinal_position
      `);
      
      if (configResult.rows.length > 0) {
        console.log('✅ Tabla as_turnos_configuracion existe');
        console.log('📋 Columnas:');
        configResult.rows.forEach((col: any) => {
          console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });
      } else {
        console.log('❌ Tabla as_turnos_configuracion NO existe');
      }
    } catch (error) {
      console.log('❌ Error verificando as_turnos_configuracion:', error);
    }

    // 2. Verificar tabla as_turnos_requisitos
    console.log('\n2️⃣ Verificando tabla as_turnos_requisitos...');
    try {
      const requisitosResult = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'as_turnos_requisitos'
        ORDER BY ordinal_position
      `);
      
      if (requisitosResult.rows.length > 0) {
        console.log('✅ Tabla as_turnos_requisitos existe');
        console.log('📋 Columnas:');
        requisitosResult.rows.forEach((col: any) => {
          console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });
      } else {
        console.log('❌ Tabla as_turnos_requisitos NO existe');
      }
    } catch (error) {
      console.log('❌ Error verificando as_turnos_requisitos:', error);
    }

    // 3. Verificar tabla as_turnos_ppc
    console.log('\n3️⃣ Verificando tabla as_turnos_ppc...');
    try {
      const ppcResult = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'as_turnos_ppc'
        ORDER BY ordinal_position
      `);
      
      if (ppcResult.rows.length > 0) {
        console.log('✅ Tabla as_turnos_ppc existe');
        console.log('📋 Columnas:');
        ppcResult.rows.forEach((col: any) => {
          console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });
      } else {
        console.log('❌ Tabla as_turnos_ppc NO existe');
      }
    } catch (error) {
      console.log('❌ Error verificando as_turnos_ppc:', error);
    }

    // 4. Verificar tabla as_turnos_roles_servicio
    console.log('\n4️⃣ Verificando tabla as_turnos_roles_servicio...');
    try {
      const rolesResult = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'as_turnos_roles_servicio'
        ORDER BY ordinal_position
      `);
      
      if (rolesResult.rows.length > 0) {
        console.log('✅ Tabla as_turnos_roles_servicio existe');
        console.log('📋 Columnas:');
        rolesResult.rows.forEach((col: any) => {
          console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });
      } else {
        console.log('❌ Tabla as_turnos_roles_servicio NO existe');
      }
    } catch (error) {
      console.log('❌ Error verificando as_turnos_roles_servicio:', error);
    }

    // 5. Verificar datos existentes
    console.log('\n5️⃣ Verificando datos existentes...');
    
    // Configuración de turnos
    try {
      const configData = await query('SELECT COUNT(*) as count FROM as_turnos_configuracion');
      console.log(`📊 as_turnos_configuracion: ${configData.rows[0].count} registros`);
    } catch (error) {
      console.log('❌ Error contando as_turnos_configuracion:', error);
    }

    // Requisitos
    try {
      const requisitosData = await query('SELECT COUNT(*) as count FROM as_turnos_requisitos');
      console.log(`📊 as_turnos_requisitos: ${requisitosData.rows[0].count} registros`);
    } catch (error) {
      console.log('❌ Error contando as_turnos_requisitos:', error);
    }

    // PPCs
    try {
      const ppcData = await query('SELECT COUNT(*) as count FROM as_turnos_ppc');
      console.log(`📊 as_turnos_ppc: ${ppcData.rows[0].count} registros`);
    } catch (error) {
      console.log('❌ Error contando as_turnos_ppc:', error);
    }

    // Roles de servicio
    try {
      const rolesData = await query('SELECT COUNT(*) as count FROM as_turnos_roles_servicio');
      console.log(`📊 as_turnos_roles_servicio: ${rolesData.rows[0].count} registros`);
    } catch (error) {
      console.log('❌ Error contando as_turnos_roles_servicio:', error);
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error en la verificación:', error);
  }
}

// Ejecutar la verificación
checkTurnosTables().then(() => {
  console.log('🏁 Verificación finalizada');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
}); 