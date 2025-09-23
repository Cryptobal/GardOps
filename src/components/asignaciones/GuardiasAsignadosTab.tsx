"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, MapPin, Users, TrendingUp, Loader2, Sun, Moon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCan } from '@/hooks/useCan';

interface GuardiaAsignado {
  guardia_id: string;
  guardia_nombre: string;
  telefono: string;
  guardia_comuna: string;
  guardia_lat: number;
  guardia_lng: number;
  rol_nombre: string;
  fecha_asignacion: string;
  asignado_desde: string;
  distancia: number;
}

interface InstalacionConGuardias {
  instalacion_id: string;
  instalacion_nombre: string;
  instalacion_lat: number;
  instalacion_lng: number;
  guardias: GuardiaAsignado[];
  total_guardias: number;
  distancia_promedio: number;
  distancia_maxima: number;
  distancia_minima: number;
  puntuacion_optimizacion: number;
}

interface GuardiasAsignadosTabProps {
  map: google.maps.Map | null;
}

export default function GuardiasAsignadosTab({ map }: GuardiasAsignadosTabProps) {
  const { toast } = useToast();
  const [instalaciones, setInstalaciones] = useState<InstalacionConGuardias[]>([]);
  const [loading, setLoading] = useState(true);
  const [instalacionSeleccionada, setInstalacionSeleccionada] = useState<InstalacionConGuardias | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [isThemeInitialized, setIsThemeInitialized] = useState(false);

  // Verificar permisos
  const { allowed: canViewGuardias, loading: loadingPermissions } = useCan("guardias.view");
  const { allowed: canViewInstalaciones } = useCan("instalaciones.view");
  const { allowed: canViewReportes } = useCan("reportes.view");

  // Verificar si tiene permisos para ver esta funcionalidad
  const hasPermission = canViewGuardias || canViewInstalaciones || canViewReportes;

  useEffect(() => {
    // Inicializar tema solo en el cliente
    const savedTheme = localStorage.getItem('theme');
    setIsDark(savedTheme === 'dark');
    setIsThemeInitialized(true);
  }, []);

  useEffect(() => {
    if (hasPermission && !loadingPermissions) {
      cargarGuardiasAsignados();
    }
  }, [hasPermission, loadingPermissions]);

  const cargarGuardiasAsignados = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/instalaciones/guardias-asignados');
      const data = await response.json();

      if (data.success) {
        setInstalaciones(data.data);
        if (data.data.length > 0) {
          setInstalacionSeleccionada(data.data[0]); // Seleccionar la primera por defecto
        }
      } else {
        if (toast?.error) {
          toast.error(data.error || 'Error cargando guardias asignados', 'Error');
        } else {
          console.error('Error cargando guardias asignados:', data.error);
        }
      }
    } catch (error) {
      logger.error('Error cargando guardias asignados::', error);
      if (toast?.error) {
        toast.error('Error de conexión al cargar datos', 'Error');
      } else {
        console.error('Error de conexión al cargar datos:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (instalacionSeleccionada && map) {
      actualizarMapa();
    }
  }, [instalacionSeleccionada, map]);

  const actualizarMapa = () => {
    if (!map || !instalacionSeleccionada) return;

    // Limpiar marcadores existentes
    (map as any).__markers?.forEach((m: google.maps.Marker) => m.setMap(null));
    (map as any).__infoWindows?.forEach((iw: google.maps.InfoWindow) => iw.close());

    const markers: google.maps.Marker[] = [];
    const infoWindows: google.maps.InfoWindow[] = [];

    // Marcador de la instalación (azul)
    const instMarker = new google.maps.Marker({
      position: { lat: instalacionSeleccionada.instalacion_lat, lng: instalacionSeleccionada.instalacion_lng },
      map,
      icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      title: instalacionSeleccionada.instalacion_nombre
    });

    const instInfoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 12px; min-width: 200px; font-family: system-ui;">
          <h3 style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937;">${instalacionSeleccionada.instalacion_nombre}</h3>
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">👥 ${instalacionSeleccionada.total_guardias} guardias asignados</p>
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">📏 Distancia promedio: ${instalacionSeleccionada.distancia_promedio.toFixed(1)} km</p>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">🏆 Optimización: ${instalacionSeleccionada.puntuacion_optimizacion.toFixed(0)}%</p>
        </div>
      `
    });

    instMarker.addListener('click', () => {
      infoWindows.forEach(iw => iw.close());
      instInfoWindow.open(map, instMarker);
    });

    markers.push(instMarker);
    infoWindows.push(instInfoWindow);

    // Marcadores de guardias (verdes)
    instalacionSeleccionada.guardias.forEach(guardia => {
      const marker = new google.maps.Marker({
        position: { lat: guardia.guardia_lat, lng: guardia.guardia_lng },
        map,
        icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        title: guardia.guardia_nombre
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 200px; font-family: system-ui;">
            <h3 style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937;">${guardia.guardia_nombre}</h3>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">📍 ${guardia.guardia_comuna}</p>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">🎯 ${guardia.rol_nombre}</p>
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">📏 ${guardia.distancia.toFixed(1)} km</p>
            ${guardia.telefono ? `
              <div style="display: flex; gap: 8px; margin-top: 8px;">
                <a href="tel:${guardia.telefono}" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 500;">
                  📞 Llamar
                </a>
                <a href="https://wa.me/56${guardia.telefono.replace(/\D/g, '')}" target="_blank" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: #25d366; color: white; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 500;">
                  💬 WhatsApp
                </a>
              </div>
            ` : '<p style="margin: 0; color: #9ca3af; font-size: 12px;">Sin teléfono</p>'}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindows.forEach(iw => iw.close());
        infoWindow.open(map, marker);
      });

      markers.push(marker);
      infoWindows.push(infoWindow);
    });

    // Centrar mapa en la instalación
    map.setCenter({ lat: instalacionSeleccionada.instalacion_lat, lng: instalacionSeleccionada.instalacion_lng });
    map.setZoom(12);

    // Guardar referencias
    (map as any).__markers = markers;
    (map as any).__infoWindows = infoWindows;
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("light");
    localStorage.setItem('theme', !isDark ? 'dark' : 'light');
  };

  // Mostrar loading de permisos
  if (loadingPermissions) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin mr-3" />
        <span className="text-sm">Verificando permisos...</span>
      </div>
    );
  }

  // Mostrar error de permisos
  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <Users className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Acceso Restringido
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            No tienes permisos para ver la información de guardias asignados.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Contacta a tu administrador para obtener los permisos necesarios.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin mr-3" />
        <span className="text-sm">Cargando guardias asignados...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header con botón de tema */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
          Guardias Asignados
        </h2>
        {isThemeInitialized && (
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="rounded-full p-2 h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {/* Ranking de optimización - Mobile First */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            Ranking de Optimización
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {instalaciones.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No hay instalaciones con guardias asignados
              </p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {instalaciones.map((inst, index) => (
                <div
                  key={inst.instalacion_id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                    instalacionSeleccionada?.instalacion_id === inst.instalacion_id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                  }`}
                  onClick={() => setInstalacionSeleccionada(inst)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant={index < 3 ? 'default' : 'secondary'}
                          className="text-xs px-2 py-1"
                        >
                          #{index + 1}
                        </Badge>
                        <h4 className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
                          {inst.instalacion_nombre}
                        </h4>
                      </div>
                      
                      {/* Grid responsive para métricas */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>{inst.total_guardias}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>{inst.distancia_promedio.toFixed(1)} km</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>{inst.puntuacion_optimizacion.toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">📊</span>
                          <span>{inst.distancia_minima.toFixed(1)}-{inst.distancia_maxima.toFixed(1)} km</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de guardias de la instalación seleccionada */}
      {instalacionSeleccionada && (
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              Guardias Asignados ({instalacionSeleccionada.total_guardias})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 sm:space-y-3">
              {instalacionSeleccionada.guardias.map(guardia => (
                <div 
                  key={guardia.guardia_id} 
                  className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
                        {guardia.guardia_nombre}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                        {guardia.guardia_comuna}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs px-2 py-1">
                          {guardia.rol_nombre}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          📏 {guardia.distancia.toFixed(1)} km
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                        {guardia.telefono || 'Sin teléfono'}
                      </p>
                      {guardia.telefono && (
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`tel:${guardia.telefono}`, '_self')}
                            className="h-7 w-7 p-0 text-xs"
                          >
                            <Phone className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`https://wa.me/56${guardia.telefono.replace(/\D/g, '')}`, '_blank')}
                            className="h-7 w-7 p-0 text-xs"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}