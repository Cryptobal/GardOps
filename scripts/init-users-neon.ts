#!/usr/bin/env tsx

import { Pool } from 'pg'

// URL directa de Neon (reemplaza con tu URL real)
const DATABASE_URL = "postgresql://neondb_owner:npg_TPizlICq5N6D@ep-gentle-bush-ad6zia51-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

// Crear pool de conexión
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function query(text: string, params?: any[]): Promise<any> {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

async function initializeDefaultUsers(): Promise<void> {
  try {
    console.log('👥 Inicializando usuarios por defecto...')

    // Limpiar usuarios con contraseñas temporales primero
    await query(`
      DELETE FROM usuarios 
      WHERE password = 'temp123' 
      OR email LIKE 'user%@gardops.com'
    `)

    // Obtener el tenant por defecto
    const tenantResult = await query('SELECT id FROM tenants LIMIT 1')
    if (tenantResult.rows.length === 0) {
      console.error('❌ No se encontró ningún tenant')
      return
    }

    const defaultTenantId = tenantResult.rows[0].id

    const defaultUsers = [
      {
        email: 'admin@gardops.com',
        password: 'admin123',
        nombre: 'Administrador',
        apellido: 'Sistema',
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
    ]

    let createdCount = 0
    let existingCount = 0

    for (const userData of defaultUsers) {
      try {
        // Verificar si el usuario ya existe
        const existing = await query('SELECT id FROM usuarios WHERE email = $1', [userData.email])
        
        if (existing.rows.length > 0) {
          existingCount++
          console.log(`ℹ️ Usuario ${userData.email} ya existe`)
          continue
        }

        // Hash simple de la contraseña (en producción usar bcrypt)
        const hashedPassword = `hashed_${userData.password}`

        // Crear usuario
        await query(`
          INSERT INTO usuarios (tenant_id, email, password, nombre, apellido, rol, telefono, activo, fecha_creacion)
          VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
        `, [defaultTenantId, userData.email, hashedPassword, userData.nombre, userData.apellido, userData.rol, userData.telefono])

        createdCount++
        console.log(`✅ Usuario creado: ${userData.email} (${userData.nombre} ${userData.apellido}) - Rol: ${userData.rol}`)

      } catch (userError) {
        console.error(`❌ Error creando usuario ${userData.email}:`, userError)
      }
    }

    if (createdCount > 0) {
      console.log(`✅ ${createdCount} usuarios por defecto creados en base de datos`)
    }
    
    if (existingCount > 0) {
      console.log(`ℹ️ ${existingCount} usuarios ya existían en base de datos`)
    }

    if (createdCount === 0 && existingCount === 0) {
      console.log('⚠️ No se crearon usuarios nuevos')
    }

    console.log('\n🔑 CREDENCIALES DE ACCESO:')
    console.log('👑 Admin: admin@gardops.com / admin123')
    console.log('👨‍💼 Supervisor: supervisor@gardops.com / super123')
    console.log('👮 Guardia: guardia@gardops.com / guard123')
    console.log('🌐 Accede en: https://gard-ops.vercel.app/login')

  } catch (error) {
    console.error('❌ Error inicializando usuarios por defecto:', error)
    throw error
  }
}

async function main() {
  console.log('🚀 Inicializando usuarios por defecto en NEON...')
  console.log('🔗 Conectando a:', DATABASE_URL.replace(/:[^:@]*@/, ':***@'))
  
  try {
    await initializeDefaultUsers()
    console.log('✅ Usuarios inicializados correctamente')
    
    console.log('\n🔑 CREDENCIALES DE ACCESO:')
    console.log('👑 Admin: admin@gardops.com / admin123')
    console.log('👨‍💼 Supervisor: supervisor@gardops.com / super123')
    console.log('👮 Guardia: guardia@gardops.com / guard123')
    console.log('\n🌐 Accede en: https://gard-ops.vercel.app/login')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main() 