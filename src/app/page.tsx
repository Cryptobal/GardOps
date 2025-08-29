'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Building2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Activity,
  TrendingUp,
  Phone,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
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
    turnos_noche: 0
  });
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const cargarKPIs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/home-kpis');
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setKpis(result.data);
        setLastUpdate(new Date());
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error cargando KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    cargarKPIs();
  }, []);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(cargarKPIs, 30000); // 30 segundos
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Escuchar cambios en otras pestañas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pauta-diaria-update' && e.newValue) {
        console.log('🔄 Actualización detectada desde otra pestaña - Recargando KPIs');
        cargarKPIs();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const fecha = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-foreground">GardOps</h1>
        <p className="text-xl text-muted-foreground">Sistema de Gestión de Guardias</p>
        <p className="text-sm text-muted-foreground">{fecha}</p>
        
        {/* Controles de actualización */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button 
            onClick={cargarKPIs} 
            variant="outline" 
            size="sm"
            disabled={loading}
            className="h-8 px-3"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            className="h-8 px-3"
          >
            <Clock className="w-3 h-3 mr-1" />
            {autoRefresh ? 'Auto ON' : 'Auto OFF'}
          </Button>
        </div>

        {/* Indicador de última actualización */}
        <p className="text-xs text-muted-foreground">
          Última actualización: {lastUpdate.toLocaleTimeString()}
        </p>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Turnos</p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{kpis.total_turnos}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Llegaron</p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-200">{kpis.llego}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">En Camino</p>
                <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{kpis.en_camino}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Sin Contestar</p>
                <p className="text-2xl font-bold text-red-800 dark:text-red-200">{kpis.no_contesta}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs Detallados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estado de Turnos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Estado de Turnos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                  <span className="text-sm font-medium">Pendientes</span>
                </div>
                <Badge variant="outline">{kpis.pendiente}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50/50 dark:bg-yellow-950/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">En Camino</span>
                </div>
                <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">{kpis.en_camino}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50/50 dark:bg-green-950/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Llegaron</span>
                </div>
                <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">{kpis.llego}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-50/50 dark:bg-red-950/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">No Contesta</span>
                </div>
                <Badge variant="outline" className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">{kpis.no_contesta}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-orange-50/50 dark:bg-orange-950/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Retrasados</span>
                </div>
                <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">{kpis.retrasado}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-100/50 dark:bg-red-950/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">No Irá</span>
                </div>
                <Badge variant="outline" className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">{kpis.no_ira}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cobertura de Puestos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Cobertura de Puestos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50/50 dark:bg-green-950/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Cubiertos</span>
                </div>
                <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">{kpis.puestos_cubiertos}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-50/50 dark:bg-red-950/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">Sin Cobertura</span>
                </div>
                <Badge variant="outline" className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">{kpis.puestos_sin_cobertura}</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-orange-50/50 dark:bg-orange-950/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Con PPC</span>
                </div>
                <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">{kpis.puestos_ppc}</Badge>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-yellow-50/50 dark:bg-yellow-950/50 rounded-lg">
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">☀️ Día</p>
                  <p className="text-xl font-bold text-yellow-800 dark:text-yellow-200">{kpis.turnos_dia}</p>
                </div>
                <div className="text-center p-3 bg-blue-50/50 dark:bg-blue-950/50 rounded-lg">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">🌙 Noche</p>
                  <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{kpis.turnos_noche}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acciones Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/pauta-diaria-v2">
              <Button className="w-full h-16 flex flex-col items-center justify-center gap-2">
                <Activity className="w-6 h-6" />
                <span>Monitoreo Tiempo Real</span>
              </Button>
            </Link>
            
            <Link href="/pauta-diaria-v2?tab=pauta">
              <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center gap-2">
                <Users className="w-6 h-6" />
                <span>Gestionar Pauta</span>
              </Button>
            </Link>
            
            <Link href="/guardias">
              <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center gap-2">
                <Users className="w-6 h-6" />
                <span>Gestionar Guardias</span>
              </Button>
            </Link>
            
            <Link href="/instalaciones">
              <Button variant="outline" className="w-full h-16 flex flex-col items-center justify-center gap-2">
                <Building2 className="w-6 h-6" />
                <span>Gestionar Instalaciones</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {(kpis.no_contesta > 0 || kpis.no_ira > 0 || kpis.puestos_sin_cobertura > 0) && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="w-5 h-5" />
              Alertas Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {kpis.no_contesta > 0 && (
                <Badge variant="destructive">
                  ⚠️ {kpis.no_contesta} guardias sin contestar
                </Badge>
              )}
              {kpis.no_ira > 0 && (
                <Badge variant="destructive">
                  🚨 {kpis.no_ira} guardias no asistirán
                </Badge>
              )}
              {kpis.puestos_sin_cobertura > 0 && (
                <Badge variant="destructive">
                  ❌ {kpis.puestos_sin_cobertura} puestos sin cobertura
                </Badge>
              )}
            </div>
            <div className="mt-3">
              <Link href="/pauta-diaria-v2">
                <Button size="sm" variant="destructive">
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