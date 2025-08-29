import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAndRole, getAuthenticatedUser, AuthenticatedRequest } from '@/lib/auth';
import { query } from '@/lib/database';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('🔍 API Guardias - Iniciando request');
  
  // Aplicar middleware de autenticación y autorización (supervisor o admin)
  const authResult = requireAuthAndRole('supervisor')(request);
  
  // Si hay error en autenticación/autorización, devolver la respuesta de error
  if (authResult instanceof NextResponse) {
    console.log('❌ API Guardias - Error de autenticación:', authResult.status);
    return authResult;
  }
  
  const authenticatedRequest = authResult as AuthenticatedRequest;
  const user = getAuthenticatedUser(authenticatedRequest);
  
  if (!user) {
    console.log('❌ API Guardias - Usuario no encontrado');
    return NextResponse.json(
      { success: false, error: 'Usuario no encontrado' },
      { status: 401 }
    );
  }
  
  console.log('✅ API Guardias - Usuario autenticado:', user.email, 'Tenant:', user.tenant_id);
  try {
    // Usar el tenant_id del usuario autenticado
    const tenantId = user.tenant_id;
    console.log('🔍 API Guardias - Ejecutando query con tenant_id:', tenantId);

    // Obtener guardias activos (con o sin coordenadas)
    const result = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido,
        g.latitud,
        g.longitud,
        g.ciudad,
        g.comuna,
        g.region,
        g.email,
        g.telefono,
        g.activo as estado,
        g.rut
      FROM guardias g
      WHERE g.tenant_id = $1 
        AND g.activo = true
      ORDER BY g.apellido, g.nombre
    `, [tenantId]);
    
    console.log('✅ API Guardias - Query ejecutada, filas encontradas:', result.rows.length);

    const guardias = result.rows.map((row: any) => ({
      id: row.id,
      nombre: `${row.nombre} ${row.apellido}`,
      direccion: `${row.ciudad || ''} ${row.comuna || ''} ${row.region || ''}`.trim() || 'Sin ubicación',
      ciudad: row.ciudad || '',
      comuna: row.comuna || '',
      region: row.region || '',
      latitud: row.latitud ? parseFloat(row.latitud) : null,
      longitud: row.longitud ? parseFloat(row.longitud) : null,
      email: row.email || '',
      telefono: row.telefono || '',
      estado: row.estado || 'Activo',
      rut: row.rut || ''
    }));
    
    console.log('✅ API Guardias - Mapeo completado, guardias procesados:', guardias.length);

    return NextResponse.json({
      success: true,
      data: guardias
    });

  } catch (error) {
    console.error('❌ API Guardias - Error obteniendo guardias con coordenadas:', error);
    console.error('❌ API Guardias - Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 