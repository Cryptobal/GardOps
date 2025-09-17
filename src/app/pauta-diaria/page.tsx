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
    <div className="w-full max-w-full mx-auto p-2 space-y-2">
      {/* Header Mobile First Minimalista */}
      <div className="flex items-center justify-between py-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
            📅 Pauta Diaria
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
            {new Date(fecha).toLocaleDateString('es-ES', { 
              weekday: 'short', 
              day: '2-digit', 
              month: '2-digit' 
            })}
          </p>
        </div>
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>

      {/* Pauta Diaria Content - Sin Card para maximizar espacio */}
      <div className="w-full">
        <ClientTable 
          rows={rows} 
          fecha={fecha} 
          incluirLibres={incluirLibres} 
          onRecargarDatos={recargarDatos}
          activeTab="pauta"
        />
      </div>
    </div>
  );
}