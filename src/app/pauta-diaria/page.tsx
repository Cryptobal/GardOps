"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ClientTable from '@/app/pauta-diaria-v2/ClientTable';
import { PautaRow } from '@/app/pauta-diaria-v2/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function PautaDiariaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<PautaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fecha = searchParams.get('fecha') || new Date().toISOString().slice(0, 10);
  const [incluirLibres, setIncluirLibres] = useState(searchParams.get('incluirLibres') === 'true');

  // 🔍 DEBUG: Log de renderizado
  devLogger.process(' [PautaDiariaPage] RENDERIZANDO:', {
    fecha,
    incluirLibres,
    loading,
    error,
    rowsLength: rows.length
  });

  useEffect(() => {
    let isMounted = true;
    
    devLogger.search(' [PautaDiariaPage useEffect] EJECUTANDO con dependencias:', {
      fecha,
      incluirLibres,
      isMounted
    });
    
    const loadData = async () => {
      if (!isMounted) return;
      
      try {
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
      logger.debug('🧹 [PautaDiariaPage useEffect] CLEANUP');
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
          <p className="text-gray-600 text-xs">Sistema de gestión de turnos diarios</p>
        </div>
      </div>

      {/* Pauta Diaria Content */}
      <Card className="w-full">
        <CardHeader className="pb-2 px-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4" />
            Gestión de Pauta Diaria
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <ClientTable 
            rows={rows} 
            fecha={fecha} 
            incluirLibres={incluirLibres} 
            onRecargarDatos={recargarDatos}
            activeTab="pauta"
          />
        </CardContent>
      </Card>
    </div>
  );
}