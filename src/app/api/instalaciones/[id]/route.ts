import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/database';
import { UpdateInstalacionRequest, InstalacionResponse } from '../../../../lib/schemas/instalaciones';

// GET - Obtener instalación por ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Obtener tenant por defecto
    const tenantResult = await query('SELECT id FROM tenants LIMIT 1');
    if (tenantResult.rows.length === 0) {
      return NextResponse.json({ error: 'No hay tenants configurados' }, { status: 400 });
    }
    const tenantId = tenantResult.rows[0].id;

    // Obtener instalación con información del cliente y conteo de guardias
    const result = await query(`
      SELECT 
        i.*,
        c.id as cliente_id,
        c.nombre as cliente_nombre,
        COUNT(DISTINCT g.id) as guardias_count
      FROM instalaciones i
      LEFT JOIN clientes c ON i.cliente_id = c.id
      LEFT JOIN guardias g ON g.id IN (
        SELECT DISTINCT guardia_id 
        FROM pautas_mensuales pm 
        WHERE pm.instalacion_id = i.id
      )
      WHERE i.id = $1 AND i.tenant_id = $2
      GROUP BY i.id, c.id, c.nombre
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Instalación no encontrada' }, { status: 404 });
    }

    const row = result.rows[0];
    const response: InstalacionResponse = {
      instalacion: {
        id: row.id,
        tenant_id: row.tenant_id,
        cliente_id: row.cliente_id,
        nombre: row.nombre,
        direccion: row.direccion,
        codigo: row.codigo,
        tipo: row.tipo,
        telefono: row.telefono,
        observaciones: row.observaciones,
        coordenadas_lat: row.coordenadas_lat ? parseFloat(row.coordenadas_lat) : undefined,
        coordenadas_lng: row.coordenadas_lng ? parseFloat(row.coordenadas_lng) : undefined,
        activo: row.activo,
        creado_en: new Date(row.creado_en),
        actualizado_en: row.actualizado_en ? new Date(row.actualizado_en) : undefined
      },
      cliente: row.cliente_nombre ? {
        id: row.cliente_id,
        nombre: row.cliente_nombre
      } : undefined,
      guardias_count: parseInt(row.guardias_count || 0)
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error obteniendo instalación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar instalación
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body: UpdateInstalacionRequest = await request.json();

    // Obtener tenant por defecto
    const tenantResult = await query('SELECT id FROM tenants LIMIT 1');
    if (tenantResult.rows.length === 0) {
      return NextResponse.json({ error: 'No hay tenants configurados' }, { status: 400 });
    }
    const tenantId = tenantResult.rows[0].id;

    // Verificar que la instalación existe
    const existingInstallation = await query(
      'SELECT id FROM instalaciones WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (existingInstallation.rows.length === 0) {
      return NextResponse.json({ error: 'Instalación no encontrada' }, { status: 404 });
    }

    // Verificar que el cliente existe si se está actualizando
    if (body.cliente_id) {
      const clienteCheck = await query(
        'SELECT id FROM clientes WHERE id = $1 AND tenant_id = $2',
        [body.cliente_id, tenantId]
      );
      if (clienteCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 400 });
      }
    }

    // Verificar código único si se está actualizando
    if (body.codigo) {
      const codigoCheck = await query(
        'SELECT id FROM instalaciones WHERE tenant_id = $1 AND codigo = $2 AND id != $3',
        [tenantId, body.codigo, id]
      );
      if (codigoCheck.rows.length > 0) {
        return NextResponse.json({ error: 'Ya existe otra instalación con ese código' }, { status: 400 });
      }
    }

    // Construir query de actualización dinámicamente
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (body.cliente_id !== undefined) {
      updateFields.push(`cliente_id = $${paramIndex++}`);
      updateValues.push(body.cliente_id || null);
    }
    if (body.nombre !== undefined) {
      updateFields.push(`nombre = $${paramIndex++}`);
      updateValues.push(body.nombre.trim());
    }
    if (body.direccion !== undefined) {
      updateFields.push(`direccion = $${paramIndex++}`);
      updateValues.push(body.direccion.trim());
    }
    if (body.codigo !== undefined) {
      updateFields.push(`codigo = $${paramIndex++}`);
      updateValues.push(body.codigo?.trim() || null);
    }
    if (body.tipo !== undefined) {
      updateFields.push(`tipo = $${paramIndex++}`);
      updateValues.push(body.tipo || null);
    }
    if (body.telefono !== undefined) {
      updateFields.push(`telefono = $${paramIndex++}`);
      updateValues.push(body.telefono?.trim() || null);
    }
    if (body.observaciones !== undefined) {
      updateFields.push(`observaciones = $${paramIndex++}`);
      updateValues.push(body.observaciones?.trim() || null);
    }
    if (body.coordenadas_lat !== undefined) {
      updateFields.push(`coordenadas_lat = $${paramIndex++}`);
      updateValues.push(body.coordenadas_lat || null);
    }
    if (body.coordenadas_lng !== undefined) {
      updateFields.push(`coordenadas_lng = $${paramIndex++}`);
      updateValues.push(body.coordenadas_lng || null);
    }
    if (body.activo !== undefined) {
      updateFields.push(`activo = $${paramIndex++}`);
      updateValues.push(body.activo);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    // Agregar actualizado_en y condiciones WHERE
    updateFields.push(`actualizado_en = $${paramIndex++}`);
    updateValues.push(new Date());
    updateValues.push(id, tenantId);

    const updateQuery = `
      UPDATE instalaciones 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);
    const instalacion = result.rows[0];

    // Obtener información del cliente si existe
    let cliente = undefined;
    if (instalacion.cliente_id) {
      const clienteResult = await query(
        'SELECT id, nombre FROM clientes WHERE id = $1',
        [instalacion.cliente_id]
      );
      if (clienteResult.rows.length > 0) {
        cliente = clienteResult.rows[0];
      }
    }

    // Obtener conteo de guardias
    const guardiasCountResult = await query(`
      SELECT COUNT(DISTINCT g.id) as count
      FROM guardias g
      WHERE g.id IN (
        SELECT DISTINCT guardia_id 
        FROM pautas_mensuales pm 
        WHERE pm.instalacion_id = $1
      )
    `, [id]);

    const response: InstalacionResponse = {
      instalacion: {
        id: instalacion.id,
        tenant_id: instalacion.tenant_id,
        cliente_id: instalacion.cliente_id,
        nombre: instalacion.nombre,
        direccion: instalacion.direccion,
        codigo: instalacion.codigo,
        tipo: instalacion.tipo,
        telefono: instalacion.telefono,
        observaciones: instalacion.observaciones,
        coordenadas_lat: instalacion.coordenadas_lat ? parseFloat(instalacion.coordenadas_lat) : undefined,
        coordenadas_lng: instalacion.coordenadas_lng ? parseFloat(instalacion.coordenadas_lng) : undefined,
        activo: instalacion.activo,
        creado_en: new Date(instalacion.creado_en),
        actualizado_en: instalacion.actualizado_en ? new Date(instalacion.actualizado_en) : undefined
      },
      cliente,
      guardias_count: parseInt(guardiasCountResult.rows[0].count || 0)
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error actualizando instalación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar instalación
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Obtener tenant por defecto
    const tenantResult = await query('SELECT id FROM tenants LIMIT 1');
    if (tenantResult.rows.length === 0) {
      return NextResponse.json({ error: 'No hay tenants configurados' }, { status: 400 });
    }
    const tenantId = tenantResult.rows[0].id;

    // Verificar que la instalación existe
    const existingInstallation = await query(
      'SELECT id FROM instalaciones WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (existingInstallation.rows.length === 0) {
      return NextResponse.json({ error: 'Instalación no encontrada' }, { status: 404 });
    }

    // Verificar si tiene pautas asociadas
    const pautasCheck = await query(
      'SELECT COUNT(*) as count FROM pautas_mensuales WHERE instalacion_id = $1',
      [id]
    );

    if (parseInt(pautasCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar una instalación que tiene pautas asociadas' },
        { status: 400 }
      );
    }

    // Eliminar instalación
    await query(
      'DELETE FROM instalaciones WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    return NextResponse.json({ message: 'Instalación eliminada correctamente' });

  } catch (error) {
    console.error('Error eliminando instalación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}