import { query } from '../src/lib/database';

async function explorarEstructura() {
  try {
    console.log('🔍 EXPLORANDO ESTRUCTURA DE TABLAS');
    console.log('='.repeat(50));
    
    // 1. Explorar tabla as_turnos_requisitos
    console.log('📋 1. ESTRUCTURA DE as_turnos_requisitos');
    console.log('-'.repeat(30));
    
    try {
      const requisitosResult = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'as_turnos_requisitos'
        ORDER BY ordinal_position
      `);
      
      console.log('Columnas encontradas:');
      requisitosResult.rows.forEach((col: any) => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } catch (error) {
      console.log('❌ Error explorando requisitos:', error);
    }
    
    console.log('');
    
    // 2. Explorar tabla as_turnos_asignaciones
    console.log('📋 2. ESTRUCTURA DE as_turnos_asignaciones');
    console.log('-'.repeat(30));
    
    try {
      const asignacionesResult = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'as_turnos_asignaciones'
        ORDER BY ordinal_position
      `);
      
      console.log('Columnas encontradas:');
      asignacionesResult.rows.forEach((col: any) => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } catch (error) {
      console.log('❌ Error explorando asignaciones:', error);
    }
    
    console.log('');
    
    // 3. Explorar tabla as_turnos_ppc
    console.log('📋 3. ESTRUCTURA DE as_turnos_ppc');
    console.log('-'.repeat(30));
    
    try {
      const ppcResult = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'as_turnos_ppc'
        ORDER BY ordinal_position
      `);
      
      console.log('Columnas encontradas:');
      ppcResult.rows.forEach((col: any) => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } catch (error) {
      console.log('❌ Error explorando PPCs:', error);
    }
    
    console.log('');
    
    // 4. Explorar tabla as_turnos_pauta_mensual
    console.log('📋 4. ESTRUCTURA DE as_turnos_pauta_mensual');
    console.log('-'.repeat(30));
    
    try {
      const pautaResult = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'as_turnos_pauta_mensual'
        ORDER BY ordinal_position
      `);
      
      console.log('Columnas encontradas:');
      pautaResult.rows.forEach((col: any) => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } catch (error) {
      console.log('❌ Error explorando pauta mensual:', error);
    }
    
    console.log('');
    console.log('='.repeat(50));
    console.log('✅ EXPLORACIÓN COMPLETADA');
    
  } catch (error) {
    console.error('❌ Error en exploración:', error);
    throw error;
  }
}

// Ejecutar la exploración
explorarEstructura()
  .then(() => {
    console.log('✅ Exploración completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Exploración falló:', error);
    process.exit(1);
  }); 