import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';
import { CreateClienteRequest, ClienteResponse, ClientesListResponse } from '../../../lib/schemas/clientes';

// GET - Listar clientes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // Obtener tenant por defecto (en una app real vendría del contexto de usuario)
    const tenantResult = await query('SELECT id FROM tenants LIMIT 1');
    if (tenantResult.rows.length === 0) {
      return NextResponse.json({ error: 'No hay tenants configurados' }, { status: 400 });
    }
    const tenantId = tenantResult.rows[0].id;

    // Query base para clientes
    let whereClause = 'WHERE c.tenant_id = $1';
    const params: any[] = [tenantId];

    // Filtro de búsqueda
    if (search) {
      whereClause += ' AND (c.nombre ILIKE $2 OR c.razon_social ILIKE $2 OR c.rut ILIKE $2 OR c.email ILIKE $2)';
      params.push(`%${search}%`);
    }

    // Consulta principal con conteo de instalaciones
    const clientesQuery = `
      SELECT 
        c.*,
        COUNT(i.id) as instalaciones_count
      FROM clientes c
      LEFT JOIN instalaciones i ON c.id = i.cliente_id AND i.activo = true
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.nombre
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const clientesResult = await query(clientesQuery, params);

    // Consulta para el total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM clientes c
      ${whereClause}
    `;
    const countParams = search ? [tenantId, `%${search}%`] : [tenantId];
    const countResult = await query(countQuery, countParams);

    const clientes: ClienteResponse[] = clientesResult.rows.map((row: any) => ({
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
    }));

    const response: ClientesListResponse = {
      clientes,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear cliente
export async function POST(request: NextRequest) {
  try {
    const body: CreateClienteRequest = await request.json();

    // Validaciones básicas
    if (!body.nombre?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    // Obtener tenant por defecto
    const tenantResult = await query('SELECT id FROM tenants LIMIT 1');
    if (tenantResult.rows.length === 0) {
      return NextResponse.json({ error: 'No hay tenants configurados' }, { status: 400 });
    }
    const tenantId = tenantResult.rows[0].id;

    // Verificar RUT único si se proporciona
    if (body.rut) {
      const rutCheck = await query(
        'SELECT id FROM clientes WHERE tenant_id = $1 AND rut = $2',
        [tenantId, body.rut]
      );
      if (rutCheck.rows.length > 0) {
        return NextResponse.json({ error: 'Ya existe un cliente con ese RUT' }, { status: 400 });
      }
    }

    // Verificar email único si se proporciona
    if (body.email) {
      const emailCheck = await query(
        'SELECT id FROM clientes WHERE tenant_id = $1 AND email = $2',
        [tenantId, body.email]
      );
      if (emailCheck.rows.length > 0) {
        return NextResponse.json({ error: 'Ya existe un cliente con ese email' }, { status: 400 });
      }
    }

    // Crear cliente
    const result = await query(`
      INSERT INTO clientes (
        tenant_id, nombre, razon_social, rut, telefono, email, 
        direccion, contacto_principal
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      tenantId,
      body.nombre.trim(),
      body.razon_social?.trim() || null,
      body.rut?.trim() || null,
      body.telefono?.trim() || null,
      body.email?.trim() || null,
      body.direccion?.trim() || null,
      body.contacto_principal?.trim() || null
    ]);

    const cliente = result.rows[0];
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
      instalaciones_count: 0
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Error creando cliente:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}