import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

// GET /api/guardias-test - API de testing sin autenticación
export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'guardias_test', action: 'read:list' });
if (deny) return deny;

  console.log('🔍 API Guardias Test - Iniciando request');
  
  try {
    // Usar un tenant_id fijo para testing
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';
    
    console.log('✅ API Guardias Test - Usando tenant:', tenantId);

    // Query simple para testing
    const result = await query(`
      SELECT 
        g.id,
        g.nombre,
        g.apellido_paterno,
        g.apellido_materno,
        g.rut,
        g.email,
        g.telefono,
        g.activo,
        g.comuna,
        g.fecha_os10
      FROM guardias g
      WHERE g.tenant_id = $1
      ORDER BY g.apellido_paterno, g.apellido_materno, g.nombre
      LIMIT 5
    `, [tenantId]);

    const guardias = result.rows.map((row: any) => ({
      id: row.id,
      nombre_completo: `${row.nombre} ${row.apellido_paterno} ${row.apellido_materno || ''}`.trim(),
      rut: row.rut,
      email: row.email,
      telefono: row.telefono,
      activo: row.activo,
      comuna: row.comuna,
      fecha_os10: row.fecha_os10
    }));

    console.log(`✅ Guardias Test cargados desde Neon: ${guardias.length}`);

    return NextResponse.json({
      guardias,
      total: guardias.length,
      success: true,
      message: 'API de testing funcionando correctamente'
    });

  } catch (error) {
    console.error('❌ Error en API Guardias Test:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 