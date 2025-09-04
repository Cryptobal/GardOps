import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/database';
import { logCRUD } from '@/lib/logging';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';
import { getGuardiaConVacacionesActualizadas, formatearDiasVacaciones } from '@/lib/utils/vacaciones';

// PUT /api/guardias/[id] - Actualizar un guardia específico
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 API Guardias - Actualizando guardia:', params.id);
  
  try {
    // Permisos: admin o guardias.edit / rbac.platform_admin
    const email = await getUserEmail(request);
    if (!email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const userId = await getUserIdByEmail(email);
    if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    let allowed = false;
    try {
      const { getCurrentUserServer } = await import('@/lib/auth');
      const u = getCurrentUserServer(request as any);
      allowed = u?.rol === 'admin';
    } catch {}
    if (!allowed) {
      allowed = (await userHasPerm(userId, 'guardias.edit')) || (await userHasPerm(userId, 'rbac.platform_admin'));
    }
    if (!allowed) return NextResponse.json({ error: 'forbidden', perm: 'guardias.edit' }, { status: 403 });

    const guardiaId = params.id;
    const body = await request.json();
    
    // Usar el tenant_id correcto de Gard
    const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337';
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
        latitud = $8,
        longitud = $9,
        ciudad = $10,
        comuna = $11,
        region = $12,
        fecha_os10 = $13,
        banco = $14,
        tipo_cuenta = $15,
        numero_cuenta = $16,
        tipo_guardia = $17,
        activo = $18,
        sexo = $19,
        nacionalidad = $20,
        fecha_nacimiento = $21,
        afp = $22,
        descuento_afp = $23,
        prevision_salud = $24,
        cotiza_sobre_7 = $25,
        monto_pactado_uf = $26,
        es_pensionado = $27,
        asignacion_familiar = $28,
        tramo_asignacion = $29,
        talla_camisa = $30,
        talla_pantalon = $31,
        talla_zapato = $32,
        altura_cm = $33,
        peso_kg = $34,
        updated_at = NOW()
      WHERE id = $35 AND tenant_id = $36
      RETURNING *
    `, [
      body.nombre,
      apellidoPaterno,
      apellidoMaterno,
      body.rut,
      body.email,
      body.telefono,
      body.direccion,
      body.latitud || null,
      body.longitud || null,
      body.ciudad || null,
      body.comuna || null,
      body.region || null,
      body.fecha_os10 || null,
      body.banco_id || null,
      body.tipo_cuenta || null,
      body.numero_cuenta || null,
      body.tipo_guardia || 'contratado',
      activo,
      body.sexo || null,
      body.nacionalidad || null,
      body.fecha_nacimiento || null,
      body.afp || null,
      body.descuento_afp || null,
      body.prevision_salud || null,
      body.cotiza_sobre_7 || null,
      body.monto_pactado_uf || null,
      body.es_pensionado || null,
      body.asignacion_familiar || null,
      body.tramo_asignacion || null,
      body.talla_camisa || null,
      body.talla_pantalon || null,
      body.talla_zapato || null,
      body.altura_cm || null,
      body.peso_kg || null,
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
      updated_at: guardiaActualizado.updated_at,
      
      // Campos del formulario de postulación
      sexo: guardiaActualizado.sexo,
      nacionalidad: guardiaActualizado.nacionalidad,
      fecha_nacimiento: guardiaActualizado.fecha_nacimiento,
      afp: guardiaActualizado.afp,
      descuento_afp: guardiaActualizado.descuento_afp,
      prevision_salud: guardiaActualizado.prevision_salud,
      cotiza_sobre_7: guardiaActualizado.cotiza_sobre_7,
      monto_pactado_uf: guardiaActualizado.monto_pactado_uf,
      es_pensionado: guardiaActualizado.es_pensionado,
      asignacion_familiar: guardiaActualizado.asignacion_familiar,
      tramo_asignacion: guardiaActualizado.tramo_asignacion,
      talla_camisa: guardiaActualizado.talla_camisa,
      talla_pantalon: guardiaActualizado.talla_pantalon,
      talla_zapato: guardiaActualizado.talla_zapato,
      altura_cm: guardiaActualizado.altura_cm,
      peso_kg: guardiaActualizado.peso_kg,
      
      // Campos de postulación
      fecha_postulacion: guardiaActualizado.fecha_postulacion,
      estado_postulacion: guardiaActualizado.estado_postulacion,
      ip_postulacion: guardiaActualizado.ip_postulacion,
      user_agent_postulacion: guardiaActualizado.user_agent_postulacion
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
    
    // Usar el tenant_id correcto de Gard
    const tenantId = '1397e653-a702-4020-9702-3ae4f3f8b337';
    const usuario = 'admin@test.com';

    // Obtener guardia con vacaciones actualizadas automáticamente
    const guardia = await getGuardiaConVacacionesActualizadas(guardiaId);
    
    if (!guardia) {
      return NextResponse.json(
        { error: 'Guardia no encontrado' },
        { status: 404 }
      );
    }

    // Obtener información adicional de instalación y cliente
    const infoAdicional = await query(`
      SELECT 
        i.nombre as instalacion_nombre,
        COALESCE(c.nombre, 'Cliente no encontrado') as cliente_nombre
      FROM guardias g
      LEFT JOIN instalaciones i ON g.instalacion_id = i.id
      LEFT JOIN clientes c ON i.cliente_id = c.id
      WHERE g.id = $1 AND g.tenant_id = $2
    `, [guardiaId, tenantId]);

    const info = infoAdicional.rows[0] || {};
    console.log('✅ Guardia obtenido exitosamente con vacaciones actualizadas');

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
      region: guardia.region || '',
      estado: guardia.activo ? 'activo' : 'inactivo',
      tipo_guardia: guardia.tipo_guardia || 'contratado',
      banco: guardia.banco,
      tipo_cuenta: guardia.tipo_cuenta,
      numero_cuenta: guardia.numero_cuenta,
      fecha_os10: guardia.fecha_os10,
      created_at: guardia.created_at,
      updated_at: guardia.updated_at,
      instalacion_nombre: info.instalacion_nombre,
      cliente_nombre: info.cliente_nombre,
      
      // Campos del formulario de postulación
      sexo: guardia.sexo,
      nacionalidad: guardia.nacionalidad,
      fecha_nacimiento: guardia.fecha_nacimiento,
      afp: guardia.afp,
      descuento_afp: guardia.descuento_afp,
      prevision_salud: guardia.prevision_salud,
      cotiza_sobre_7: guardia.cotiza_sobre_7,
      monto_pactado_uf: guardia.monto_pactado_uf,
      es_pensionado: guardia.es_pensionado,
      asignacion_familiar: guardia.asignacion_familiar,
      tramo_asignacion: guardia.tramo_asignacion,
      talla_camisa: guardia.talla_camisa,
      talla_pantalon: guardia.talla_pantalon,
      talla_zapato: guardia.talla_zapato,
      altura_cm: guardia.altura_cm,
      peso_kg: guardia.peso_kg,
      
      // Campos de postulación
      fecha_postulacion: guardia.fecha_postulacion,
      estado_postulacion: guardia.estado_postulacion,
      ip_postulacion: guardia.ip_postulacion,
      user_agent_postulacion: guardia.user_agent_postulacion,
      
      // Nuevos campos agregados
      monto_anticipo: guardia.monto_anticipo,
      pin: guardia.pin,
      dias_vacaciones_pendientes: guardia.dias_vacaciones_pendientes,
      dias_vacaciones_formateados: formatearDiasVacaciones(guardia.dias_vacaciones_pendientes),
      fecha_ingreso: guardia.fecha_ingreso,
      fecha_finiquito: guardia.fecha_finiquito
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
    // Permisos: admin o guardias.edit / rbac.platform_admin
    const email = await getUserEmail(request);
    if (!email) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const userId = await getUserIdByEmail(email);
    if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    let allowed = false;
    try {
      const { getCurrentUserServer } = await import('@/lib/auth');
      const u = getCurrentUserServer(request as any);
      allowed = u?.rol === 'admin';
    } catch {}
    if (!allowed) {
      allowed = (await userHasPerm(userId, 'guardias.edit')) || (await userHasPerm(userId, 'rbac.platform_admin'));
    }
    if (!allowed) return NextResponse.json({ error: 'forbidden', perm: 'guardias.edit' }, { status: 403 });

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