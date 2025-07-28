import { NextRequest, NextResponse } from 'next/server';
import { 
  obtenerInstalaciones, 
  crearInstalacion, 
  actualizarInstalacion, 
  eliminarInstalacion,
  obtenerComunas,
  obtenerClientes
} from '../../../lib/api/instalaciones';
import { crearInstalacionSchema, actualizarInstalacionSchema } from '../../../lib/schemas/instalaciones';
import { query } from '../../../lib/database';

// GET /api/instalaciones - Obtener todas las instalaciones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Si se solicita comunas para filtros
    if (action === 'comunas') {
      const comunas = await obtenerComunas();
      return NextResponse.json({ success: true, data: comunas });
    }

    // Si se solicitan clientes para filtros
    if (action === 'clientes') {
      const clientes = await obtenerClientes();
      return NextResponse.json({ success: true, data: clientes });
    }

    // Obtener todas las instalaciones por defecto
    const instalaciones = await obtenerInstalaciones();
    return NextResponse.json({ success: true, data: instalaciones });
  } catch (error) {
    console.error('❌ Error en GET /api/instalaciones:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener instalaciones' },
      { status: 500 }
    );
  }
}

// POST /api/instalaciones - Crear nueva instalación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar datos con Zod
    const validatedData = crearInstalacionSchema.parse(body);
    
    // La tabla ya existe, no necesitamos verificarla
    
    const nuevaInstalacion = await crearInstalacion(validatedData);
    
    return NextResponse.json(
      { success: true, data: nuevaInstalacion, message: 'Instalación creada correctamente' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Error en POST /api/instalaciones:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Datos de entrada inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear instalación' },
      { status: 500 }
    );
  }
}

// PUT /api/instalaciones - Actualizar instalación
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar datos con Zod
    const validatedData = actualizarInstalacionSchema.parse(body);
    
    const instalacionActualizada = await actualizarInstalacion(validatedData);
    
    return NextResponse.json({
      success: true,
      data: instalacionActualizada,
      message: 'Instalación actualizada correctamente'
    });
  } catch (error: any) {
    console.error('❌ Error en PUT /api/instalaciones:', error);
    
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

// DELETE /api/instalaciones - Eliminar instalación
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de instalación requerido' },
        { status: 400 }
      );
    }
    
    await eliminarInstalacion(id);
    
    return NextResponse.json({
      success: true,
      message: 'Instalación eliminada correctamente'
    });
  } catch (error: any) {
    console.error('❌ Error en DELETE /api/instalaciones:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar instalación' },
      { status: 500 }
    );
  }
}

// Función para asegurar que existe la tabla instalaciones
async function ensureInstalacionesTable() {
  try {
    const checkTable = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'instalaciones'
      );
    `);

    if (!checkTable.rows[0].exists) {
      console.log('📊 Creando tabla instalaciones...');
      
      await query(`
        CREATE TABLE instalaciones (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          nombre TEXT NOT NULL,
          cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
          direccion TEXT,
          latitud FLOAT,
          longitud FLOAT,
          comuna_id UUID REFERENCES comunas(id) ON DELETE SET NULL,
          estado TEXT DEFAULT 'Activo',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      // Crear índices para mejorar rendimiento
      await query(`
        CREATE INDEX idx_instalaciones_cliente ON instalaciones(cliente_id);
        CREATE INDEX idx_instalaciones_comuna ON instalaciones(comuna_id);
        CREATE INDEX idx_instalaciones_nombre ON instalaciones(nombre);
        CREATE INDEX idx_instalaciones_created_at ON instalaciones(created_at);
      `);
      
      console.log('✅ Tabla instalaciones creada exitosamente');
    }
  } catch (error) {
    console.error('❌ Error creando tabla instalaciones:', error);
    throw error;
  }
} 