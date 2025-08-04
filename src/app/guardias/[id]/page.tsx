'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, MapPin, Phone, Mail, Calendar, FileText, Settings, Edit, RefreshCw, AlertTriangle, CreditCard } from 'lucide-react';
import Link from 'next/link';
import AsignacionOperativa from './components/AsignacionOperativa';
import { DocumentManager } from '@/components/shared/document-manager';
import PermisosGuardia from './components/PermisosGuardia';
import FiniquitoGuardia from './components/FiniquitoGuardia';
import DatosBancarios from './components/DatosBancarios';
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingEstado, setPendingEstado] = useState<string | null>(null);

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

  const handleToggleEstado = () => {
    if (!guardia) return;
    const nuevoEstado = guardia.estado === 'activo' ? 'inactivo' : 'activo';
    setPendingEstado(nuevoEstado);
    setShowConfirmModal(true);
  };

  const confirmarCambioEstado = async () => {
    if (!guardia || !pendingEstado) return;
    
    try {
      const response = await fetch(`/api/guardias/${guardia.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: pendingEstado })
      });
      
      if (!response.ok) throw new Error('Error al cambiar estado');
      
      setGuardia({ ...guardia, estado: pendingEstado });
      setShowConfirmModal(false);
      setPendingEstado(null);
      
      console.log(`Guardia ${pendingEstado === 'activo' ? 'activado' : 'inactivado'} correctamente`);
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
            guardia.estado === 'activo' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {guardia.estado === 'activo' ? 'Activo' : 'Inactivo'}
            <button
              onClick={handleToggleEstado}
              className="ml-2 focus:outline-none"
              title={guardia.estado === 'activo' ? 'Inactivar guardia' : 'Activar guardia'}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <span style={{
                display: 'inline-block',
                width: 24,
                height: 14,
                borderRadius: 7,
                background: guardia.estado === 'activo' ? '#22c55e' : '#d1d5db',
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
                  left: guardia.estado === 'activo' ? 10 : 2,
                  top: 1,
                  transition: 'left 0.2s'
                }} />
              </span>
            </button>
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
          </div>
        </div>
      </div>

              {/* Contenido de la pestaña Información */}
        {activeTab === 'informacion' && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Nombre Completo</label>
                      <p className="text-lg font-semibold">{guardia.nombre} {guardia.apellidos}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">RUT</label>
                      <p className="text-lg">{guardia.rut}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        Email
                      </label>
                      <p className="text-lg">{guardia.email}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        Teléfono
                      </label>
                      <p className="text-lg">{guardia.telefono}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Dirección
                      </label>
                      <p className="text-lg">{guardia.direccion}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Fecha de Registro
                      </label>
                      <p className="text-lg">
                        {new Date(guardia.created_at).toLocaleDateString('es-ES', {
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
                          title: `${guardia.nombre} ${guardia.apellidos}`,
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

      {/* Modal de confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">
                {pendingEstado === 'activo' ? 'Activar Guardia' : 'Inactivar Guardia'}
              </h3>
              <p className="text-gray-600 mb-6">
                ¿Estás seguro de que quieres {pendingEstado === 'activo' ? 'activar' : 'inactivar'} a {guardia?.nombre} {guardia?.apellidos}?
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
                    pendingEstado === 'activo' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {pendingEstado === 'activo' ? 'Activar' : 'Inactivar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 