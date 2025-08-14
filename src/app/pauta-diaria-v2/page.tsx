import { Authorize, GuardButton, can } from '@/lib/authz-ui'
import { redirect } from 'next/navigation'
import { isFlagEnabled } from '@/lib/flags'
import { unstable_noStore as noStore } from 'next/cache'
import pool from '@/lib/database'
import VersionBanner from '@/components/VersionBanner'
import ClientTable from '@/app/pauta-diaria-v2/ClientTable'
import { PautaRow } from './types'
import { toYmd, toDisplay } from '@/lib/date'

// Forzar respuesta dinámica sin caché
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getRows(fecha: string, incluirLibres: boolean = false): Promise<PautaRow[]> {
  noStore();
  
  try {
    console.log(`🔍 Obteniendo datos de pauta diaria para fecha: ${fecha}, incluirLibres: ${incluirLibres}`);
    
    const { rows } = await pool.query<PautaRow>(`
      SELECT 
        pd.*,
        CASE 
          WHEN pd.meta->>'cobertura_guardia_id' IS NOT NULL THEN
            CONCAT(g.apellido_paterno, ' ', g.apellido_materno, ', ', g.nombre)
          ELSE NULL
        END AS cobertura_guardia_nombre
      FROM as_turnos_v_pauta_diaria_dedup pd
      LEFT JOIN guardias g ON g.id::text = pd.meta->>'cobertura_guardia_id'
      WHERE pd.fecha = $1
      ORDER BY pd.es_ppc DESC, pd.instalacion_nombre NULLS LAST, pd.puesto_id, pd.pauta_id DESC
    `, [fecha]);
    
    console.log(`✅ Datos obtenidos exitosamente: ${rows.length} registros`);
    
    // Si no hay datos, verificar si hay datos disponibles en otras fechas
    if (rows.length === 0) {
      console.log(`⚠️ No hay datos para la fecha ${fecha}, verificando fechas disponibles...`);
      
      const { rows: fechasDisponibles } = await pool.query(`
        SELECT DISTINCT fecha 
        FROM as_turnos_v_pauta_diaria_dedup 
        ORDER BY fecha 
        LIMIT 5
      `);
      
      if (fechasDisponibles.length > 0) {
        console.log(`📅 Fechas disponibles: ${fechasDisponibles.map(r => r.fecha).join(', ')}`);
      } else {
        console.log(`❌ No hay datos de pauta diaria disponibles en el sistema`);
      }
    }
    
    return rows;
  } catch (error) {
    console.error('❌ Error obteniendo datos de pauta diaria:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    throw new Error(`Error al cargar la pauta diaria: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

export default async function PautaDiariaV2Page({ 
  searchParams 
}: { 
  searchParams: { fecha?: string; incluir_libres?: string } 
}) {
  noStore() // Evita caché en esta request
  // Gate SSR: requiere permiso para ver pautas
  const { cookies } = await import('next/headers');
  const { verifyToken } = await import('@/lib/auth');
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value || '';
  const { sql } = await import('@vercel/postgres');
  try {
    const decoded = token ? verifyToken(token as any) : null;
    const userEmail = decoded?.email ?? null;
    if (!userEmail) return redirect('/login');
    // Admin absoluto (rol en JWT) tiene acceso total
    if (decoded?.rol === 'admin') {
      // skip check
    } else {
      const { rows } = await sql`with me as (select id from public.usuarios where lower(email)=lower(${userEmail}) limit 1) select public.fn_usuario_tiene_permiso((select id from me), ${'pautas.view'}) as allowed`;
      const allowed = rows?.[0]?.allowed === true;
      if (!allowed) return redirect('/');
    }
  } catch {}
  
  // Verificar flag fuera del try/catch para que redirect funcione correctamente
  const isOn = await isFlagEnabled('ado_v2')
  if (!isOn) redirect('/legacy/pauta-diaria')
  
  try {
    const fecha = toYmd(searchParams?.fecha || new Date());
    const incluirLibres = searchParams?.incluir_libres === 'true';
    const rows = await getRows(fecha, incluirLibres);

    // Si no hay datos, obtener fechas disponibles para sugerir
    let fechasDisponibles: string[] = [];
    if (rows.length === 0) {
      try {
        const { rows: fechas } = await pool.query(`
          SELECT DISTINCT fecha 
          FROM as_turnos_v_pauta_diaria_dedup 
          ORDER BY fecha 
          LIMIT 5
        `);
        fechasDisponibles = fechas.map(r => toYmd(r.fecha));
      } catch (error) {
        console.error('Error obteniendo fechas disponibles:', error);
      }
    }

    return (
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <VersionBanner version="v2" />
        <h1 className="text-2xl font-bold">Pauta Diaria v2 (beta)</h1>

        {rows.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 dark:bg-yellow-900/20 dark:border-yellow-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 rounded-lg dark:bg-yellow-900/30">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-yellow-800 dark:text-yellow-200 font-semibold">No hay datos para esta fecha</h2>
                <p className="text-yellow-600 dark:text-yellow-300">No se encontraron registros de pauta diaria para el {toDisplay(fecha)}.</p>
              </div>
            </div>
            
            {fechasDisponibles.length > 0 && (
              <div className="mt-4">
                <p className="text-yellow-700 dark:text-yellow-300 mb-2">Fechas disponibles con datos:</p>
                <div className="flex flex-wrap gap-2">
                  {fechasDisponibles.map((fechaDisponible) => (
                    <a
                      key={fechaDisponible}
                      href={`/pauta-diaria-v2?fecha=${fechaDisponible}`}
                      className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm hover:bg-yellow-200 transition-colors dark:bg-yellow-900/30 dark:text-yellow-200 dark:hover:bg-yellow-900/50"
                    >
                      {toDisplay(fechaDisponible)}
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-yellow-200 dark:border-yellow-800">
              <p className="text-yellow-600 dark:text-yellow-300 text-sm">
                💡 <strong>Sugerencia:</strong> Los datos de pauta diaria se generan a partir de la pauta mensual. 
                Verifica que exista una pauta mensual para el período correspondiente.
              </p>
            </div>
          </div>
        ) : (
          <ClientTable rows={rows} fecha={fecha} incluirLibres={incluirLibres} />
        )}
      </div>
    )
  } catch (error: any) {
    // Si es un error de redirect de Next.js, re-lanzarlo para que funcione correctamente
    if (error?.message === 'NEXT_REDIRECT' || error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    
    console.error('Error en PautaDiariaV2Page:', error);
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
          <h2 className="text-red-800 dark:text-red-200 font-semibold">Error al cargar la pauta diaria</h2>
          <p className="text-red-600 dark:text-red-300 mt-1">Por favor, intenta nuevamente más tarde.</p>
          <p className="text-red-500 dark:text-red-400 text-sm mt-2">
            Error: {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
        </div>
      </div>
    );
  }
}


