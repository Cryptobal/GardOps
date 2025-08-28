import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// DELETE - Eliminar estructura por ID (solo administradores)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🗑️ DELETE /api/payroll/estructuras-unificadas/[id]/delete - Iniciando...');
  
  try {
    // Verificar permisos de administrador
    const maybeDeny = await requireAuthz(request as any, { resource: 'payroll', action: 'delete' });
    if (maybeDeny && (maybeDeny as any).status === 403) {
      console.log('❌ Acceso denegado por permisos');
      return maybeDeny;
    }
    console.log('✅ Permisos verificados correctamente');
  } catch (error) {
    console.log('⚠️ Error verificando permisos:', error);
  }

  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Se requiere ID de estructura' },
        { status: 400 }
      );
    }

    console.log('🗑️ Eliminando estructura con ID:', id);

    // Primero verificar si la estructura existe y determinar su tipo
    const checkQuery = `
      SELECT 
        CASE 
          WHEN es.id IS NOT NULL THEN 'servicio'
          WHEN seg.id IS NOT NULL THEN 'guardia'
          ELSE NULL
        END as tipo
      FROM (SELECT 1) as dummy
      LEFT JOIN sueldo_estructuras_servicio es ON es.id = $1
      LEFT JOIN sueldo_estructura_guardia seg ON seg.id = $1
    `;

    const checkResult = await query(checkQuery, [id]);
    
    if (!checkResult.rows || checkResult.rows.length === 0 || !checkResult.rows[0].tipo) {
      return NextResponse.json(
        { success: false, error: 'Estructura no encontrada' },
        { status: 404 }
      );
    }

    const tipo = checkResult.rows[0].tipo;
    console.log('📊 Tipo de estructura:', tipo);

    // Eliminar según el tipo
    if (tipo === 'servicio') {
      // Eliminar estructura de servicio
      const deleteQuery = `DELETE FROM sueldo_estructuras_servicio WHERE id = $1`;
      const result = await query(deleteQuery, [id]);
      
      if (result.rowCount === 0) {
        return NextResponse.json(
          { success: false, error: 'No se pudo eliminar la estructura de servicio' },
          { status: 500 }
        );
      }
      
      console.log('✅ Estructura de servicio eliminada');
    } else if (tipo === 'guardia') {
      // Eliminar estructura de guardia (primero items, luego estructura)
      const deleteItemsQuery = `DELETE FROM sueldo_estructura_guardia_item WHERE estructura_guardia_id = $1`;
      const deleteStructureQuery = `DELETE FROM sueldo_estructura_guardia WHERE id = $1`;
      
      await query(deleteItemsQuery, [id]);
      const result = await query(deleteStructureQuery, [id]);
      
      if (result.rowCount === 0) {
        return NextResponse.json(
          { success: false, error: 'No se pudo eliminar la estructura de guardia' },
          { status: 500 }
        );
      }
      
      console.log('✅ Estructura de guardia eliminada');
    }

    const response = {
      success: true,
      message: `Estructura de ${tipo} eliminada correctamente`
    };

    console.log('✅ Enviando respuesta exitosa');
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error al eliminar estructura:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

