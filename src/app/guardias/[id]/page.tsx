'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, MapPin, Phone, Mail, Calendar, FileText, Settings, Edit, RefreshCw, AlertTriangle, CreditCard, Clock } from 'lucide-react';
import Link from 'next/link';
import AsignacionOperativa from './components/AsignacionOperativa';
import { DocumentManager } from '@/components/shared/document-manager';
import PermisosGuardia from './components/PermisosGuardia';
import FiniquitoGuardia from './components/FiniquitoGuardia';
import DatosBancarios from './components/DatosBancarios';
import TurnosExtrasGuardia from './components/TurnosExtrasGuardia';
import HistorialMensual from './components/HistorialMensual';
import { GoogleMap } from '@/components/ui/google-map';
import { geocodificarDireccion, cargarGoogleMaps, type GeocodingResult } from '@/lib/geocoding';

interface Guardia {
  id: string;
  nombre: string;
  apellidos: string;
  rut: string;
  email: string;
  telefono: string;
  direccion: string;
  latitud?: number;
  longitud?: number;
  estado: string;
  tipo_guardia?: 'contratado' | 'esporadico';
  fecha_os10?: string;
  created_at: string;
  updated_at: string;
}

export default function GuardiaDetallePage() {
  const params = useParams();
  const router = useRouter();
  const guardiaId = params.id as string;
  const [guardia, setGuardia] = useState<Guardia | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('informacion');
  const [geocodingData, setGeocodingData] = useState<GeocodingResult | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);


  useEffect(() => {
    cargarGuardia();
  }, [guardiaId]);

  const cargarGuardia = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/guardias/${guardiaId}`);
      if (!response.ok) {
        throw new Error('Error al cargar guardia');
      }
      const guardiaData = await response.json();
      setGuardia(guardiaData);
      
      if (guardiaData.direccion) {
        await cargarDatosGeograficos(guardiaData.direccion);
      }
    } catch (error) {
      console.error('Error cargando guardia:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarDatosGeograficos = async (direccion: string) => {
    try {
      setMapLoading(true);
      setMapError(null);
      
      const mapsLoaded = await cargarGoogleMaps();
      if (!mapsLoaded) {
        setMapError('No se pudo cargar Google Maps');
        return;
      }

      const resultado = await geocodificarDireccion(direccion);
      if (resultado) {
        setGeocodingData(resultado);
      } else {
        setMapError('No se pudo obtener la ubicación de la dirección');
      }
    } catch (error) {
      console.error('Error al cargar datos geográficos:', error);
      setMapError('Error al cargar la información geográfica');
    } finally {
      setMapLoading(false);
    }
  };

  const handleEditarGuardia = () => {
    router.push(`/guardias/${guardiaId}/editar`);
  };

  const handleReintentarGeocodificacion = () => {
    if (guardia?.direccion) {
      cargarDatosGeograficos(guardia.direccion);
    }
  };





  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          <span className="ml-2">Cargando guardia...</span>
        </div>
      </div>
    );
  }

  if (!guardia) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Guardia no encontrado</h1>
          <p className="text-gray-600 mb-6">El guardia que buscas no existe o ha sido eliminado.</p>
          <Link href="/guardias">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Guardias
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
          <Link href="/guardias">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {guardia.nombre} {guardia.apellidos}
            </h1>
            <p className="text-gray-600">RUT: {guardia.rut}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            guardia.tipo_guardia === 'contratado' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
          }`}>
            {guardia.tipo_guardia === 'contratado' ? 'Contratado' : 'Esporádico'}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            guardia.estado === 'activo' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {guardia.estado === 'activo' ? 'Activo' : 'Inactivo'}
          </span>
          <Button 
            onClick={handleEditarGuardia}
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
      <div className="w-full mb-6">
        {/* Contenedor de pestañas con fondo y bordes */}
        <div className="bg-muted/30 rounded-xl p-3 shadow-sm border border-border/50">
          {/* Desktop: Mejor distribución con espaciado */}
          <div className="hidden md:flex gap-4 w-full justify-center">
            <button
              onClick={() => setActiveTab('informacion')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap rounded-lg transition-all duration-200 hover:bg-muted/60 ${
                activeTab === 'informacion' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="h-4 w-4 flex-shrink-0" />
              <span>Información</span>
            </button>
            <button
              onClick={() => setActiveTab('asignacion')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap rounded-lg transition-all duration-200 hover:bg-muted/60 ${
                activeTab === 'asignacion' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span>Asignación</span>
            </button>
            <button
              onClick={() => setActiveTab('permisos')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap rounded-lg transition-all duration-200 hover:bg-muted/60 ${
                activeTab === 'permisos' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>Permisos</span>
            </button>
            <button
              onClick={() => setActiveTab('documentos')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap rounded-lg transition-all duration-200 hover:bg-muted/60 ${
                activeTab === 'documentos' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span>Documentos</span>
            </button>
            <button
              onClick={() => setActiveTab('datos-bancarios')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap rounded-lg transition-all duration-200 hover:bg-muted/60 ${
                activeTab === 'datos-bancarios' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CreditCard className="h-4 w-4 flex-shrink-0" />
              <span>Datos Bancarios</span>
            </button>
            <button
              onClick={() => setActiveTab('finiquito')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap rounded-lg transition-all duration-200 hover:bg-muted/60 ${
                activeTab === 'finiquito' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Finiquito</span>
            </button>
            <button
              onClick={() => setActiveTab('turnos-extras')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap rounded-lg transition-all duration-200 hover:bg-muted/60 ${
                activeTab === 'turnos-extras' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>Turnos Extras</span>
            </button>
            <button
              onClick={() => setActiveTab('historial-mensual')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap rounded-lg transition-all duration-200 hover:bg-muted/60 ${
                activeTab === 'historial-mensual' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>Historial Mensual</span>
            </button>
          </div>

          {/* Móvil: Diseño en 2 filas de 3 pestañas cada una */}
          <div className="md:hidden grid grid-cols-3 gap-3">
            {/* Primera fila */}
            <button
              onClick={() => setActiveTab('informacion')}
              className={`flex flex-col items-center gap-1 px-3 py-4 text-xs font-medium rounded-lg transition-all duration-200 hover:bg-muted/60 ${
                activeTab === 'informacion' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Información</span>
            </button>
            <button
              onClick={() => setActiveTab('asignacion')}
              className={`flex flex-col items-center gap-1 px-3 py-4 text-xs font-medium rounded-lg transition-all duration-200 hover:bg-muted/60 ${
                activeTab === 'asignacion' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Asignación</span>
            </button>
            <button
              onClick={() => setActiveTab('permisos')}
              className={`flex flex-col items-center gap-1 px-3 py-4 text-xs font-medium rounded-lg transition-all duration-200 hover:bg-muted/60 ${
                activeTab === 'permisos' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Permisos</span>
            </button>
            {/* Segunda fila */}
            <button
              onClick={() => setActiveTab('documentos')}
              className={`flex flex-col items-center gap-1 px-3 py-4 text-xs font-medium rounded-lg transition-all duration-200 hover:bg-muted/60 ${
                activeTab === 'documentos' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Documentos</span>
            </button>
            <button
              onClick={() => setActiveTab('datos-bancarios')}
              className={`flex flex-col items-center gap-1 px-3 py-4 text-xs font-medium rounded-lg transition-all duration-200 hover:bg-muted/60 ${
                activeTab === 'datos-bancarios' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              <span>Bancarios</span>
            </button>
            <button
              onClick={() => setActiveTab('finiquito')}
              className={`flex flex-col items-center gap-1 px-3 py-4 text-xs font-medium rounded-lg transition-all duration-200 hover:bg-muted/60 ${
                activeTab === 'finiquito' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Finiquito</span>
            </button>
            <button
              onClick={() => setActiveTab('turnos-extras')}
              className={`flex flex-col items-center gap-1 px-3 py-4 text-xs font-medium rounded-lg transition-all duration-200 hover:bg-muted/60 ${
                activeTab === 'turnos-extras' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Extras</span>
            </button>
            <button
              onClick={() => setActiveTab('historial-mensual')}
              className={`flex flex-col items-center gap-1 px-3 py-4 text-xs font-medium rounded-lg transition-all duration-200 hover:bg-muted/60 ${
                activeTab === 'historial-mensual' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Historial</span>
            </button>
          </div>
        </div>
      </div>

        {/* Contenido de las pestañas */}
        {activeTab === 'informacion' && (
          <div className="mt-6 space-y-4">
            {/* Sección 1: Información Personal */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-4 w-4" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Nombre Completo
                    </label>
                    <p className="text-sm font-medium">
                      {guardia.nombre} {guardia.apellidos}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      RUT
                    </label>
                    <p className="text-sm">{guardia.rut}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Email
                    </label>
                    <p className="text-sm">{guardia.email}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Teléfono
                    </label>
                    <p className="text-sm">{guardia.telefono}</p>
                  </div>
                </div>
                
                {/* Tipo de Guardia y Vencimiento OS10 en fila adicional */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Tipo de Guardia
                    </label>
                    <p className="text-sm font-medium">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        guardia.tipo_guardia === 'contratado' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {guardia.tipo_guardia === 'contratado' ? 'Contratado' : 'Esporádico'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Vencimiento OS10
                    </label>
                    <p className="text-sm">
                      {guardia.fecha_os10 
                        ? new Date(guardia.fecha_os10).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : 'No especificada'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sección 2: Ubicación */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-4 w-4" />
                  Ubicación
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {/* Información de ubicación - Lado izquierdo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Dirección
                      </label>
                      <p className="text-sm">{guardia.direccion}</p>
                    </div>
                    {geocodingData?.comuna && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Comuna
                        </label>
                        <p className="text-sm">{geocodingData.comuna}</p>
                      </div>
                    )}
                    {geocodingData?.ciudad && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          Ciudad
                        </label>
                        <p className="text-sm">{geocodingData.ciudad}</p>
                      </div>
                    )}
                  </div>

                  {/* Mapa - Lado derecho, cuadrado más pequeño */}
                  {geocodingData && (
                    <div className="rounded-lg shadow-sm overflow-hidden border">
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
                          title: `${guardia.nombre} ${guardia.apellidos}`,
                          info: geocodingData.direccionCompleta
                        }]}
                        height="200px"
                        className="w-full"
                      />
                    </div>
                  )}
                </div>

                {/* Estados del mapa */}
                {mapLoading && (
                  <div className="flex items-center justify-center py-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="ml-2 text-xs text-muted-foreground">Cargando mapa...</span>
                  </div>
                )}

                {mapError && (
                  <div className="text-center py-3">
                    <MapPin className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground mb-1">{mapError}</p>
                    <Button 
                      onClick={handleReintentarGeocodificacion}
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-1 mx-auto text-xs h-6 px-2"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Reintentar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sección 3: Historial en una sola línea sutil */}
            <div className="flex justify-between text-xs text-muted-foreground mt-2 px-4">
              <span>
                Registro: {new Date(guardia.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
              <span>
                Última actualización: {new Date(guardia.updated_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        )}

        {/* Contenido de la pestaña Asignación */}
        {activeTab === 'asignacion' && (
          <div className="mt-6">
            <AsignacionOperativa guardiaId={guardiaId} />
          </div>
        )}

        {/* Contenido de la pestaña Permisos */}
        {activeTab === 'permisos' && (
          <div className="mt-6">
            <PermisosGuardia guardiaId={guardiaId} />
          </div>
        )}

        {/* Contenido de la pestaña Documentos */}
        {activeTab === 'documentos' && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documentos del Guardia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentManager
                  modulo="guardias"
                  entidadId={guardiaId}
                  onDocumentDeleted={() => console.log('Documento eliminado')}
                  onUploadSuccess={() => console.log('Documento subido')}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Contenido de la pestaña Datos Bancarios */}
        {activeTab === 'datos-bancarios' && (
          <div className="mt-6">
            <DatosBancarios guardiaId={guardiaId} />
          </div>
        )}

        {/* Contenido de la pestaña Finiquito */}
        {activeTab === 'finiquito' && (
          <div className="mt-6">
            <FiniquitoGuardia guardiaId={guardiaId} />
          </div>
        )}

        {/* Contenido de la pestaña Turnos Extras */}
        {activeTab === 'turnos-extras' && (
          <div className="mt-6">
            <TurnosExtrasGuardia 
              guardiaId={guardiaId} 
              guardiaNombre={`${guardia?.nombre} ${guardia?.apellidos}`} 
            />
          </div>
        )}

        {/* Contenido de la pestaña Historial Mensual */}
        {activeTab === 'historial-mensual' && (
          <div className="mt-6">
            <HistorialMensual guardiaId={guardiaId} />
          </div>
        )}

      {/* Modal de confirmación */}



    </div>
  );
} 