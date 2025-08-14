import { NextRequest, NextResponse } from 'next/server'
import { initializeDefaultUsers } from '../../../lib/api/usuarios'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Inicializando usuarios por defecto...')
    
    await initializeDefaultUsers()
    
    return NextResponse.json({
      success: true,
      message: 'Usuarios por defecto inicializados correctamente',
      credentials: {
        admin: 'admin@gardops.com / admin123',
        supervisor: 'supervisor@gardops.com / super123',
        guardia: 'guardia@gardops.com / guard123'
      }
    })
    
  } catch (error) {
    console.error('❌ Error inicializando usuarios:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error inicializando usuarios por defecto',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
} 