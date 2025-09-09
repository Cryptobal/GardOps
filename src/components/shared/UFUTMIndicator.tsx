"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UFUTMData {
  uf: {
    valor: number;
    fecha: string;
    error?: string;
  };
  utm: {
    valor: number;
    fecha: string;
    error?: string;
  };
  timestamp: string;
  source: string;
}

interface UFUTMIndicatorProps {
  compact?: boolean;
}

export function UFUTMIndicator({ compact = false }: UFUTMIndicatorProps) {
  const [data, setData] = useState<UFUTMData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Evitar error de hidratación
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchValues = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payroll/valores-utm-uf');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setData(result.data);
          setLastUpdate(new Date());
        }
      }
    } catch (error) {
      logger.error('Error fetching UF/UTM values::', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValues();
    
    // Actualizar cada 30 minutos
    const interval = setInterval(fetchValues, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (!data) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
        <TrendingUp className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Cargando...</span>
      </div>
    );
  }

  // Versión compacta para pantallas medianas
  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1">
          {/* UF Compact */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <TrendingUp className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                <span className="text-[10px] font-medium text-green-700 dark:text-green-300">
                  {formatCurrency(data.uf.valor).replace('CLP', '').trim()}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="text-xs">
                <div className="font-medium">UF: {formatCurrency(data.uf.valor)}</div>
                <div className="text-muted-foreground">{formatDate(data.uf.fecha)}</div>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* UTM Compact */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <DollarSign className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300">
                  {formatCurrency(data.utm.valor).replace('CLP', '').trim()}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="text-xs">
                <div className="font-medium">UTM: {formatCurrency(data.utm.valor)}</div>
                <div className="text-muted-foreground">{formatDate(data.utm.fecha)}</div>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Refresh Button Compact */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchValues}
                disabled={loading}
                className="h-5 w-5 p-0 hover:bg-accent/50"
              >
                <RefreshCw className={`h-2.5 w-2.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="text-xs">Actualizar</div>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {/* UF Indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors cursor-pointer">
              <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                UF: {formatCurrency(data.uf.valor)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1">
              <div className="font-medium">Unidad de Fomento (UF)</div>
              <div className="text-sm">Valor: {formatCurrency(data.uf.valor)}</div>
              <div className="text-xs text-muted-foreground">
                Fecha: {formatDate(data.uf.fecha)}
              </div>
              <div className="text-xs text-muted-foreground">
                Fuente: CMF Chile
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* UTM Indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors cursor-pointer">
              <DollarSign className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                UTM: {formatCurrency(data.utm.valor)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1">
              <div className="font-medium">Unidad Tributaria Mensual (UTM)</div>
              <div className="text-sm">Valor: {formatCurrency(data.utm.valor)}</div>
              <div className="text-xs text-muted-foreground">
                Fecha: {formatDate(data.utm.fecha)}
              </div>
              <div className="text-xs text-muted-foreground">
                Fuente: CMF Chile
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Refresh Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchValues}
              disabled={loading}
              className="h-6 w-6 p-0 hover:bg-accent/50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="text-xs">
              {loading ? 'Actualizando...' : 'Actualizar valores'}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Last Update Indicator - Solo en pantallas grandes */}
        {lastUpdate && isMounted && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="px-1 hidden lg:block">
                <Badge variant="outline" className="text-[10px] h-5 px-1">
                  {lastUpdate.toLocaleTimeString('es-CL', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="text-xs">
                Última actualización: {lastUpdate.toLocaleString('es-CL')}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
