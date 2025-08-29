import { redirect } from 'next/navigation'
import { isFlagEnabled } from '@/lib/flags'
import { unstable_noStore as noStore } from 'next/cache'
import pool from '@/lib/database'
import VersionBanner from '@/components/VersionBanner'
import ClientTable from '@/app/pauta-diaria-v2/ClientTable'
import { PautaRow } from './types'
import { toYmd, toDisplay } from '@/lib/date'
import { Suspense } from 'react';
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
        END AS cobertura_guardia_nombre,
        g.telefono AS cobertura_guardia_telefono,
        gt.telefono AS guardia_titular_telefono,
        gw.telefono AS guardia_trabajo_telefono,
        pd.meta->>'estado_semaforo' AS estado_semaforo,
        pd.meta->>'comentarios' AS comentarios
      FROM as_turnos_v_pauta_diaria_dedup pd
      LEFT JOIN guardias g ON g.id::text = pd.meta->>'cobertura_guardia_id'
      LEFT JOIN guardias gt ON gt.id::text = pd.guardia_titular_id::text
      LEFT JOIN guardias gw ON gw.id::text = pd.guardia_trabajo_id::text
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

export default async function PautaDiariaV2Page({ searchParams }: { searchParams: { fecha?: string } }) {
  const fecha = searchParams.fecha || new Date().toISOString().slice(0, 10);
  const rows = await getRows(fecha);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Pauta Diaria v2 (beta)</h1>
      <div className="flex justify-end">
        <a href="/pauta-diaria" className="text-sm text-blue-600 hover:underline">ver v1</a>
      </div>
      <Suspense fallback={<div>Cargando...</div>}>
        <ClientTable rows={rows} fecha={fecha} />
      </Suspense>
    </div>
  );
}


