import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Obtener bonos disponibles
export async function GET(request: NextRequest) {
  console.log('🔍 GET /api/payroll/bonos - Iniciando...');
  
  try {
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'read:list' });
    if (maybeDeny && (maybeDeny as any).status === 403) {
      console.log('❌ Acceso denegado por permisos');
      return maybeDeny;
    }
    console.log('✅ Permisos verificados correctamente');
  } catch (error) {
    console.log('⚠️ Error verificando permisos:', error);
  }

  try {
    // Obtener bonos disponibles
    const bonosQuery = `
      SELECT 
        id,
        nombre,
        descripcion,
        imponible,
        activo
      FROM sueldo_bonos_globales
      WHERE activo = true
      ORDER BY nombre
    `;

    console.log('📊 Ejecutando consulta de bonos...');
    
    const result = await query(bonosQuery);

    console.log('📊 Bonos encontrados:', result.rows?.length || 0);

    const response = {
      success: true,
      data: result.rows || []
    };

    console.log('✅ Enviando respuesta exitosa');
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error al obtener bonos:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
