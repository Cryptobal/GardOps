import { NextRequest, NextResponse } from 'next/server'
import { initializeDefaultUsers } from '../../../lib/api/usuarios'

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  logger.debug('🚫 API /api/init-users DESHABILITADA - Ya no crea usuarios automáticamente');
return NextResponse.json({
    success: false,
    error: 'Esta API ha sido deshabilitada para prevenir creación automática de usuarios',
    message: 'Los usuarios se gestionan manualmente desde el frontend'
  }, { status: 410 });
} 