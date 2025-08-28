import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(
  request: NextRequest,
  {

 params }: { params: { id: string } }
) {
  try {
    const instalacionId = params.id;

    const result = await sql`
      SELECT 
        i.id,
        i.nombre,
        i.cliente_id,
        COALESCE(c.nombre, 'Cliente no encontrado') as cliente_nombre,
        i.direccion,
        i.latitud,
        i.longitud,
        i.ciudad,
        i.comuna,
        i.telefono,
        i.valor_turno_extra,
        i.estado,
        i.created_at,
        i.updated_at
      FROM instalaciones i
      LEFT JOIN clientes c ON i.cliente_id = c.id
      WHERE i.id = ${instalacionId}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Instalación no encontrada' },
        { status: 404 }
      );
    }

    const instalacion = result.rows[0];

    return NextResponse.json({
      success: true,
      data: instalacion
    });
  } catch (error) {
    console.error('Error obteniendo instalación:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(request, { resource: 'instalaciones', action: 'update' });
  if (deny) return deny;

  try {
    const instalacionId = params.id;
    const body = await request.json();
    const { estado, telefono, nombre, direccion, valor_turno_extra, cliente_id } = body;

    // Validar que al menos un campo se esté actualizando
    if (estado === undefined && telefono === undefined && nombre === undefined && 
        direccion === undefined && valor_turno_extra === undefined && cliente_id === undefined) {
      return NextResponse.json(
        { success: false, error: 'Se requiere al menos un campo para actualizar' },
        { status: 400 }
      );
    }

    // Validar formato de teléfono si se proporciona
    if (telefono !== undefined && telefono && !/^[0-9]{9}$/.test(telefono)) {
      return NextResponse.json(
        { success: false, error: 'El teléfono debe tener exactamente 9 dígitos' },
        { status: 400 }
      );
    }

    // Construir la consulta dinámicamente usando sql template
    let result;
    
    if (nombre !== undefined) {
      result = await sql`
        UPDATE instalaciones 
        SET nombre = ${nombre}, updated_at = now()
        WHERE id = ${instalacionId}
        RETURNING *
      `;
    } else if (direccion !== undefined) {
      result = await sql`
        UPDATE instalaciones 
        SET direccion = ${direccion}, updated_at = now()
        WHERE id = ${instalacionId}
        RETURNING *
      `;
    } else if (valor_turno_extra !== undefined) {
      result = await sql`
        UPDATE instalaciones 
        SET valor_turno_extra = ${valor_turno_extra}, updated_at = now()
        WHERE id = ${instalacionId}
        RETURNING *
      `;
    } else if (cliente_id !== undefined) {
      result = await sql`
        UPDATE instalaciones 
        SET cliente_id = ${cliente_id}, updated_at = now()
        WHERE id = ${instalacionId}
        RETURNING *
      `;
    } else if (estado !== undefined && telefono !== undefined) {
      result = await sql`
        UPDATE instalaciones 
        SET estado = ${estado}, telefono = ${telefono}, updated_at = now()
        WHERE id = ${instalacionId}
        RETURNING *
      `;
    } else if (estado !== undefined) {
      result = await sql`
        UPDATE instalaciones 
        SET estado = ${estado}, updated_at = now()
        WHERE id = ${instalacionId}
        RETURNING *
      `;
    } else if (telefono !== undefined) {
      result = await sql`
        UPDATE instalaciones 
        SET telefono = ${telefono}, updated_at = now()
        WHERE id = ${instalacionId}
        RETURNING *
      `;
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Instalación no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error actualizando instalación:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}