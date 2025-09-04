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
import { BadgeCheck, MapPin, Loader2, Phone, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import PPCModal from '@/components/asignaciones/PPCModal';

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

  /* Cada vez que cambian instalación o radio → actualiza guards + markers */
  useEffect(()=>{
    if(!map||!instSelected) return;
    
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
            return new google.maps.Marker({
              position:{lat,lng},
              map,
              icon:'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
            });
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
      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Stat title="Total Guardias" value={guards.length} icon={<BadgeCheck className="w-4 h-4" />} />
        <Stat title="Instalación Seleccionada" value={instSelected?1:0} icon={<MapPin className="w-4 h-4" />} />
        <Stat title="Resultados" value={guards.length} icon="🎯" />
        <Stat title="Dist. Promedio" value={guards.length?`${(guards.reduce((t,g)=>t+g.distancia,0)/guards.length).toFixed(1)} km`:'N/A'} icon="📏" />
      </section>

      {/* Configuración */}
      <Card className="mb-6">
        <CardContent className="flex flex-col md:flex-row gap-4 p-6">
          {/* Instalación */}
          <div className="flex-1">
            <label className="text-sm">Instalación</label>
            <Input placeholder="Buscar instalación..." list="insts" onChange={e=>{
              const found=instalaciones.find(i=>i.nombre===e.target.value); if(found) setInstSelected(found);
            }}/>
            <datalist id="insts">
              {instalaciones.map(i=><option key={i.id} value={i.nombre}/>)}
            </datalist>
          </div>

          {/* Radio */}
          <div className="w-40">
            <label className="text-sm">Radio (km)</label>
            <Select defaultValue={String(radio)} onValueChange={v=>setRadio(Number(v))}>
              <SelectTrigger>{radio} km</SelectTrigger>
              <SelectContent>{radios.map(r=><SelectItem key={r} value={String(r)}>{r} km</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Mapa */}
      <div id="map" className="w-full h-96 rounded-2xl mb-6 shadow-lg"/>

      {/* Tabla resultados */}
      {guards.length>0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guardia</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Comuna</TableHead>
              <TableHead>Distancia (km)</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Asignar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guards.sort((a,b)=>a.distancia-b.distancia).map(g=>(
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.nombre}</TableCell>
                <TableCell>{g.telefono || 'Sin teléfono'}</TableCell>
                <TableCell>{g.comuna}</TableCell>
                <TableCell>{g.distancia.toFixed(1)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {g.telefono && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(`tel:${g.telefono}`, '_self')}
                          className="h-8 w-8 p-0"
                        >
                          <Phone className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(`https://wa.me/56${g.telefono.replace(/\D/g, '')}`, '_blank')}
                          className="h-8 w-8 p-0"
                        >
                          <MessageCircle className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => handleAsignar(g)}
                  >
                    Asignar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
      <CardContent className="p-4 flex flex-col gap-2 items-center">
        {typeof icon==='string'?<span>{icon}</span>:icon}
        <span className="text-2xl font-semibold">{value}</span>
        <span className="text-xs opacity-70">{title}</span>
      </CardContent>
    </Card>
  );
} 