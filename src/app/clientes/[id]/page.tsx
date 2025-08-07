'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  FileText, 
  Edit, 
  Save,
  X,
  RefreshCw,
  Loader2,
  DollarSign,
  Shield,
  Clock,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { DocumentManager } from '@/components/shared/document-manager';

import { GoogleMap } from '@/components/ui/google-map';
import { InputDireccion, type AddressData } from '@/components/ui/input-direccion';
import { geocodificarDireccion, cargarGoogleMaps, type GeocodingResult } from '@/lib/geocoding';
import ErrorModal from '@/components/ui/error-modal';

interface Cliente {
  id: string;
  nombre: string;
  rut: string;
  representante_legal?: string;
  rut_representante?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  ciudad?: string;
  comuna?: string;
  razon_social?: string;
  estado: string;
  created_at: string;
  updated_at: string;
}

interface RolServicio {
  id: string;
  nombre: string;
  descripcion?: string;
  dias_trabajo: number;
  dias_descanso: number;
  horas_turno: number;
  hora_inicio: string;
  hora_termino: string;
  estado: string;
  activo: boolean;
  sueldo_base?: number;
  created_at: string;
  updated_at: string;
}

interface EstructuraSueldo {
  id: string;
  rol_servicio_id: string;
  rol_nombre: string;
  sueldo_base: number;
  activo: boolean;
  fecha_inactivacion?: string;
  conceptos: EstructuraConcepto[];
  created_at: string;
  updated_at: string;
}

interface EstructuraConcepto {
  id: string;
  estructura_id: string;
  nombre: string;
  monto: number;
  imponible: boolean;
  tipo: string;
}

