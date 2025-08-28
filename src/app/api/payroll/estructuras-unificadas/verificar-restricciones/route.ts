import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { tipo, instalacion_id, rol_servicio_id, guardia_id } = body;

    if (!tipo) {
      return NextResponse.json({ success: false, error: 'Tipo es requerido' }, { status: 400 });
    }

    if (tipo === 'servicio') {
      // Verificar restricción para estructuras de servicio
      if (!instalacion_id || !rol_servicio_id) {
        return NextResponse.json({ 
          success: false, 
          error: 'Instalación y rol de servicio son requeridos para estructuras de servicio' 
        }, { status: 400 });
      }

      const result = await sql`
        SELECT id, activo 
        FROM sueldo_estructuras_servicio 
        WHERE instalacion_id = ${instalacion_id} AND rol_servicio_id = ${rol_servicio_id}
      `;

      if (result.rows.length > 0) {
        const estructura = result.rows[0];
        return NextResponse.json({
          success: false,
          error: 'Ya existe una estructura de servicio para esta instalación y rol',
          data: {
            existe: true,
            activo: estructura.activo,
            id: estructura.id
          }
        }, { status: 409 });
      }

      return NextResponse.json({
        success: true,
        data: { existe: false }
      });

    } else if (tipo === 'guardia') {
      // Verificar restricción para estructuras de guardia
      if (!guardia_id) {
        return NextResponse.json({ 
          success: false, 
          error: 'ID de guardia es requerido para estructuras de guardia' 
        }, { status: 400 });
      }

      const result = await sql`
        SELECT id, activo 
        FROM sueldo_estructura_guardia 
        WHERE guardia_id = ${guardia_id}
      `;

      if (result.rows.length > 0) {
        const estructura = result.rows[0];
        return NextResponse.json({
          success: false,
          error: 'Ya existe una estructura de guardia para este guardia',
          data: {
            existe: true,
            activo: estructura.activo,
            id: estructura.id
          }
        }, { status: 409 });
      }

      return NextResponse.json({
        success: true,
        data: { existe: false }
      });

    } else {
      return NextResponse.json({ success: false, error: 'Tipo de estructura no válido' }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error en POST /api/payroll/estructuras-unificadas/verificar-restricciones:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
