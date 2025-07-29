import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/database';
import { UpdateClienteRequest, ClienteResponse } from '../../../../lib/schemas/clientes';

// GET - Obtener cliente por ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Obtener tenant por defecto
    const tenantResult = await query('SELECT id FROM tenants LIMIT 1');
    if (tenantResult.rows.length === 0) {
      return NextResponse.json({ error: 'No hay tenants configurados' }, { status: 400 });
    }
    const tenantId = tenantResult.rows[0].id;

    // Obtener cliente con conteo de instalaciones
    const result = await query(`
      SELECT 
        c.*,
        COUNT(i.id) as instalaciones_count
      FROM clientes c
      LEFT JOIN instalaciones i ON c.id = i.cliente_id AND i.activo = true
      WHERE c.id = $1 AND c.tenant_id = $2
      GROUP BY c.id
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const row = result.rows[0];
    const response: ClienteResponse = {
      cliente: {
        id: row.id,
        tenant_id: row.tenant_id,
        nombre: row.nombre,
        razon_social: row.razon_social,
        rut: row.rut,
        telefono: row.telefono,
        email: row.email,
        direccion: row.direccion,
        contacto_principal: row.contacto_principal,
        activo: row.activo,
        creado_en: new Date(row.creado_en),
        actualizado_en: row.actualizado_en ? new Date(row.actualizado_en) : undefined
      },
      instalaciones_count: parseInt(row.instalaciones_count || 0)
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar cliente
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body: UpdateClienteRequest = await request.json();

    // Obtener tenant por defecto
    const tenantResult = await query('SELECT id FROM tenants LIMIT 1');
    if (tenantResult.rows.length === 0) {
      return NextResponse.json({ error: 'No hay tenants configurados' }, { status: 400 });
    }
    const tenantId = tenantResult.rows[0].id;

    // Verificar que el cliente existe
    const existingClient = await query(
      'SELECT id FROM clientes WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (existingClient.rows.length === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Verificar RUT único si se está actualizando
    if (body.rut) {
      const rutCheck = await query(
        'SELECT id FROM clientes WHERE tenant_id = $1 AND rut = $2 AND id != $3',
        [tenantId, body.rut, id]
      );
      if (rutCheck.rows.length > 0) {
        return NextResponse.json({ error: 'Ya existe otro cliente con ese RUT' }, { status: 400 });
      }
    }

    // Verificar email único si se está actualizando
    if (body.email) {
      const emailCheck = await query(
        'SELECT id FROM clientes WHERE tenant_id = $1 AND email = $2 AND id != $3',
        [tenantId, body.email, id]
      );
      if (emailCheck.rows.length > 0) {
        return NextResponse.json({ error: 'Ya existe otro cliente con ese email' }, { status: 400 });
      }
    }

    // Construir query de actualización dinámicamente
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (body.nombre !== undefined) {
      updateFields.push(`nombre = $${paramIndex++}`);
      updateValues.push(body.nombre.trim());
    }
    if (body.razon_social !== undefined) {
      updateFields.push(`razon_social = $${paramIndex++}`);
      updateValues.push(body.razon_social?.trim() || null);
    }
    if (body.rut !== undefined) {
      updateFields.push(`rut = $${paramIndex++}`);
      updateValues.push(body.rut?.trim() || null);
    }
    if (body.telefono !== undefined) {
      updateFields.push(`telefono = $${paramIndex++}`);
      updateValues.push(body.telefono?.trim() || null);
    }
    if (body.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      updateValues.push(body.email?.trim() || null);
    }
    if (body.direccion !== undefined) {
      updateFields.push(`direccion = $${paramIndex++}`);
      updateValues.push(body.direccion?.trim() || null);
    }
    if (body.contacto_principal !== undefined) {
      updateFields.push(`contacto_principal = $${paramIndex++}`);
      updateValues.push(body.contacto_principal?.trim() || null);
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
      UPDATE clientes 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);
    const cliente = result.rows[0];

    // Obtener conteo de instalaciones
    const countResult = await query(
      'SELECT COUNT(*) as count FROM instalaciones WHERE cliente_id = $1 AND activo = true',
      [id]
    );

    const response: ClienteResponse = {
      cliente: {
        id: cliente.id,
        tenant_id: cliente.tenant_id,
        nombre: cliente.nombre,
        razon_social: cliente.razon_social,
        rut: cliente.rut,
        telefono: cliente.telefono,
        email: cliente.email,
        direccion: cliente.direccion,
        contacto_principal: cliente.contacto_principal,
        activo: cliente.activo,
        creado_en: new Date(cliente.creado_en),
        actualizado_en: cliente.actualizado_en ? new Date(cliente.actualizado_en) : undefined
      },
      instalaciones_count: parseInt(countResult.rows[0].count || 0)
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error actualizando cliente:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar cliente
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Obtener tenant por defecto
    const tenantResult = await query('SELECT id FROM tenants LIMIT 1');
    if (tenantResult.rows.length === 0) {
      return NextResponse.json({ error: 'No hay tenants configurados' }, { status: 400 });
    }
    const tenantId = tenantResult.rows[0].id;

    // Verificar que el cliente existe
    const existingClient = await query(
      'SELECT id FROM clientes WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (existingClient.rows.length === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Verificar si tiene instalaciones asociadas
    const instalacionesCheck = await query(
      'SELECT COUNT(*) as count FROM instalaciones WHERE cliente_id = $1',
      [id]
    );

    if (parseInt(instalacionesCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un cliente que tiene instalaciones asociadas' },
        { status: 400 }
      );
    }

    // Eliminar cliente
    await query(
      'DELETE FROM clientes WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    return NextResponse.json({ message: 'Cliente eliminado correctamente' });

  } catch (error) {
    console.error('Error eliminando cliente:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}