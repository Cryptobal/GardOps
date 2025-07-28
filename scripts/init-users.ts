#!/usr/bin/env tsx

import { initializeDefaultUsers } from '../src/lib/api/usuarios'

async function main() {
  console.log('🚀 Inicializando usuarios por defecto...')
  
  try {
    await initializeDefaultUsers()
    console.log('✅ Usuarios inicializados correctamente')
    
    console.log('\n🔑 CREDENCIALES DE ACCESO:')
    console.log('👑 Admin: admin@gardops.com / admin123')
    console.log('👨‍💼 Supervisor: supervisor@gardops.com / super123')
    console.log('👮 Guardia: guardia@gardops.com / guard123')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main() 