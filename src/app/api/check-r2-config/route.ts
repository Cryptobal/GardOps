import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Verificando configuración de Cloudflare R2...');
    
    const r2Config = {
      NODE_ENV: process.env.NODE_ENV,
      R2_ENDPOINT: process.env.R2_ENDPOINT ? '✅ Configurado' : '❌ No configurado',
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ? '✅ Configurado' : '❌ No configurado',
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? '✅ Configurado' : '❌ No configurado',
      R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || 'gardops-documents (default)',
      R2_PUBLIC_URL: process.env.R2_PUBLIC_URL || '❌ No configurado'
    };
    
    const isProduction = process.env.NODE_ENV === 'production';
    const hasR2Config = process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY;
    
    console.log('📋 Configuración R2:', r2Config);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Configuración R2 verificada',
      config: r2Config,
      isProduction,
      hasR2Config,
      storageMode: isProduction && hasR2Config ? 'cloudflare-r2' : 'database'
    });
    
  } catch (error) {
    console.error('❌ Error verificando configuración R2:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Error verificando configuración R2',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
