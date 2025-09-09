import { query } from '../src/lib/database';
import { hashPassword } from '../src/lib/auth';
import { v4 as uuidv4 } from 'uuid';

async function crearUsuariosGard() {
  try {
    console.log('🔧 Iniciando creación de usuarios administradores para Gard...');

    // 1. Verificar si existe el tenant de Gard
    const existingTenant = await query('SELECT id FROM tenants WHERE nombre ILIKE $1', ['%Gard%']);
    let tenantId;

    if (existingTenant.rows.length === 0) {
      // Crear tenant de Gard si no existe
      const newTenant = await query(`
        INSERT INTO tenants (id, nombre, email, telefono, direccion, activo)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING id
      `, [
        uuidv4(),
        'Gard',
        'contacto@gard.cl',
        '+56 9 1234 5678',
        'Santiago, Chile'
      ]);
      tenantId = newTenant.rows[0].id;
      console.log('✅ Tenant Gard creado');
    } else {
      tenantId = existingTenant.rows[0].id;
      console.log('ℹ️ Tenant Gard ya existe');
    }

    // 2. Definir los usuarios a crear
    const usuarios = [
      {
        email: 'jorge.montenegro@gard.cl',
        nombre: 'Jorge',
        apellido: 'Montenegro',
        rol: 'admin',
        telefono: '+56 9 1111 1111'
      },
      {
        email: 'alberto.stein@gard.cl',
        nombre: 'Alberto',
        apellido: 'Stein',
        rol: 'admin',
        telefono: '+56 9 2222 2222'
      },
      {
        email: 'lizeth.gonzalez@gard.cl',
        nombre: 'Lizeth',
        apellido: 'González',
        rol: 'admin',
        telefono: '+56 9 3333 3333'
      },
      {
        email: 'rafael.escalona@gard.cl',
        nombre: 'Rafael',
        apellido: 'Escalona',
        rol: 'admin',
        telefono: '+56 9 4444 4444'
      }
    ];

    const password = 'Gard2025';
    const hashedPassword = hashPassword(password);

    let createdCount = 0;
    let existingCount = 0;

    // 3. Crear cada usuario
    for (const userData of usuarios) {
      try {
        // Verificar si el usuario ya existe
        const existing = await query('SELECT id FROM usuarios WHERE email = $1', [userData.email]);
        
        if (existing.rows.length > 0) {
          existingCount++;
          console.log(`ℹ️ Usuario ${userData.email} ya existe`);
          continue;
        }

        // Crear usuario
        await query(`
          INSERT INTO usuarios (id, tenant_id, email, password, nombre, apellido, rol, telefono, activo, fecha_creacion)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
        `, [
          uuidv4(),
          tenantId,
          userData.email,
          hashedPassword,
          userData.nombre,
          userData.apellido,
          userData.rol,
          userData.telefono
        ]);

        createdCount++;
        console.log(`✅ Usuario creado: ${userData.email} (${userData.nombre} ${userData.apellido}) - Rol: ${userData.rol}`);

      } catch (userError) {
        console.error(`❌ Error creando usuario ${userData.email}:`, userError);
      }
    }

    // 4. Resumen final
    console.log('\n🎉 RESUMEN DE CREACIÓN DE USUARIOS GARD:');
    console.log(`✅ ${createdCount} usuarios nuevos creados`);
    console.log(`ℹ️ ${existingCount} usuarios ya existían`);
    
    if (createdCount > 0) {
      console.log('\n🔑 CREDENCIALES DE ACCESO:');
      console.log('Contraseña para todos los usuarios: Gard2025');
      console.log('\n👑 Usuarios Administradores Gard:');
      usuarios.forEach(user => {
        console.log(`   • ${user.email}`);
      });
      console.log('\n🌐 Accede en: http://localhost:3000/login');
    }

  } catch (error) {
    console.error('❌ Error creando usuarios Gard:', error);
  }
}

// Ejecutar el script
crearUsuariosGard()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en script:', error);
    process.exit(1);
  }); 