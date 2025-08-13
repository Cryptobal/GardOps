import { config } from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
config({ path: path.join(__dirname, '../.env.local') });

import { sql } from '@vercel/postgres';
import { hash } from 'bcryptjs';

async function crearUsuariosPruebaRoles() {
  try {
    console.log('👥 CREANDO USUARIOS DE PRUEBA CON DIFERENTES ROLES\n');

    // ===============================================
    // 1. OBTENER ROLES ACTIVOS
    // ===============================================
    console.log('1️⃣ Obteniendo roles activos...');
    
    const roles = await sql`
      SELECT id, nombre, descripcion, tenant_id
      FROM roles
      WHERE activo = true
      ORDER BY nombre
    `;

    console.log('📋 Roles disponibles:');
    roles.rows.forEach((rol: any) => {
      const tipo = rol.tenant_id ? 'Tenant' : 'Global';
      console.log(`   - ${rol.nombre} (${tipo}): ${rol.descripcion}`);
    });

    // ===============================================
    // 2. CREAR USUARIOS DE PRUEBA
    // ===============================================
    console.log('\n2️⃣ Creando usuarios de prueba...');
    
    const usuariosPrueba = [
      {
        email: 'admin@gard.cl',
        nombre: 'Admin Gard',
        password: 'admin123',
        rol: 'admin'
      },
      {
        email: 'supervisor@gard.cl',
        nombre: 'Supervisor Gard',
        password: 'supervisor123',
        rol: 'supervisor'
      },
      {
        email: 'guardia@gard.cl',
        nombre: 'Guardia Gard',
        password: 'guardia123',
        rol: 'guardia'
      }
    ];

    for (const usuario of usuariosPrueba) {
      try {
        // Verificar si el usuario ya existe
        const usuarioExistente = await sql`
          SELECT id FROM usuarios WHERE email = ${usuario.email}
        `;

        if (usuarioExistente.rows.length > 0) {
          console.log(`   ⚠️  Usuario ${usuario.email} ya existe`);
          continue;
        }

        // Crear usuario
        const hashedPassword = await hash(usuario.password, 12);
        const tenantId = usuario.rol === 'Platform Admin' ? null : 'accebf8a-bacc-41fa-9601-ed39cb320a52';
        
        const nuevoUsuario = await sql`
          INSERT INTO usuarios (email, nombre, apellido, password, rol, tenant_id, activo)
          VALUES (${usuario.email}, ${usuario.nombre}, 'Test', ${hashedPassword}, ${usuario.rol}, ${tenantId}, true)
          RETURNING id
        `;

        const userId = nuevoUsuario.rows[0].id;
        console.log(`   ✅ Usuario ${usuario.email} creado (ID: ${userId})`);

        // Asignar rol RBAC basado en el rol del usuario
        let rolRBAC = null;
        if (usuario.rol === 'admin') {
          rolRBAC = roles.rows.find((r: any) => r.nombre === 'Admin' && r.tenant_id === tenantId);
        } else if (usuario.rol === 'supervisor') {
          rolRBAC = roles.rows.find((r: any) => r.nombre === 'Supervisor' && r.tenant_id === tenantId);
        } else if (usuario.rol === 'guardia') {
          rolRBAC = roles.rows.find((r: any) => r.nombre === 'Operador' && r.tenant_id === tenantId);
        }
        
        if (rolRBAC) {
          await sql`
            INSERT INTO usuarios_roles (usuario_id, rol_id)
            VALUES (${userId}, ${rolRBAC.id})
          `;
          console.log(`   🔗 Rol RBAC ${rolRBAC.nombre} asignado`);
        } else {
          console.log(`   ⚠️  No se pudo asignar rol RBAC para ${usuario.rol}`);
        }

      } catch (error: any) {
        console.log(`   ❌ Error creando ${usuario.email}: ${error.message}`);
      }
    }

    // ===============================================
    // 3. VERIFICAR USUARIOS CREADOS
    // ===============================================
    console.log('\n3️⃣ Verificando usuarios creados...');
    
    const usuariosFinales = await sql`
      SELECT 
        u.email,
        u.nombre,
        u.activo,
        r.nombre as rol,
        r.descripcion as rol_descripcion
      FROM usuarios u
      LEFT JOIN usuarios_roles ur ON ur.usuario_id = u.id
      LEFT JOIN roles r ON r.id = ur.rol_id AND r.activo = true
      WHERE u.email LIKE '%@gard.cl'
      ORDER BY u.email
    `;

    console.log('📊 Usuarios de prueba:');
    usuariosFinales.rows.forEach((usuario: any) => {
      const estado = usuario.activo ? '🟢' : '🔴';
      const rol = usuario.rol || 'Sin rol';
      console.log(`   ${estado} ${usuario.email} (${usuario.nombre}) → ${rol}`);
      if (usuario.rol_descripcion) {
        console.log(`      📝 ${usuario.rol_descripcion}`);
      }
    });

    // ===============================================
    // 4. MOSTRAR CREDENCIALES DE ACCESO
    // ===============================================
    console.log('\n4️⃣ Credenciales de acceso:');
    console.log('🔐 Usa estas credenciales para probar diferentes roles:');
    console.log('');
    
    usuariosPrueba.forEach(usuario => {
      console.log(`👤 ${usuario.nombre} (${usuario.rol})`);
      console.log(`   📧 Email: ${usuario.email}`);
      console.log(`   🔑 Password: ${usuario.password}`);
      console.log('');
    });

    console.log('🎉 USUARIOS DE PRUEBA CREADOS');
    console.log('✅ Puedes usar estas credenciales para probar diferentes niveles de acceso');
    console.log('✅ Cada usuario tiene un rol específico para testing');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

crearUsuariosPruebaRoles().then(() => {
  console.log('\n🏁 Script completado');
  process.exit(0);
});
