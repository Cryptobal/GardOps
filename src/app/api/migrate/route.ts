import { NextRequest, NextResponse } from 'next/server';
import { runDatabaseMigrations } from '../../../lib/database-migrations';
import { initializeDefaultUsers } from '../../../lib/api/usuarios';

export async function POST(request: NextRequest) {
  try {
    console.log('📡 API: Iniciando migración de base de datos...');
    
    const result = await runDatabaseMigrations();
    
    if (result.success) {
      console.log('📡 API: Migración completada exitosamente');
      
      // ❌ ELIMINADO: NO crear usuarios por defecto automáticamente
      // Los usuarios se crean manualmente desde el frontend o scripts específicos
      console.log('✅ Migración completada sin crear usuarios por defecto');
      
      return NextResponse.json({
        success: true,
        message: result.message,
        warnings: result.warnings,
        errors: result.errors
      }, { status: 200 });
    } else {
      console.log('📡 API: Migración falló');
      return NextResponse.json({
        success: false,
        message: 'La migración falló',
        warnings: result.warnings,
        errors: result.errors
      }, { status: 400 });
    }
  } catch (error) {
    console.error('📡 API: Error interno:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Endpoint de migración de base de datos',
    usage: 'Envía una petición POST para ejecutar las migraciones'
  });
} 