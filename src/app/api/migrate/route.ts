import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { runDatabaseMigrations } from '../../../lib/database-migrations';
import { initializeDefaultUsers } from '../../../lib/api/usuarios';

export async function POST(request: NextRequest) {
  const deny = await requireAuthz(req, { resource: 'migrate', action: 'read:list' });
  if (deny) return deny;

try {
    console.log('📡 API: Iniciando migración de base de datos...');
    
    const result = await runDatabaseMigrations();
    
    if (result.success) {
      console.log('📡 API: Migración completada exitosamente');
      
      // Inicializar usuarios por defecto después de las migraciones
      console.log('👥 API: Inicializando usuarios por defecto...');
      await initializeDefaultUsers();
      
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
  const deny = await requireAuthz(req, { resource: 'migrate', action: 'read:list' });
  if (deny) return deny;

return NextResponse.json({
    message: 'Endpoint de migración de base de datos',
    usage: 'Envía una petición POST para ejecutar las migraciones'
  });
} 