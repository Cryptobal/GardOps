import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// PUT - Inactivar una estructura base específica (solo marca activo=false)
export async function PUT(
  request: NextRequest,
  {

 params }: { params: { estructuraId: string } }
) {
  const { estructuraId } = params;
  try {
    const current = await query(
      `SELECT id, rol_servicio_id, activo FROM sueldo_estructuras_servicio WHERE id = $1 LIMIT 1`,
      [estructuraId]
    );
    const row = Array.isArray(current) ? current[0] : (current.rows || [])[0];
    if (!row) return NextResponse.json({ error: 'Estructura no encontrada' }, { status: 404 });

    if (row.activo === false) {
      return NextResponse.json({ success: true });
    }

    await query(
      `UPDATE sueldo_estructuras_servicio
       SET activo = false, fecha_inactivacion = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [estructuraId]
    );

    await query(
      `INSERT INTO sueldo_historial_estructuras (
         rol_servicio_id, estructura_id, accion, fecha_accion, detalles, usuario_id, datos_anteriores, datos_nuevos
       ) VALUES ($1, $2, 'INACTIVACION', NOW(), $3, NULL, $4, $5)`,
      [row.rol_servicio_id, row.id, 'Inactivación de estructura', { activo: true }, { activo: false }]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error inactivando estructura específica:', error);
    return NextResponse.json({ error: 'Error inactivando estructura' }, { status: 500 });
  }
}

