"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { redirect, useRouter, usePathname, useSearchParams } from 'next/navigation'
import { isFlagEnabled } from '@/lib/flags'
import VersionBanner from '@/components/VersionBanner'
import ClientTable from '@/app/pauta-diaria-v2/ClientTable'
import { PautaRow } from './types'
import { toYmd, toDisplay } from '@/lib/date'
import { Suspense, useState, useEffect, useCallback } from 'react';
import { MonitoreoTiempoReal } from './components/MonitoreoTiempoReal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, Activity } from 'lucide-react';

export default function PautaDiariaV2Page({ searchParams }: { searchParams: { fecha?: string; incluirLibres?: string; tab?: string } }) {
  // Router y parámetros reactivos de la URL
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const activeTab = sp.get('tab') || 'pauta';
  const [rows, setRows] = useState<PautaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fecha = sp.get('fecha') || (() => {
    // Forzar fecha correcta: 20 de septiembre de 2025
    const hoy = new Date();
    hoy.setDate(20);
    hoy.setMonth(8); // Septiembre (0-indexed)
    hoy.setFullYear(2025);
    return hoy.toISOString().split('T')[0];
  })();
  const [incluirLibres, setIncluirLibres] = useState(searchParams.incluirLibres === 'true');

  // 🔍 DEBUG: Log de renderizado
  devLogger.process(' [PautaDiariaV2Page] RENDERIZANDO:', {
    searchParams,
    activeTab,
    fecha,
    incluirLibres,
    loading,
    error,
    rowsLength: rows.length
  });

  // Ya no sincronizamos por estado: el tab activo se deriva de la URL vía useSearchParams

  useEffect(() => {
    let isMounted = true;
    
    devLogger.search(' [useEffect loadData] EJECUTANDO con dependencias:', {
      fecha,
      incluirLibres,
      isMounted
    });
    
    const loadData = async () => {
      if (!isMounted) return;
      
      try {
        // ❌ PROBLEMA: setLoading(true) causa re-render que ejecuta useEffect de nuevo
        // setLoading(true); // REMOVIDO para evitar bucle infinito
        setError(null);
        
        logger.debug('🔍 Cargando datos de pauta diaria...');
        const params = new URLSearchParams({
          fecha,
          ...(incluirLibres && { incluirLibres: 'true' })
        });
        const response = await fetch(`/api/pauta-diaria-v2/data?${params}`);
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && isMounted) {
          setRows(result.data);
          logger.debug(`✅ Datos cargados: ${result.data.length} registros`);
          
          // Debug: mostrar todos los registros para verificar si está el turno extra
          console.log('🔍 REGISTROS EN PAUTA DIARIA:', result.data.map(row => ({
            pauta_id: row.pauta_id,
            puesto_id: row.puesto_id,
            tipo_cobertura: row.tipo_cobertura,
            guardia_trabajo_id: row.guardia_trabajo_id,
            estado: row.estado,
            es_ppc: row.es_ppc
          })));
        } else if (!result.success) {
          throw new Error(result.error || 'Error desconocido');
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
          setError(errorMessage);
          logger.error('Error cargando datos::', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      logger.debug('🧹 [useEffect loadData] CLEANUP');
      isMounted = false;
    };
  }, [fecha, incluirLibres]);

  // Función para recargar datos sin cambiar URL
  const recargarDatos = useCallback(async (nuevoIncluirLibres?: boolean) => {
    try {
      setLoading(true);
      setError(null);
      
      // Actualizar el estado incluirLibres si se proporciona un nuevo valor
      if (nuevoIncluirLibres !== undefined) {
        setIncluirLibres(nuevoIncluirLibres);
      }
      
      const params = new URLSearchParams({
        fecha,
        ...((nuevoIncluirLibres !== undefined ? nuevoIncluirLibres : incluirLibres) && { incluirLibres: 'true' })
      });
      const response = await fetch(`/api/pauta-diaria-v2/data?${params}`);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setRows(result.data);
        logger.debug(`✅ Datos recargados: ${result.data.length} registros`);
        // Log temporal para debug de comentarios
        const comentariosData = result.data.map((row: any) => ({ 
          pauta_id: row.pauta_id, 
          comentarios: row.comentarios 
        }));
        console.log('🔍 Datos recargados con comentarios:', comentariosData);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      logger.error('Error recargando datos::', err);
    } finally {
      setLoading(false);
    }
  }, [fecha, incluirLibres]);

  if (loading) {
    return (
      <div className="w-full max-w-full mx-auto p-3 space-y-3">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-full mx-auto p-3 space-y-3">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold text-sm">Error al cargar datos</h3>
          <p className="text-red-600 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full mx-auto p-3 space-y-3">
      {/* Header Mobile First */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Pauta Diaria</h1>
          <p className="text-gray-600 text-xs">Sistema de gestión y monitoreo de turnos</p>
        </div>
      </div>

      {/* Tabs Mobile First */}
      <Tabs value={activeTab} onValueChange={(value) => {
        devLogger.process(' [Tabs onValueChange] CAMBIANDO TAB:', {
          from: activeTab,
          to: value,
          fecha,
          incluirLibres
        });
        const params = new URLSearchParams(sp.toString());
        if (fecha) params.set('fecha', fecha);
        if (incluirLibres) params.set('incluirLibres', 'true');
        params.set('tab', value);
        const newUrl = `${pathname}?${params.toString()}`;
        devLogger.process(' [Tabs onValueChange] ACTUALIZANDO URL a:', newUrl);
        router.replace(newUrl);
      }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-10">
          <TabsTrigger value="monitoreo" className="flex items-center gap-1 text-xs">
            <Activity className="w-3 h-3" />
            Control de Asistencias
          </TabsTrigger>
          <TabsTrigger value="pauta" className="flex items-center gap-1 text-xs">
            <Users className="w-3 h-3" />
            Pauta Diaria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitoreo" className="space-y-3 mt-3">
          <Card className="w-full">
            <CardHeader className="pb-2 px-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4" />
                Control de Asistencias en Tiempo Real
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <Suspense fallback={
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              }>
                <MonitoreoTiempoReal fecha={fecha} activeTab={activeTab} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pauta" className="space-y-3 mt-3">
          <Card className="w-full">
            <CardHeader className="pb-2 px-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4" />
                Gestión de Pauta Diaria
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <Suspense fallback={<div className="text-xs">Cargando pauta diaria...</div>}>
                <ClientTable 
                  rows={rows} 
                  fecha={fecha} 
                  incluirLibres={incluirLibres} 
                  onRecargarDatos={recargarDatos}
                  activeTab={activeTab}
                />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


