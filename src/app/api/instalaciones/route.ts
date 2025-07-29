import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';
import { CreateInstalacionRequest, InstalacionResponse, InstalacionesListResponse } from '../../../lib/schemas/instalaciones';

// GET - Listar instalaciones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const cliente_id = searchParams.get('cliente_id') || '';
    const tipo = searchParams.get('tipo') || '';
    const offset = (page - 1) * limit;

    // Obtener tenant por defecto
    const tenantResult = await query('SELECT id FROM tenants LIMIT 1');
    if (tenantResult.rows.length === 0) {
      return NextResponse.json({ error: 'No hay tenants configurados' }, { status: 400 });
    }
    const tenantId = tenantResult.rows[0].id;

    // Query base para instalaciones
    let whereClause = 'WHERE i.tenant_id = $1';
    const params: any[] = [tenantId];

    // Filtros
    if (search) {
      whereClause += ` AND (i.nombre ILIKE $${params.length + 1} OR i.direccion ILIKE $${params.length + 1} OR i.codigo ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    if (cliente_id) {
      whereClause += ` AND i.cliente_id = $${params.length + 1}`;
      params.push(cliente_id);
    }

    if (tipo) {
      whereClause += ` AND i.tipo = $${params.length + 1}`;
      params.push(tipo);
    }

    // Consulta principal con información del cliente y conteo de guardias
    const instalacionesQuery = `
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
      ${whereClause}
      GROUP BY i.id, c.id, c.nombre
      ORDER BY i.nombre
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const instalacionesResult = await query(instalacionesQuery, params);

    // Consulta para el total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM instalaciones i
      ${whereClause}
    `;
    const countParams = params.slice(0, -2); // Remover limit y offset
    const countResult = await query(countQuery, countParams);

    const instalaciones: InstalacionResponse[] = instalacionesResult.rows.map((row: any) => ({
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
    }));

    const response: InstalacionesListResponse = {
      instalaciones,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error obteniendo instalaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear instalación
export async function POST(request: NextRequest) {
  try {
    const body: CreateInstalacionRequest = await request.json();

    // Validaciones básicas
    if (!body.nombre?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }
    if (!body.direccion?.trim()) {
      return NextResponse.json({ error: 'La dirección es requerida' }, { status: 400 });
    }

    // Obtener tenant por defecto
    const tenantResult = await query('SELECT id FROM tenants LIMIT 1');
    if (tenantResult.rows.length === 0) {
      return NextResponse.json({ error: 'No hay tenants configurados' }, { status: 400 });
    }
    const tenantId = tenantResult.rows[0].id;

    // Verificar que el cliente existe si se proporciona
    if (body.cliente_id) {
      const clienteCheck = await query(
        'SELECT id FROM clientes WHERE id = $1 AND tenant_id = $2',
        [body.cliente_id, tenantId]
      );
      if (clienteCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 400 });
      }
    }

    // Verificar código único si se proporciona
    if (body.codigo) {
      const codigoCheck = await query(
        'SELECT id FROM instalaciones WHERE tenant_id = $1 AND codigo = $2',
        [tenantId, body.codigo]
      );
      if (codigoCheck.rows.length > 0) {
        return NextResponse.json({ error: 'Ya existe una instalación con ese código' }, { status: 400 });
      }
    }

    // Crear instalación
    const result = await query(`
      INSERT INTO instalaciones (
        tenant_id, cliente_id, nombre, direccion, codigo, tipo, telefono,
        observaciones, coordenadas_lat, coordenadas_lng
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      tenantId,
      body.cliente_id || null,
      body.nombre.trim(),
      body.direccion.trim(),
      body.codigo?.trim() || null,
      body.tipo || null,
      body.telefono?.trim() || null,
      body.observaciones?.trim() || null,
      body.coordenadas_lat || null,
      body.coordenadas_lng || null
    ]);

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
      guardias_count: 0
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Error creando instalación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}