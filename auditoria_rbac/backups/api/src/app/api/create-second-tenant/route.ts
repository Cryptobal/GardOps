import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { hashPassword } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST() {
  try {
    // Eliminar usuarios y tenant demo anterior si existen
    await query(`DELETE FROM usuarios WHERE email LIKE '%@demo.cl'`);
    await query(`DELETE FROM tenants WHERE nombre = 'Empresa Demo'`);

    const tenantId = uuidv4();
    const rutUnico = `76.987.${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}-3`;

    // Crear el tenant demo
    await query(`
      INSERT INTO tenants (id, nombre, rut) 
      VALUES ($1, $2, $3)
    `, [tenantId, 'Empresa Demo', rutUnico]);

    // Crear los usuarios demo
    const usuarios = [
      {
        id: uuidv4(),
        email: 'admin@demo.cl',
        nombre: 'Admin Demo',
        apellido: 'Sistema',
        password: hashPassword('demo123'),
        rol: 'admin',
        tenant_id: tenantId,
        telefono: '+56 9 1111 1111'
      },
      {
        id: uuidv4(),
        email: 'supervisor@demo.cl',
        nombre: 'Supervisor Demo',
        apellido: 'Prueba',
        password: hashPassword('super123'),
        rol: 'supervisor',
        tenant_id: tenantId,
        telefono: '+56 9 2222 2222'
      },
      {
        id: uuidv4(),
        email: 'guardia@demo.cl',
        nombre: 'Guardia Demo',
        apellido: 'Test',
        password: hashPassword('guard123'),
        rol: 'guardia',
        tenant_id: tenantId,
        telefono: '+56 9 3333 3333'
      }
    ];

    // Insertar usuarios llenando ambas columnas de password
    for (const usuario of usuarios) {
      await query(`
        INSERT INTO usuarios (id, email, nombre, apellido, password_hash, password, rol, tenant_id, telefono, activo, fecha_creacion) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        usuario.id,
        usuario.email,
        usuario.nombre,
        usuario.apellido,
        usuario.password, // password_hash
        usuario.password, // password (mismo valor)
        usuario.rol,
        usuario.tenant_id,
        usuario.telefono,
        true, // activo
        new Date() // fecha_creacion
      ]);
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Tenant demo y usuarios creados correctamente',
      tenantId,
      rut: rutUnico,
      usuarios: usuarios.map(u => ({ email: u.email, rol: u.rol })),
      credenciales: {
        admin: 'admin@demo.cl / demo123',
        supervisor: 'supervisor@demo.cl / super123',
        guardia: 'guardia@demo.cl / guard123'
      }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
} 