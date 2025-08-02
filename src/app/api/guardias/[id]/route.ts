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

    // Separar apellidos si vienen en un solo campo
    let apellidoPaterno = '';
    let apellidoMaterno = '';
    
    if (body.apellidos) {
      const apellidosArray = body.apellidos.trim().split(' ');
      apellidoPaterno = apellidosArray[0] || '';
      apellidoMaterno = apellidosArray.slice(1).join(' ') || '';
    } else {
      apellidoPaterno = body.apellido_paterno || '';
      apellidoMaterno = body.apellido_materno || '';
    }

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
        updated_at = NOW()
      WHERE id = $8 AND tenant_id = $9
      RETURNING *
    `, [
      body.nombre,
      apellidoPaterno,
      apellidoMaterno,
      body.rut,
      body.email,
      body.telefono,
      body.direccion,
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

    // Formatear la respuesta para que coincida con el frontend
    const guardiaFormateado = {
      id: guardiaActualizado.id,
      nombre: guardiaActualizado.nombre,
      apellidos: `${guardiaActualizado.apellido_paterno} ${guardiaActualizado.apellido_materno}`.trim(),
      rut: guardiaActualizado.rut,
      email: guardiaActualizado.email,
      telefono: guardiaActualizado.telefono,
      direccion: guardiaActualizado.direccion,
      latitud: guardiaActualizado.latitud,
      longitud: guardiaActualizado.longitud,
      estado: guardiaActualizado.activo ? 'activo' : 'inactivo',
      created_at: guardiaActualizado.created_at,
      updated_at: guardiaActualizado.updated_at
    };

    return NextResponse.json({
      guardia: guardiaFormateado,
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
        COALESCE(c.nombre, 'Cliente no encontrado') as cliente_nombre
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

    // Transformar los datos para que coincidan con la interfaz del frontend
    const guardiaFormateado = {
      id: guardia.id,
      nombre: guardia.nombre,
      apellidos: `${guardia.apellido_paterno} ${guardia.apellido_materno}`.trim(),
      rut: guardia.rut,
      email: guardia.email,
      telefono: guardia.telefono,
      direccion: guardia.direccion,
      latitud: guardia.latitud,
      longitud: guardia.longitud,
      estado: guardia.activo ? 'activo' : 'inactivo',
      created_at: guardia.created_at,
      updated_at: guardia.updated_at,
      instalacion_nombre: guardia.instalacion_nombre,
      cliente_nombre: guardia.cliente_nombre
    };

    return NextResponse.json(guardiaFormateado);

  } catch (error) {
    console.error('❌ Error obteniendo guardia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH /api/guardias/[id] - Actualizar estado del guardia
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 API Guardias - Actualizando estado del guardia:', params.id);
  
  try {
    const guardiaId = params.id;
    const body = await request.json();
    
    // Por ahora usar un tenant_id fijo para testing
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';
    
    console.log('✅ API Guardias - Actualizando estado con datos:', body);

    // Verificar que se proporcione el estado
    if (!body.estado || !['activo', 'inactivo'].includes(body.estado)) {
      return NextResponse.json(
        { error: 'Estado inválido. Debe ser "activo" o "inactivo"' },
        { status: 400 }
      );
    }

    // Convertir estado a booleano para la base de datos
    const activo = body.estado === 'activo';

    // Query para actualizar el estado del guardia
    const result = await query(`
      UPDATE guardias 
      SET 
        activo = $1,
        updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `, [activo, guardiaId, tenantId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    const guardiaActualizado = result.rows[0];
    console.log('✅ Estado del guardia actualizado exitosamente');

    // Formatear la respuesta para que coincida con el frontend
    const guardiaFormateado = {
      id: guardiaActualizado.id,
      nombre: guardiaActualizado.nombre,
      apellidos: `${guardiaActualizado.apellido_paterno} ${guardiaActualizado.apellido_materno}`.trim(),
      rut: guardiaActualizado.rut,
      email: guardiaActualizado.email,
      telefono: guardiaActualizado.telefono,
      direccion: guardiaActualizado.direccion,
      latitud: guardiaActualizado.latitud,
      longitud: guardiaActualizado.longitud,
      estado: guardiaActualizado.activo ? 'activo' : 'inactivo',
      created_at: guardiaActualizado.created_at,
      updated_at: guardiaActualizado.updated_at
    };

    return NextResponse.json({
      guardia: guardiaFormateado,
      success: true
    });

  } catch (error) {
    console.error('❌ Error actualizando estado del guardia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}