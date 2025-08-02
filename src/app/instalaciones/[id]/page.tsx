'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building2, MapPin, Phone, Mail, Calendar, FileText, Activity, Settings, Edit, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { GoogleMap } from '@/components/ui/google-map';
import { geocodificarDireccion, cargarGoogleMaps, type GeocodingResult } from '@/lib/geocoding';
import { getInstalacion, actualizarInstalacion, obtenerClientes, obtenerComunas, obtenerDatosCompletosInstalacion } from '@/lib/api/instalaciones';
import { Instalacion, Cliente, Comuna } from '@/lib/schemas/instalaciones';
import TurnosInstalacion from './components/TurnosInstalacion';
import { DocumentManager } from '@/components/shared/document-manager';
import { LogViewer } from '@/components/shared/log-viewer';

export default function InstalacionDetallePage() {
  const params = useParams();
  const router = useRouter();
  const instalacionId = params.id as string;
  const [instalacion, setInstalacion] = useState<Instalacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('informacion');
  const [geocodingData, setGeocodingData] = useState<GeocodingResult | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingEstado, setPendingEstado] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Estados para datos precargados
  const [turnosPrecargados, setTurnosPrecargados] = useState<any[]>([]);
  const [ppcsPrecargados, setPpcsPrecargados] = useState<any[]>([]);
  const [guardiasPrecargados, setGuardiasPrecargados] = useState<any[]>([]);
  const [rolesPrecargados, setRolesPrecargados] = useState<any[]>([]);

  useEffect(() => {
    cargarInstalacion();
  }, [instalacionId]);

  const cargarInstalacion = async () => {
    try {
      setLoading(true);
      
      // Usar la función optimizada que obtiene todo en una sola llamada
      const datosCompletos = await obtenerDatosCompletosInstalacion(instalacionId);
      
      setInstalacion(datosCompletos.instalacion);
      
      // Guardar datos precargados
      setTurnosPrecargados(datosCompletos.turnos);
      setPpcsPrecargados(datosCompletos.ppcs);
      setGuardiasPrecargados(datosCompletos.guardias);
      setRolesPrecargados(datosCompletos.roles);
      
      // Cargar datos de geocodificación si hay dirección
      if (datosCompletos.instalacion.direccion) {
        await cargarDatosGeograficos(datosCompletos.instalacion.direccion);
      }
    } catch (error) {
      console.error('Error cargando instalación:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarDatosGeograficos = async (direccion: string) => {
    try {
      setMapLoading(true);
      setMapError(null);
      
      console.log('Iniciando geocodificación para dirección:', direccion);
      
      // Cargar Google Maps si no está disponible
      const mapsLoaded = await cargarGoogleMaps();
      if (!mapsLoaded) {
        console.error('No se pudo cargar Google Maps');
        setMapError('No se pudo cargar Google Maps');
        return;
      }

      console.log('Google Maps cargado correctamente');

      // Geocodificar la dirección
      const resultado = await geocodificarDireccion(direccion);
      if (resultado) {
        setGeocodingData(resultado);
        console.log('Información con mapa integrada correctamente');
      } else {
        console.error('No se pudo obtener la ubicación de la dirección');
        setMapError('No se pudo obtener la ubicación de la dirección');
      }
    } catch (error) {
      console.error('Error al cargar datos geográficos:', error);
      setMapError('Error al cargar la información geográfica');
    } finally {
      setMapLoading(false);
    }
  };

  const handleEditarInstalacion = () => {
    // Redirigir a la página de edición o abrir modal
    router.push(`/instalaciones/${instalacionId}/editar`);
  };

  const handleReintentarGeocodificacion = () => {
    if (instalacion?.direccion) {
      cargarDatosGeograficos(instalacion.direccion);
    }
  };

  const handleToggleEstado = () => {
    if (!instalacion) return;
    const nuevoEstado = instalacion.estado === 'Activo' ? 'Inactivo' : 'Activo';
    setPendingEstado(nuevoEstado);
    setShowConfirmModal(true);
  };

  const confirmarCambioEstado = async () => {
    if (!instalacion || !pendingEstado) return;
    
    try {
      const response = await fetch(`/api/instalaciones/${instalacion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: pendingEstado })
      });
      
      if (!response.ok) throw new Error('Error al cambiar estado');
      
      setInstalacion({ ...instalacion, estado: pendingEstado as "Activo" | "Inactivo" });
      setShowConfirmModal(false);
      setPendingEstado(null);
      
      console.log(`Instalación ${pendingEstado === 'Activo' ? 'activada' : 'inactivada'} correctamente`);
    } catch (e) {
      console.error('Error al cambiar estado:', e);
    } finally {
      setShowConfirmModal(false);
      setPendingEstado(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          <span className="ml-2">Cargando instalación...</span>
        </div>
      </div>
    );
  }

  if (!instalacion) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Instalación no encontrada</h1>
          <p className="text-gray-600 mb-6">La instalación que buscas no existe o ha sido eliminada.</p>
          <Link href="/instalaciones">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Instalaciones
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/instalaciones">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {instalacion.nombre}
            </h1>
            <p className="text-gray-600">Cliente: {instalacion.cliente_nombre}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            instalacion.estado === 'Activo' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {instalacion.estado === 'Activo' ? 'Activa' : 'Inactiva'}
            <button
              onClick={handleToggleEstado}
              className="ml-2 focus:outline-none"
              title={instalacion.estado === 'Activo' ? 'Inactivar instalación' : 'Activar instalación'}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <span style={{
                display: 'inline-block',
                width: 24,
                height: 14,
                borderRadius: 7,
                background: instalacion.estado === 'Activo' ? '#22c55e' : '#d1d5db',
                position: 'relative',
                verticalAlign: 'middle',
                transition: 'background 0.2s'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  left: instalacion.estado === 'Activo' ? 10 : 2,
                  top: 1,
                  transition: 'left 0.2s'
                }} />
              </span>
            </button>
          </span>
          <Button 
            onClick={handleEditarInstalacion}
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Button>
        </div>
      </div>

      {/* Pestañas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="informacion" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Información
          </TabsTrigger>
          <TabsTrigger value="asignaciones" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Asignaciones
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="actividad" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Actividad
          </TabsTrigger>
        </TabsList>

        {/* Contenido de la pestaña Información */}
        <TabsContent value="informacion" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Información de la Instalación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Nombre de la Instalación</label>
                    <p className="text-lg font-semibold">{instalacion.nombre}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Cliente</label>
                    <p className="text-lg">{instalacion.cliente_nombre}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Dirección
                    </label>
                    <p className="text-lg">{instalacion.direccion}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Valor Turno Extra</label>
                    <p className="text-lg">${instalacion.valor_turno_extra?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Fecha de Registro
                    </label>
                    <p className="text-lg">
                      {new Date(instalacion.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Información geográfica */}
              {geocodingData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {geocodingData.comuna && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Comuna</label>
                        <p className="text-lg">{geocodingData.comuna}</p>
                      </div>
                    )}
                    {geocodingData.ciudad && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Ciudad</label>
                        <p className="text-lg">{geocodingData.ciudad}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mapa de Google Maps */}
              {geocodingData && (
                <div className="space-y-4">
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Ubicación
                  </label>
                  <div className="rounded-xl shadow-md overflow-hidden">
                    <GoogleMap
                      center={{
                        lat: geocodingData.latitud,
                        lng: geocodingData.longitud
                      }}
                      zoom={16}
                      markers={[{
                        position: {
                          lat: geocodingData.latitud,
                          lng: geocodingData.longitud
                        },
                        title: instalacion.nombre,
                        info: geocodingData.direccionCompleta
                      }]}
                      height="240px"
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {/* Estado de carga del mapa */}
              {mapLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
                  <span className="ml-2 text-sm text-gray-600">Cargando mapa...</span>
                </div>
              )}

              {/* Error del mapa */}
              {mapError && (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">{mapError}</p>
                  <Button 
                    onClick={handleReintentarGeocodificacion}
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reintentar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contenido de la pestaña Asignaciones (ex Turnos) */}
        <TabsContent value="asignaciones" className="mt-6">
          <TurnosInstalacion 
            instalacionId={instalacionId} 
            turnosPrecargados={turnosPrecargados} 
            ppcsPrecargados={ppcsPrecargados} 
            guardiasPrecargados={guardiasPrecargados} 
            rolesPrecargados={rolesPrecargados} 
          />
        </TabsContent>

        {/* Contenido de la pestaña Documentos */}
        <TabsContent value="documentos" className="mt-6">
          <DocumentManager
            modulo="instalaciones"
            entidadId={instalacionId}
            refreshTrigger={refreshTrigger}
            onUploadSuccess={() => setRefreshTrigger(prev => prev + 1)}
          />
        </TabsContent>

        {/* Contenido de la pestaña Actividad (ex Logs) */}
        <TabsContent value="actividad" className="mt-6">
          <div className="space-y-6">
            {/* Información del Sistema */}
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Información del Sistema
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium">Creado:</span>
                  <div className="font-medium">
                    {new Date(instalacion.created_at).toLocaleDateString('es-CL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium">Última modificación:</span>
                  <div className="font-medium">
                    {new Date(instalacion.updated_at).toLocaleDateString('es-CL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium">Último usuario:</span>
                  <div className="font-medium text-blue-400">
                    Sistema
                  </div>
                </div>
              </div>
            </div>

            {/* Logs de Actividad */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Historial de Actividad</h3>
              <LogViewer
                modulo="instalaciones"
                entidadId={instalacionId}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">
                {pendingEstado === 'Activo' ? 'Activar Instalación' : 'Inactivar Instalación'}
              </h3>
              <p className="text-gray-600 mb-6">
                ¿Estás seguro de que quieres {pendingEstado === 'Activo' ? 'activar' : 'inactivar'} la instalación {instalacion?.nombre}?
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmarCambioEstado}
                  className={`px-4 ${
                    pendingEstado === 'Activo' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {pendingEstado === 'Activo' ? 'Activar' : 'Inactivar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 