import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

const RESOURCES = [
  'instalaciones',
  'guardias',
  'clientes',
  'usuarios',
  'roles',
  'permisos',
  'pauta_mensual',
  'turnos',
  'puestos_operativos',
  'roles_servicio',
  'payroll',
  'estructuras_servicio',
  'documentos',
  'logs',
  'audit',
  'central_monitoring'
] as const;

const ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'view',
  'record',
  'configure',
  'export'
] as const;

type Resource = typeof RESOURCES[number];
type Action = typeof ACTIONS[number];

interface Permission {
  resource: Resource;
  action: Action;
}

// Mapeo de acciones específicas para central_monitoring
const toPermCode = (resource: string, action: string): string => {
  if (resource === 'central_monitoring') {
    const actionMap: Record<string, string> = {
      'view': 'central_monitoring.view',
      'record': 'central_monitoring.record',
      'configure': 'central_monitoring.configure',
      'export': 'central_monitoring.export'
    };
    return actionMap[action] || `${resource}.${action}`;
  }
  return `${resource}.${action}`;
};

export async function requireAuthz(
  request: NextRequest,
  permission: Permission
): Promise<NextResponse | null> {
  try {
    // Obtener el token de autorización o email de usuario
    const authHeader = request.headers.get('authorization');
    const userEmail = request.headers.get('x-user-email');
    
    let user = null;
    
    // En desarrollo, permitir acceso por email
    if (process.env.NODE_ENV === 'development' && userEmail) {
      console.log('🔍 Auth: Usando email de desarrollo:', userEmail);
      
      const userResult = await sql`
        SELECT u.id, u.email, u.tenant_id
        FROM usuarios u
        WHERE u.email = ${userEmail}
        LIMIT 1
      `;

      if (userResult.rows.length === 0) {
        console.log('❌ Auth: Usuario no encontrado por email:', userEmail);
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 401 }
        );
      }
      
      user = userResult.rows[0];
      console.log('✅ Auth: Usuario encontrado por email:', user.email);
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      // Método tradicional con token Bearer
      const token = authHeader.substring(7);
      
      // Para desarrollo, permitir token dev
      if (token === 'dev-token') {
        return null; // Permitir acceso
      }

      // Obtener usuario por token
      const userResult = await sql`
        SELECT u.id, u.email, u.tenant_id
        FROM usuarios u
        WHERE u.token = ${token}
        LIMIT 1
      `;

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Token inválido' },
          { status: 401 }
        );
      }

      user = userResult.rows[0];
    } else {
      return NextResponse.json(
        { error: 'Token de autorización o email de usuario requerido' },
        { status: 401 }
      );
    }

    // Obtener permisos efectivos del usuario
    const permsResult = await sql`
      SELECT DISTINCT p.clave
      FROM usuarios u
      INNER JOIN usuarios_roles ur ON u.id = ur.usuario_id
      INNER JOIN roles_permisos rp ON ur.rol_id = rp.rol_id
      INNER JOIN permisos p ON rp.permiso_id = p.id
      WHERE u.id = ${user.id}
    `;

    const userPermissions = permsResult.rows.map(row => row.clave);
    console.log('🔍 Auth: Permisos del usuario:', userPermissions);
    
    // Verificar si el usuario tiene el permiso requerido
    const requiredPerm = toPermCode(permission.resource, permission.action);
    console.log('🔍 Auth: Permiso requerido:', requiredPerm);
    
    // Verificar permiso específico o wildcard
    const hasPermission = userPermissions.some(perm => 
      perm === requiredPerm || 
      perm === `${permission.resource}.*` ||
      perm === '*.*'
    );

    if (!hasPermission) {
      console.log('❌ Auth: Permiso denegado. Requerido:', requiredPerm, 'Disponibles:', userPermissions);
      return NextResponse.json(
        { 
          error: 'Permiso denegado',
          required: requiredPerm,
          user_permissions: userPermissions
        },
        { status: 403 }
      );
    }

    console.log('✅ Auth: Permiso concedido para:', requiredPerm);

    // Agregar información del usuario al request para uso posterior
    request.headers.set('x-user-id', user.id);
    request.headers.set('x-user-email', user.email);
    request.headers.set('x-tenant-id', user.tenant_id);

    return null; // Permitir acceso

  } catch (error) {
    console.error('❌ Auth: Error en autorización:', error);
    return NextResponse.json(
      { error: 'Error interno de autorización' },
      { status: 500 }
    );
  }
}
