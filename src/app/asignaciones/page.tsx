"use client";

/** 
 * GardOps · Optimización de Asignaciones v2
 * Objetivo: simplificar flujo → instalación ➜ radio ➜ resultados automáticos.
 * Coloca este código en src/app/asignaciones/page.tsx y elimina el
 * estado/props heredados que ya no se usan (typeReference, guardSearch, etc.).
 * Requiere que exista un endpoint GET /api/guards/nearby.
 */

import { useState, useEffect, Fragment } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import GoogleMapsManager from '@/lib/useGoogleMaps';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectItem, SelectContent } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableHead, TableRow, TableCell, TableHeader, TableBody } from '@/components/ui/table';
import { BadgeCheck, MapPin, Loader2, Phone, MessageCircle, Users, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import PPCModal from '@/components/asignaciones/PPCModal';
import GuardiasAsignadosTab from '@/components/asignaciones/GuardiasAsignadosTab';

/* --- Helpers -------------------------------------------------------------- */
type Inst = { id: string; nombre: string; lat: number; lng: number; };
type Guard = { id: string; nombre: string; comuna: string; lat: number; lng: number; distancia: number; telefono: string; };

const radios = [5,10,15,20,25,30,40,50];

/* --- Main Component ------------------------------------------------------- */
export default function Asignaciones() {
  const { toast } = useToast();
  const [instalaciones,setInstalaciones]=useState<Inst[]>([]);
  const [instSelected,setInstSelected]=useState<Inst|null>(null);
  const [radio,setRadio]=useState<number>(Number(localStorage.getItem('radioKm')||10));
  const [guards,setGuards]=useState<Guard[]>([]);
  const [map,setMap]=useState<google.maps.Map|null>(null);
  const [asignando,setAsignando]=useState<string|null>(null); // ID del guardia siendo asignado
  const [ppcModalOpen,setPpcModalOpen]=useState(false);
  const [guardiaSeleccionado,setGuardiaSeleccionado]=useState<Guard|null>(null);
  const [tabActiva,setTabActiva]=useState<'buscar'|'asignados'>('buscar');

  /* Cargar instalaciones para el autocomplete */
  useEffect(()=>{ fetch('/api/instalaciones?withCoords=true').then(r=>r.json()).then(setInstalaciones); },[]);

  /* Inicializar mapa una sola vez */
  useEffect(()=>{
    const initMap = async () => {
      try {
        const manager = GoogleMapsManager.getInstance();
        await manager.load();
        
        setMap(new google.maps.Map(document.getElementById('map') as HTMLElement,{ 
          zoom:6, 
          center:{lat:-33.45,lng:-70.66}, 
          styles:[/*dark theme*/] 
        }));
      } catch (error) {
        console.error('Error cargando Google Maps:', error);
      }
    };
    
    initMap();
  },[]);

  /* Limpiar mapa cuando se cambia a pestaña de guardias asignados */
  useEffect(() => {
    if (tabActiva === 'asignados' && map) {
      // Limpiar marcadores existentes
      (map as any).__markers?.forEach((m: google.maps.Marker) => m.setMap(null));
      (map as any).__infoWindows?.forEach((iw: google.maps.InfoWindow) => iw.close());
      (map as any).__markers = [];
      (map as any).__infoWindows = [];
    }
  }, [tabActiva, map]);

  /* Cada vez que cambian instalación o radio → actualiza guards + markers */
  useEffect(()=>{
    if(!map||!instSelected||tabActiva!=='buscar') return;
    
    // Validar coordenadas de la instalación
    const instLat = parseFloat(instSelected.lat.toString());
    const instLng = parseFloat(instSelected.lng.toString());
    
    if (isNaN(instLat) || isNaN(instLng)) {
      console.error('Coordenadas de instalación inválidas:', instSelected);
      return;
    }

    /* Limpia capas previas */
    (map as any).__markers?.forEach((m:google.maps.Marker)=>m.setMap(null));
    map.setCenter({lat:instLat,lng:instLng}); 
    map.setZoom(11);

    /* Marker rojo instalación */
    const red=new google.maps.Marker({
      position:{lat:instLat,lng:instLng}, 
      map, 
      icon:'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
    });
    (map as any).__markers=[red];

    /* Fetch guards */
    fetch(`/api/guards/nearby?installationId=${instSelected.id}&radius=${radio}`)
      .then(r=>r.json())
      .then((data:Guard[])=>{
        console.log('Guardias recibidos:', data);
        setGuards(data);
        
        // Validar coordenadas de guardias antes de crear marcadores
        const gMarkers = data
          .filter(g => {
            const lat = parseFloat(g.lat.toString());
            const lng = parseFloat(g.lng.toString());
            return !isNaN(lat) && !isNaN(lng);
          })
          .map(g => {
            const lat = parseFloat(g.lat.toString());
            const lng = parseFloat(g.lng.toString());
            
            const marker = new google.maps.Marker({
              position:{lat,lng},
              map,
              icon:'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
              title: g.nombre
            });

            // Crear info window para el marcador
            const infoWindow = new google.maps.InfoWindow({
              content: `
                <div style="padding: 12px; min-width: 200px; font-family: system-ui;">
                  <h3 style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937;">${g.nombre}</h3>
                  <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">📍 ${g.comuna}</p>
                  <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">📏 ${g.distancia.toFixed(1)} km</p>
                  ${g.telefono ? `
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                      <a href="tel:${g.telefono}" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 500;">
                        📞 Llamar
                      </a>
                      <a href="https://wa.me/56${g.telefono.replace(/\D/g, '')}" target="_blank" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: #25d366; color: white; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 500;">
                        💬 WhatsApp
                      </a>
                    </div>
                  ` : '<p style="margin: 0; color: #9ca3af; font-size: 12px;">Sin teléfono</p>'}
                </div>
              `
            });

            // Agregar evento click al marcador
            marker.addListener('click', () => {
              // Cerrar otros info windows
              (map as any).__infoWindows?.forEach((iw: google.maps.InfoWindow) => iw.close());
              
              // Abrir info window del marcador clickeado
              infoWindow.open(map, marker);
              
              // Guardar referencia para poder cerrarlo después
              if (!(map as any).__infoWindows) (map as any).__infoWindows = [];
              (map as any).__infoWindows.push(infoWindow);
            });

            return marker;
          });
        (map as any).__markers.push(...gMarkers);
      })
      .catch(error => {
        console.error('Error obteniendo guardias cercanos:', error);
        setGuards([]);
      });
  },[instSelected,radio,map]);

  /* Persistir radio en localStorage */
  useEffect(()=>{ localStorage.setItem('radioKm',String(radio)); },[radio]);

  /* Función para abrir modal de PPCs */
  const handleAsignar = (guardia: Guard) => {
    if (!instSelected) {
      toast.error("Selecciona una instalación primero", "Error");
      return;
    }
    
    setGuardiaSeleccionado(guardia);
    setPpcModalOpen(true);
  };

  /* Función para cerrar modal y actualizar lista */
  const handleAsignacionExitosa = () => {
    if (guardiaSeleccionado) {
      // Actualizar la lista de guardias removiendo el asignado
      setGuards(prev => prev.filter(g => g.id !== guardiaSeleccionado.id));
    }
    setPpcModalOpen(false);
    setGuardiaSeleccionado(null);
  };

  return(
    <Fragment>
      {/* Tabs de navegación */}
      <div className="flex space-x-1 mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setTabActiva('buscar')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            tabActiva === 'buscar'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Search className="w-4 h-4" />
          Buscar Guardias
        </button>
        <button
          onClick={() => setTabActiva('asignados')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            tabActiva === 'asignados'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Guardias Asignados
        </button>
      </div>

      {/* Mapa - Siempre visible */}
      <div id="map" className="w-full h-64 sm:h-80 lg:h-96 rounded-lg mb-4 shadow-lg"/>

      {tabActiva === 'buscar' ? (
        <div>
          {/* KPIs */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Stat title="Guardias" value={guards.length} icon={<BadgeCheck className="w-4 h-4" />} />
            <Stat title="Instalación" value={instSelected?1:0} icon={<MapPin className="w-4 h-4" />} />
            <Stat title="Resultados" value={guards.length} icon="🎯" />
            <Stat title="Dist. Prom." value={guards.length?`${(guards.reduce((t,g)=>t+g.distancia,0)/guards.length).toFixed(1)} km`:'N/A'} icon="📏" />
          </section>

      {/* Configuración */}
      <Card className="mb-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-4 space-y-4">
          {/* Instalación */}
          <div>
            <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Instalación</label>
            <Select onValueChange={(value) => {
              const found = instalaciones.find(i => i.id === value);
              if (found) setInstSelected(found);
            }}>
              <SelectTrigger className="w-full">
                <span>{instSelected ? instSelected.nombre : "Seleccionar instalación..."}</span>
              </SelectTrigger>
              <SelectContent>
                {instalaciones.map(i => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Radio */}
          <div>
            <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">Radio de búsqueda</label>
            <Select value={String(radio)} onValueChange={v=>setRadio(Number(v))}>
              <SelectTrigger className="w-full">
                <span>{radio} km</span>
              </SelectTrigger>
              <SelectContent>
                {radios.map(r=><SelectItem key={r} value={String(r)}>{r} km</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de guardias - Grid responsive */}
      {guards.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Guardias Cercanos ({guards.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guards.sort((a,b)=>a.distancia-b.distancia).map(g=>(
              <Card key={g.id} className="p-4">
                <div className="space-y-3">
                  {/* Información principal */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-base">
                        <a 
                          href={`/guardias/${g.id}`} 
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {g.nombre}
                        </a>
                      </h4>
                      <p className="text-sm text-gray-600">{g.comuna}</p>
                      <p className="text-sm text-gray-500">📏 {g.distancia.toFixed(1)} km</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{g.telefono || 'Sin teléfono'}</p>
                    </div>
                  </div>

                {/* Botones de acción */}
                <div className="flex gap-2 flex-wrap">
                  {g.telefono && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(`tel:${g.telefono}`, '_self')}
                        className="flex-1 sm:flex-none"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Llamar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(`https://wa.me/56${g.telefono.replace(/\D/g, '')}`, '_blank')}
                        className="flex-1 sm:flex-none"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp
                      </Button>
                    </>
                  )}
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => handleAsignar(g)}
                    className="flex-1 sm:flex-none"
                  >
                    Asignar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          </div>
        </div>
      )}
        </div>
      ) : (
        <GuardiasAsignadosTab map={map} />
      )}

      {(() => { console.log('Optimización de Asignaciones v2 cargada correctamente'); return null; })()}

      {/* Modal de PPCs */}
      {guardiaSeleccionado && (
        <PPCModal
          isOpen={ppcModalOpen}
          onClose={() => {
            setPpcModalOpen(false);
            setGuardiaSeleccionado(null);
          }}
          guardia={guardiaSeleccionado}
          instalacionId={instSelected?.id || ''}
          onAsignacionExitosa={handleAsignacionExitosa}
        />
      )}
    </Fragment>
  );
}

/* --- KPI Card component --------------------------------------------------- */
function Stat({title,value,icon}:{title:string;value:any;icon:any}) {
  return(
    <Card className="text-center">
      <CardContent className="p-3 flex flex-col gap-1 items-center">
        {typeof icon==='string'?<span className="text-lg">{icon}</span>:icon}
        <span className="text-lg lg:text-xl font-semibold">{value}</span>
        <span className="text-xs opacity-70">{title}</span>
      </CardContent>
    </Card>
  );
} 