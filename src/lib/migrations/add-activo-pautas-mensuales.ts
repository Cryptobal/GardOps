import { sql } from '@/lib/db';

export interface MigrationResult {
  success: boolean;
  message: string;
  warnings: string[];
  errors: string[];
}

export async function addActivoPautasMensuales(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    message: '',
    warnings: [],
    errors: []
  };

  try {
    console.log('🔍 Verificando estructura de tabla pautas_mensuales...');

    // Verificar si la tabla existe
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pautas_mensuales'
      )
    `;

    if (!tableExists.rows[0].exists) {
      result.errors.push('Tabla pautas_mensuales no existe');
      result.message = '❌ Tabla pautas_mensuales no encontrada';
      return result;
    }

    // Verificar si la columna activo ya existe
    const columnExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pautas_mensuales' 
        AND column_name = 'activo'
      )
    `;

    if (columnExists.rows[0].exists) {
      result.success = true;
      result.message = '✅ Columna activo ya existe en pautas_mensuales';
      console.log(result.message);
      return result;
    }

    console.log('📝 Agregando columna activo a pautas_mensuales...');

    // Agregar columna activo con valor por defecto true
    await sql`
      ALTER TABLE pautas_mensuales 
      ADD COLUMN activo BOOLEAN DEFAULT true NOT NULL
    `;

    console.log('✅ Columna activo agregada');

    // Crear índice para mejorar performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_pautas_mensuales_activo 
      ON pautas_mensuales(activo)
    `;

    console.log('✅ Índice idx_pautas_mensuales_activo creado');

    // Crear índice compuesto para consultas comunes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_pautas_mensuales_instalacion_activo 
      ON pautas_mensuales(instalacion_id, activo)
    `;

    console.log('✅ Índice idx_pautas_mensuales_instalacion_activo creado');

    // Verificar que todas las pautas existentes están marcadas como activas
    const activePautas = await sql`
      SELECT COUNT(*) as total_activas
      FROM pautas_mensuales 
      WHERE activo = true
    `;

    const totalPautas = await sql`
      SELECT COUNT(*) as total
      FROM pautas_mensuales
    `;

    console.log(`📊 Pautas mensuales: ${activePautas.rows[0].total_activas} activas de ${totalPautas.rows[0].total} totales`);

    result.success = true;
    result.message = `✅ Migración completada: Columna 'activo' agregada a pautas_mensuales con ${activePautas.rows[0].total_activas} registros activos`;
    
    if (totalPautas.rows[0].total > 0) {
      result.warnings.push(`Todas las pautas existentes (${totalPautas.rows[0].total}) se marcaron como activas por defecto`);
    }

    console.log(result.message);
    return result;

  } catch (error) {
    console.error('❌ Error en migración add-activo-pautas-mensuales:', error);
    result.errors.push(`Error ejecutando migración: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    result.message = '❌ Error ejecutando migración add-activo-pautas-mensuales';
    return result;
  }
}

// Función para revertir la migración si es necesario
export async function revertActivoPautasMensuales(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    message: '',
    warnings: [],
    errors: []
  };

  try {
    console.log('🔄 Revirtiendo migración add-activo-pautas-mensuales...');

    // Eliminar índices
    await sql`DROP INDEX IF EXISTS idx_pautas_mensuales_activo`;
    await sql`DROP INDEX IF EXISTS idx_pautas_mensuales_instalacion_activo`;

    // Eliminar columna
    await sql`ALTER TABLE pautas_mensuales DROP COLUMN IF EXISTS activo`;

    result.success = true;
    result.message = '✅ Migración revertida: Columna activo eliminada de pautas_mensuales';
    console.log(result.message);
    return result;

  } catch (error) {
    console.error('❌ Error revirtiendo migración:', error);
    result.errors.push(`Error revirtiendo migración: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    result.message = '❌ Error revirtiendo migración';
    return result;
  }
}
