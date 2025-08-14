import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'estructuras_sueldo', action: 'delete' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'estructuras_sueldo', action: 'update' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'estructuras_sueldo', action: 'read:detail' });
if (deny) return deny;
 params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || '1';

    const query = 'SELECT * FROM get_estructura_sueldo_by_id($1, $2)';
    const result = await sql.query(query, [id, tenantId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Estructura de sueldo no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener estructura de sueldo:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'estructuras_sueldo', action: 'delete' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'estructuras_sueldo', action: 'update' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'estructuras_sueldo', action: 'read:detail' });
if (deny) return deny;
 params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { 
      rol_id, 
      nombre, 
      descripcion, 
      sueldo_base, 
      bonificacion_nocturna, 
      bonificacion_festivo, 
      bonificacion_riesgo, 
      bonificacion_zona, 
      bonificacion_especialidad, 
      bonificacion_antiguedad, 
      bonificacion_presentismo, 
      bonificacion_rendimiento, 
      bonificacion_transporte, 
      bonificacion_alimentacion, 
      bonificacion_otros, 
      descuento_afp, 
      descuento_salud, 
      descuento_impuesto, 
      descuento_otros, 
      activo, 
      tenantId = '1' 
    } = body;

    if (!nombre || !sueldo_base) {
      return NextResponse.json(
        { success: false, error: 'El nombre y sueldo_base son requeridos' },
        { status: 400 }
      );
    }

    const query = `
      SELECT * FROM update_estructura_sueldo(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      )
    `;
    
    const params = [
      id, rol_id, nombre, descripcion, sueldo_base, bonificacion_nocturna, 
      bonificacion_festivo, bonificacion_riesgo, bonificacion_zona, 
      bonificacion_especialidad, bonificacion_antiguedad, bonificacion_presentismo, 
      bonificacion_rendimiento, bonificacion_transporte, bonificacion_alimentacion, 
      bonificacion_otros, descuento_afp, descuento_salud, descuento_impuesto, 
      descuento_otros, activo, tenantId
    ];

    const result = await sql.query(query, params);

    if (result.rows[0]?.error) {
      return NextResponse.json(
        { success: false, error: result.rows[0].error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Estructura de sueldo actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar estructura de sueldo:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'estructuras_sueldo', action: 'delete' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'estructuras_sueldo', action: 'update' });
if (deny) return deny;

const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'estructuras_sueldo', action: 'read:detail' });
if (deny) return deny;
 params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || '1';

    const query = 'SELECT * FROM delete_estructura_sueldo($1, $2)';
    const result = await sql.query(query, [id, tenantId]);

    if (result.rows[0]?.error) {
      return NextResponse.json(
        { success: false, error: result.rows[0].error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Estructura de sueldo eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar estructura de sueldo:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
