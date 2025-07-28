import { NextRequest, NextResponse } from 'next/server';
import { 
  obtenerInstalacionPorId, 
  actualizarInstalacion, 
  eliminarInstalacion
} from '../../../../lib/api/instalaciones';
import { actualizarInstalacionSchema } from '../../../../lib/schemas/instalaciones';

// GET /api/instalaciones/[id] - Obtener instalación por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instalacion = await obtenerInstalacionPorId(params.id);
    
    if (!instalacion) {
      return NextResponse.json(
        { success: false, error: 'Instalación no encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: instalacion });
  } catch (error) {
    console.error('❌ Error obteniendo instalación por ID:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener instalación' },
      { status: 500 }
    );
  }
}

// PUT /api/instalaciones/[id] - Actualizar instalación
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Agregar ID del parámetro al body
    const dataWithId = { ...body, id: params.id };
    
    // Validar datos con Zod
    const validatedData = actualizarInstalacionSchema.parse(dataWithId);
    
    const instalacionActualizada = await actualizarInstalacion(validatedData);
    
    return NextResponse.json({
      success: true,
      data: instalacionActualizada,
      message: 'Instalación actualizada correctamente'
    });
  } catch (error: any) {
    console.error('❌ Error actualizando instalación:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Datos de entrada inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar instalación' },
      { status: 500 }
    );
  }
}

// DELETE /api/instalaciones/[id] - Eliminar instalación
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await eliminarInstalacion(params.id);
    
    return NextResponse.json({
      success: true,
      message: 'Instalación eliminada correctamente'
    });
  } catch (error: any) {
    console.error('❌ Error eliminando instalación:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar instalación' },
      { status: 500 }
    );
  }
}