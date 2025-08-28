import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';

// Definir todos los módulos que deberían existir
const MODULOS_ESPERADOS = [
  'home',
  'clientes', 
  'instalaciones',
  'guardias',
  'pauta_mensual',
  'pauta_diaria',
  'payroll',
  'configuracion',
  'documentos',
  'alertas',
  'asignaciones',
  'turnos_extras',
  'usuarios',
  'roles',
  'permisos',
  'tenants',
  'ppc',
  'estructuras',
  'sueldos',
  'planillas',
  'logs'
];

// Permisos básicos que cada módulo debería tener
const PERMISOS_BASICOS = ['view', 'create', 'edit', 'delete'];

export async function POST(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'admin', action: 'read:list' });
  if (deny) return deny;

  try {
    const email = await getUserEmail(request);
    if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
    const userId = await getUserIdByEmail(email);
    if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });
    
    // Solo Platform Admin puede crear permisos
    const isPlatformAdmin = await userHasPerm(userId, 'rbac.platform_admin');
    if (!isPlatformAdmin) {
      return NextResponse.json({ ok:false, error:'unauthorized', code:'UNAUTHORIZED' }, { status:403 });
    }

    // 1. Obtener todos los permisos existentes
    const permisosResult = await sql`
      SELECT id, clave, descripcion, categoria
      FROM permisos
      ORDER BY categoria NULLS FIRST, clave
    `;

    const permisosExistentes = permisosResult.rows;

    // 2. Identificar permisos faltantes
    const permisosFaltantes: Array<{modulo: string, permiso: string, clave: string, descripcion: string, categoria: string}> = [];

    MODULOS_ESPERADOS.forEach(modulo => {
      PERMISOS_BASICOS.forEach(permisoBasico => {
        const clave = `${modulo}.${permisoBasico}`;
        const existe = permisosExistentes.some(p => p.clave === clave);
        
        if (!existe) {
          permisosFaltantes.push({
            modulo,
            permiso: permisoBasico,
            clave,
            descripcion: `${permisoBasico} ${modulo}`,
            categoria: modulo
          });
        }
      });
    });

    if (permisosFaltantes.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No hay permisos faltantes. Todos los módulos tienen sus permisos básicos.',
        estadisticas: {
          permisosExistentes: permisosExistentes.length,
          permisosFaltantes: 0,
          permisosCreados: 0
        }
      });
    }

    // 3. Crear permisos faltantes
    let creados = 0;
    let errores = 0;
    const erroresDetalle: string[] = [];

    for (const permiso of permisosFaltantes) {
      try {
        const result = await sql`
          INSERT INTO permisos (clave, descripcion, categoria)
          VALUES (${permiso.clave}, ${permiso.descripcion}, ${permiso.categoria})
          ON CONFLICT (clave) DO NOTHING
        `;
        
        if (result.rowCount > 0) {
          creados++;
        }
      } catch (error) {
        errores++;
        erroresDetalle.push(`Error creando ${permiso.clave}: ${error}`);
      }
    }

    // 4. Verificar resultado final
    const permisosFinales = await sql`
      SELECT id, clave, descripcion, categoria
      FROM permisos
      ORDER BY categoria NULLS FIRST, clave
    `;

    // 5. Generar resumen por módulo
    const resumenModulos: Record<string, {total: number, permisos: string[]}> = {};
    MODULOS_ESPERADOS.forEach(modulo => {
      const permisosModulo = permisosFinales.rows.filter(p => p.clave.startsWith(`${modulo}.`));
      resumenModulos[modulo] = {
        total: permisosModulo.length,
        permisos: permisosModulo.map(p => p.clave)
      };
    });

    return NextResponse.json({
      ok: true,
      message: `Proceso completado. ${creados} permisos creados, ${errores} errores.`,
      estadisticas: {
        permisosExistentes: permisosExistentes.length,
        permisosFaltantes: permisosFaltantes.length,
        permisosCreados: creados,
        errores: errores
      },
      permisosCreados: permisosFaltantes.slice(0, creados).map(p => p.clave),
      erroresDetalle: erroresDetalle.length > 0 ? erroresDetalle : undefined,
      resumenModulos,
      permisosFinales: permisosFinales.rows.map(p => ({
        id: p.id,
        clave: p.clave,
        descripcion: p.descripcion,
        categoria: p.categoria
      }))
    });

  } catch (error) {
    console.error('Error creando permisos faltantes:', error);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
