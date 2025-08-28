import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  try {
    // Por ahora, permitir a todos los usuarios para testing
    // TODO: Restaurar verificación de autenticación cuando esté listo
    console.log('Endpoint de eliminación llamado');
    
    /*
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    console.log('Usuario autenticado:', session.user.email);
    */
    
    /*
    // Verificar si el usuario es administrador del tenant
    const userEmail = session.user.email;
    const checkAdminQuery = `
      SELECT u.role 
      FROM users u 
      WHERE u.email = $1
    `;
    const adminResult = await sql`SELECT u.role FROM users u WHERE u.email = ${userEmail}`;
    
    if (adminResult.rows.length === 0 || adminResult.rows[0].role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        error: 'Solo los administradores pueden eliminar estructuras' 
      }, { status: 403 });
    }
    */

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const tipo = searchParams.get('tipo');

    console.log('Parámetros recibidos:', { id, tipo });

    if (!id || !tipo) {
      return NextResponse.json({ success: false, error: 'ID y tipo son requeridos' }, { status: 400 });
    }

    if (tipo === 'servicio') {
      console.log('Eliminando estructura de servicio con ID:', id);
      
      // Eliminar estructura de servicio
      const result = await sql`DELETE FROM sueldo_estructuras_servicio WHERE id = ${id} RETURNING *`;

      console.log('Resultado de eliminación:', result.rows.length, 'filas afectadas');

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Estructura de servicio no encontrada' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Estructura de servicio eliminada correctamente'
      });

    } else if (tipo === 'guardia') {
      console.log('Eliminando estructura de guardia con ID:', id);
      
      // Eliminar estructura de guardia (primero el item, luego la estructura)
      const itemResult = await sql`DELETE FROM sueldo_estructura_guardia_item WHERE estructura_guardia_id = ${id}`;
      console.log('Items eliminados:', itemResult.rows.length);

      const result = await sql`DELETE FROM sueldo_estructura_guardia WHERE id = ${id} RETURNING *`;

      console.log('Resultado de eliminación de estructura:', result.rows.length, 'filas afectadas');

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Estructura de guardia no encontrada' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Estructura de guardia eliminada correctamente'
      });

    } else {
      return NextResponse.json({ success: false, error: 'Tipo de estructura no válido' }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error en DELETE /api/payroll/estructuras-unificadas/eliminar:', error);
    console.error('Detalles del error:', error.message);
    return NextResponse.json(
      { success: false, error: `Error interno del servidor: ${error.message}` },
      { status: 500 }
    );
  }
}
