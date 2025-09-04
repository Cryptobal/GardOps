'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MonitoreoTiempoReal } from '@/app/pauta-diaria-v2/components/MonitoreoTiempoReal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

export default function ControlAsistenciasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const fecha = searchParams.get('fecha') || new Date().toISOString().slice(0, 10);

  // 🔍 DEBUG: Log de renderizado
  console.log('🔄 [ControlAsistenciasPage] RENDERIZANDO:', {
    fecha
  });

  return (
    <div className="w-full max-w-full mx-auto p-3 space-y-3">
      {/* Header Mobile First */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Control de Asistencias</h1>
          <p className="text-gray-600 text-xs">Monitoreo en tiempo real de asistencias</p>
        </div>
      </div>

      {/* Control de Asistencias Content */}
      <Card className="w-full">
        <CardHeader className="pb-2 px-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="w-4 h-4" />
            Control de Asistencias en Tiempo Real
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <MonitoreoTiempoReal 
            fecha={fecha} 
            activeTab="monitoreo"
          />
        </CardContent>
      </Card>
    </div>
  );
}
