import { query } from '../src/lib/database';

async function agregarColumnaCodigo() {
  try {
    console.log('🔍 Verificando si la columna codigo existe en te_planillas_turnos_extras...');
    
    // Verificar si la columna existe
    const { rows: columnExists } = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'te_planillas_turnos_extras' 
        AND column_name = 'codigo'
      );
    `);
    
    if (columnExists[0].exists) {
      console.log('✅ La columna codigo ya existe en te_planillas_turnos_extras');
      return;
    }
    
    console.log('📝 Agregando columna codigo a te_planillas_turnos_extras...');
    
    // Agregar la columna codigo
    await query(`
      ALTER TABLE te_planillas_turnos_extras 
      ADD COLUMN codigo TEXT UNIQUE
    `);
    
    console.log('✅ Columna codigo agregada exitosamente');
    
    // Generar códigos para las planillas existentes
    console.log('📝 Generando códigos para planillas existentes...');
    
    const { rows: planillas } = await query(`
      SELECT id, fecha_generacion 
      FROM te_planillas_turnos_extras 
      WHERE codigo IS NULL
    `);
    
    for (const planilla of planillas) {
      const fecha = new Date(planilla.fecha_generacion);
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const codigo = `TE-${year}-${month}-${String(planilla.id).padStart(4, '0')}`;
      
      await query(
        'UPDATE te_planillas_turnos_extras SET codigo = $1 WHERE id = $2',
        [codigo, planilla.id]
      );
      
      console.log(`  - Planilla ${planilla.id}: ${codigo}`);
    }
    
    console.log('✅ Códigos generados para todas las planillas existentes');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

agregarColumnaCodigo().then(() => {
  console.log('✅ Proceso completado');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
