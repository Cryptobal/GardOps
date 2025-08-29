'use client';

import { redirect } from 'next/navigation'
import { isFlagEnabled } from '@/lib/flags'
import VersionBanner from '@/components/VersionBanner'
import ClientTable from '@/app/pauta-diaria-v2/ClientTable'
import { PautaRow } from './types'
import { toYmd, toDisplay } from '@/lib/date'
import { Suspense, useState, useEffect } from 'react';
import { MonitoreoTiempoReal } from './components/MonitoreoTiempoReal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, Activity } from 'lucide-react';

export default function PautaDiariaV2Page({ searchParams }: { searchParams: { fecha?: string } }) {
  const [activeTab, setActiveTab] = useState('monitoreo');
  const [rows, setRows] = useState<PautaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fecha = searchParams.fecha || new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Cargando datos de pauta diaria...');
        const response = await fetch(`/api/pauta-diaria-v2/data?fecha=${fecha}`);
        
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
  }, [fecha]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error al cargar datos</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pauta Diaria v2</h1>
          <p className="text-gray-600">Sistema de gestión y monitoreo de turnos</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/pauta-diaria" className="text-sm text-blue-600 hover:underline">ver v1</a>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monitoreo" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Control de Asistencias
          </TabsTrigger>
          <TabsTrigger value="pauta" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Pauta Diaria
          </TabsTrigger>
          <TabsTrigger value="resumen" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Resumen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitoreo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Control de Asistencias en Tiempo Real
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              }>
                <MonitoreoTiempoReal />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pauta" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Gestión de Pauta Diaria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Cargando pauta diaria...</div>}>
                <ClientTable rows={rows} fecha={fecha} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resumen" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Resumen del Día
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Total Turnos</p>
                        <p className="text-2xl font-bold text-blue-800">{rows.length}</p>
                      </div>
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">Con Semáforo</p>
                        <p className="text-2xl font-bold text-green-800">
                          {rows.filter(r => r.estado_semaforo).length}
                        </p>
                      </div>
                      <Activity className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-amber-700">Instalaciones</p>
                        <p className="text-2xl font-bold text-amber-800">
                          {new Set(rows.map(r => r.instalacion_id)).size}
                        </p>
                      </div>
                      <Building2 className="w-8 h-8 text-amber-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Estados de Semáforo</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['pendiente', 'en_camino', 'no_contesta', 'llego'].map(estado => {
                    const count = rows.filter(r => r.estado_semaforo === estado).length;
                    const colors = {
                      pendiente: 'bg-gray-100 text-gray-800',
                      en_camino: 'bg-yellow-100 text-yellow-800',
                      no_contesta: 'bg-red-100 text-red-800',
                      llego: 'bg-green-100 text-green-800'
                    };
                    
                    return (
                      <div key={estado} className={`p-3 rounded-lg ${colors[estado as keyof typeof colors]}`}>
                        <p className="text-sm font-medium capitalize">{estado.replace('_', ' ')}</p>
                        <p className="text-xl font-bold">{count}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


