import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function PUT(request: NextRequest) {
  try {
    // Por ahora, permitir a todos los usuarios para testing
    // TODO: Restaurar verificación de autenticación cuando esté listo
    console.log('Endpoint de cambio de estado llamado');
    
    /*
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    */

    const body = await request.json();
    const { id, tipo, activo } = body;

    if (!id || !tipo || typeof activo !== 'boolean') {
      return NextResponse.json({ success: false, error: 'ID, tipo y estado son requeridos' }, { status: 400 });
    }

    if (tipo === 'servicio') {
      // Actualizar estado de estructura de servicio
      let result;
      if (!activo) {
        result = await sql`
          UPDATE sueldo_estructuras_servicio 
          SET 
            activo = ${activo},
            fecha_inactivacion = NOW()
          WHERE id = ${id}
          RETURNING *
        `;
      } else {
        result = await sql`
          UPDATE sueldo_estructuras_servicio 
          SET 
            activo = ${activo},
            fecha_inactivacion = NULL
          WHERE id = ${id}
          RETURNING *
        `;
      }

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Estructura de servicio no encontrada' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: `Estructura de servicio ${activo ? 'activada' : 'inactivada'} correctamente`
      });

    } else if (tipo === 'guardia') {
      // Actualizar estado de estructura de guardia
      let result;
      if (!activo) {
        result = await sql`
          UPDATE sueldo_estructura_guardia 
          SET 
            activo = ${activo},
            vigencia_hasta = NOW()
          WHERE id = ${id}
          RETURNING *
        `;
      } else {
        result = await sql`
          UPDATE sueldo_estructura_guardia 
          SET 
            activo = ${activo},
            vigencia_hasta = NULL
          WHERE id = ${id}
          RETURNING *
        `;
      }

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Estructura de guardia no encontrada' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: `Estructura de guardia ${activo ? 'activada' : 'inactivada'} correctamente`
      });

    } else {
      return NextResponse.json({ success: false, error: 'Tipo de estructura no válido' }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error en PUT /api/payroll/estructuras-unificadas/estado:', error);
    console.error('Detalles del error:', error.message);
    return NextResponse.json(
      { success: false, error: `Error interno del servidor: ${error.message}` },
      { status: 500 }
    );
  }
}
