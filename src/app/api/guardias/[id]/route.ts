import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/database';

// PUT /api/guardias/[id] - Actualizar un guardia específico
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 API Guardias - Actualizando guardia:', params.id);
  
  try {
    const guardiaId = params.id;
    const body = await request.json();
    
    // Por ahora usar un tenant_id fijo para testing
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';
    
    console.log('✅ API Guardias - Actualizando con datos:', body);

    // Query para actualizar el guardia
    const result = await query(`
      UPDATE guardias 
      SET 
        nombre = $1,
        apellido_paterno = $2,
        apellido_materno = $3,
        rut = $4,
        email = $5,
        telefono = $6,
        direccion = $7,
        ciudad = $8,
        comuna = $9,
        activo = $10,
        latitud = $11,
        longitud = $12,
        updated_at = NOW()
      WHERE id = $13 AND tenant_id = $14
      RETURNING *
    `, [
      body.nombre,
      body.apellido_paterno,
      body.apellido_materno || '',
      body.rut,
      body.email,
      body.telefono,
      body.direccion,
      body.ciudad,
      body.comuna,
      body.estado === 'Activo',
      body.latitud,
      body.longitud,
      guardiaId,
      tenantId
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    const guardiaActualizado = result.rows[0];
    console.log('✅ Guardia actualizado exitosamente');

    return NextResponse.json({
      guardia: guardiaActualizado,
      success: true
    });

  } catch (error) {
    console.error('❌ Error actualizando guardia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/guardias/[id] - Obtener un guardia específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 API Guardias - Obteniendo guardia:', params.id);
  
  try {
    const guardiaId = params.id;
    
    // Por ahora usar un tenant_id fijo para testing
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';

    const result = await query(`
      SELECT 
        g.*,
        i.nombre as instalacion_nombre,
        c.nombre as cliente_nombre
      FROM guardias g
      LEFT JOIN instalaciones i ON g.instalacion_id = i.id
      LEFT JOIN clientes c ON i.cliente_id = c.id
      WHERE g.id = $1 AND g.tenant_id = $2
    `, [guardiaId, tenantId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    const guardia = result.rows[0];
    console.log('✅ Guardia obtenido exitosamente');

    return NextResponse.json({
      guardia,
      success: true
    });

  } catch (error) {
    console.error('❌ Error obteniendo guardia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}