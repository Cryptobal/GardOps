import { query } from '../src/lib/database';

interface MigrationResult {
  success: boolean;
  message: string;
  warnings: string[];
  errors: string[];
}

async function addTipoGuardiaColumn(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    message: '',
    warnings: [],
    errors: []
  };

  try {
    console.log('🔄 Iniciando migración: Agregar campo tipo_guardia...');

    // Verificar si la columna ya existe
    const columnExists = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'guardias' 
      AND column_name = 'tipo_guardia'
    `);

    if (columnExists.rows.length > 0) {
      result.warnings.push('⚠️ La columna tipo_guardia ya existe en la tabla guardias');
      result.success = true;
      result.message = 'La columna ya existe, no se requiere migración';
      return result;
    }

    // Agregar la columna tipo_guardia
    console.log('📝 Agregando columna tipo_guardia...');
    await query(`
      ALTER TABLE guardias 
      ADD COLUMN tipo_guardia VARCHAR(20) DEFAULT 'contratado' 
      CHECK (tipo_guardia IN ('contratado', 'esporadico'))
    `);

    // Actualizar todos los guardias existentes a 'contratado' por defecto
    console.log('🔄 Actualizando guardias existentes a tipo "contratado"...');
    const updateResult = await query(`
      UPDATE guardias 
      SET tipo_guardia = 'contratado' 
      WHERE tipo_guardia IS NULL
    `);

    result.success = true;
    result.message = `✅ Campo tipo_guardia agregado exitosamente. ${updateResult.rowCount} guardias actualizados a tipo "contratado"`;
    
    // Verificar la migración
    const verification = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN tipo_guardia = 'contratado' THEN 1 END) as contratados,
        COUNT(CASE WHEN tipo_guardia = 'esporadico' THEN 1 END) as esporadicos,
        COUNT(CASE WHEN tipo_guardia IS NULL THEN 1 END) as sin_tipo
      FROM guardias
    `);

    const stats = verification.rows[0];
    console.log('\n📊 Estadísticas después de la migración:');
    console.log(`   Total guardias: ${stats.total}`);
    console.log(`   Contratados: ${stats.contratados}`);
    console.log(`   Esporádicos: ${stats.esporadicos}`);
    console.log(`   Sin tipo: ${stats.sin_tipo}`);

    if (stats.sin_tipo > 0) {
      result.warnings.push(`⚠️ Hay ${stats.sin_tipo} guardias sin tipo definido`);
    }

  } catch (error) {
    result.errors.push(`❌ Error durante la migración: ${error}`);
    result.success = false;
    result.message = 'Error al agregar campo tipo_guardia';
    console.error(error);
  }

  // Mostrar resultado
  if (result.success) {
    console.log('\n' + result.message);
  } else {
    console.error('\n' + result.message);
  }
  
  result.warnings.forEach(w => console.log(w));
  result.errors.forEach(e => console.error(e));

  return result;
}

// Ejecutar migración
addTipoGuardiaColumn()
  .then(result => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
