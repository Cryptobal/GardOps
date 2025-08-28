import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function PUT(request: NextRequest) {
  try {
    // Por ahora, permitir a todos los usuarios para testing
    // TODO: Restaurar verificación de autenticación cuando esté listo
    console.log('Endpoint de edición llamado');
    
    /*
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    */

    const body = await request.json();
    const { id, tipo, sueldo_base, bono_movilizacion, bono_colacion, bono_responsabilidad } = body;

    if (!id || !tipo) {
      return NextResponse.json({ success: false, error: 'ID y tipo son requeridos' }, { status: 400 });
    }

    if (tipo === 'servicio') {
      // Actualizar estructura de servicio
      const result = await sql`
        UPDATE sueldo_estructuras_servicio 
        SET 
          sueldo_base = ${sueldo_base},
          bono_movilizacion = ${bono_movilizacion},
          bono_colacion = ${bono_colacion},
          bono_responsabilidad = ${bono_responsabilidad}
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Estructura de servicio no encontrada' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: 'Estructura de servicio actualizada correctamente'
      });

    } else if (tipo === 'guardia') {
      // Actualizar estructura de guardia
      const result = await sql`
        UPDATE sueldo_estructura_guardia_item 
        SET 
          monto = ${sueldo_base},
          bono_movilizacion = ${bono_movilizacion},
          bono_colacion = ${bono_colacion},
          bono_responsabilidad = ${bono_responsabilidad}
        WHERE estructura_guardia_id = ${id}
        RETURNING *
      `;

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Estructura de guardia no encontrada' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: result.rows[0],
        message: 'Estructura de guardia actualizada correctamente'
      });

    } else {
      return NextResponse.json({ success: false, error: 'Tipo de estructura no válido' }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error en PUT /api/payroll/estructuras-unificadas/editar:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
