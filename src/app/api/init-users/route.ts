import { NextRequest, NextResponse } from 'next/server'
import { initializeDefaultUsers } from '../../../lib/api/usuarios'

export async function POST(request: NextRequest) {
  console.log('🚫 API /api/init-users DESHABILITADA - Ya no crea usuarios automáticamente');
  return NextResponse.json({
    success: false,
    error: 'Esta API ha sido deshabilitada para prevenir creación automática de usuarios',
    message: 'Los usuarios se gestionan manualmente desde el frontend'
  }, { status: 410 });
} 