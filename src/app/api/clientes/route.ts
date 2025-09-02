import { NextRequest, NextResponse } from 'next/server';
import { obtenerClientes, crearCliente, actualizarCliente, eliminarCliente } from '../../../lib/api/clientes';
import { crearClienteSchema, actualizarClienteSchema } from '../../../lib/schemas/clientes';
import { query } from '../../../lib/database';

// Configuración para evitar errores de Dynamic Server Usage
export const dynamic = 'force-dynamic';

// GET /api/clientes - Obtener todos los clientes
export async function GET(req: NextRequest) {
  try {
    // Gate backend: requiere permiso 'clientes.view'
    try {
      const h = req.headers;
      const { getCurrentUserServer } = await import('@/lib/auth');
      const fromJwt = getCurrentUserServer(req as any)?.email || null;
      const fromHeader = h.get('x-user-email') || h.get('x-user-email(next/headers)') || null;
      const isDev = process.env.NODE_ENV !== 'production';
      const dev = isDev ? process.env.NEXT_PUBLIC_DEV_USER_EMAIL : undefined;
      const email = fromJwt || fromHeader || dev || null;
      
      if (!email) {
        console.log('❌ No se pudo obtener email del usuario');
        return NextResponse.json({ ok: false, error: 'no-auth' }, { status: 401 });
      }

      console.log('🔍 Verificando permisos para:', email);

      // Verificar permisos usando el sistema RBAC existente
      const { sql } = await import('@vercel/postgres');
      
      // Primero verificar si el usuario existe
      const userCheck = await sql`
        SELECT id, rol FROM public.usuarios WHERE lower(email) = lower(${email}) LIMIT 1
      `;

      if (userCheck.rows.length === 0) {
        console.log('❌ Usuario no encontrado en BD:', email);
        return NextResponse.json({ ok: false, error: 'user-not-found' }, { status: 403 });
      }

      const user = userCheck.rows[0];
      console.log('✅ Usuario encontrado:', { id: user.id, rol: user.rol });

      // Si es admin, permitir acceso
      if (user.rol === 'admin') {
        console.log('✅ Usuario es admin, permitiendo acceso');
      } else {
        // Verificar permiso específico usando la función helper
        try {
          const permCheck = await sql`
            SELECT public.fn_usuario_tiene_permiso(${email}, ${'clientes.view'}) as allowed
          `;
          
          const hasPermission = permCheck.rows?.[0]?.allowed === true;
          console.log('🔍 Verificación de permiso clientes.view:', hasPermission);
          
          if (!hasPermission) {
            console.log('❌ Usuario no tiene permiso clientes.view');
            return NextResponse.json({ ok: false, error: 'forbidden', perm: 'clientes.view' }, { status: 403 });
          }
        } catch (permError) {
          console.error('❌ Error verificando permiso:', permError);
          // Si falla la verificación de permisos, permitir acceso para admin o en desarrollo
          if (user.rol !== 'admin' && process.env.NODE_ENV === 'production') {
            return NextResponse.json({ ok: false, error: 'permission-check-failed' }, { status: 403 });
          }
        }
      }

      console.log('✅ Permisos verificados, obteniendo clientes...');
      const clientes = await obtenerClientes();
      return NextResponse.json({ success: true, data: clientes });
    } catch (authError) {
      console.error('❌ Error en verificación de permisos:', authError);
      // En desarrollo, permitir acceso si falla la verificación
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ Modo desarrollo: permitiendo acceso por fallo en verificación');
        const clientes = await obtenerClientes();
        return NextResponse.json({ success: true, data: clientes });
      }
      return NextResponse.json({ ok: false, error: 'auth-error' }, { status: 500 });
    }
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
      { success: false, error: error instanceof Error ? error.message : 'Error al crear cliente' },
      { status: 500 }
    );
  }
}

// PUT /api/clientes - Actualizar cliente existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔄 API Clientes - Actualizando cliente:', body);

    // Validar campos requeridos
    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'ID del cliente es requerido' },
        { status: 400 }
      );
    }

    // Intentar actualizar el cliente
    try {
      const clienteActualizado = await actualizarCliente(body);
      
      return NextResponse.json({
        success: true,
        data: clienteActualizado,
        message: 'Cliente actualizado correctamente'
      });
    } catch (error) {
      console.error('❌ Error en actualizarCliente:', error);
      
      // Si es un error de instalaciones activas, devolver información detallada
      if (error instanceof Error && error.message.includes('instalaciones activas')) {
        return NextResponse.json({
          success: false,
          error: error.message,
          instalacionesActivas: (error as any).instalacionesActivas || [],
          instalacionesInactivas: (error as any).instalacionesInactivas || [],
          clienteId: (error as any).clienteId
        }, { status: 400 });
      }
      
      // Para otros errores, devolver mensaje genérico
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Error al actualizar cliente' 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('❌ Error en PUT /api/clientes:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
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
      { success: false, error: error instanceof Error ? error.message : 'Error al eliminar cliente' },
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