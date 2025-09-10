"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Building, Calendar, Clock, User, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Asignacion {
  id: string;
  instalacion_id: string;
  instalacion_nombre: string;
  puesto_nombre: string;
  fecha_inicio: string;
  fecha_fin?: string;
  estado: 'activa' | 'finalizada';
  tipo_asignacion: 'directa' | 'pauta_mensual';
}

interface AsignacionGuardiaProps {
  guardiaId: string;
}

export default function AsignacionGuardia({ guardiaId }: AsignacionGuardiaProps) {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [asignacionActual, setAsignacionActual] = useState<Asignacion | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    cargarAsignaciones();
  }, [guardiaId]);

  const cargarAsignaciones = async () => {
    try {
      setLoading(true);
      
      // PRIORIDAD 1: Intentar nueva API con historial completo
      const responseHistorial = await fetch(`/api/guardias/${guardiaId}/historial-asignaciones`);
      
      if (responseHistorial.ok) {
        const data = await responseHistorial.json();
        console.log('🔍 Respuesta de nueva API historial:', data);
        if (data.success) {
          // USAR SIEMPRE la nueva API, aunque no haya datos (para mostrar vacío correctamente)
          console.log('🔍 Datos de historial recibidos:', data.historial);
          setAsignaciones(data.historial || []);
          setAsignacionActual(data.asignacionActual || null);
          logger.debug('✅ Historial cargado desde nueva API:', data.historial?.length || 0);
          return;
        }
      }
      
      // FALLBACK: Usar API legacy si no hay datos en nuevo sistema
      const response = await fetch(`/api/guardias/${guardiaId}/asignaciones`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Datos de API legacy:', {
          asignaciones: data.asignaciones,
          asignacionActual: data.asignacionActual
        });
        setAsignaciones(data.asignaciones || []);
        setAsignacionActual(data.asignacionActual || null);
        logger.debug('✅ Asignaciones cargadas desde API legacy:', data.asignaciones?.length || 0);
      } else {
        logger.error('Error al cargar asignaciones::', response.statusText);
        toast({
          title: "Error",
          description: "No se pudieron cargar las asignaciones del guardia",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('Error al cargar asignaciones::', error);
      toast({
        title: "Error",
        description: "Error de conexión al cargar asignaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha: string) => {
    // SIMPLIFICADO: Parsear fecha directamente sin zona horaria
    if (!fecha) return 'Fecha no disponible';
    
    try {
      console.log('🔍 Formateando fecha:', { fechaOriginal: fecha });
      
      // Parsear fecha como YYYY-MM-DD directamente
      const [año, mes, dia] = fecha.split('-').map(Number);
      
      if (!año || !mes || !dia) {
        console.warn('Formato de fecha inválido:', fecha);
        return 'Formato inválido';
      }
      
      // Crear fecha local sin problemas de zona horaria
      const fechaLocal = new Date(año, mes - 1, dia); // mes - 1 porque Date usa 0-11
      
      const fechaFormateada = fechaLocal.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      console.log('🔍 Fecha formateada:', {
        entrada: fecha,
        año, mes, dia,
        fechaLocal,
        resultado: fechaFormateada
      });
      
      return fechaFormateada;
      
    } catch (error) {
      console.error('Error formateando fecha:', fecha, error);
      return 'Error en fecha';
    }
  };

  const obtenerEstadoBadge = (estado: string) => {
    if (estado === 'activa') {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle className="h-3 w-3 mr-1" />
          Activa
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Finalizada
      </Badge>
    );
  };

  const obtenerTipoAsignacionBadge = (tipo: string) => {
    if (tipo === 'directa') {
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-600">
          <Building className="h-3 w-3 mr-1" />
          Directa
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-purple-600 border-purple-600">
        <Calendar className="h-3 w-3 mr-1" />
        Pauta Mensual
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        <span className="ml-2">Cargando asignaciones...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Asignación Actual */}
      {asignacionActual && (
        <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Asignación Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{asignacionActual.instalacion_nombre}</p>
                  <p className="text-xs text-muted-foreground">Instalación</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{asignacionActual.puesto_nombre}</p>
                  <p className="text-xs text-muted-foreground">Puesto</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{formatearFecha(asignacionActual.fecha_inicio)}</p>
                  <p className="text-xs text-muted-foreground">Desde</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {obtenerTipoAsignacionBadge(asignacionActual.tipo_asignacion)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sin Asignación Actual */}
      {!asignacionActual && (
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Sin Asignación Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Este guardia no tiene una asignación activa en este momento.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Historial de Asignaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historial de Asignaciones
            <Badge variant="secondary" className="ml-2">
              {asignaciones.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {asignaciones.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay historial de asignaciones</p>
            </div>
          ) : (
            <div className="space-y-4">
              {asignaciones.map((asignacion) => (
                <div
                  key={asignacion.id}
                  className={`p-4 rounded-lg border ${
                    asignacion.estado === 'activa'
                      ? 'border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-950/10'
                      : 'border-gray-200 bg-gray-50/30 dark:border-gray-800 dark:bg-gray-950/10'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">{asignacion.instalacion_nombre}</h4>
                      {/* NUEVO: ID de asignación (sutil) */}
                      <span className="text-xs text-gray-400 font-mono">#{asignacion.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {obtenerEstadoBadge(asignacion.estado)}
                      {obtenerTipoAsignacionBadge(asignacion.tipo_asignacion)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Puesto:</span>
                      <span className="font-medium">{asignacion.puesto_nombre}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Inicio:</span>
                      <span className="font-medium" title={`Fecha original: ${asignacion.fecha_inicio}`}>
                        {formatearFecha(asignacion.fecha_inicio)}
                      </span>
                    </div>
                    
                    {asignacion.fecha_termino && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Término:</span>
                        <span className="font-medium" title={`Fecha original: ${asignacion.fecha_termino}`}>
                          {formatearFecha(asignacion.fecha_termino)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botón de actualizar */}
      <div className="flex justify-end">
        <Button
          onClick={cargarAsignaciones}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>
    </div>
  );
}

