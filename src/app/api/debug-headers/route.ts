import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const headers = req.headers;
    const allHeaders: Record<string, string> = {};
    
    // Obtener todos los headers
    headers.forEach((value, key) => {
      allHeaders[key] = value;
    });

    // Información específica que necesitamos
    const debugInfo = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: allHeaders,
      specificHeaders: {
        'x-user-email': headers.get('x-user-email'),
        'authorization': headers.get('authorization'),
        'cookie': headers.get('cookie'),
        'user-agent': headers.get('user-agent'),
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_DEV_USER_EMAIL: process.env.NEXT_PUBLIC_DEV_USER_EMAIL,
      }
    };

    console.log('🔍 Debug Headers - Información completa:', debugInfo);
    
    return NextResponse.json({
      success: true,
      debug: debugInfo
    });
  } catch (error) {
    console.error('❌ Error en debug headers:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
