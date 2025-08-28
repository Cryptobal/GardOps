import { NextRequest, NextResponse } from 'next/server';

// GET - Endpoint de prueba
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Endpoint de prueba funcionando correctamente',
    timestamp: new Date().toISOString()
  });
}

