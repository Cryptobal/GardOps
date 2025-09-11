"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';
import { useSSE } from '@/hooks/useSSE';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Activity,
  Building2,
  Phone,
  AlertTriangle,
  TrendingUp,
  Shield,
  ShieldAlert,
  ShieldX,
  HelpCircle
} from 'lucide-react';
import { UFUTMIndicator } from '@/components/shared/UFUTMIndicator';
import Link from 'next/link';

interface KPIData {
  total_turnos: number;
  en_camino: number;
  no_contesta: number;
  no_ira: number;
  llego: number;
  pendiente: number;
  retrasado: number;
  puestos_cubiertos: number;
  puestos_sin_cobertura: number;
  puestos_ppc: number;
  turnos_dia: number;
  turnos_noche: number;
  // KPIs del Central de Monitoreo
  monitoreo_urgentes: number;
  monitoreo_actuales: number;
  monitoreo_proximos: number;
  monitoreo_completados: number;
  monitoreo_total: number;
  monitoreo_no_realizados: number;
  // KPIs de OS10
  os10_por_vencer: number;
  os10_sin_fecha: number;
  os10_vencidos: number;
  os10_vigentes: number;
}

export default function HomePage() {
  const [kpis, setKpis] = useState<KPIData>({
    total_turnos: 0,
    en_camino: 0,
    no_contesta: 0,
    no_ira: 0,
    llego: 0,
    pendiente: 0,
    retrasado: 0,
    puestos_cubiertos: 0,
    puestos_sin_cobertura: 0,
    puestos_ppc: 0,
    turnos_dia: 0,
    turnos_noche: 0,
    // KPIs del Central de Monitoreo
    monitoreo_urgentes: 0,
    monitoreo_actuales: 0,
    monitoreo_proximos: 0,
    monitoreo_completados: 0,
    monitoreo_total: 0,
    monitoreo_no_realizados: 0,
    // KPIs de OS10
    os10_por_vencer: 0,
    os10_sin_fecha: 0,
    os10_vencidos: 0,
    os10_vigentes: 0
  });
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Evitar error de hidratación
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const cargarKPIs = async () => {
    try {
      logger.debug('🔄 Cargando KPIs...');
      setLoading(true);
      const response = await fetch('/api/home-kpis');
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        devLogger.success(' KPIs cargados:', result.data);
        devLogger.search(' KPIs OS10 específicos:', {
          os10_por_vencer: result.data.os10_por_vencer,
          os10_sin_fecha: result.data.os10_sin_fecha,
          os10_vencidos: result.data.os10_vencidos,
          os10_vigentes: result.data.os10_vigentes
        });
        setKpis(result.data);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('❌ Error cargando KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    cargarKPIs();
  }, []);


  // Usar Server-Sent Events para sincronización en tiempo real
  const { isConnected: sseConnected } = useSSE('/api/events/turnos', (event) => {
    logger.debug('📡 SSE: Evento recibido en página principal:', event);
    if (event.type === 'turno_update') {
      logger.debug('🔄 Actualización de turno detectada via SSE - Recargando KPIs');
      cargarKPIs();
    }
  });

  // Auto-refresh cada 30 segundos para mantener KPIs actualizados
  useEffect(() => {
    const interval = setInterval(() => {
      logger.debug('🔄 Auto-refresh de KPIs (cada 30 segundos)');
      cargarKPIs();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-full mx-auto p-3 space-y-3">
      
      {/* Indicador de conexión SSE */}
      <div className="flex justify-between items-center">
        <Button 
          onClick={() => {
            logger.debug('🔄 Prueba manual: Recargando KPIs');
            cargarKPIs();
          }}
          variant="outline" 
          size="sm"
          className="text-xs"
        >
          🔄 Recargar KPIs
        </Button>
        <Badge variant={sseConnected ? "default" : "destructive"} className="text-xs">
          {sseConnected ? "🟢 Tiempo Real" : "🔴 Desconectado"}
        </Badge>
      </div>

      {/* KPIs de OS10 - Estado de Certificaciones */}
      <Card className="w-full">
        <CardHeader className="pb-2 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Estado OS10 - Certificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {console.log('🔍 Renderizando KPIs OS10 con valores:', {
            os10_por_vencer: kpis.os10_por_vencer,
            os10_sin_fecha: kpis.os10_sin_fecha,
            os10_vencidos: kpis.os10_vencidos,
            os10_vigentes: kpis.os10_vigentes
          })}
          <div className="grid grid-cols-2 gap-2 w-full">
            <div className="text-center p-2 bg-yellow-50/50 dark:bg-yellow-950/50 rounded-lg w-full">
              <ShieldAlert className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mx-auto mb-1" />
              <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300 leading-tight">Por Vencer</p>
              <p className="text-sm font-bold text-yellow-800 dark:text-yellow-200 leading-tight">{kpis.os10_por_vencer}</p>
            </div>
            
            <div className="text-center p-2 bg-gray-50/50 dark:bg-gray-950/50 rounded-lg w-full">
              <HelpCircle className="w-4 h-4 text-gray-600 dark:text-gray-400 mx-auto mb-1" />
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">Sin Fecha</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-tight">{kpis.os10_sin_fecha}</p>
            </div>
            
            <div className="text-center p-2 bg-red-50/50 dark:bg-red-950/50 rounded-lg w-full">
              <ShieldX className="w-4 h-4 text-red-600 dark:text-red-400 mx-auto mb-1" />
              <p className="text-xs font-medium text-red-700 dark:text-red-300 leading-tight">Vencidos</p>
              <p className="text-sm font-bold text-red-800 dark:text-red-200 leading-tight">{kpis.os10_vencidos}</p>
            </div>
            
            <div className="text-center p-2 bg-green-50/50 dark:bg-green-950/50 rounded-lg w-full">
              <Shield className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
              <p className="text-xs font-medium text-green-700 dark:text-green-300 leading-tight">Vigentes</p>
              <p className="text-sm font-bold text-green-800 dark:text-green-200 leading-tight">{kpis.os10_vigentes}</p>
            </div>
          </div>
          
          <div className="text-center p-2 bg-muted/50 rounded-lg w-full mt-2">
            <p className="text-xs font-medium text-muted-foreground leading-tight">Total Guardias Activos</p>
            <p className="text-lg font-bold leading-tight">{kpis.os10_por_vencer + kpis.os10_sin_fecha + kpis.os10_vencidos + kpis.os10_vigentes}</p>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Detallados - Mobile First */}
      <div className="grid grid-cols-1 gap-3 w-full">
        {/* Estado de Turnos - Mobile First */}
        <Card className="w-full">
          <CardHeader className="pb-2 px-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4" />
              Estado de Turnos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="grid grid-cols-3 gap-2 w-full">
              <div className="text-center p-2 bg-muted/50 rounded-lg w-full">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full mx-auto mb-1"></div>
                <p className="text-xs font-medium leading-tight">Pendientes</p>
                <p className="text-sm font-bold leading-tight">{kpis.pendiente}</p>
              </div>
              
              <div className="text-center p-2 bg-yellow-50/50 dark:bg-yellow-950/50 rounded-lg w-full">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mx-auto mb-1"></div>
                <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300 leading-tight">En Camino</p>
                <p className="text-sm font-bold text-yellow-800 dark:text-yellow-200 leading-tight">{kpis.en_camino}</p>
              </div>
              
              <div className="text-center p-2 bg-green-50/50 dark:bg-green-950/50 rounded-lg w-full">
                <div className="w-2 h-2 bg-green-500 rounded-full mx-auto mb-1"></div>
                <p className="text-xs font-medium text-green-700 dark:text-green-300 leading-tight">Llegaron</p>
                <p className="text-sm font-bold text-green-800 dark:text-green-200 leading-tight">{kpis.llego}</p>
              </div>
              
              <div className="text-center p-2 bg-red-50/50 dark:bg-red-950/50 rounded-lg w-full">
                <div className="w-2 h-2 bg-red-500 rounded-full mx-auto mb-1"></div>
                <p className="text-xs font-medium text-red-700 dark:text-red-300 leading-tight">No Contesta</p>
                <p className="text-sm font-bold text-red-800 dark:text-red-200 leading-tight">{kpis.no_contesta}</p>
              </div>
              
              <div className="text-center p-2 bg-orange-50/50 dark:bg-orange-950/50 rounded-lg w-full">
                <div className="w-2 h-2 bg-orange-500 rounded-full mx-auto mb-1"></div>
                <p className="text-xs font-medium text-orange-700 dark:text-orange-300 leading-tight">Retrasados</p>
                <p className="text-sm font-bold text-orange-800 dark:text-orange-200 leading-tight">{kpis.retrasado}</p>
              </div>
              
              <div className="text-center p-2 bg-red-100/50 dark:bg-red-950/50 rounded-lg w-full">
                <div className="w-2 h-2 bg-red-600 rounded-full mx-auto mb-1"></div>
                <p className="text-xs font-medium text-red-700 dark:text-red-300 leading-tight">No Irá</p>
                <p className="text-sm font-bold text-red-800 dark:text-red-200 leading-tight">{kpis.no_ira}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cobertura de Puestos - Mobile First */}
        <Card className="w-full">
          <CardHeader className="pb-2 px-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4" />
              Cobertura de Puestos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="grid grid-cols-3 gap-2 mb-3 w-full">
              <div className="text-center p-2 bg-green-50/50 dark:bg-green-950/50 rounded-lg w-full">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
                <p className="text-xs font-medium text-green-700 dark:text-green-300 leading-tight">Cubiertos</p>
                <p className="text-sm font-bold text-green-800 dark:text-green-200 leading-tight">{kpis.puestos_cubiertos}</p>
              </div>
              
              <div className="text-center p-2 bg-red-50/50 dark:bg-red-950/50 rounded-lg w-full">
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 mx-auto mb-1" />
                <p className="text-xs font-medium text-red-700 dark:text-red-300 leading-tight">Sin Cobertura</p>
                <p className="text-sm font-bold text-red-800 dark:text-red-200 leading-tight">{kpis.puestos_sin_cobertura}</p>
              </div>
              
              <div className="text-center p-2 bg-orange-50/50 dark:bg-orange-950/50 rounded-lg w-full">
                <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 mx-auto mb-1" />
                <p className="text-xs font-medium text-orange-700 dark:text-orange-300 leading-tight">Con PPC</p>
                <p className="text-sm font-bold text-orange-800 dark:text-orange-200 leading-tight">{kpis.puestos_ppc}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 w-full">
              <div className="text-center p-2 bg-yellow-50/50 dark:bg-yellow-950/50 rounded-lg w-full">
                <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300 leading-tight">☀️ Día</p>
                <p className="text-sm font-bold text-yellow-800 dark:text-yellow-200 leading-tight">{kpis.turnos_dia}</p>
              </div>
              <div className="text-center p-2 bg-blue-50/50 dark:bg-blue-950/50 rounded-lg w-full">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300 leading-tight">🌙 Noche</p>
                <p className="text-sm font-bold text-blue-800 dark:text-blue-200 leading-tight">{kpis.turnos_noche}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs del Central de Monitoreo - Mobile First */}
      <Card className="w-full">
        <CardHeader className="pb-2 px-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Central de Monitoreo
            </div>
            <Link href="/central-monitoreo">
              <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                <Activity className="w-3 h-3 mr-1" />
                Ver Central
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="grid grid-cols-4 gap-2 mb-3 w-full">
            <div className="text-center p-2 bg-red-50/50 dark:bg-red-950/50 rounded-lg w-full">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mx-auto mb-1" />
              <p className="text-xs font-medium text-red-700 dark:text-red-300 leading-tight">No realizados</p>
              <p className="text-sm font-bold text-red-800 dark:text-red-200 leading-tight">{kpis.monitoreo_no_realizados}</p>
            </div>
            
            <div className="text-center p-2 bg-yellow-50/50 dark:bg-yellow-950/50 rounded-lg w-full">
              <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mx-auto mb-1" />
              <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300 leading-tight">Actuales</p>
              <p className="text-sm font-bold text-yellow-800 dark:text-yellow-200 leading-tight">{kpis.monitoreo_actuales}</p>
            </div>
            
            <div className="text-center p-2 bg-blue-50/50 dark:bg-blue-950/50 rounded-lg w-full">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300 leading-tight">Próximos</p>
              <p className="text-sm font-bold text-blue-800 dark:text-blue-200 leading-tight">{kpis.monitoreo_proximos}</p>
            </div>
            
            <div className="text-center p-2 bg-green-50/50 dark:bg-green-950/50 rounded-lg w-full">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
              <p className="text-xs font-medium text-green-700 dark:text-green-300 leading-tight">Completados</p>
              <p className="text-sm font-bold text-green-800 dark:text-green-200 leading-tight">{kpis.monitoreo_completados}</p>
            </div>
          </div>
          
          <div className="text-center p-2 bg-muted/50 rounded-lg w-full">
            <p className="text-xs font-medium text-muted-foreground leading-tight">Total Llamados del Día</p>
            <p className="text-lg font-bold leading-tight">{kpis.monitoreo_total}</p>
          </div>
        </CardContent>
      </Card>

      {/* Acciones Rápidas - Mobile First */}
      <Card className="w-full">
        <CardHeader className="pb-2 px-3">
          <CardTitle className="text-sm">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="grid grid-cols-2 gap-2 w-full">
            <Link href="/control-asistencias" className="w-full">
              <Button className="w-full h-12 flex flex-col items-center justify-center gap-1">
                <Activity className="w-4 h-4" />
                <span className="text-xs leading-tight">Control de Asistencias</span>
              </Button>
            </Link>
            
            <Link href="/pauta-diaria" className="w-full">
              <Button variant="outline" className="w-full h-12 flex flex-col items-center justify-center gap-1">
                <Users className="w-4 h-4" />
                <span className="text-xs leading-tight">Gestionar Pauta</span>
              </Button>
            </Link>
            
            <Link href="/guardias" className="w-full">
              <Button variant="outline" className="w-full h-12 flex flex-col items-center justify-center gap-1">
                <Users className="w-4 h-4" />
                <span className="text-xs leading-tight">Gestionar Guardias</span>
              </Button>
            </Link>
            
            <Link href="/instalaciones" className="w-full">
              <Button variant="outline" className="w-full h-12 flex flex-col items-center justify-center gap-1">
                <Building2 className="w-4 h-4" />
                <span className="text-xs leading-tight">Gestionar Instalaciones</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Alertas - Mobile First */}
      {(kpis.no_contesta > 0 || kpis.no_ira > 0 || kpis.puestos_sin_cobertura > 0) && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/50 w-full">
          <CardHeader className="pb-2 px-3">
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Alertas Activas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="flex flex-wrap gap-2 w-full">
              {kpis.no_contesta > 0 && (
                <Badge variant="destructive" className="text-xs">
                  ⚠️ {kpis.no_contesta} guardias sin contestar
                </Badge>
              )}
              {kpis.no_ira > 0 && (
                <Badge variant="destructive" className="text-xs">
                  🚨 {kpis.no_ira} guardias no asistirán
                </Badge>
              )}
              {kpis.puestos_sin_cobertura > 0 && (
                <Badge variant="destructive" className="text-xs">
                  ❌ {kpis.puestos_sin_cobertura} puestos sin cobertura
                </Badge>
              )}
            </div>
            <div className="mt-3 w-full">
              <Link href="/pauta-diaria" className="w-full">
                <Button size="sm" variant="destructive" className="text-xs w-full">
                  Ver Detalles
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 