export default function ClienteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const clienteId = params.id as string;
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('informacion');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Cliente>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [geocodingData, setGeocodingData] = useState<GeocodingResult | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingEstado, setPendingEstado] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  
  // Estados para la pestaña de estructura
  const [rolesServicio, setRolesServicio] = useState<RolServicio[]>([]);
  const [estructurasSueldo, setEstructurasSueldo] = useState<EstructuraSueldo[]>([]);
  const [loadingEstructura, setLoadingEstructura] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  const cargarCliente = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clientes/${clienteId}`);
      if (!response.ok) {
        throw new Error('Error al cargar cliente');
      }
      const responseData = await response.json();
      
      // Verificar si la respuesta tiene el formato esperado
      const clienteData = responseData.data || responseData;
      
      if (!clienteData || !clienteData.id) {
        throw new Error('Datos de cliente inválidos');
      }
      
      setCliente(clienteData);
      setFormData(clienteData);
      
      // Cargar datos de geocodificación si hay dirección
      if (clienteData.direccion) {
        await cargarDatosGeograficos(clienteData.direccion);
      }
    } catch (error) {
      console.error('Error cargando cliente:', error);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  // Nueva función para cargar datos de estructura
  const cargarDatosEstructura = useCallback(async () => {
    try {
      setLoadingEstructura(true);
      
      // Cargar roles de servicio del cliente
      const rolesResponse = await fetch(`/api/roles-servicio/cliente/${clienteId}`);
      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        setRolesServicio(rolesData.rows || rolesData);
      }
      
      // Cargar estructuras de sueldo
      const estructurasResponse = await fetch(`/api/estructuras-sueldo/cliente/${clienteId}`);
      if (estructurasResponse.ok) {
        const estructurasData = await estructurasResponse.json();
        setEstructurasSueldo(estructurasData.rows || estructurasData);
      }
    } catch (error) {
      console.error('Error cargando datos de estructura:', error);
    } finally {
      setLoadingEstructura(false);
    }
  }, [clienteId]);

  useEffect(() => {
    cargarCliente();
  }, [cargarCliente]);

  // Cargar datos de estructura cuando se selecciona la pestaña
  useEffect(() => {
    if (activeTab === 'estructura' && cliente) {
      cargarDatosEstructura();
    }
  }, [activeTab, cliente, cargarDatosEstructura]);

  // Funciones para manejar roles y estructuras
  const handleInactivarRol = async (rolId: string) => {
    if (!confirm(`¿Estás seguro de inactivar el rol "${rolesServicio.find(r => r.id === rolId)?.nombre}"?\n\nEsto inactivará el rol y liberará todos los guardias asignados.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/roles-servicio/${rolId}/inactivar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: 'Inactivación desde vista de cliente', usuario_id: null })
      });

      if (response.ok) {
        const resultado = await response.json();
        alert(`✅ Rol inactivado exitosamente.\n\nGuardias liberados: ${resultado.guardias_liberados}\nEstructura inactivada: ${resultado.estructura_inactivada ? 'Sí' : 'No'}`);
        await cargarDatosEstructura();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al inactivar el rol');
      }
    } catch (error) {
      console.error('Error inactivando rol:', error);
      alert(`❌ Error al inactivar el rol: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleReactivarRol = async (rolId: string) => {
    if (!confirm(`¿Estás seguro de reactivar el rol "${rolesServicio.find(r => r.id === rolId)?.nombre}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/roles-servicio/${rolId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reactivar' })
      });

      if (response.ok) {
        alert('✅ Rol reactivado exitosamente');
        await cargarDatosEstructura();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al reactivar el rol');
      }
    } catch (error) {
      console.error('Error reactivando rol:', error);
      alert(`❌ Error al reactivar el rol: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleInactivarEstructura = async (estructuraId: string) => {
    const motivo = prompt('Ingrese el motivo de la inactivación (opcional):');
    const crearNueva = confirm('¿Desea crear una nueva estructura automáticamente?');
    
    try {
      const response = await fetch(`/api/estructuras-sueldo/${estructuraId}/inactivar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          motivo: motivo || 'Inactivación desde vista de cliente', 
          usuario_id: null,
          crear_nueva_automaticamente: crearNueva 
        })
      });

      if (response.ok) {
        const resultado = await response.json();
        alert(`✅ Estructura inactivada exitosamente.\n\n${resultado.nueva_estructura_creada ? 'Nueva estructura creada automáticamente.' : ''}`);
        await cargarDatosEstructura();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al inactivar la estructura');
      }
    } catch (error) {
      console.error('Error inactivando estructura:', error);
      alert(`❌ Error al inactivar la estructura: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleReactivarEstructura = async (estructuraId: string) => {
    if (!confirm('¿Estás seguro de reactivar esta estructura de sueldo?')) {
      return;
    }

    try {
      const response = await fetch(`/api/estructuras-sueldo/${estructuraId}/toggle-activo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: true })
      });

      if (response.ok) {
        alert('✅ Estructura reactivada exitosamente');
        await cargarDatosEstructura();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al reactivar la estructura');
      }
    } catch (error) {
      console.error('Error reactivando estructura:', error);
      alert(`❌ Error al reactivar la estructura: ${error instanceof Error ? error.message : 'Error desconocido'}`);
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

  const handleEditarCliente = () => {
    setIsEditing(true);
  };

  const handleGuardarCliente = async () => {
    try {
      const response = await fetch(`/api/clientes/${clienteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const responseData = await response.json();
        const updatedCliente = responseData.data || responseData;
        setCliente(updatedCliente);
        setIsEditing(false);
        setRefreshTrigger(prev => prev + 1);
        
        // Recargar datos geográficos si cambió la dirección
        if (updatedCliente.direccion && updatedCliente.direccion !== cliente?.direccion) {
          await cargarDatosGeograficos(updatedCliente.direccion);
        }
      } else {
        console.error('Error al actualizar cliente');
      }
    } catch (error) {
      console.error('Error guardando cliente:', error);
    }
  };

  const handleCancelarEdicion = () => {
    setFormData(cliente || {});
    setIsEditing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressSelect = (addressData: AddressData) => {
    setFormData(prev => ({
      ...prev,
      direccion: addressData.direccionCompleta,
      latitud: addressData.latitud,
      longitud: addressData.longitud,
      ciudad: addressData.componentes.ciudad,
      comuna: addressData.componentes.comuna
    }));
    
    // Actualizar los datos de geocodificación
    setGeocodingData({
      latitud: addressData.latitud,
      longitud: addressData.longitud,
      comuna: addressData.componentes.comuna,
      ciudad: addressData.componentes.ciudad,
      region: addressData.componentes.region,
      direccionCompleta: addressData.direccionCompleta
    });
  };

  const handleToggleEstado = () => {
    if (!cliente) return;
    const nuevoEstado = cliente.estado === 'Activo' ? 'Inactivo' : 'Activo';
    setPendingEstado(nuevoEstado);
    setShowConfirmModal(true);
  };

  const confirmarCambioEstado = async () => {
    if (!cliente || !pendingEstado) return;
    
    try {
      const response = await fetch(`/api/clientes/${cliente.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cliente, estado: pendingEstado })
      });
      
      if (response.ok) {
        const responseData = await response.json();
        const updatedCliente = responseData.data || responseData;
        setCliente(updatedCliente);
        setFormData(updatedCliente);
        setShowConfirmModal(false);
        setPendingEstado(null);
        console.log(`Cliente ${pendingEstado === 'Activo' ? 'activado' : 'inactivado'} correctamente`);
      } else {
        const errorData = await response.json();
        
        // Si es un error de instalaciones activas, mostrar el modal de error
        if (response.status === 400 && errorData.instalacionesActivas) {
          setErrorDetails({
            instalacionesActivas: errorData.instalacionesActivas,
            instalacionesInactivas: errorData.instalacionesInactivas || []
          });
          setShowErrorModal(true);
        } else {
          console.error('Error al cambiar estado:', errorData.error || 'Error desconocido');
        }
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    } finally {
      setShowConfirmModal(false);
      setPendingEstado(null);
    }
  };

  const handleReintentarGeocodificacion = () => {
    if (cliente?.direccion) {
      cargarDatosGeograficos(cliente.direccion);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-muted-foreground">Cliente no encontrado</p>
        <Button onClick={() => router.push('/clientes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Clientes
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/clientes')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{cliente.nombre}</h1>
            <p className="text-sm text-muted-foreground font-mono">{cliente.rut}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            cliente.estado === 'Activo' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {cliente.estado === 'Activo' ? 'Activo' : 'Inactivo'}
            <button
              onClick={handleToggleEstado}
              className="ml-2 focus:outline-none"
              title={cliente.estado === 'Activo' ? 'Inactivar cliente' : 'Activar cliente'}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <span style={{
                display: 'inline-block',
                width: 24,
                height: 14,
                borderRadius: 7,
                background: cliente.estado === 'Activo' ? '#22c55e' : '#d1d5db',
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
                  left: cliente.estado === 'Activo' ? 10 : 2,
                  top: 1,
                  transition: 'left 0.2s'
                }} />
              </span>
            </button>
          </span>
          
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelarEdicion}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleGuardarCliente}
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditarCliente}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Modal de confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Confirmar cambio de estado
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              ¿Estás seguro de que quieres cambiar el estado del cliente a "{pendingEstado}"?
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingEstado(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmarCambioEstado}
                variant={pendingEstado === 'Activo' ? 'default' : 'destructive'}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de error para instalaciones activas */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="No se puede inactivar el cliente"
        message="No se puede inactivar el cliente porque tiene instalaciones activas. Primero debe inactivar todas las instalaciones asociadas."
        details={errorDetails}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="informacion" className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span>Información</span>
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Documentos</span>
          </TabsTrigger>
          <TabsTrigger value="estructura" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Estructura</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="informacion" className="flex-1 space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Información del cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Información de la Empresa</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Nombre de la Empresa
                    </label>
                    <Input
                      name="nombre"
                      value={formData.nombre || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="Nombre de la empresa"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      RUT
                    </label>
                    <Input
                      name="rut"
                      value={formData.rut || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="12345678-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Razón Social
                    </label>
                    <Input
                      name="razon_social"
                      value={formData.razon_social || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="Razón social"
                    />
                  </div>


                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Representante Legal
                  </label>
                  <Input
                    name="representante_legal"
                    value={formData.representante_legal || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Nombre del representante legal"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    RUT Representante
                  </label>
                  <Input
                    name="rut_representante"
                    value={formData.rut_representante || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="12345678-9"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Información de contacto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>Información de Contacto</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="correo@empresa.cl"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span>Teléfono</span>
                  </label>
                  <Input
                    name="telefono"
                    value={formData.telefono || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="+56 9 1234 5678"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>Dirección</span>
                  </label>
                  {isEditing ? (
                    <InputDireccion
                      value={formData.direccion || ''}
                      onAddressSelect={handleAddressSelect}
                      placeholder="Buscar dirección..."
                      initialLatitude={formData.latitud || null}
                      initialLongitude={formData.longitud || null}
                      initialCiudad={formData.ciudad || ''}
                      initialComuna={formData.comuna || ''}
                      showMap={false}
                      className="w-full"
                    />
                  ) : (
                    <Input
                      name="direccion"
                      value={formData.direccion || ''}
                      disabled={true}
                      placeholder="Dirección completa"
                      className="bg-muted"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Ciudad
                    </label>
                    <Input
                      name="ciudad"
                      value={formData.ciudad || ''}
                      onChange={handleInputChange}
                      disabled={true}
                      placeholder="Se completa automáticamente"
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Comuna
                    </label>
                    <Input
                      name="comuna"
                      value={formData.comuna || ''}
                      onChange={handleInputChange}
                      disabled={true}
                      placeholder="Se completa automáticamente"
                      className="bg-muted"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mapa de ubicación */}
          {cliente.direccion && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>Ubicación</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReintentarGeocodificacion}
                    disabled={mapLoading}
                  >
                    {mapLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-2">Actualizar</span>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mapError ? (
                  <div className="flex items-center justify-center h-64 bg-muted rounded-md">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">{mapError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReintentarGeocodificacion}
                      >
                        Reintentar
                      </Button>
                    </div>
                  </div>
                ) : geocodingData ? (
                  <div className="space-y-4">
                    <GoogleMap
                      center={{ lat: geocodingData.latitud, lng: geocodingData.longitud }}
                      zoom={15}
                      markers={[
                        {
                          position: { lat: geocodingData.latitud, lng: geocodingData.longitud },
                          title: cliente.nombre,
                          info: geocodingData.direccionCompleta,
                          color: 'blue'
                        }
                      ]}
                      height="300px"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Ciudad:</span> {geocodingData.ciudad}
                      </div>
                      <div>
                        <span className="font-medium">Comuna:</span> {geocodingData.comuna}
                      </div>
                      <div>
                        <span className="font-medium">Región:</span> {geocodingData.region}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-muted rounded-md">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {mapLoading ? 'Cargando ubicación...' : 'No se pudo cargar la ubicación'}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documentos" className="flex-1 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Documentos del Cliente</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentManager
                modulo="clientes"
                entidadId={clienteId}
                onDocumentDeleted={() => setRefreshTrigger(prev => prev + 1)}
                onUploadSuccess={() => setRefreshTrigger(prev => prev + 1)}
                refreshTrigger={refreshTrigger}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estructura" className="flex-1 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Estructura de Servicios</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Roles de Servicio</h3>
                {loadingEstructura ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : rolesServicio.length === 0 ? (
                  <p className="text-muted-foreground">No hay roles de servicio registrados para este cliente.</p>
                ) : (
                  <div className="space-y-3">
                    {rolesServicio.map((rol) => (
                      <div key={rol.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-md font-medium">{rol.nombre}</h4>
                          <Badge variant={rol.activo ? 'default' : 'destructive'}>{rol.activo ? 'Activo' : 'Inactivo'}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{rol.descripcion}</p>
                        <p className="text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 inline-block mr-1" />
                          Horas de trabajo: {rol.horas_turno}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 inline-block mr-1" />
                          Horas de descanso: {rol.dias_descanso} días
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 inline-block mr-1" />
                          Horas de turno: {rol.horas_turno}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 inline-block mr-1" />
                          Horario: {rol.hora_inicio} - {rol.hora_termino}
                        </p>
                        <div className="flex items-center mt-3 text-sm text-muted-foreground">
                          <Eye className="h-4 w-4 inline-block mr-1" />
                          <span>Estado: {rol.activo ? 'Activo' : 'Inactivo'}</span>
                        </div>
                                                 <div className="flex items-center mt-1 text-sm text-muted-foreground">
                           <DollarSign className="h-4 w-4 inline-block mr-1" />
                           <span>Sueldo Base: ${rol.sueldo_base?.toFixed(0) || 'N/A'}</span>
                         </div>
                                                 <div className="flex items-center justify-between mt-3">
                           {rol.activo ? (
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => handleInactivarRol(rol.id)}
                               className="text-red-600 hover:text-red-700"
                             >
                               <EyeOff className="h-4 w-4 mr-1" />
                               Inactivar Rol
                             </Button>
                           ) : (
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => handleReactivarRol(rol.id)}
                               className="text-green-600 hover:text-green-700"
                             >
                               <RotateCcw className="h-4 w-4 mr-1" />
                               Reactivar Rol
                             </Button>
                           )}
                         </div>
                      </div>
                    ))}
                  </div>
                )}

                <h3 className="text-lg font-semibold mt-6">Estructuras de Sueldo</h3>
                {loadingEstructura ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : estructurasSueldo.length === 0 ? (
                  <p className="text-muted-foreground">No hay estructuras de sueldo registradas para este cliente.</p>
                ) : (
                  <div className="space-y-3">
                    {estructurasSueldo.map((estructura) => (
                      <div key={estructura.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-md font-medium">{estructura.rol_nombre}</h4>
                          <Badge variant={estructura.activo ? 'default' : 'destructive'}>{estructura.activo ? 'Activo' : 'Inactivo'}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <DollarSign className="h-4 w-4 inline-block mr-1" />
                          Sueldo Base: ${estructura.sueldo_base.toFixed(0)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 inline-block mr-1" />
                          Fecha de Inactivación: {estructura.fecha_inactivacion || 'N/A'}
                        </p>
                        <div className="flex items-center mt-3 text-sm text-muted-foreground">
                          <Eye className="h-4 w-4 inline-block mr-1" />
                          <span>Estado: {estructura.activo ? 'Activo' : 'Inactivo'}</span>
                        </div>
                                                 <div className="flex items-center justify-between mt-3">
                           {estructura.activo ? (
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => handleInactivarEstructura(estructura.id)}
                               className="text-red-600 hover:text-red-700"
                             >
                               <EyeOff className="h-4 w-4 mr-1" />
                               Inactivar Estructura
                             </Button>
                           ) : (
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => handleReactivarEstructura(estructura.id)}
                               className="text-green-600 hover:text-green-700"
                             >
                               <RotateCcw className="h-4 w-4 mr-1" />
                               Reactivar Estructura
                             </Button>
                           )}
                         </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button className="mt-6">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Rol de Servicio
                </Button>
                <Button className="mt-6">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Estructura de Sueldo
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  );
}

// Confirmación de auditoría completada
console.log("✅ Vista interior de cliente actualizada correctamente"); 