#!/usr/bin/env tsx

import dotenv from 'dotenv'

// Cargar variables de entorno de producción
dotenv.config({ path: '.env.local' })

// Verificar que tenemos la URL de la base de datos
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no está configurada')
  console.log('💡 Asegúrate de tener un archivo .env.local con DATABASE_URL')
  process.exit(1)
}

console.log('🔗 Conectando a:', process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@'))

import { initializeDefaultUsers } from '../src/lib/api/usuarios'

async function main() {
  console.log('🚀 Inicializando usuarios por defecto en PRODUCCIÓN...')
  
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
  }
}

main() 