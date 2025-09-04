'use client';

import { redirect } from 'next/navigation'
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
  const [activeTab, setActiveTab] = useState(searchParams.tab || 'monitoreo');
  const [rows, setRows] = useState<PautaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fecha = searchParams.fecha || new Date().toISOString().slice(0, 10);
  const [incluirLibres, setIncluirLibres] = useState(searchParams.incluirLibres === 'true');

  // Sincronizar activeTab con searchParams
  useEffect(() => {
    if (searchParams.tab && searchParams.tab !== activeTab) {
      setActiveTab(searchParams.tab);
    }
  }, [searchParams.tab, activeTab]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Cargando datos de pauta diaria...');
        const params = new URLSearchParams({
          fecha,
          ...(incluirLibres && { incluirLibres: 'true' })
        });
        const response = await fetch(`/api/pauta-diaria-v2/data?${params}`);
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setRows(result.data);
          console.log(`✅ Datos cargados: ${result.data.length} registros`);
        } else {
          throw new Error(result.error || 'Error desconocido');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        console.error('Error cargando datos:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
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
        console.log(`✅ Datos recargados: ${result.data.length} registros`);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error recargando datos:', err);
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
        setActiveTab(value);
        // Actualizar URL con el tab activo
        const params = new URLSearchParams();
        if (fecha) params.set('fecha', fecha);
        if (incluirLibres) params.set('incluirLibres', 'true');
        params.set('tab', value);
        window.history.replaceState({}, '', `/pauta-diaria-v2?${params.toString()}`);
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


