import { requireAuthz, getSessionAndTenant } from '@/lib/authz-api';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

const ESTADOS_VALIDOS = ['pendiente', 'exitoso', 'no_contesta', 'ocupado', 'incidente', 'cancelado'] as const;
const CONTACTO_TIPOS_VALIDOS = ['instalacion', 'guardia'] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAuthz(req, { resource: 'central_monitoring', action: 'record' });
  if (deny) return deny;

  try {
    const id = params.id;
    const { 
      estado, 
      observaciones, 
      canal = null, 
      contacto_tipo = null,
      contacto_id = null,
      contacto_nombre = null,
      contacto_telefono = null,
      incidente 
    } = await req.json();

    // Validar estado
    if (!ESTADOS_VALIDOS.includes(estado)) {
      return NextResponse.json(
        { success: false, error: 'estado_invalido', estados_validos: ESTADOS_VALIDOS }, 
        { status: 400 }
      );
    }

    // Validar tipo de contacto si se proporciona
    if (contacto_tipo && !CONTACTO_TIPOS_VALIDOS.includes(contacto_tipo)) {
      return NextResponse.json(
        { success: false, error: 'contacto_tipo_invalido', tipos_validos: CONTACTO_TIPOS_VALIDOS }, 
        { status: 400 }
      );
    }

    // Actualizar llamado
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (estado) {
      updateFields.push(`estado = $${paramIndex++}`);
      updateValues.push(estado);
    }

    if (observaciones !== undefined) {
      updateFields.push(`observaciones = $${paramIndex++}`);
      updateValues.push(observaciones);
    }

    if (canal) {
      updateFields.push(`canal = $${paramIndex++}`);
      updateValues.push(canal);
    }

    if (contacto_tipo) {
      updateFields.push(`contacto_tipo = $${paramIndex++}`);
      updateValues.push(contacto_tipo);
    }

    if (contacto_id) {
      updateFields.push(`contacto_id = $${paramIndex++}`);
      updateValues.push(contacto_id);
    }

    if (contacto_nombre) {
      updateFields.push(`contacto_nombre = $${paramIndex++}`);
      updateValues.push(contacto_nombre);
    }

    if (contacto_telefono) {
      updateFields.push(`contacto_telefono = $${paramIndex++}`);
      updateValues.push(contacto_telefono);
    }

    // Siempre actualizar ejecutado_en si no está establecido
    updateFields.push(`ejecutado_en = COALESCE(ejecutado_en, now())`);
    updateFields.push(`updated_at = now()`);

    const updateQuery = `
      UPDATE central_llamados
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    updateValues.push(id);

    const result = await sql.unsafe(updateQuery, updateValues);
    const row = result.rows[0];

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'llamado_no_encontrado' }, 
        { status: 404 }
      );
    }

    // Si es incidente, crear registro en central_incidentes
    if (estado === 'incidente' && incidente) {
      await sql`
        INSERT INTO central_incidentes (
          llamado_id, 
          tipo, 
          severidad, 
          detalle, 
          evidencia_url, 
          tenant_id
        )
        VALUES (
          ${id}, 
          ${incidente.tipo || null}, 
          ${incidente.severidad || null}, 
          ${incidente.detalle || null}, 
          ${incidente.evidencia_url || null}, 
          ${row.tenant_id || null}
        )
      `;
    }

    return NextResponse.json({ 
      success: true, 
      data: row 
    });
  } catch (error) {
    console.error('Error actualizando llamado:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(req, { resource: 'central_monitoring', action: 'record' });
  if (deny) return deny;

  try {
    const llamadoId = params.id;
    const { estado, observaciones, ejecutado_en } = await req.json();
    
    // Obtener información del usuario que está haciendo el registro
    let usuarioId = null;
    let usuarioEmail = process.env.NEXT_PUBLIC_DEV_USER_EMAIL || 'dev@example.com';
    
    // En desarrollo, usar información del usuario de desarrollo
    if (process.env.NODE_ENV !== 'production') {
      // En desarrollo, siempre usar el usuario de desarrollo
      console.log('🔧 Modo desarrollo - usando usuario:', usuarioEmail);
    } else {
      // En producción, obtener la sesión real
      const session = await getSessionAndTenant(req);
      usuarioId = session?.user?.id;
      usuarioEmail = session?.user?.email;
      
      if (!usuarioId) {
        return NextResponse.json(
          { success: false, error: 'Usuario no autenticado' },
          { status: 401 }
        );
      }
    }

    // Validar estado
    const estadosValidos = ['pendiente', 'exitoso', 'no_contesta', 'ocupado', 'incidente', 'cancelado'];
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json(
        { success: false, error: 'Estado no válido' },
        { status: 400 }
      );
    }

    // Actualizar el llamado con auditoría completa
    let updateQuery;
    if (ejecutado_en) {
      updateQuery = sql`
        UPDATE central_llamados 
        SET 
          estado = ${estado},
          observaciones = ${observaciones || null},
          ejecutado_en = ${ejecutado_en}::timestamptz,
          registrado_por_usuario_id = ${usuarioId},
          registrado_por_usuario_email = ${usuarioEmail},
          registrado_en = NOW(),
          updated_at = NOW()
        WHERE id = ${llamadoId}
        RETURNING id, estado, observaciones, ejecutado_en, registrado_por_usuario_email, registrado_en
      `;
    } else {
      updateQuery = sql`
        UPDATE central_llamados 
        SET 
          estado = ${estado},
          observaciones = ${observaciones || null},
          ejecutado_en = NOW(),
          registrado_por_usuario_id = ${usuarioId},
          registrado_por_usuario_email = ${usuarioEmail},
          registrado_en = NOW(),
          updated_at = NOW()
        WHERE id = ${llamadoId}
        RETURNING id, estado, observaciones, ejecutado_en, registrado_por_usuario_email, registrado_en
      `;
    }
    
    const result = await updateQuery;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Llamado no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error actualizando llamado:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const deny = await requireAuthz(req, { resource: 'central_monitoring', action: 'view' });
  if (deny) return deny;

  try {
    const llamadoId = params.id;

    const result = await sql`
      SELECT 
        cl.*,
        i.nombre as instalacion_nombre,
        i.telefono as instalacion_telefono
      FROM central_llamados cl
      LEFT JOIN instalaciones i ON i.id = cl.instalacion_id
      WHERE cl.id = ${llamadoId}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Llamado no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error obteniendo llamado:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

