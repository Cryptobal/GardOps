import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/database';
import { logCRUD } from '@/lib/logging';

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
    const usuario = 'admin@test.com'; // En producción, obtener del token de autenticación
    
    console.log('✅ API Guardias - Actualizando con datos:', body);

    // Obtener datos anteriores para el log
    const oldDataResult = await query(`
      SELECT * FROM guardias WHERE id = $1 AND tenant_id = $2
    `, [guardiaId, tenantId]);

    if (oldDataResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    const datosAnteriores = oldDataResult.rows[0];

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

    // Convertir estado a booleano para la base de datos
    const activo = body.estado === 'activo';

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
        fecha_os10 = $10,
        banco = $11,
        tipo_cuenta = $12,
        numero_cuenta = $13,
        tipo_guardia = $14,
        activo = $15,
        updated_at = NOW()
      WHERE id = $16 AND tenant_id = $17
      RETURNING *
    `, [
      body.nombre,
      apellidoPaterno,
      apellidoMaterno,
      body.rut,
      body.email,
      body.telefono,
      body.direccion,
      body.ciudad || null,
      body.comuna || null,
      body.fecha_os10 || null,
      body.banco_id || null,
      body.tipo_cuenta || null,
      body.numero_cuenta || null,
      body.tipo_guardia || 'contratado',
      activo,
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

    // Log de actualización
    await logCRUD(
      'guardias',
      guardiaId,
      'UPDATE',
      usuario,
      datosAnteriores,
      guardiaActualizado,
      tenantId
    );

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
      ciudad: guardiaActualizado.ciudad || '',
      comuna: guardiaActualizado.comuna || '',
      estado: guardiaActualizado.activo ? 'activo' : 'inactivo',
      tipo_guardia: guardiaActualizado.tipo_guardia || 'contratado',
      fecha_os10: guardiaActualizado.fecha_os10,
      banco: guardiaActualizado.banco,
      tipo_cuenta: guardiaActualizado.tipo_cuenta,
      numero_cuenta: guardiaActualizado.numero_cuenta,
      created_at: guardiaActualizado.created_at,
      updated_at: guardiaActualizado.updated_at
    };

    return NextResponse.json({
      guardia: guardiaFormateado,
      success: true
    });

  } catch (error) {
    console.error('❌ Error actualizando guardia:', error);
    
    // Log del error
    await logCRUD(
      'guardias',
      params.id,
      'UPDATE',
      'admin@test.com',
      null,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: '/api/guardias/[id]',
        method: 'PUT'
      },
      'accebf8a-bacc-41fa-9601-ed39cb320a52'
    );
    
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
    const usuario = 'admin@test.com';

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

    // Log de lectura (opcional)
    await logCRUD(
      'guardias',
      guardiaId,
      'READ',
      usuario,
      null, // No hay datos anteriores en lectura
      guardia,
      tenantId
    );

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
      ciudad: guardia.ciudad || '',
      comuna: guardia.comuna || '',
      estado: guardia.activo ? 'activo' : 'inactivo',
      tipo_guardia: guardia.tipo_guardia || 'contratado',
      banco: guardia.banco,
      tipo_cuenta: guardia.tipo_cuenta,
      numero_cuenta: guardia.numero_cuenta,
      fecha_os10: guardia.fecha_os10,
      created_at: guardia.created_at,
      updated_at: guardia.updated_at,
      instalacion_nombre: guardia.instalacion_nombre,
      cliente_nombre: guardia.cliente_nombre
    };

    return NextResponse.json(guardiaFormateado);

  } catch (error) {
    console.error('❌ Error obteniendo guardia:', error);
    
    // Log del error
    await logCRUD(
      'guardias',
      params.id,
      'READ',
      'admin@test.com',
      null,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: '/api/guardias/[id]',
        method: 'GET'
      },
      'accebf8a-bacc-41fa-9601-ed39cb320a52'
    );
    
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
    const usuario = 'admin@test.com';
    
    console.log('✅ API Guardias - Actualizando estado con datos:', body);

    // Verificar que se proporcione el estado
    if (!body.estado || !['activo', 'inactivo'].includes(body.estado)) {
      return NextResponse.json(
        { error: 'Estado inválido. Debe ser "activo" o "inactivo"' },
        { status: 400 }
      );
    }

    // Obtener datos anteriores para el log
    const oldDataResult = await query(`
      SELECT * FROM guardias WHERE id = $1 AND tenant_id = $2
    `, [guardiaId, tenantId]);

    if (oldDataResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    const datosAnteriores = oldDataResult.rows[0];

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

    // Log de actualización
    await logCRUD(
      'guardias',
      guardiaId,
      'UPDATE',
      usuario,
      datosAnteriores,
      guardiaActualizado,
      tenantId
    );

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
    
    // Log del error
    await logCRUD(
      'guardias',
      params.id,
      'UPDATE',
      'admin@test.com',
      null,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: '/api/guardias/[id]',
        method: 'PATCH'
      },
      'accebf8a-bacc-41fa-9601-ed39cb320a52'
    );
    
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/guardias/[id] - Eliminar un guardia específico
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 API Guardias - Eliminando guardia:', params.id);
  
  try {
    const guardiaId = params.id;
    
    // Por ahora usar un tenant_id fijo para testing
    const tenantId = 'accebf8a-bacc-41fa-9601-ed39cb320a52';
    const usuario = 'admin@test.com';
    
    console.log('✅ API Guardias - Eliminando guardia con ID:', guardiaId);

    // Obtener datos anteriores para el log
    const oldDataResult = await query(`
      SELECT * FROM guardias WHERE id = $1 AND tenant_id = $2
    `, [guardiaId, tenantId]);

    if (oldDataResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    const datosAnteriores = oldDataResult.rows[0];

    // Verificar si el guardia tiene asignaciones activas
    const asignacionesResult = await query(`
      SELECT COUNT(*) as total_asignaciones
      FROM as_turnos_puestos_operativos 
      WHERE guardia_id = $1 AND activo = true
    `, [guardiaId]);

    const totalAsignaciones = parseInt(asignacionesResult.rows[0].total_asignaciones);

    if (totalAsignaciones > 0) {
      return NextResponse.json(
        { 
          error: 'No se puede eliminar el guardia porque tiene asignaciones activas',
          details: `El guardia tiene ${totalAsignaciones} asignación(es) activa(s)`
        },
        { status: 400 }
      );
    }

    // Query para eliminar el guardia
    const result = await query(`
      DELETE FROM guardias 
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [guardiaId, tenantId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    const guardiaEliminado = result.rows[0];
    console.log('✅ Guardia eliminado exitosamente');

    // Log de eliminación
    await logCRUD(
      'guardias',
      guardiaId,
      'DELETE',
      usuario,
      datosAnteriores,
      null, // No hay datos posteriores en eliminación
      tenantId
    );

    return NextResponse.json({
      success: true,
      message: 'Guardia eliminado exitosamente',
      guardia: guardiaEliminado
    });

  } catch (error) {
    console.error('❌ Error eliminando guardia:', error);
    
    // Log del error
    await logCRUD(
      'guardias',
      params.id,
      'DELETE',
      'admin@test.com',
      null,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: '/api/guardias/[id]',
        method: 'DELETE'
      },
      'accebf8a-bacc-41fa-9601-ed39cb320a52'
    );
    
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}