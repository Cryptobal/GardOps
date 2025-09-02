import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const headers = req.headers;
    const email = headers.get('x-user-email');
    
    console.log('🔍 Debug Clientes Auth - Email recibido:', email);
    
    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'No se recibió header x-user-email',
        debug: { headers: Object.fromEntries(headers.entries()) }
      });
    }

    // Verificar si el usuario existe en la base de datos
    try {
      const { sql } = await import('@vercel/postgres');
      
      console.log('🔍 Buscando usuario en BD con email:', email);
      
      const userCheck = await sql`
        SELECT id, email, rol, activo FROM public.usuarios WHERE lower(email) = lower(${email}) LIMIT 1
      `;

      console.log('🔍 Resultado de búsqueda en BD:', userCheck.rows);

      if (userCheck.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'user-not-found',
          debug: {
            email_buscado: email,
            query_result: userCheck.rows,
            total_rows: userCheck.rows.length
          }
        });
      }

      const user = userCheck.rows[0];
      
      // Verificar permisos
      try {
        const permCheck = await sql`
          SELECT public.fn_usuario_tiene_permiso(${email}, ${'clientes.view'}) as allowed
        `;
        
        const hasPermission = permCheck.rows?.[0]?.allowed === true;
        
        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            rol: user.rol,
            activo: user.activo
          },
          permission: {
            permiso: 'clientes.view',
            allowed: hasPermission,
            check_result: permCheck.rows
          },
          debug: {
            email_buscado: email,
            user_found: true,
            permission_check: hasPermission
          }
        });
      } catch (permError) {
        console.error('❌ Error verificando permiso:', permError);
        return NextResponse.json({
          success: false,
          error: 'permission-check-failed',
          debug: {
            email_buscado: email,
            user_found: true,
            permission_error: permError.message
          }
        });
      }
      
    } catch (dbError) {
      console.error('❌ Error de base de datos:', dbError);
      return NextResponse.json({
        success: false,
        error: 'database-error',
        debug: {
          email_buscado: email,
          db_error: dbError.message
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error general en debug clientes auth:', error);
    return NextResponse.json({
      success: false,
      error: 'general-error',
      debug: {
        error_message: error.message
      }
    }, { status: 500 });
  }
}
