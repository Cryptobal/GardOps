import { query } from '../src/lib/database';
import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

async function verificarDatosBancarios() {
  console.log('🔍 VERIFICACIÓN DE DATOS BANCARIOS DE GUARDIAS\n');

  try {
    // 1. Estadísticas generales
    console.log('📊 ESTADÍSTICAS GENERALES');
    console.log('========================');
    
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_guardias,
        COUNT(banco) as con_banco,
        COUNT(tipo_cuenta) as con_tipo_cuenta,
        COUNT(numero_cuenta) as con_numero_cuenta,
        COUNT(CASE WHEN banco IS NOT NULL AND tipo_cuenta IS NOT NULL AND numero_cuenta IS NOT NULL THEN 1 END) as completos
      FROM guardias
      WHERE rut IS NOT NULL AND rut != ''
    `);

    const stats = statsResult.rows[0];
    console.log(`• Total guardias: ${stats.total_guardias}`);
    console.log(`• Con banco: ${stats.con_banco} (${((stats.con_banco / stats.total_guardias) * 100).toFixed(1)}%)`);
    console.log(`• Con tipo cuenta: ${stats.con_tipo_cuenta} (${((stats.con_tipo_cuenta / stats.total_guardias) * 100).toFixed(1)}%)`);
    console.log(`• Con número cuenta: ${stats.con_numero_cuenta} (${((stats.con_numero_cuenta / stats.total_guardias) * 100).toFixed(1)}%)`);
    console.log(`• Datos completos: ${stats.completos} (${((stats.completos / stats.total_guardias) * 100).toFixed(1)}%)`);

    // 2. Distribución por banco
    console.log('\n🏦 DISTRIBUCIÓN POR BANCO');
    console.log('========================');
    
    const bancosResult = await query(`
      SELECT 
        b.nombre as banco,
        COUNT(g.id) as cantidad,
        ROUND((COUNT(g.id) * 100.0 / (SELECT COUNT(*) FROM guardias WHERE rut IS NOT NULL AND rut != '' AND banco IS NOT NULL)), 1) as porcentaje
      FROM guardias g
      INNER JOIN bancos b ON g.banco = b.id
      WHERE g.rut IS NOT NULL AND g.rut != '' AND g.banco IS NOT NULL
      GROUP BY b.id, b.nombre
      ORDER BY cantidad DESC
    `);

    bancosResult.rows.forEach((row: any) => {
      console.log(`• ${row.banco}: ${row.cantidad} guardias (${row.porcentaje}%)`);
    });

    // 3. Distribución por tipo de cuenta
    console.log('\n💳 DISTRIBUCIÓN POR TIPO DE CUENTA');
    console.log('==================================');
    
    const tiposResult = await query(`
      SELECT 
        tipo_cuenta,
        COUNT(*) as cantidad,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM guardias WHERE rut IS NOT NULL AND rut != '' AND tipo_cuenta IS NOT NULL)), 1) as porcentaje
      FROM guardias
      WHERE rut IS NOT NULL AND rut != '' AND tipo_cuenta IS NOT NULL
      GROUP BY tipo_cuenta
      ORDER BY cantidad DESC
    `);

    tiposResult.rows.forEach((row: any) => {
      const tipoDesc = {
        'RUT': 'Cuenta RUT',
        'CTA': 'Cuenta Vista',
        'CTE': 'Cuenta Corriente'
      }[row.tipo_cuenta] || row.tipo_cuenta;
      
      console.log(`• ${tipoDesc}: ${row.cantidad} guardias (${row.porcentaje}%)`);
    });

    // 4. Guardias sin datos bancarios
    console.log('\n❌ GUARDIAS SIN DATOS BANCARIOS');
    console.log('===============================');
    
    const sinDatosResult = await query(`
      SELECT 
        nombre,
        apellido_paterno,
        apellido_materno,
        rut
      FROM guardias
      WHERE rut IS NOT NULL AND rut != '' 
      AND (banco IS NULL OR tipo_cuenta IS NULL OR numero_cuenta IS NULL)
      ORDER BY nombre, apellido_paterno
    `);

    if (sinDatosResult.rows.length === 0) {
      console.log('✅ Todos los guardias tienen datos bancarios completos');
    } else {
      console.log(`⚠️  ${sinDatosResult.rows.length} guardias sin datos bancarios completos:`);
      sinDatosResult.rows.forEach((row: any) => {
        const nombreCompleto = `${row.nombre} ${row.apellido_paterno} ${row.apellido_materno || ''}`.trim();
        console.log(`   • ${nombreCompleto} (${row.rut})`);
      });
    }

    // 5. Ejemplos de datos actualizados
    console.log('\n✅ EJEMPLOS DE DATOS ACTUALIZADOS');
    console.log('==================================');
    
    const ejemplosResult = await query(`
      SELECT 
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        g.rut,
        b.nombre as banco,
        g.tipo_cuenta,
        g.numero_cuenta
      FROM guardias g
      INNER JOIN bancos b ON g.banco = b.id
      WHERE g.rut IS NOT NULL AND g.rut != '' 
      AND g.banco IS NOT NULL AND g.tipo_cuenta IS NOT NULL AND g.numero_cuenta IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 10
    `);

    ejemplosResult.rows.forEach((row: any) => {
      const nombreCompleto = `${row.nombre} ${row.apellido_paterno} ${row.apellido_materno || ''}`.trim();
      const tipoDesc = {
        'RUT': 'Cuenta RUT',
        'CTA': 'Cuenta Vista',
        'CTE': 'Cuenta Corriente'
      }[row.tipo_cuenta] || row.tipo_cuenta;
      
      console.log(`• ${nombreCompleto} (${row.rut})`);
      console.log(`  Banco: ${row.banco} | Tipo: ${tipoDesc} | N°: ${row.numero_cuenta}`);
    });

    console.log('\n🎉 Verificación completada exitosamente');

  } catch (error) {
    console.error('\n❌ Error en la verificación:', error);
    process.exit(1);
  }
}

// Ejecutar script
verificarDatosBancarios()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  }); 