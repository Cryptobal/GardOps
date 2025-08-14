import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../lib/database";

export async function GET(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'clientes', action: 'update' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'clientes', action: 'read:detail' });
if (deny) return deny;
 params }: { params: { id: string } }
) {
  try {
    const clienteId = params.id;

    // Obtener el cliente por ID
    const result = await pool.query(
      "SELECT * FROM clientes WHERE id = $1",
      [clienteId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error obteniendo cliente:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'clientes', action: 'update' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'clientes', action: 'read:detail' });
if (deny) return deny;
 params }: { params: { id: string } }
) {
  try {
    const clienteId = params.id;
    const body = await request.json();

    // Verificar si el cliente existe
    const checkResult = await pool.query(
      "SELECT id FROM clientes WHERE id = $1",
      [clienteId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    // Validar si se está intentando inactivar el cliente
    if (body.estado === 'Inactivo') {
      // Verificar si el cliente tiene instalaciones activas
      const instalacionesActivas = await pool.query(
        `SELECT COUNT(*) as count 
         FROM instalaciones 
         WHERE cliente_id = $1 AND estado = 'Activo'`,
        [clienteId]
      );

      if (instalacionesActivas.rows[0].count > 0) {
        // Obtener información detallada de las instalaciones
        const instalacionesDetalle = await pool.query(
          `SELECT id, nombre, estado
           FROM instalaciones 
           WHERE cliente_id = $1
           ORDER BY estado DESC, nombre`,
          [clienteId]
        );

        const instalacionesActivasDetalle = instalacionesDetalle.rows.filter((i: any) => i.estado === 'Activo');
        const instalacionesInactivasDetalle = instalacionesDetalle.rows.filter((i: any) => i.estado === 'Inactivo');

        return NextResponse.json(
          { 
            success: false, 
            error: 'No se puede inactivar el cliente porque tiene instalaciones activas. Primero debe inactivar todas las instalaciones asociadas.',
            instalacionesActivas: instalacionesActivasDetalle,
            instalacionesInactivas: instalacionesInactivasDetalle,
            clienteId: clienteId
          },
          { status: 400 }
        );
      }
    }

    // Actualizar el cliente
    const updateResult = await pool.query(
      `UPDATE clientes SET 
        nombre = $1,
        rut = $2,
        representante_legal = $3,
        rut_representante = $4,
        email = $5,
        telefono = $6,
        direccion = $7,
        latitud = $8,
        longitud = $9,
        ciudad = $10,
        comuna = $11,
        razon_social = $12,
        estado = $13,
        updated_at = NOW()
      WHERE id = $14
      RETURNING *`,
      [
        body.nombre,
        body.rut,
        body.representante_legal,
        body.rut_representante,
        body.email,
        body.telefono,
        body.direccion,
        body.latitud,
        body.longitud,
        body.ciudad,
        body.comuna,
        body.razon_social,
        body.estado,
        clienteId
      ]
    );

    return NextResponse.json({
      success: true,
      data: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Error actualizando cliente:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
} 