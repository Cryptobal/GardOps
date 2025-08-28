import { query } from '../src/lib/database';

async function verificarRUTsGuardias() {
  try {
    console.log('🔍 Verificando RUTs de guardias...');
    
    const result = await query(`
      SELECT 
        id, 
        nombre, 
        apellido_paterno, 
        apellido_materno,
        rut,
        activo
      FROM guardias 
      WHERE activo = true 
      ORDER BY apellido_paterno, apellido_materno, nombre 
      LIMIT 20
    `);

    console.log(`📊 Total de guardias encontrados: ${result.rows.length}`);
    
    result.rows.forEach((guardia, index) => {
      console.log(`\n${index + 1}. Guardia:`);
      console.log(`   ID: ${guardia.id}`);
      console.log(`   Nombre: ${guardia.nombre}`);
      console.log(`   Apellido Paterno: ${guardia.apellido_paterno}`);
      console.log(`   Apellido Materno: ${guardia.apellido_materno}`);
      console.log(`   RUT: ${guardia.rut || 'NULL/SIN RUT'}`);
      console.log(`   Activo: ${guardia.activo}`);
    });

    // Verificar cuántos tienen RUT
    const conRUT = result.rows.filter(g => g.rut && g.rut.trim() !== '').length;
    const sinRUT = result.rows.length - conRUT;
    
    console.log(`\n📈 Estadísticas:`);
    console.log(`   Con RUT: ${conRUT}`);
    console.log(`   Sin RUT: ${sinRUT}`);
    console.log(`   Porcentaje con RUT: ${((conRUT / result.rows.length) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Error verificando RUTs:', error);
  }
}

verificarRUTsGuardias();

