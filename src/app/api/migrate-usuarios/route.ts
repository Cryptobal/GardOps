import { requireAuthz } from '@/lib/authz-api'
import { NextResponse } from 'next/server';
import { query } from '../../../lib/database';
import { hashPassword } from '../../../lib/auth';

export async function GET() {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'migrate_usuarios', action: 'read:list' });
if (deny) return deny;

  try {
    console.log('🔧 Iniciando migración completa de usuarios...');

    // 1. Crear tabla tenants si no existe
    await query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre TEXT NOT NULL,
        email TEXT,
        telefono TEXT,
        direccion TEXT,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla tenants verificada');

    // 2. Crear tenant por defecto si no existe
    const existingTenant = await query('SELECT id FROM tenants LIMIT 1');
    let tenantId;
    
    if (existingTenant.rows.length === 0) {
      const newTenant = await query(`
        INSERT INTO tenants (nombre, email, telefono, direccion)
        VALUES ('GardOps Empresa', 'carlos.irigoyen@gard.cl', '+56 9 1234 5678', 'Santiago, Chile')
        RETURNING id
      `);
      tenantId = newTenant.rows[0].id;
      console.log('✅ Tenant por defecto creado');
    } else {
      tenantId = existingTenant.rows[0].id;
      console.log('ℹ️ Tenant ya existe');
    }

    // 3. Eliminar tabla usuarios existente si tiene estructura incorrecta
    try {
      await query('DROP TABLE IF EXISTS usuarios CASCADE;');
      console.log('🗑️ Tabla usuarios anterior eliminada');
    } catch (error) {
      console.log('ℹ️ No había tabla usuarios anterior o error al eliminar:', error);
    }

    // 4. Crear tabla usuarios con estructura correcta
    await query(`
      CREATE TABLE usuarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL,
        rol TEXT NOT NULL CHECK (rol IN ('admin', 'supervisor', 'guardia')),
        activo BOOLEAN DEFAULT true,
        fecha_creacion TIMESTAMP DEFAULT NOW(),
        ultimo_acceso TIMESTAMP,
        telefono TEXT,
        avatar TEXT
      );
    `);
    console.log('✅ Tabla usuarios creada con estructura correcta');

    // 5. Crear índices para optimizar consultas
    await query(`
      CREATE INDEX idx_usuarios_email ON usuarios(email);
      CREATE INDEX idx_usuarios_tenant ON usuarios(tenant_id);
      CREATE INDEX idx_usuarios_rol ON usuarios(rol);
      CREATE INDEX idx_usuarios_activo ON usuarios(activo);
    `);
    console.log('✅ Índices creados');

    // 6. Crear usuarios por defecto
    const usuarios = [
      {
        email: 'carlos.irigoyen@gard.cl',
        password: 'admin123',
        nombre: 'Carlos',
        apellido: 'Irigoyen',
        rol: 'admin',
        telefono: '+56 9 1234 5678'
      },
      {
        email: 'supervisor@gardops.com',
        password: 'super123',
        nombre: 'Juan',
        apellido: 'Supervisor',
        rol: 'supervisor',
        telefono: '+56 9 8765 4321'
      },
      {
        email: 'guardia@gardops.com',
        password: 'guard123',
        nombre: 'Pedro',
        apellido: 'Guardia',
        rol: 'guardia',
        telefono: '+56 9 5555 5555'
      }
    ];

    let createdUsers = 0;
    for (const userData of usuarios) {
      try {
        // Hash de la contraseña
        const hashedPassword = hashPassword(userData.password);

        // Crear usuario
        await query(`
          INSERT INTO usuarios (tenant_id, email, password, nombre, apellido, rol, telefono, activo, fecha_creacion)
          VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
        `, [tenantId, userData.email, hashedPassword, userData.nombre, userData.apellido, userData.rol, userData.telefono]);

        createdUsers++;
        console.log(`✅ Usuario creado: ${userData.email} (${userData.rol})`);
      } catch (userError) {
        console.error(`❌ Error creando usuario ${userData.email}:`, userError);
      }
    }

    const response = {
      success: true,
      message: 'Migración de usuarios completada exitosamente',
      details: {
        tenantCreated: existingTenant.rows.length === 0,
        usersCreated: createdUsers,
        totalUsers: usuarios.length,
        tablesRecreated: true
      },
      credentials: {
        admin: { email: 'carlos.irigoyen@gard.cl', password: 'admin123' },
        supervisor: { email: 'supervisor@gardops.com', password: 'super123' },
        guardia: { email: 'guardia@gardops.com', password: 'guard123' }
      }
    };

    console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('🔑 CREDENCIALES DE ACCESO:');
    console.log('👑 Admin: carlos.irigoyen@gard.cl / admin123');
    console.log('👨‍💼 Supervisor: supervisor@gardops.com / super123');
    console.log('👮 Guardia: guardia@gardops.com / guard123');
    console.log(`🌐 Accede en: http://localhost:${process.env.PORT || 3001}/login`);
    console.log('\n🎯 Ahora puedes hacer login con carlos.irigoyen@gard.cl / admin123');

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error en migración de usuarios:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error en migración de usuarios',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 