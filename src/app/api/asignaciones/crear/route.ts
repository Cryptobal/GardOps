import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getCurrentUserServer } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación usando el sistema personalizado
    const currentUser = getCurrentUserServer(request);
    
    // En producción, permitir acceso si no hay usuario autenticado (modo temporal)
    if (!currentUser && process.env.NODE_ENV === 'production') {
      console.log('🔍 Modo producción: permitiendo acceso sin autenticación estricta');
    } else if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { guardia_id, instalacion_id, fecha, motivo } = await request.json();

    // Validaciones básicas
    if (!guardia_id || !instalacion_id || !fecha) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros obligatorios: guardia_id, instalacion_id, fecha' },
        { status: 400 }
      );
    }

    console.log('🔄 Iniciando asignación:', { guardia_id, instalacion_id, fecha });

    // Verificar que la instalación existe y está activa
    const instalacionResult = await query(`
      SELECT id, nombre FROM instalaciones 
      WHERE id = $1 AND estado = 'Activo'
    `, [instalacion_id]);

    if (instalacionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Instalación no encontrada o inactiva' },
        { status: 404 }
      );
    }

    // Verificar que el guardia existe y está activo
    const guardiaResult = await query(`
      SELECT id, nombre, apellido_paterno, apellido_materno 
      FROM guardias 
      WHERE id = $1 AND activo = true
    `, [guardia_id]);

    if (guardiaResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Guardia no encontrado o inactivo' },
        { status: 404 }
      );
    }

    // Verificar si el guardia ya tiene asignación activa
    const asignacionExistente = await query(`
      SELECT po.id, i.nombre as instalacion_nombre
      FROM as_turnos_puestos_operativos po
      JOIN instalaciones i ON po.instalacion_id = i.id
      WHERE po.guardia_id = $1 
        AND po.es_ppc = false 
        AND po.activo = true
    `, [guardia_id]);

    if (asignacionExistente.rows.length > 0) {
      const instalacionActual = asignacionExistente.rows[0].instalacion_nombre;
      return NextResponse.json(
        { 
          success: false, 
          error: `El guardia ya tiene una asignación activa en ${instalacionActual}` 
        },
        { status: 409 }
      );
    }

    // Buscar un PPC disponible en la instalación
    const ppcDisponible = await query(`
      SELECT po.id, rs.nombre as rol_nombre
      FROM as_turnos_puestos_operativos po
      JOIN as_turnos_roles_servicio rs ON po.rol_id = rs.id
      WHERE po.instalacion_id = $1 
        AND po.es_ppc = true 
        AND po.activo = true
        AND po.guardia_id IS NULL
      ORDER BY po.creado_en ASC
      LIMIT 1
    `, [instalacion_id]);

    if (ppcDisponible.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay puestos disponibles en esta instalación' },
        { status: 404 }
      );
    }

    const ppc = ppcDisponible.rows[0];

    // Asignar el guardia al PPC
    await query(`
      UPDATE as_turnos_puestos_operativos 
      SET 
        guardia_id = $1,
        es_ppc = false,
        actualizado_en = NOW()
      WHERE id = $2
    `, [guardia_id, ppc.id]);

    const guardia = guardiaResult.rows[0];
    const instalacion = instalacionResult.rows[0];

    console.log('✅ Asignación completada exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Guardia asignado exitosamente',
      data: {
        guardia: {
          id: guardia.id,
          nombre: `${guardia.nombre} ${guardia.apellido_paterno} ${guardia.apellido_materno || ''}`.trim()
        },
        instalacion: {
          id: instalacion.id,
          nombre: instalacion.nombre
        },
        rol: ppc.rol_nombre,
        ppc_id: ppc.id
      }
    });

  } catch (error) {
    console.error('❌ Error en asignación:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
