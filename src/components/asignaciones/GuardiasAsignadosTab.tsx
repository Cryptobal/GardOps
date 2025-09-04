"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, MapPin, Users, TrendingUp, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  useEffect(() => {
    cargarGuardiasAsignados();
  }, []);

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
        toast.error(data.error || 'Error cargando guardias asignados', 'Error');
      }
    } catch (error) {
      console.error('Error cargando guardias asignados:', error);
      toast.error('Error de conexión al cargar datos', 'Error');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mr-3" />
        <span>Cargando guardias asignados...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Ranking de optimización */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Ranking de Optimización por Instalación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {instalaciones.map((inst, index) => (
              <div
                key={inst.instalacion_id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  instalacionSeleccionada?.instalacion_id === inst.instalacion_id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setInstalacionSeleccionada(inst)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={index < 3 ? 'default' : 'secondary'}>
                        #{index + 1}
                      </Badge>
                      <h4 className="font-medium">{inst.instalacion_nombre}</h4>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-gray-600">
                      <div>👥 {inst.total_guardias} guardias</div>
                      <div>📏 {inst.distancia_promedio.toFixed(1)} km</div>
                      <div>📊 {inst.puntuacion_optimizacion.toFixed(0)}%</div>
                      <div>🎯 {inst.distancia_minima.toFixed(1)}-{inst.distancia_maxima.toFixed(1)} km</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>


      {/* Lista de guardias de la instalación seleccionada */}
      {instalacionSeleccionada && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Guardias Asignados ({instalacionSeleccionada.total_guardias})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {instalacionSeleccionada.guardias.map(guardia => (
                <div key={guardia.guardia_id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{guardia.guardia_nombre}</h4>
                      <p className="text-sm text-gray-600">{guardia.guardia_comuna}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{guardia.rol_nombre}</Badge>
                        <span className="text-sm text-gray-500">📏 {guardia.distancia.toFixed(1)} km</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{guardia.telefono || 'Sin teléfono'}</p>
                      {guardia.telefono && (
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`tel:${guardia.telefono}`, '_self')}
                            className="h-8 w-8 p-0"
                          >
                            <Phone className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`https://wa.me/56${guardia.telefono.replace(/\D/g, '')}`, '_blank')}
                            className="h-8 w-8 p-0"
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
