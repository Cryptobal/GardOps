import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    logger.debug('🚀 Renombrando tabla tipos_documentos a documentos_tipos...');

    // Verificar si la tabla tipos_documentos existe
    const checkTable = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'tipos_documentos'
      ) as tabla_existe
    `);

    if (!checkTable.rows[0].tabla_existe) {
      return NextResponse.json({
        success: false,
        message: 'La tabla tipos_documentos no existe'
      });
    }

    // Verificar si la tabla documentos_tipos ya existe
    const checkNewTable = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'documentos_tipos'
      ) as tabla_existe
    `);

    if (checkNewTable.rows[0].tabla_existe) {
      return NextResponse.json({
        success: false,
        message: 'La tabla documentos_tipos ya existe'
      });
    }

    // Renombrar la tabla
    await query('ALTER TABLE tipos_documentos RENAME TO documentos_tipos');
    logger.debug('✅ Tabla renombrada exitosamente');

    // Renombrar índices si existen
    try {
      await query('ALTER INDEX IF EXISTS idx_tipos_documentos_modulo RENAME TO idx_documentos_tipos_modulo');
      await query('ALTER INDEX IF EXISTS idx_tipos_documentos_activo RENAME TO idx_documentos_tipos_activo');
      logger.debug('✅ Índices renombrados');
    } catch (error) {
      logger.debug('ℹ️ No se pudieron renombrar los índices:', error);
    }

    // Verificar que la tabla se renombró correctamente
    const verification = await query(`
      SELECT 
        COUNT(*) as registros
      FROM documentos_tipos
    `);

    logger.debug('✅ Renombrado completado exitosamente');
    logger.debug('📊 Registros en la nueva tabla:', verification.rows[0].registros);

    return NextResponse.json({
      success: true,
      message: 'Tabla renombrada exitosamente',
      registros: verification.rows[0].registros
    });

  } catch (error) {
    console.error('❌ Error renombrando tabla:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error renombrando tabla',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
