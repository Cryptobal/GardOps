import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Iniciando inserción de datos de prueba...');

    // Verificar conexión
    const connectionTest = await query('SELECT 1');
    if (!connectionTest) {
      return NextResponse.json({ 
        error: 'No se pudo conectar a la base de datos' 
      }, { status: 500 });
    }

    // Obtener tenant por defecto
    const tenantResult = await query('SELECT id FROM tenants LIMIT 1');
    if (tenantResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'No hay tenants configurados. Ejecuta las migraciones primero.' 
      }, { status: 400 });
    }
    const tenantId = tenantResult.rows[0].id;

    const results = [];

    // Verificar si ya existen datos de prueba
    const existingClients = await query('SELECT COUNT(*) as count FROM clientes');
    const clientCount = parseInt(existingClients.rows[0].count);

    if (clientCount > 0) {
      return NextResponse.json({
        message: `Ya existen ${clientCount} clientes en la base de datos. No se agregaron datos de prueba.`,
        existing_data: true
      });
    }

    // Insertar clientes de prueba
    const clientesData = [
      {
        nombre: 'Empresa Demo',
        razon_social: 'Empresa Demo S.A.',
        rut: '12.345.678-9',
        email: 'demo@empresa.com',
        telefono: '+56912345678',
        direccion: 'Av. Providencia 123, Santiago'
      },
      {
        nombre: 'Constructora ABC',
        razon_social: 'Constructora ABC Ltda.',
        rut: '98.765.432-1',
        email: 'contacto@abc.cl',
        telefono: '+56987654321',
        direccion: 'Las Condes 456, Santiago'
      },
      {
        nombre: 'Retail XYZ',
        razon_social: 'Retail XYZ SpA',
        rut: '11.222.333-4',
        email: 'info@retailxyz.cl',
        telefono: '+56911223344',
        direccion: 'Mall Plaza Norte, Santiago'
      }
    ];

    const clienteIds = [];
    for (const cliente of clientesData) {
      const result = await query(`
        INSERT INTO clientes (tenant_id, nombre, razon_social, rut, email, telefono, direccion)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, nombre
      `, [tenantId, cliente.nombre, cliente.razon_social, cliente.rut, cliente.email, cliente.telefono, cliente.direccion]);
      
      clienteIds.push(result.rows[0]);
      results.push(`✅ Cliente creado: ${result.rows[0].nombre}`);
    }

    // Insertar instalaciones de prueba
    const instalacionesData = [
      {
        cliente_idx: 0, // Empresa Demo
        nombre: 'Sucursal Centro',
        direccion: 'Av. Libertador 456, Santiago',
        tipo: 'comercial',
        codigo: 'SUC-001',
        telefono: '+56912345679'
      },
      {
        cliente_idx: 0, // Empresa Demo
        nombre: 'Bodega Principal',
        direccion: 'Parque Industrial 789, Quilicura',
        tipo: 'industrial',
        codigo: 'BOD-001',
        telefono: '+56912345680'
      },
      {
        cliente_idx: 1, // Constructora ABC
        nombre: 'Obra Torre Norte',
        direccion: 'Av. Apoquindo 1000, Las Condes',
        tipo: 'institucional',
        codigo: 'OBR-001',
        telefono: '+56987654322'
      },
      {
        cliente_idx: 2, // Retail XYZ
        nombre: 'Tienda Mall',
        direccion: 'Mall Plaza Norte Local 123',
        tipo: 'comercial',
        codigo: 'TDA-001',
        telefono: '+56911223345'
      },
      {
        cliente_idx: null, // Sin cliente
        nombre: 'Instalación Independiente',
        direccion: 'Av. Independencia 555, Santiago',
        tipo: 'residencial',
        codigo: 'IND-001',
        telefono: '+56955555555'
      }
    ];

    for (const instalacion of instalacionesData) {
      const clienteId = instalacion.cliente_idx !== null ? clienteIds[instalacion.cliente_idx].id : null;
      
      const result = await query(`
        INSERT INTO instalaciones (tenant_id, cliente_id, nombre, direccion, tipo, codigo, telefono)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, nombre
      `, [tenantId, clienteId, instalacion.nombre, instalacion.direccion, instalacion.tipo, instalacion.codigo, instalacion.telefono]);
      
      results.push(`✅ Instalación creada: ${result.rows[0].nombre}`);
    }

    console.log('🌱 Datos de prueba insertados exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Datos de prueba insertados exitosamente',
      results,
      summary: {
        clientes_creados: clientesData.length,
        instalaciones_creadas: instalacionesData.length
      }
    });

  } catch (error) {
    console.error('Error insertando datos de prueba:', error);
    return NextResponse.json({
      error: 'Error insertando datos de prueba',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Endpoint para insertar datos de prueba',
    usage: 'Envía una petición POST para insertar datos de clientes e instalaciones de prueba'
  });
}