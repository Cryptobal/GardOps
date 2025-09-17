"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChileDate } from '@/hooks/useChileDate';
import { MonitoreoTiempoReal } from '@/app/pauta-diaria-v2/components/MonitoreoTiempoReal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

export default function ControlAsistenciasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fechaHoy, loading: loadingConfig } = useChileDate();
  
  // Usar configuración de sistema o fallback a fecha de URL
  const fecha = searchParams.get('fecha') || fechaHoy;

  // 🔍 DEBUG: Log de renderizado
  devLogger.process(' [ControlAsistenciasPage] RENDERIZANDO:', {
    fecha
  });

  return (
    <div className="w-full max-w-full mx-auto p-2 space-y-2">
      {/* Header Mobile First Minimalista */}
      <div className="flex items-center justify-between py-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
            📊 Control de Asistencias
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
            Monitoreo en tiempo real
          </p>
        </div>
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>

      {/* Control de Asistencias Content - Sin Card para maximizar espacio */}
      <div className="w-full">
        <MonitoreoTiempoReal 
          fecha={fecha} 
          activeTab="monitoreo"
        />
      </div>
    </div>
  );
}
