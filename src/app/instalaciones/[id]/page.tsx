'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building2, MapPin, Phone, Mail, Calendar, FileText, Settings, Edit, RefreshCw, Users, Clock, Shield, DollarSign, Satellite, Check, X } from 'lucide-react';
import Link from 'next/link';
import { GoogleMap } from '@/components/ui/google-map';
import { geocodificarDireccion, cargarGoogleMaps, type GeocodingResult } from '@/lib/geocoding';
import { getInstalacion, actualizarInstalacion, obtenerClientes, obtenerComunas, obtenerDatosCompletosInstalacion } from '@/lib/api/instalaciones';
import { Instalacion, Cliente, Comuna } from '@/lib/schemas/instalaciones';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAddressAutocomplete, type AddressData } from '@/lib/useAddressAutocomplete';
import { formatearFecha } from '@/lib/utils/date';
import TurnosInstalacion from './components/TurnosInstalacion';
import EstructuraServicio from './components/EstructuraServicio';
import MonitoreoInstalacion from './components/MonitoreoInstalacion';
import { DocumentManager } from '@/components/shared/document-manager';

// Función para formatear números con puntos como separadores de miles sin decimales
const formatThousands = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const intVal = Number.isFinite(num) ? Math.round(num) : 0;
  return intVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export default function InstalacionDetallePage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
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

  // Estados para edición inline
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
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

  // Estados para datos precargados
  const [turnosPrecargados, setTurnosPrecargados] = useState<any[]>([]);
  const [ppcsPrecargados, setPpcsPrecargados] = useState<any[]>([]);
  const [guardiasPrecargados, setGuardiasPrecargados] = useState<any[]>([]);
  const [rolesPrecargados, setRolesPrecargados] = useState<any[]>([]);

  useEffect(() => {
    cargarInstalacion();
    cargarClientes();
  }, [instalacionId]);

  const cargarClientes = async () => {
    try {
      const clientesData = await obtenerClientes();
      setClientes(clientesData || []);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  };

  const cargarInstalacion = async () => {
    try {
      setLoading(true);
      
      // Usar la función optimizada que obtiene todo en una sola llamada
      const datosCompletos = await obtenerDatosCompletosInstalacion(instalacionId);
      
      console.log('🔍 Datos recibidos del endpoint:', {
        turnos: datosCompletos.turnos.length,
        ppcs: datosCompletos.ppcs.length,
        guardias: datosCompletos.guardias.length,
        roles: datosCompletos.roles.length
      });
      
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

  // Funciones para edición inline
  const handleEdit = (field: string, initialValue: string) => {
    setEditingField(field);
    setEditValue(initialValue);
    setSelectedAddress(null); // Limpiar selección al editar
    clearSelection(); // Limpiar sugerencias al editar
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
    setSelectedAddress(null);
    clearSelection();
  };

  const handleSave = async (field: string) => {
    if (!instalacion) return;
    
    try {
      setSaving(true);
      
      let dataToUpdate: any = {};
      
      if (field === 'valor_turno_extra') {
        // Remover separadores de miles y convertir a número
        const numericValue = editValue.replace(/\./g, '');
        const parsedValue = parseInt(numericValue) || 0;
        dataToUpdate[field] = parsedValue;
      } else if (field === 'direccion' && selectedAddress) {
        // Para dirección con datos de Google Maps - solo guardar la dirección de la calle
        dataToUpdate[field] = editValue; // Usar el valor editado (dirección limpia)
        dataToUpdate.latitud = selectedAddress.latitud;
        dataToUpdate.longitud = selectedAddress.longitud;
        dataToUpdate.ciudad = selectedAddress.componentes.ciudad;
        dataToUpdate.comuna = selectedAddress.componentes.comuna;
      } else {
        dataToUpdate[field] = editValue;
      }
      
      console.log('🔍 Datos a actualizar:', dataToUpdate);
      console.log('🔍 Instalación actual antes de actualizar:', instalacion);
      
      await actualizarInstalacion(instalacionId, dataToUpdate);
      
      // Actualizar estado local
      setInstalacion(prev => prev ? { ...prev, ...dataToUpdate } : null);
      
      console.log('🔍 Instalación después de actualizar estado local:', instalacion);
      
      // Si se actualizó la dirección, recargar datos geográficos
      if (field === 'direccion') {
        await cargarDatosGeograficos(dataToUpdate[field]);
      }
      
      setEditingField(null);
      setEditValue('');
      setSelectedAddress(null);
      clearSelection();
      
      toast.success("Campo actualizado correctamente");
      
    } catch (error) {
      console.error('Error guardando campo:', error);
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
    className = ''
  }: {
    label: string;
    value: string | number;
    field: string;
    type?: string;
    placeholder?: string;
    className?: string;
  }) => {
    const isEditing = editingField === field;
    
    return (
      <div className={className}>
        <label className="text-xs sm:text-sm font-medium text-gray-600">{label}</label>
        {isEditing ? (
          <div className="flex items-center gap-2 mt-1">
            {field === 'cliente_id' ? (
              <Select
                value={editValue}
                onValueChange={(value) => setEditValue(value)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
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
              {field === 'cliente_id' 
                ? clientes.find(c => c.id === value)?.nombre || 'Cliente no encontrado'
                : field === 'valor_turno_extra'
                ? `$${formatThousands(value)}`
                : (field === 'fecha_creacion' || field === 'fecha_actualizacion')
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
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-gray-900 dark:border-white"></div>
          <span className="ml-2 text-xs sm:text-sm">Cargando instalación...</span>
        </div>
      </div>
    );
  }

  if (!instalacion) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="text-center py-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Instalación no encontrada</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">La instalación que buscas no existe o ha sido eliminada.</p>
          <Link href="/instalaciones">
            <Button className="text-xs sm:text-sm">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Volver a Instalaciones
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header optimizado para móviles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/instalaciones">
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">
              {instalacion.nombre}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 truncate">
              Cliente: {(() => { 
                console.log('🔍 cliente_nombre:', instalacion.cliente_nombre, typeof instalacion.cliente_nombre); 
                return instalacion.cliente_nombre?.toString().trim(); 
              })()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium ${
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
                width: 20,
                height: 12,
                borderRadius: 6,
                background: instalacion.estado === 'Activo' ? '#22c55e' : '#d1d5db',
                position: 'relative',
                verticalAlign: 'middle',
                transition: 'background 0.2s'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  left: instalacion.estado === 'Activo' ? 8 : 2,
                  top: 1,
                  transition: 'left 0.2s'
                }} />
              </span>
            </button>
          </span>

        </div>
      </div>

      {/* Cuadro de Resumen optimizado para móviles */}
      <div className="mb-3 sm:mb-6">
        <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Puestos Operativos */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Puestos Operativos</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    {(() => {
                      const total = turnosPrecargados.reduce((total, turno) => total + turno.cantidad_guardias, 0);
                      console.log('🔍 Puestos operativos calculados:', total, 'de', turnosPrecargados.length, 'turnos');
                      return total;
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {turnosPrecargados.length} turnos • {ppcsPrecargados.filter((ppc: any) => ppc.estado === 'Pendiente').length} PPCs
                  </p>
                </div>
              </div>

              {/* Guardias Asignados */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Guardias Asignados</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    {(() => {
                      const asignados = guardiasPrecargados.filter((g: any) => g.tipo === 'asignado').length;
                      console.log('🔍 Guardias asignados calculados:', asignados, 'de', guardiasPrecargados.length, 'total');
                      return asignados;
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {guardiasPrecargados.filter((g: any) => g.tipo === 'asignado' && g.activo).length} activos
                  </p>
                </div>
              </div>

              {/* PPCs */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                    <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">PPCs</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    {(() => {
                      const pendientes = ppcsPrecargados.filter((ppc: any) => ppc.estado === 'Pendiente').length;
                      console.log('🔍 PPCs pendientes calculados:', pendientes, 'de', ppcsPrecargados.length, 'total');
                      return pendientes;
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {ppcsPrecargados.filter((ppc: any) => ppc.estado === 'Pendiente').length} pendientes
                  </p>
                </div>
              </div>

              {/* Roles de Servicio */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Roles de Servicio</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    {(() => {
                      console.log('🔍 Roles de servicio calculados:', turnosPrecargados.length, 'activos');
                      return turnosPrecargados.length;
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {turnosPrecargados.length} activos
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pestañas optimizadas para móviles */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <TabsTrigger value="informacion" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-3">
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Información</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
          <TabsTrigger value="asignaciones" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-3">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Asignaciones</span>
            <span className="sm:hidden">Asign</span>
          </TabsTrigger>
          <TabsTrigger value="monitoreo" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-3">
            <Satellite className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Monitoreo</span>
            <span className="sm:hidden">Monit</span>
          </TabsTrigger>
          <TabsTrigger value="estructura" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-3">
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Estructura</span>
            <span className="sm:hidden">Estruct</span>
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-3">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Documentos</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
        </TabsList>

        {/* Contenido de la pestaña Información optimizado para móviles */}
        <TabsContent value="informacion" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                Información de la Instalación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-3 sm:space-y-4 group">
                  <EditableField
                    label="Nombre de la Instalación"
                    value={instalacion.nombre}
                    field="nombre"
                    placeholder="Ingresa el nombre de la instalación"
                  />
                  <EditableField
                    label="Cliente"
                    value={instalacion.cliente_id}
                    field="cliente_id"
                  />
                  <EditableField
                    label="Dirección"
                    value={instalacion.direccion}
                    field="direccion"
                    placeholder="Buscar dirección con Google Maps..."
                  />
                </div>
                <div className="space-y-3 sm:space-y-4 group">
                  <EditableField
                    label="Teléfono de Contacto"
                    value={instalacion.telefono || ''}
                    field="telefono"
                    type="tel"
                    placeholder="+56 9 1234 5678"
                  />
                  <EditableField
                    label="Valor Turno Extra"
                    value={instalacion.valor_turno_extra || 0}
                    field="valor_turno_extra"
                    type="text"
                    placeholder="0"
                  />
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                      Fecha de Registro
                    </label>
                    <p className="text-sm sm:text-lg">
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
              {(instalacion.ciudad || instalacion.comuna || geocodingData) && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {(instalacion.comuna || geocodingData?.comuna) && (
                      <div>
                        <label className="text-xs sm:text-sm font-medium text-gray-600">Comuna</label>
                        <p className="text-sm sm:text-lg">{instalacion.comuna || geocodingData?.comuna}</p>
                      </div>
                    )}
                    {(instalacion.ciudad || geocodingData?.ciudad) && (
                      <div>
                        <label className="text-xs sm:text-sm font-medium text-gray-600">Ciudad</label>
                        <p className="text-sm sm:text-lg">{instalacion.ciudad || geocodingData?.ciudad}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mapa de Google Maps optimizado para móviles */}
              {geocodingData && (
                <div className="space-y-3 sm:space-y-4">
                  <label className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
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
                      height="200px"
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {/* Estado de carga del mapa optimizado para móviles */}
              {mapLoading && (
                <div className="flex items-center justify-center py-6 sm:py-8">
                  <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-gray-900 dark:border-white"></div>
                  <span className="ml-2 text-xs sm:text-sm text-gray-600">Cargando mapa...</span>
                </div>
              )}

              {/* Error del mapa optimizado para móviles */}
              {mapError && (
                <div className="text-center py-6 sm:py-8">
                  <MapPin className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">{mapError}</p>
                  <Button 
                    onClick={handleReintentarGeocodificacion}
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-2 mx-auto text-xs sm:text-sm"
                  >
                    <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                    Reintentar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contenido de la pestaña Asignaciones (ex Turnos) */}
        <TabsContent value="asignaciones" className="mt-4 sm:mt-6">
          <TurnosInstalacion 
            instalacionId={instalacionId} 
            instalacionNombre={instalacion?.nombre || 'Instalación'}
            turnosPrecargados={turnosPrecargados} 
            ppcsPrecargados={ppcsPrecargados} 
            guardiasPrecargados={guardiasPrecargados} 
            rolesPrecargados={rolesPrecargados} 
          />
        </TabsContent>

        {/* Contenido de la pestaña Estructura de Servicio */}
        <TabsContent value="estructura" className="mt-4 sm:mt-6">
          <EstructuraServicio 
            instalacionId={instalacionId}
            rolesPrecargados={rolesPrecargados}
          />
        </TabsContent>

        {/* Contenido de la pestaña Documentos */}
        <TabsContent value="documentos" className="mt-4 sm:mt-6">
          <DocumentManager
            modulo="instalaciones"
            entidadId={instalacionId}
            refreshTrigger={refreshTrigger}
            onUploadSuccess={() => setRefreshTrigger(prev => prev + 1)}
          />
        </TabsContent>

        {/* Contenido de la pestaña Monitoreo */}
        <TabsContent value="monitoreo" className="mt-4 sm:mt-6">
          <MonitoreoInstalacion 
            instalacionId={instalacionId}
            instalacionNombre={instalacion?.nombre || 'Instalación'}
          />
        </TabsContent>


      </Tabs>

      {/* Modal de confirmación optimizado para móviles */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
                {pendingEstado === 'Activo' ? 'Activar Instalación' : 'Inactivar Instalación'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
                ¿Estás seguro de que quieres {pendingEstado === 'Activo' ? 'activar' : 'inactivar'} la instalación {instalacion?.nombre}?
              </p>
              <div className="flex gap-2 sm:gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-3 sm:px-4 text-xs sm:text-sm"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmarCambioEstado}
                  className={`px-3 sm:px-4 text-xs sm:text-sm ${
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