import { query } from '../src/lib/database';

async function testPayrollItemsExtras() {
  try {
    console.log('🧪 Iniciando pruebas de ítems extras de payroll...');

    // 1. Verificar que existe la tabla
    console.log('1. Verificando estructura de la tabla...');
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'payroll_items_extras'
      )
    `);

    if (!tableExists.rows[0].exists) {
      throw new Error('❌ La tabla payroll_items_extras no existe');
    }
    console.log('✅ Tabla payroll_items_extras existe');

    // 2. Verificar que existe la columna item_id
    console.log('2. Verificando columna item_id...');
    const columnExists = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payroll_items_extras' 
      AND column_name = 'item_id'
    `);

    if (columnExists.rows.length === 0) {
      throw new Error('❌ La columna item_id no existe');
    }
    console.log('✅ Columna item_id existe');

    // 3. Verificar catálogo de ítems
    console.log('3. Verificando catálogo de ítems...');
    const sueldoItems = await query(`
      SELECT COUNT(*) as count, clase, naturaleza
      FROM sueldo_item 
      WHERE activo = true 
      GROUP BY clase, naturaleza
    `);

    console.log('📊 Ítems en catálogo por tipo:');
    sueldoItems.rows.forEach((row: any) => {
      const tipo = `${row.clase} ${row.naturaleza}`;
      console.log(`   - ${tipo}: ${row.count} ítems`);
    });

    // 4. Verificar instalaciones
    console.log('4. Verificando instalaciones...');
    const instalaciones = await query(`
      SELECT COUNT(*) as count FROM instalaciones
    `);
    console.log(`✅ ${instalaciones.rows[0].count} instalaciones disponibles`);

    // 5. Verificar guardias
    console.log('5. Verificando guardias...');
    const guardias = await query(`
      SELECT COUNT(*) as count FROM guardias
    `);
    console.log(`✅ ${guardias.rows[0].count} guardias disponibles`);

    // 6. Verificar payroll runs existentes
    console.log('6. Verificando payroll runs...');
    const payrollRuns = await query(`
      SELECT COUNT(*) as count FROM payroll_run
    `);
    console.log(`✅ ${payrollRuns.rows[0].count} payroll runs existentes`);

    // 7. Verificar ítems extras existentes
    console.log('7. Verificando ítems extras...');
    const itemsExtras = await query(`
      SELECT COUNT(*) as count FROM payroll_items_extras
    `);
    console.log(`✅ ${itemsExtras.rows[0].count} ítems extras existentes`);

    // 8. Probar consulta completa
    console.log('8. Probando consulta completa...');
    const testQuery = await query(`
      SELECT 
        pie.id,
        pie.nombre,
        pie.tipo,
        pie.monto,
        g.nombre as guardia_nombre,
        g.apellido_paterno,
        g.apellido_materno,
        i.nombre as instalacion_nombre,
        si.nombre as item_nombre,
        si.clase as item_clase,
        si.naturaleza as item_naturaleza
      FROM payroll_items_extras pie
      JOIN guardias g ON pie.guardia_id = g.id
      JOIN payroll_run pr ON pie.payroll_run_id = pr.id
      JOIN instalaciones i ON g.instalacion_id = i.id
      LEFT JOIN sueldo_item si ON pie.item_id = si.id
      LIMIT 5
    `);

    console.log(`✅ Consulta de prueba exitosa: ${testQuery.rows.length} registros`);

    // 9. Calcular estadísticas de ejemplo
    console.log('9. Calculando estadísticas...');
    const stats = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN tipo = 'haber_imponible' THEN 1 END) as haberes_imponibles,
        COUNT(CASE WHEN tipo = 'haber_no_imponible' THEN 1 END) as haberes_no_imponibles,
        COUNT(CASE WHEN tipo = 'descuento' THEN 1 END) as descuentos,
        SUM(CASE WHEN tipo != 'descuento' THEN ABS(monto) ELSE 0 END) as total_haberes,
        SUM(CASE WHEN tipo = 'descuento' THEN ABS(monto) ELSE 0 END) as total_descuentos
      FROM payroll_items_extras
    `);

    const stat = stats.rows[0];
    console.log('📊 Estadísticas actuales:');
    console.log(`   - Total ítems: ${stat.total}`);
    console.log(`   - Haberes imponibles: ${stat.haberes_imponibles}`);
    console.log(`   - Haberes no imponibles: ${stat.haberes_no_imponibles}`);
    console.log(`   - Descuentos: ${stat.descuentos}`);
    console.log(`   - Total haberes: $${parseInt(String(stat.total_haberes || 0)).toLocaleString('es-CL')}`);
    console.log(`   - Total descuentos: $${parseInt(String(stat.total_descuentos || 0)).toLocaleString('es-CL')}`);
    console.log(`   - Neto: $${parseInt(String((stat.total_haberes || 0) - (stat.total_descuentos || 0))).toLocaleString('es-CL')}`);

    console.log('✅ Todas las pruebas pasaron exitosamente');
    console.log('🎉 El sistema de ítems extras está funcionando correctamente');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
    throw error;
  }
}

// Ejecutar las pruebas si se llama directamente
if (require.main === module) {
  testPayrollItemsExtras()
    .then(() => {
      console.log('🎉 Pruebas completadas');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en las pruebas:', error);
      process.exit(1);
    });
}

export default testPayrollItemsExtras;
