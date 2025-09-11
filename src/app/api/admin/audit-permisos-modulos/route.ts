import { requireAuthz } from '@/lib/authz-api'
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserEmail, getUserIdByEmail, userHasPerm } from '@/lib/auth/rbac';

// Configurar como ruta dinámica para evitar prerendering
export const dynamic = 'force-dynamic';

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

export async function GET(request: NextRequest) {
  const deny = await requireAuthz(request, { resource: 'admin', action: 'read:list' });
  if (deny) return deny;

  try {
    const email = await getUserEmail(request);
    if (!email) return NextResponse.json({ ok:false, error:'unauthenticated', code:'UNAUTHENTICATED' }, { status:401 });
    const userId = await getUserIdByEmail(email);
    if (!userId) return NextResponse.json({ ok:false, error:'user_not_found', code:'NOT_FOUND' }, { status:401 });
    
    // Solo Platform Admin puede hacer auditoría
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

    // 2. Analizar permisos por módulo
    const analisisModulos: Record<string, {
      permisos: string[],
      faltantes: string[],
      extras: string[]
    }> = {};

    // Inicializar análisis para cada módulo esperado
    MODULOS_ESPERADOS.forEach(modulo => {
      analisisModulos[modulo] = {
        permisos: [],
        faltantes: [],
        extras: []
      };
    });

    // Clasificar permisos existentes por módulo
    permisosExistentes.forEach(permiso => {
      const clave = permiso.clave;
      
      // Buscar el módulo correspondiente
      let moduloEncontrado = false;
      
      for (const modulo of MODULOS_ESPERADOS) {
        if (clave.startsWith(modulo + '.')) {
          analisisModulos[modulo].permisos.push(clave);
          moduloEncontrado = true;
          break;
        }
      }

      // Si no coincide con ningún módulo esperado, buscar otros patrones
      if (!moduloEncontrado) {
        if (clave.includes('rbac')) {
          analisisModulos['roles'].permisos.push(clave);
        } else if (clave.includes('admin')) {
          analisisModulos['usuarios'].permisos.push(clave);
        }
      }
    });

    // Verificar permisos faltantes y extras para cada módulo
    MODULOS_ESPERADOS.forEach(modulo => {
      const analisis = analisisModulos[modulo];
      const permisosModulo = analisis.permisos;
      
      if (permisosModulo.length === 0) {
        analisis.faltantes = PERMISOS_BASICOS;
      } else {
        // Verificar permisos básicos faltantes
        PERMISOS_BASICOS.forEach(permisoBasico => {
          const permisoCompleto = `${modulo}.${permisoBasico}`;
          if (!permisosModulo.includes(permisoCompleto)) {
            analisis.faltantes.push(permisoBasico);
          }
        });

        // Identificar permisos extras
        permisosModulo.forEach(permiso => {
          const accion = permiso.split('.')[1];
          if (!PERMISOS_BASICOS.includes(accion)) {
            analisis.extras.push(accion);
          }
        });
      }
    });

    // 3. Calcular estadísticas
    let modulosSinPermisos = 0;
    let modulosIncompletos = 0;
    let modulosCompletos = 0;
    let totalFaltantes = 0;

    MODULOS_ESPERADOS.forEach(modulo => {
      const analisis = analisisModulos[modulo];
      if (analisis.permisos.length === 0) {
        modulosSinPermisos++;
      } else if (analisis.faltantes.length > 0) {
        modulosIncompletos++;
      } else {
        modulosCompletos++;
      }
      totalFaltantes += analisis.faltantes.length;
    });

    // 4. Generar lista de permisos que faltan crear
    const permisosFaltantes: Array<{modulo: string, permiso: string, sql: string}> = [];
    MODULOS_ESPERADOS.forEach(modulo => {
      const analisis = analisisModulos[modulo];
      if (analisis.faltantes.length > 0) {
        analisis.faltantes.forEach(permiso => {
          permisosFaltantes.push({
            modulo,
            permiso,
            sql: `INSERT INTO permisos (clave, descripcion, categoria) VALUES ('${modulo}.${permiso}', '${permiso} ${modulo}', '${modulo}');`
          });
        });
      }
    });

    return NextResponse.json({
      ok: true,
      auditoria: {
        estadisticas: {
          totalPermisos: permisosExistentes.length,
          modulosCompletos,
          modulosIncompletos,
          modulosSinPermisos,
          totalModulos: MODULOS_ESPERADOS.length,
          totalFaltantes
        },
        analisisModulos,
        permisosFaltantes,
        permisosExistentes: permisosExistentes.map(p => ({
          id: p.id,
          clave: p.clave,
          descripcion: p.descripcion,
          categoria: p.categoria
        }))
      }
    });

  } catch (error) {
    console.error('Error en auditoría de permisos:', error);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
