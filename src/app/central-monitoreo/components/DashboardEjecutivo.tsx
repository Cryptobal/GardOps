'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Phone, 
  Building, 
  Users,
  Activity,
  BarChart3,
  Target,
  Zap,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Calendar,
  MapPin
} from 'lucide-react';

interface DashboardEjecutivoProps {
  llamados: any[];
  contactos: any[];
  fecha: string;
  onRefresh: () => void;
}

export default function DashboardEjecutivo({ 
  llamados, 
  contactos, 
  fecha, 
  onRefresh 
}: DashboardEjecutivoProps) {
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [modoOscuro, setModoOscuro] = useState(false);

  // Calcular métricas ejecutivas
  const metricas = useMemo(() => {
    const ahora = new Date();
    const horaActual = ahora.getHours();
    const minutoActual = ahora.getMinutes();
    const tiempoActual = horaActual * 60 + minutoActual;

    const llamadosClasificados = llamados.map(llamado => {
      const programado = new Date(llamado.programado_para);
      const horaProgramada = programado.getHours();
      const minutoProgramado = programado.getMinutes();
      const tiempoProgramado = horaProgramada * 60 + minutoProgramado;
      
      const diferenciaMinutos = tiempoProgramado - tiempoActual;
      
      let categoria: 'urgente' | 'actual' | 'proximo' | 'futuro' | 'completado';
      if (llamado.estado === 'exitoso') {
        categoria = 'completado';
      } else if (diferenciaMinutos < -15) {
        categoria = 'urgente';
      } else if (diferenciaMinutos >= -15 && diferenciaMinutos <= 30) {
        categoria = 'actual';
      } else if (diferenciaMinutos > 30 && diferenciaMinutos <= 120) {
        categoria = 'proximo';
      } else {
        categoria = 'futuro';
      }

      return { ...llamado, categoria, diferenciaMinutos };
    });

    const total = llamadosClasificados.length;
    const completados = llamadosClasificados.filter(l => l.categoria === 'completado').length;
    const urgentes = llamadosClasificados.filter(l => l.categoria === 'urgente').length;
    const actuales = llamadosClasificados.filter(l => l.categoria === 'actual').length;
    const proximos = llamadosClasificados.filter(l => l.categoria === 'proximo').length;
    const incidentes = llamadosClasificados.filter(l => l.estado === 'incidente').length;

    const porcentajeCompletado = total > 0 ? (completados / total) * 100 : 0;
    const porcentajeIncidentes = total > 0 ? (incidentes / total) * 100 : 0;
    const eficiencia = total > 0 ? ((completados - incidentes) / total) * 100 : 0;

    // Calcular tendencias (comparar con hora anterior)
    const llamadosHoraAnterior = llamadosClasificados.filter(l => {
      const programado = new Date(l.programado_para);
      return programado.getHours() === horaActual - 1;
    });
    
    const completadosHoraAnterior = llamadosHoraAnterior.filter(l => l.estado === 'exitoso').length;
    const tendencia = completadosHoraAnterior > 0 ? 
      ((completados - completadosHoraAnterior) / completadosHoraAnterior) * 100 : 0;

    return {
      total,
      completados,
      urgentes,
      actuales,
      proximos,
      incidentes,
      porcentajeCompletado,
      porcentajeIncidentes,
      eficiencia,
      tendencia,
      llamadosClasificados
    };
  }, [llamados]);

  // Obtener instalaciones con más incidentes
  const instalacionesCriticas = useMemo(() => {
    const incidentesPorInstalacion = metricas.llamadosClasificados
      .filter(l => l.estado === 'incidente')
      .reduce((acc, llamado) => {
        acc[llamado.instalacion_nombre] = (acc[llamado.instalacion_nombre] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(incidentesPorInstalacion)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  }, [metricas.llamadosClasificados]);

  // Obtener llamados más atrasados
  const llamadosMasAtrasados = useMemo(() => {
    return metricas.llamadosClasificados
      .filter(l => l.categoria === 'urgente')
      .sort((a, b) => Math.abs(a.diferenciaMinutos) - Math.abs(b.diferenciaMinutos))
      .slice(0, 5);
  }, [metricas.llamadosClasificados]);

  // Exportar reporte
  const exportarReporte = () => {
    const reporte = {
      fecha,
      hora: new Date().toLocaleTimeString('es-CL'),
      metricas,
      instalacionesCriticas,
      llamadosMasAtrasados
    };

    const blob = new Blob([JSON.stringify(reporte, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-monitoreo-${fecha}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header del Dashboard */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-xl p-6 text-white border border-slate-600">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Dashboard Ejecutivo
            </h2>
            <p className="text-slate-300">
              Monitoreo en tiempo real • {fecha} • {new Date().toLocaleTimeString('es-CL')}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setMostrarDetalles(!mostrarDetalles)}
              variant="outline"
              size="sm"
              className="bg-slate-700/50 border-slate-500 text-white hover:bg-slate-600/50"
            >
              {mostrarDetalles ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {mostrarDetalles ? 'Ocultar Detalles' : 'Ver Detalles'}
            </Button>
            
            <Button
              onClick={onRefresh}
              variant="outline"
              size="sm"
              className="bg-slate-700/50 border-slate-500 text-white hover:bg-slate-600/50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            
            <Button
              onClick={exportarReporte}
              variant="outline"
              size="sm"
              className="bg-slate-700/50 border-slate-500 text-white hover:bg-slate-600/50"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Eficiencia General</p>
                <p className="text-3xl font-bold text-green-800">{metricas.eficiencia.toFixed(1)}%</p>
                <div className="flex items-center gap-1 mt-2">
                  {metricas.tendencia > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-xs ${metricas.tendencia > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(metricas.tendencia).toFixed(1)}%
                  </span>
                </div>
              </div>
              <Target className="w-12 h-12 text-green-600" />
            </div>
            <Progress value={metricas.eficiencia} className="mt-4" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Llamados Completados</p>
                <p className="text-3xl font-bold text-blue-800">{metricas.completados}</p>
                <p className="text-sm text-blue-600 mt-1">de {metricas.total} total</p>
              </div>
              <CheckCircle className="w-12 h-12 text-blue-600" />
            </div>
            <Progress value={metricas.porcentajeCompletado} className="mt-4" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Llamados Urgentes</p>
                <p className="text-3xl font-bold text-red-800">{metricas.urgentes}</p>
                <p className="text-sm text-red-600 mt-1">requieren atención</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-red-600" />
            </div>
            {metricas.urgentes > 0 && (
              <div className="mt-4 p-2 bg-red-200 rounded-lg">
                <p className="text-xs text-red-800 font-medium">⚠️ Atención requerida</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Incidentes</p>
                <p className="text-3xl font-bold text-orange-800">{metricas.incidentes}</p>
                <p className="text-sm text-orange-600 mt-1">{metricas.porcentajeIncidentes.toFixed(1)}% del total</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-orange-600" />
            </div>
            {metricas.incidentes > 0 && (
              <div className="mt-4 p-2 bg-orange-200 rounded-lg">
                <p className="text-xs text-orange-800 font-medium">🔍 Revisión necesaria</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detalles Expandidos */}
      {mostrarDetalles && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Instalaciones Críticas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                Instalaciones Críticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {instalacionesCriticas.length > 0 ? (
                <div className="space-y-3">
                  {instalacionesCriticas.map(([instalacion, incidentes]) => (
                    <div key={instalacion} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Building className="w-4 h-4 text-red-600" />
                        <span className="font-medium">{instalacion}</span>
                      </div>
                      <Badge variant="destructive">{incidentes} incidentes</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p>No hay instalaciones críticas</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Llamados Más Atrasados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <Clock className="w-5 h-5" />
                Llamados Más Atrasados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {llamadosMasAtrasados.length > 0 ? (
                <div className="space-y-3">
                  {llamadosMasAtrasados.map((llamado) => (
                    <div key={llamado.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-orange-600" />
                        <div>
                          <p className="font-medium text-sm">{llamado.instalacion_nombre}</p>
                          <p className="text-xs text-gray-600">
                            {new Date(llamado.programado_para).toLocaleTimeString('es-CL', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="destructive">
                        {Math.abs(llamado.diferenciaMinutos)}m atrasado
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p>No hay llamados atrasados</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Distribución por Estado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Distribución por Estado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Completados</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${metricas.porcentajeCompletado}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{metricas.completados}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pendientes</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${((metricas.actuales + metricas.proximos) / metricas.total) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{metricas.actuales + metricas.proximos}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Urgentes</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${(metricas.urgentes / metricas.total) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{metricas.urgentes}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Incidentes</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full" 
                        style={{ width: `${metricas.porcentajeIncidentes}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{metricas.incidentes}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumen de Actividad */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Resumen de Actividad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Instalaciones Activas</span>
                  </div>
                  <span className="font-medium">{contactos.length}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Contactos Disponibles</span>
                  </div>
                  <span className="font-medium">{contactos.length}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">Fecha de Monitoreo</span>
                  </div>
                  <span className="font-medium">{fecha}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-600" />
                    <span className="text-sm">Cobertura</span>
                  </div>
                  <span className="font-medium">100%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
