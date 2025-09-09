"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAddressAutocomplete, type AddressData } from '@/lib/useAddressAutocomplete';
import { formatearFecha } from '@/lib/utils/date';
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
  Check
} from 'lucide-react';
import Link from 'next/link';
import { DocumentManager } from '@/components/shared/document-manager';

import { GoogleMap } from '@/components/ui/google-map';
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

export default function ClienteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const clienteId = params.id as string;
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('informacion');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [clientesActivos, setClientesActivos] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("");
  const [geocodingData, setGeocodingData] = useState<GeocodingResult | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingEstado, setPendingEstado] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorDetails, setErrorDetails] = useState<any>(null);

  // Estados para edición inline
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);

  // Hook para autocompletado de direcciones
  const {
    isLoaded: mapsLoaded,
    suggestions,
    isLoading: addressLoading,
    searchAddresses,
    selectAddress,
    clearSelection
  } = useAddressAutocomplete();

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
      setClienteSeleccionado(clienteData.id); // Establecer el cliente actual como seleccionado
      
      // Cargar datos de geocodificación si hay dirección
      if (clienteData.direccion) {
        await cargarDatosGeograficos(clienteData.direccion);
      }
    } catch (error) {
      logger.error('Error cargando cliente::', error);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  // Función para cargar todos los clientes activos
  const cargarClientesActivos = useCallback(async () => {
    try {
      const response = await fetch('/api/clientes');
      if (!response.ok) {
        throw new Error('Error al cargar clientes');
      }
      const responseData = await response.json();
      
      if (responseData.success && responseData.data) {
        const clientesActivos = responseData.data.filter((c: Cliente) => c.estado === "Activo");
        setClientesActivos(clientesActivos);
        devLogger.success(' Clientes activos cargados:', clientesActivos.length);
      }
    } catch (error) {
      console.error('❌ Error cargando clientes activos:', error);
    }
  }, []);

  // Función para manejar el cambio de cliente seleccionado
  const handleClienteChange = (clienteId: string) => {
    if (clienteId && clienteId !== cliente?.id) {
      router.push(`/clientes/${clienteId}`);
    }
  };

  useEffect(() => {
    cargarCliente();
    cargarClientesActivos();
  }, [cargarCliente, cargarClientesActivos]);

  const cargarDatosGeograficos = async (direccion: string) => {
    try {
      setMapLoading(true);
      setMapError(null);
      
      logger.debug('Iniciando geocodificación para dirección:', direccion);
      
      // Cargar Google Maps si no está disponible
      const mapsLoaded = await cargarGoogleMaps();
      if (!mapsLoaded) {
        console.error('No se pudo cargar Google Maps');
        setMapError('No se pudo cargar Google Maps');
        return;
      }

      logger.debug('Google Maps cargado correctamente');

      // Geocodificar la dirección
      const resultado = await geocodificarDireccion(direccion);
      if (resultado) {
        setGeocodingData(resultado);
        logger.debug('Información con mapa integrada correctamente');
      } else {
        console.error('No se pudo obtener la ubicación de la dirección');
        setMapError('No se pudo obtener la ubicación de la dirección');
      }
    } catch (error) {
      logger.error('Error al cargar datos geográficos::', error);
      setMapError('Error al cargar la información geográfica');
    } finally {
      setMapLoading(false);
    }
  };

  // Funciones para edición inline
  const handleEdit = (field: string, initialValue: string) => {
    setEditingField(field);
    setEditValue(initialValue);
    setSelectedAddress(null);
    clearSelection();
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
    setSelectedAddress(null);
    clearSelection();
  };

  const handleSave = async (field: string) => {
    if (!cliente) return;
    
    try {
      setSaving(true);
      
      // Crear objeto con todos los datos del cliente actual
      let dataToUpdate: any = {
        nombre: cliente.nombre,
        rut: cliente.rut,
        representante_legal: cliente.representante_legal,
        rut_representante: cliente.rut_representante,
        email: cliente.email,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
        latitud: cliente.latitud,
        longitud: cliente.longitud,
        ciudad: cliente.ciudad,
        comuna: cliente.comuna,
        razon_social: cliente.razon_social,
        estado: cliente.estado
      };
      
      // Actualizar solo el campo específico
      if (field === 'direccion' && selectedAddress) {
        // Para dirección con datos de Google Maps - solo guardar la dirección de la calle
        dataToUpdate[field] = editValue; // Usar el valor editado (dirección limpia)
        dataToUpdate.latitud = selectedAddress.latitud;
        dataToUpdate.longitud = selectedAddress.longitud;
        dataToUpdate.ciudad = selectedAddress.componentes.ciudad;
        dataToUpdate.comuna = selectedAddress.componentes.comuna;
      } else {
        dataToUpdate[field] = editValue;
      }
      
      const response = await fetch(`/api/clientes/${clienteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToUpdate),
      });

      if (response.ok) {
        const responseData = await response.json();
        const updatedCliente = responseData.data || responseData;
        setCliente(updatedCliente);
        
        // Si se actualizó la dirección, recargar datos geográficos
        if (field === 'direccion') {
          await cargarDatosGeograficos(dataToUpdate[field]);
        }
        
        setEditingField(null);
        setEditValue('');
        setSelectedAddress(null);
        clearSelection();
        
        toast.success("Campo actualizado correctamente");
      } else {
        throw new Error('Error al actualizar cliente');
      }
    } catch (error) {
      logger.error('Error guardando campo::', error);
      toast.error("No se pudo actualizar el campo");
    } finally {
      setSaving(false);
    }
  };

  const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditValue(value);
    
    // Buscar sugerencias si hay al menos 3 caracteres
    if (value.length >= 3 && mapsLoaded) {
      searchAddresses(value);
    }
  };

  const handleAddressSelect = async (placeId: string) => {
    const addressData = await selectAddress(placeId);
    if (addressData) {
      setSelectedAddress(addressData);
      
      // Función para limpiar la dirección y obtener solo la calle
      const limpiarDireccion = (direccionCompleta: string): string => {
        // Para el ejemplo "Av. La Dehesa 226, 7690000 Lo Barnechea, Región Metropolitana, Chile"
        // Queremos solo "Av. La Dehesa 226"
        
        // Dividir por comas y tomar solo la primera parte (la dirección de la calle)
        const partes = direccionCompleta.split(',').map(p => p.trim());
        
        // La primera parte siempre es la dirección de la calle
        return partes[0];
      };
      
      const direccionCalle = limpiarDireccion(addressData.direccionCompleta);
      setEditValue(direccionCalle);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter') {
      handleSave(field);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };


  // Componente de campo editable
  const EditableField = ({ 
    label, 
    value, 
    field, 
    type = 'text',
    placeholder = '',
    className = '',
    options = []
  }: {
    label: string;
    value: string | number;
    field: string;
    type?: string;
    placeholder?: string;
    className?: string;
    options?: { value: string; label: string }[];
  }) => {
    const isEditing = editingField === field;
    
    return (
      <div className={className}>
        <label className="text-xs sm:text-sm font-medium text-gray-600">{label}</label>
        {isEditing ? (
          <div className="flex items-center gap-2 mt-1">
            {options.length > 0 ? (
              <Select
                value={editValue}
                onValueChange={(value) => setEditValue(value)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={`Seleccionar ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field === 'direccion' ? (
              <div className="flex-1 relative">
                <Input
                  type={type}
                  value={editValue}
                  onChange={handleAddressInputChange}
                  onKeyDown={(e) => handleKeyDown(e, field)}
                  placeholder={placeholder}
                  className="flex-1"
                  autoFocus
                />
                {addressLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-white"></div>
                  </div>
                )}
                {/* Lista de sugerencias */}
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.placeId}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none border-b border-border last:border-b-0"
                        onClick={() => handleAddressSelect(suggestion.placeId)}
                      >
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {suggestion.direccionPrincipal}
                            </div>
                            {suggestion.direccionSecundaria && (
                              <div className="text-xs text-muted-foreground truncate">
                                {suggestion.direccionSecundaria}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Input
                type={type}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, field)}
                placeholder={placeholder}
                className="flex-1"
                autoFocus
              />
            )}
            <Button
              size="sm"
              onClick={() => handleSave(field)}
              disabled={saving}
              className="h-8 w-8 p-0"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelEdit}
              disabled={saving}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between mt-1 group">
            <p className="text-sm sm:text-lg">
              {(field === 'fecha_vencimiento' || field === 'fecha_creacion' || field === 'fecha_actualizacion')
                ? formatearFecha(value?.toString())
                : value || 'No configurado'
              }
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleEdit(field, value?.toString() || '')}
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
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
        setShowConfirmModal(false);
        setPendingEstado(null);
        logger.debug(`Cliente ${pendingEstado === 'Activo' ? 'activado' : 'inactivado'} correctamente`);
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
          logger.error('Error al cambiar estado::', errorData.error || 'Error desconocido');
        }
      }
    } catch (error) {
      logger.error('Error al cambiar estado::', error);
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

      {/* Selector de Clientes Activos */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-end">
            <div className="w-full sm:w-80">
              <Select value={clienteSeleccionado} onValueChange={handleClienteChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente activo" />
                </SelectTrigger>
                <SelectContent>
                  {clientesActivos.map((clienteActivo) => (
                    <SelectItem key={clienteActivo.id} value={clienteActivo.id}>
                      {clienteActivo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="informacion" className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span>Información</span>
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Documentos</span>
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
                <EditableField
                  label="Nombre de la Empresa"
                  value={cliente.nombre}
                  field="nombre"
                      placeholder="Nombre de la empresa"
                    />

                <EditableField
                  label="RUT"
                  value={cliente.rut}
                  field="rut"
                      placeholder="12345678-9"
                    />

                                 <EditableField
                   label="Razón Social"
                   value={cliente.razon_social || ''}
                   field="razon_social"
                      placeholder="Razón social"
                    />

                 <EditableField
                   label="Representante Legal"
                   value={cliente.representante_legal || ''}
                   field="representante_legal"
                    placeholder="Nombre del representante legal"
                  />

                 <EditableField
                   label="RUT Representante"
                   value={cliente.rut_representante || ''}
                   field="rut_representante"
                    placeholder="12345678-9"
                  />

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
                <EditableField
                  label="Email"
                  value={cliente.email || ''}
                  field="email"
                    type="email"
                    placeholder="correo@empresa.cl"
                  />

                <EditableField
                  label="Teléfono"
                  value={cliente.telefono || ''}
                  field="telefono"
                    placeholder="+56 9 1234 5678"
                  />

                <EditableField
                  label="Dirección"
                  value={cliente.direccion || ''}
                  field="direccion"
                      placeholder="Dirección completa"
                    />

                <div className="grid grid-cols-2 gap-4">
                  <EditableField
                    label="Ciudad"
                    value={cliente.ciudad || ''}
                    field="ciudad"
                      placeholder="Se completa automáticamente"
                  />

                  <EditableField
                    label="Comuna"
                    value={cliente.comuna || ''}
                    field="comuna"
                      placeholder="Se completa automáticamente"
                    />
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


      </Tabs>
    </div>
  );
}

// Confirmación de auditoría completada
logger.debug("✅ Vista interior de cliente actualizada correctamente"); 