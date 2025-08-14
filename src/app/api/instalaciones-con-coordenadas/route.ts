import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAndRole, getAuthenticatedUser, AuthenticatedRequest } from '../../../middleware/auth';
import { query } from '@/lib/database';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'instalaciones_con_coordenadas', action: 'read:list' });
if (deny) return deny;

  console.log('🔍 API Instalaciones - Iniciando request');
  
  // Aplicar middleware de autenticación y autorización (supervisor o admin)
  const authResult = requireAuthAndRole('supervisor')(request);
  
  // Si hay error en autenticación/autorización, devolver la respuesta de error
  if (authResult instanceof NextResponse) {
    console.log('❌ API Instalaciones - Error de autenticación:', authResult.status);
    return authResult;
  }
  
  const authenticatedRequest = authResult as AuthenticatedRequest;
  const user = getAuthenticatedUser(authenticatedRequest);
  
  if (!user) {
    console.log('❌ API Instalaciones - Usuario no encontrado');
    return NextResponse.json(
      { success: false, error: 'Usuario no encontrado' },
      { status: 401 }
    );
  }
  
  console.log('✅ API Instalaciones - Usuario autenticado:', user.email, 'Tenant:', user.tenant_id);
  try {
    // Usar el tenant_id del usuario autenticado
    const tenantId = user.tenant_id;

    // Obtener instalaciones con coordenadas
    const result = await query(`
      SELECT 
        i.id,
        i.nombre,
        i.direccion,
        i.latitud,
        i.longitud,
        i.ciudad,
        i.comuna,
        i.estado,
        i.valor_turno_extra,
        c.nombre as cliente_nombre
      FROM instalaciones i
      LEFT JOIN clientes c ON i.cliente_id = c.id
      WHERE i.tenant_id = $1 
        AND i.estado = 'Activo'
        AND i.latitud IS NOT NULL 
        AND i.longitud IS NOT NULL
        AND i.direccion IS NOT NULL 
        AND i.direccion != ''
      ORDER BY i.nombre
    `, [tenantId]);

    const instalaciones = result.rows.map((row: any) => ({
      id: row.id,
      nombre: row.nombre,
      direccion: row.direccion || '',
      ciudad: row.ciudad || '',
      comuna: row.comuna || '',
      latitud: parseFloat(row.latitud),
      longitud: parseFloat(row.longitud),
      estado: row.estado || 'Activo',
      valor_turno_extra: parseFloat(row.valor_turno_extra) || 0,
      cliente_nombre: row.cliente_nombre || ''
    }));

    return NextResponse.json({
      success: true,
      data: instalaciones
    });

  } catch (error) {
    console.error('Error obteniendo instalaciones con coordenadas:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 