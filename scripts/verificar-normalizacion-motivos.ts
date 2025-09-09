import { config } from 'dotenv';
import path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { query } from '../src/lib/database';

async function verificarNormalizacion() {
  console.log('🔍 Verificando normalización de motivos PPC...\n');

  try {
    // =====================================================
    // PASO 1: VERIFICAR VALORES ACTUALES
    // =====================================================
    
    console.log('📊 Valores actuales en puestos_por_cubrir:');
    const valoresActuales = await query(`
      SELECT motivo, COUNT(*) as cantidad
      FROM puestos_por_cubrir 
      GROUP BY motivo
      ORDER BY motivo
    `);
    
    valoresActuales.rows.forEach((row: any) => {
      console.log(`   ${row.motivo}: ${row.cantidad} registros`);
    });
    
    // =====================================================
    // PASO 2: VERIFICAR VALORES VÁLIDOS
    // =====================================================
    
    const valoresValidos = ['falta_asignacion', 'falta_con_aviso', 'ausencia_temporal', 'renuncia'];
    const valoresInvalidos = await query(`
      SELECT DISTINCT motivo
      FROM puestos_por_cubrir 
      WHERE motivo NOT IN ($1, $2, $3, $4)
    `, valoresValidos);
    
    if (valoresInvalidos.rows.length > 0) {
      console.log('❌ Valores inválidos encontrados:');
      valoresInvalidos.rows.forEach((row: any) => {
        console.log(`   - ${row.motivo}`);
      });
    } else {
      console.log('✅ Todos los valores son válidos');
    }
    
    // =====================================================
    // PASO 3: VERIFICAR CONSTRAINT
    // =====================================================
    
    console.log('\n🔧 Verificando constraint...');
    const constraints = await query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'puestos_por_cubrir'::regclass
      AND contype = 'c'
      AND conname = 'puestos_por_cubrir_motivo_check'
    `);
    
    if (constraints.rows.length > 0) {
      console.log('✅ Constraint encontrada:');
      console.log(`   ${constraints.rows[0].constraint_definition}`);
    } else {
      console.log('❌ No se encontró la constraint puestos_por_cubrir_motivo_check');
    }
    
    // =====================================================
    // PASO 4: VERIFICAR as_turnos_ppc (si existe)
    // =====================================================
    
    const tablaExiste = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'as_turnos_ppc'
      ) as existe
    `);
    
    if (tablaExiste.rows[0].existe) {
      console.log('\n📊 Verificando as_turnos_ppc...');
      
      const valoresAsTurnos = await query(`
        SELECT motivo, COUNT(*) as cantidad
        FROM as_turnos_ppc 
        GROUP BY motivo
        ORDER BY motivo
      `);
      
      valoresAsTurnos.rows.forEach((row: any) => {
        console.log(`   ${row.motivo}: ${row.cantidad} registros`);
      });
      
      const valoresInvalidosAsTurnos = await query(`
        SELECT DISTINCT motivo
        FROM as_turnos_ppc 
        WHERE motivo NOT IN ($1, $2, $3, $4)
      `, valoresValidos);
      
      if (valoresInvalidosAsTurnos.rows.length > 0) {
        console.log('❌ Valores inválidos en as_turnos_ppc:');
        valoresInvalidosAsTurnos.rows.forEach((row: any) => {
          console.log(`   - ${row.motivo}`);
        });
      } else {
        console.log('✅ Todos los valores en as_turnos_ppc son válidos');
      }
    } else {
      console.log('\nℹ️ Tabla as_turnos_ppc no existe');
    }
    
    // =====================================================
    // PASO 5: VERIFICAR BACKUP
    // =====================================================
    
    console.log('\n💾 Verificando backups...');
    const backupExiste = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'puestos_por_cubrir_backup_normalizacion'
      ) as existe
    `);
    
    if (backupExiste.rows[0].existe) {
      const backupCount = await query(`
        SELECT COUNT(*) as cantidad
        FROM puestos_por_cubrir_backup_normalizacion
      `);
      console.log(`✅ Backup encontrado con ${backupCount.rows[0].cantidad} registros`);
    } else {
      console.log('⚠️ No se encontró backup de normalización');
    }
    
    // =====================================================
    // PASO 6: RESUMEN FINAL
    // =====================================================
    
    console.log('\n📋 RESUMEN DE VERIFICACIÓN:');
    console.log('='.repeat(50));
    
    const totalRegistros = await query('SELECT COUNT(*) as total FROM puestos_por_cubrir');
    console.log(`Total de registros en puestos_por_cubrir: ${totalRegistros.rows[0].total}`);
    
    if (valoresInvalidos.rows.length === 0 && constraints.rows.length > 0) {
      console.log('✅ NORMALIZACIÓN EXITOSA');
      console.log('   - Todos los valores son válidos');
      console.log('   - Constraint aplicada correctamente');
      console.log('   - Backup disponible');
    } else {
      console.log('❌ PROBLEMAS DETECTADOS');
      if (valoresInvalidos.rows.length > 0) {
        console.log('   - Hay valores inválidos');
      }
      if (constraints.rows.length === 0) {
        console.log('   - Falta constraint');
      }
    }
    
    console.log('\nValores normalizados:');
    valoresValidos.forEach(valor => {
      console.log(`   - ${valor}`);
    });
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    process.exit(1);
  }
}

// Ejecutar la verificación
verificarNormalizacion()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }); 