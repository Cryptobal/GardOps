"use client";

import { Authorize, GuardButton, can } from '@/lib/authz-ui.tsx'
import React, { useState, useEffect } from 'react';
import { MapPin, Loader2, Building2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import GoogleMap from '@/components/ui/google-map';
import { cn } from '@/lib/utils';
import { BuscadorEntidades, EntityOption } from '@/components/ui/buscador-entidades';
import { 
  LocationData, 
  SearchResult, 
  getGuardiasConCoordenadas, 
  getInstalacionesConCoordenadas,
  buscarUbicacionesCercanas,
  getCurrentTenantId
} from '@/lib/api/optimizacion-asignaciones';
import { StatsCards } from '@/components/optimizacion/stats-cards';
import { FiltrosAvanzados } from '@/components/optimizacion/filtros-avanzados';

export default function AsignacionesPage() {
  const [tipoReferencia, setTipoReferencia] = useState<'guardia' | 'instalacion'>('instalacion');
  const [referenciaSeleccionada, setReferenciaSeleccionada] = useState<LocationData | null>(null);
  const [distancia, setDistancia] = useState<number>(10);
  const [busqueda, setBusqueda] = useState<string>('');
  const [resultados, setResultados] = useState<SearchResult[]>([]);

  
  // Estados para datos y carga
  const [guardias, setGuardias] = useState<LocationData[]>([]);
  const [instalaciones, setInstalaciones] = useState<LocationData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos al montar el componente
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const [guardiasData, instalacionesData] = await Promise.all([
          getGuardiasConCoordenadas(),
          getInstalacionesConCoordenadas()
        ]);
        
        setGuardias(guardiasData);
        setInstalaciones(instalacionesData);
      } catch (err) {
        console.error('Error cargando datos:', err);
        setError('Error al cargar los datos. Por favor, intenta de nuevo.');
      } finally {
        setIsLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // Convertir datos para el buscador
  const guardiasParaBuscador = guardias.map(guardia => {
    // Separar nombre y apellido del campo nombre completo
    const nombreCompleto = guardia.nombre;
    const partes = nombreCompleto.split(' ');
    const nombre = partes[0] || '';
    const apellido = partes.slice(1).join(' ') || '';
    
    return {
      id: guardia.id,
      nombre: nombre,
      apellido: apellido,
      rut: guardia.rut,
      direccion: guardia.direccion,
      ciudad: guardia.ciudad,
      comuna: guardia.comuna,
      email: guardia.email,
      telefono: guardia.telefono,
      tipo: 'guardia' as const
    };
  });

  const instalacionesParaBuscador = instalaciones.map(instalacion => ({
    id: instalacion.id,
    nombre: instalacion.nombre,
    direccion: instalacion.direccion,
    ciudad: instalacion.ciudad,
    comuna: instalacion.comuna,
    cliente_nombre: instalacion.cliente_nombre,
    valor_turno_extra: instalacion.valor_turno_extra,
    tipo: 'instalacion' as const
  }));

  // Debug: Log de datos
  console.log('Guardias originales:', guardias.length);
  console.log('Instalaciones originales:', instalaciones.length);
  console.log('Guardias para buscador:', guardiasParaBuscador.length);
  console.log('Instalaciones para buscador:', instalacionesParaBuscador.length);
  console.log('Ejemplo guardia:', guardiasParaBuscador[0]);
  console.log('Ejemplo instalación:', instalacionesParaBuscador[0]);

  // Calcular resultados cuando cambie la referencia o distancia
  useEffect(() => {
    if (!referenciaSeleccionada) {
      setResultados([]);
      return;
    }

    const datos = tipoReferencia === 'guardia' ? instalaciones : guardias;
    const resultadosCalculados = buscarUbicacionesCercanas(referenciaSeleccionada, datos, distancia);
    setResultados(resultadosCalculados);
  }, [referenciaSeleccionada, distancia, tipoReferencia, guardias, instalaciones]);

  // Generar marcadores para el mapa
  const generarMarcadores = () => {
    const marcadores = [];

    // Marcador de referencia (azul)
    if (referenciaSeleccionada) {
      marcadores.push({
        position: {
          lat: referenciaSeleccionada.latitud,
          lng: referenciaSeleccionada.longitud
        },
        title: referenciaSeleccionada.nombre,
        info: `Punto de referencia: ${referenciaSeleccionada.nombre}`,
        color: 'blue' as const
      });
    }

    // Marcadores de resultados (rojos)
    resultados.forEach(resultado => {
      const datos = tipoReferencia === 'guardia' ? instalaciones : guardias;
      const item = datos.find(item => item.id === resultado.id);
      
      if (item) {
        marcadores.push({
          position: {
            lat: item.latitud,
            lng: item.longitud
          },
          title: resultado.nombre,
          info: `${resultado.nombre} - ${resultado.distancia.toFixed(1)} km`,
          color: 'red' as const
        });
      }
    });

    return marcadores;
  };

  // Obtener centro del mapa
  const obtenerCentroMapa = () => {
    if (referenciaSeleccionada) {
      return {
        lat: referenciaSeleccionada.latitud,
        lng: referenciaSeleccionada.longitud
      };
    }
    // Centro por defecto en Concepción
    return { lat: -36.8270, lng: -73.0500 };
  };

  // Mostrar estado de carga
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Cargando datos de optimización...</p>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="p-2 bg-destructive/10 rounded-lg w-fit mx-auto mb-4">
              <MapPin className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Error al cargar datos</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Authorize resource="optimizacion_asignaciones" action="create" eff={effectivePermissions}>
  <GuardButton resource="optimizacion_asignaciones" action="create" eff={effectivePermissions}  onClick={() => window.location.reload()}>
              Intentar de nuevo
            </GuardButton>
</Authorize>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Optimización de Asignaciones</h1>
            <p className="text-muted-foreground">
              Encuentra guardias e instalaciones cercanas para optimizar asignaciones
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <StatsCards
        totalGuardias={guardias.length}
        totalInstalaciones={instalaciones.length}
        resultadosEncontrados={resultados.length}
        distanciaPromedio={
          resultados.length > 0 
            ? resultados.reduce((sum, r) => sum + r.distancia, 0) / resultados.length 
            : undefined
        }
      />

      {/* Filtros */}
      <FiltrosAvanzados
        tipoReferencia={tipoReferencia}
        onTipoChange={(value) => {
          setTipoReferencia(value);
          setReferenciaSeleccionada(null);
          setBusqueda('');
        }}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        distancia={distancia}
        onDistanciaChange={setDistancia}
        referenciaSeleccionada={referenciaSeleccionada}
        onLimpiarReferencia={() => {
          setReferenciaSeleccionada(null);
          setBusqueda('');
        }}
        guardias={guardiasParaBuscador}
        instalaciones={instalacionesParaBuscador}
        isLoading={isLoading}
        onSeleccionarOpcion={(opcion: EntityOption) => {
          // Convertir EntityOption a LocationData
          const locationData: LocationData = {
            id: opcion.id,
            nombre: opcion.tipo === 'guardia' ? `${opcion.nombre} ${opcion.apellido || ''}`.trim() : opcion.nombre,
            direccion: opcion.direccion || '',
            ciudad: opcion.ciudad || '',
            comuna: opcion.comuna || '',
            latitud: 0, // Se llenará desde los datos originales
            longitud: 0, // Se llenará desde los datos originales
            tipo: opcion.tipo, // Agregar la propiedad tipo requerida
            email: opcion.email || '',
            telefono: opcion.telefono || '',
            rut: opcion.rut || '',
            cliente_nombre: opcion.cliente_nombre || '',
            valor_turno_extra: opcion.valor_turno_extra || 0
          };

          // Buscar los datos completos en los arrays originales
          const datosOriginales = opcion.tipo === 'guardia' ? guardias : instalaciones;
          const datosCompletos = datosOriginales.find(item => item.id === opcion.id);
          
          if (datosCompletos) {
            locationData.latitud = datosCompletos.latitud;
            locationData.longitud = datosCompletos.longitud;
          }

          setReferenciaSeleccionada(locationData);
          setBusqueda(locationData.nombre);
        }}
      />

      {/* Mapa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mapa de ubicaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <GoogleMap
            center={obtenerCentroMapa()}
            zoom={12}
            markers={generarMarcadores()}
            height="500px"
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Tabla de resultados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Resultados ({resultados.length} encontrados)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resultados.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Comuna</TableHead>
                    <TableHead>Ciudad</TableHead>
                    <TableHead>Información adicional</TableHead>
                    <TableHead className="text-right">Distancia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultados.map((resultado) => (
                    <TableRow key={resultado.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {resultado.tipo === 'instalacion' ? (
                            <Building2 className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Users className="h-4 w-4 text-green-500" />
                          )}
                          <span className="font-medium">{resultado.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell>{resultado.direccion}</TableCell>
                      <TableCell>{resultado.comuna}</TableCell>
                      <TableCell>{resultado.ciudad}</TableCell>
                      <TableCell>
                        {resultado.tipo === 'guardia' ? (
                          <div className="space-y-1">
                            {resultado.email && (
                              <div className="text-xs text-muted-foreground">
                                📧 {resultado.email}
                              </div>
                            )}
                            {resultado.telefono && (
                              <div className="text-xs text-muted-foreground">
                                📞 {resultado.telefono}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {resultado.cliente_nombre && (
                              <div className="text-xs text-muted-foreground">
                                🏢 {resultado.cliente_nombre}
                              </div>
                            )}
                            {resultado.valor_turno_extra && (
                              <div className="text-xs text-muted-foreground">
                                💰 ${resultado.valor_turno_extra.toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">
                          {resultado.distancia.toFixed(1)} km
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {referenciaSeleccionada 
                  ? `No se encontraron ${tipoReferencia === 'guardia' ? 'instalaciones' : 'guardias'} dentro del radio de ${distancia} km`
                  : 'Selecciona una referencia para ver resultados'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 