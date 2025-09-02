import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    console.log('🧪 Probando autenticación...');

    // Obtener email del usuario
    const h = req.headers;
    const fromHeader = h.get('x-user-email') || h.get('x-user-email(next/headers)') || null;
    const isDev = process.env.NODE_ENV !== 'production';
    const dev = isDev ? process.env.NEXT_PUBLIC_DEV_USER_EMAIL : undefined;
    const email = fromHeader || dev || null;

    if (!email) {
      return NextResponse.json({ 
        success: false, 
        error: 'No se pudo obtener email del usuario',
        headers: Object.fromEntries(h.entries())
      }, { status: 401 });
    }

    console.log('📧 Email del usuario:', email);

    // Verificar si el usuario existe
    const userCheck = await sql`
      SELECT id, email, rol, tenant_id, activo 
      FROM public.usuarios 
      WHERE lower(email) = lower(${email}) 
      LIMIT 1
    `;

    if (userCheck.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Usuario no encontrado en BD',
        email,
        suggestion: 'Verificar que el usuario esté creado en la tabla usuarios'
      }, { status: 404 });
    }

    const user = userCheck.rows[0];
    console.log('✅ Usuario encontrado:', user);

    // Verificar permisos básicos
    const permissionsToCheck = ['clientes.view', 'instalaciones.view', 'guardias.view'];
    const permissionResults: Record<string, boolean> = {};

    for (const permission of permissionsToCheck) {
      try {
        const permCheck = await sql`
          SELECT public.fn_usuario_tiene_permiso(${email}, ${permission}) as allowed
        `;
        permissionResults[permission] = permCheck.rows?.[0]?.allowed === true;
      } catch (error) {
        console.error(`❌ Error verificando permiso ${permission}:`, error);
        permissionResults[permission] = false;
      }
    }

    // Verificar si la función de permisos existe
    let functionExists = false;
    try {
      const funcCheck = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.routines 
          WHERE routine_name = 'fn_usuario_tiene_permiso'
          AND routine_schema = 'public'
        ) as exists
      `;
      functionExists = funcCheck.rows?.[0]?.exists === true;
    } catch (error) {
      console.error('❌ Error verificando función:', error);
    }

    // Verificar estructura de tablas RBAC
    const rbacTables = ['usuarios', 'roles', 'permisos', 'usuarios_roles', 'roles_permisos'];
    const tableStatus: Record<string, boolean> = {};

    for (const table of rbacTables) {
      try {
        const tableCheck = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          ) as exists
        `;
        tableStatus[table] = tableCheck.rows?.[0]?.exists === true;
      } catch (error) {
        tableStatus[table] = false;
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        rol: user.rol,
        tenant_id: user.tenant_id,
        activo: user.activo
      },
      permissions: permissionResults,
      rbac: {
        function_exists: functionExists,
        tables: tableStatus
      },
      environment: {
        node_env: process.env.NODE_ENV,
        dev_email: process.env.NEXT_PUBLIC_DEV_USER_EMAIL
      }
    });

  } catch (error) {
    console.error('❌ Error en test-auth:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
