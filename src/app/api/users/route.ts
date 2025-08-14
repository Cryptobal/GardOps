import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers } from '../../../lib/api/usuarios'

export async function GET(request: NextRequest) {
const __req = (typeof req!== 'undefined' ? req : (typeof request !== 'undefined' ? request : (arguments as any)[0]));
const deny = await requireAuthz(__req as any, { resource: 'users', action: 'read:list' });
if (deny) return deny;

  try {
    // En producción aquí verificaríamos que el usuario es admin
    // Por ahora permitimos acceso para debugging
    
    const users = await getAllUsers()
    
    // No devolver las contraseñas
    const safeUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
      rol: user.rol,
      activo: user.activo,
      fechaCreacion: user.fechaCreacion,
      ultimoAcceso: user.ultimoAcceso,
      telefono: user.telefono,
    }))

    return NextResponse.json({
      users: safeUsers,
      total: safeUsers.length
    })

  } catch (error) {
    console.error('Error obteniendo usuarios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 