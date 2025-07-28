import { NextRequest, NextResponse } from 'next/server';
import { obtenerClientes, crearCliente, actualizarCliente, eliminarCliente } from '../../../lib/api/clientes';
import { crearClienteSchema, actualizarClienteSchema } from '../../../lib/schemas/clientes';
import { query } from '../../../lib/database';

// GET /api/clientes - Obtener todos los clientes
export async function GET() {
  try {
    const clientes = await obtenerClientes();
    return NextResponse.json({ success: true, data: clientes });
  } catch (error) {
    console.error('❌ Error en GET /api/clientes:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener clientes' },
      { status: 500 }
    );
  }
}

// POST /api/clientes - Crear nuevo cliente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar datos con Zod
    const validatedData = crearClienteSchema.parse(body);
    
    // Verificar que la tabla existe, si no, crearla
    await ensureClientesTable();
    
    const nuevoCliente = await crearCliente(validatedData);
    
    return NextResponse.json(
      { success: true, data: nuevoCliente, message: 'Cliente creado correctamente' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Error en POST /api/clientes:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Datos de entrada inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear cliente' },
      { status: 500 }
    );
  }
}

// PUT /api/clientes - Actualizar cliente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar datos con Zod
    const validatedData = actualizarClienteSchema.parse(body);
    
    const clienteActualizado = await actualizarCliente(validatedData);
    
    return NextResponse.json({
      success: true,
      data: clienteActualizado,
      message: 'Cliente actualizado correctamente'
    });
  } catch (error: any) {
    console.error('❌ Error en PUT /api/clientes:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Datos de entrada inválidos', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar cliente' },
      { status: 500 }
    );
  }
}

// DELETE /api/clientes - Eliminar cliente
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de cliente requerido' },
        { status: 400 }
      );
    }
    
    await eliminarCliente(id);
    
    return NextResponse.json({
      success: true,
      message: 'Cliente eliminado correctamente'
    });
  } catch (error: any) {
    console.error('❌ Error en DELETE /api/clientes:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar cliente' },
      { status: 500 }
    );
  }
}

// Función para asegurar que existe la tabla clientes
async function ensureClientesTable() {
  try {
    const checkTable = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clientes'
      );
    `);

    if (!checkTable.rows[0].exists) {
      console.log('📊 Creando tabla clientes...');
      
      await query(`
        CREATE TABLE clientes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nombre TEXT NOT NULL,
          rut_representante TEXT NOT NULL,
          email TEXT,
          telefono TEXT,
          direccion TEXT,
          latitud FLOAT,
          longitud FLOAT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      // Crear índices para mejorar rendimiento
      await query(`
        CREATE INDEX idx_clientes_rut ON clientes(rut_representante);
        CREATE INDEX idx_clientes_nombre ON clientes(nombre);
        CREATE INDEX idx_clientes_created_at ON clientes(created_at);
      `);
      
      console.log('✅ Tabla clientes creada exitosamente');
    }
  } catch (error) {
    console.error('❌ Error creando tabla clientes:', error);
    throw error;
  }
} 