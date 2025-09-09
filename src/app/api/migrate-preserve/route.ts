import { NextRequest, NextResponse } from 'next/server';
import { runDatabaseMigrations } from '../../../lib/database-migrations';

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    logger.debug('📡 API: Iniciando migración preservando datos existentes...');
    
    const result = await runDatabaseMigrations(true); // preserveData = true
    
    if (result.success) {
      logger.debug('📡 API: Migración con preservación de datos completada exitosamente');
      return NextResponse.json({
        success: true,
        message: result.message,
        warnings: result.warnings,
        errors: result.errors
      }, { status: 200 });
    } else {
      logger.debug('📡 API: Migración con preservación de datos falló');
      return NextResponse.json({
        success: false,
        message: 'La migración con preservación de datos falló',
        warnings: result.warnings,
        errors: result.errors
      }, { status: 400 });
    }
  } catch (error) {
    console.error('📡 API: Error interno en migración con preservación:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Endpoint de migración preservando datos existentes',
    usage: 'Envía una petición POST para ejecutar las migraciones preservando datos',
    description: 'Este endpoint migra la tabla guardias de integer a UUID preservando todos los datos existentes'
  });
} 