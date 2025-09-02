'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, MapPin, Phone, Mail, Calendar, FileText, Edit, RefreshCw, AlertTriangle, CreditCard, Clock, Check, X } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAddressAutocomplete, type AddressData } from '@/lib/useAddressAutocomplete';

import { DocumentManager } from '@/components/shared/document-manager';
import PermisosGuardia from './components/PermisosGuardia';
import FiniquitoGuardia from './components/FiniquitoGuardia';
import TurnosExtrasGuardia from './components/TurnosExtrasGuardia';
import HistorialMensual from './components/HistorialMensual';
import AsignacionGuardia from './components/AsignacionGuardia';

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
  // Campos del formulario de postulación
  sexo?: string;
  nacionalidad?: string;
  fecha_nacimiento?: string;
  afp?: string;
  descuento_afp?: number;
  prevision_salud?: string;
  cotiza_sobre_7?: boolean;
  monto_pactado_uf?: number;
  es_pensionado?: boolean;
  asignacion_familiar?: boolean;
  tramo_asignacion?: string;
  // Campos de información física
  talla_camisa?: string;
  talla_pantalon?: string;
  talla_zapato?: number;
  altura_cm?: number;
  peso_kg?: number;
  created_at: string;
  updated_at: string;
}

interface DatosBancarios {
  id: string;
  banco: string | null;
  tipo_cuenta: string | null;
  numero_cuenta: string | null;
  banco_nombre: string | null;
}

interface Banco {
  id: string;
  nombre: string;
  codigo: string;
}

const TIPOS_CUENTA = [
  { value: 'CCT', label: 'Cuenta Corriente' },
  { value: 'CTE', label: 'Cuenta de Ahorro' },
  { value: 'CTA', label: 'Cuenta Vista' },
  { value: 'RUT', label: 'Cuenta RUT' }
];

export default function GuardiaDetallePage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const guardiaId = params.id as string;
  const [guardia, setGuardia] = useState<Guardia | null>(null);
  const [datosBancarios, setDatosBancarios] = useState<DatosBancarios | null>(null);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('informacion');
  const [geocodingData, setGeocodingData] = useState<GeocodingResult | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

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

  useEffect(() => {
    cargarGuardia();
    cargarBancos();
  }, [guardiaId]);

  const cargarBancos = async () => {
    try {
      const response = await fetch('/api/bancos');
      if (response.ok) {
        const data = await response.json();
        setBancos(data.bancos || []);
      }
    } catch (error) {
      console.error('Error cargando bancos:', error);
    }
  };

  const cargarGuardia = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/guardias/${guardiaId}`);
      if (!response.ok) {
        throw new Error('Error al cargar guardia');
      }
      const guardiaData = await response.json();
      setGuardia(guardiaData);
      
      // Cargar datos bancarios
      const datosBancariosResponse = await fetch(`/api/guardias/${guardiaId}/banco`);
      if (datosBancariosResponse.ok) {
        const datosBancariosData = await datosBancariosResponse.json();
        setDatosBancarios(datosBancariosData);
      }
      
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
    if (!guardia) return;
    
    try {
      setSaving(true);
      
      let dataToUpdate: any = {};
      
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
      
      // Determinar si es un campo del guardia o de datos bancarios
      const isBancoField = ['banco', 'tipo_cuenta', 'numero_cuenta'].includes(field);
      
      if (isBancoField) {
        // Actualizar datos bancarios
        const response = await fetch(`/api/guardias/${guardiaId}/banco`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToUpdate)
        });
        
        if (response.ok) {
          const updatedDatosBancarios = await response.json();
          setDatosBancarios(updatedDatosBancarios);
        } else {
          throw new Error('Error actualizando datos bancarios');
        }
      } else {
        // Actualizar datos del guardia
        const response = await fetch(`/api/guardias/${guardiaId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToUpdate)
        });
        
        if (response.ok) {
          const updatedGuardia = await response.json();
          setGuardia(updatedGuardia);
          
          // Si se actualizó la dirección, recargar datos geográficos
          if (field === 'direccion') {
            await cargarDatosGeograficos(dataToUpdate[field]);
          }
        } else {
          throw new Error('Error actualizando guardia');
        }
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
              {field === 'banco' 
                ? bancos.find(b => b.id === value)?.nombre || 'No especificado'
                : field === 'tipo_cuenta'
                ? TIPOS_CUENTA.find(t => t.value === value)?.label || value || 'No especificado'
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
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
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

        </div>
      </div>

      {/* Pestañas */}
      <div className="w-full mb-6">
        {/* Contenedor de pestañas con fondo y bordes */}
        <div className="bg-muted/30 rounded-xl p-3 shadow-sm border border-border/50 overflow-x-auto">
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
              onClick={() => setActiveTab('asignacion')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap rounded-lg transition-all duration-200 hover:bg-muted/60 ${
                activeTab === 'asignacion' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span>Asignación</span>
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
              onClick={() => setActiveTab('asignacion')}
              className={`flex flex-col items-center gap-1 px-3 py-4 text-xs font-medium rounded-lg transition-all duration-200 hover:bg-muted/60 ${
                activeTab === 'asignacion' 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MapPin className="h-4 w-4" />
              <span>Asignación</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <EditableField
                    label="Nombre"
                    value={guardia.nombre}
                    field="nombre"
                    placeholder="Nombre del guardia"
                  />
                  <EditableField
                    label="Apellidos"
                    value={guardia.apellidos}
                    field="apellidos"
                    placeholder="Apellidos del guardia"
                  />
                  <EditableField
                    label="RUT"
                    value={guardia.rut}
                    field="rut"
                    placeholder="12.345.678-9"
                  />
                  <EditableField
                    label="Email"
                    value={guardia.email}
                    field="email"
                    type="email"
                    placeholder="email@ejemplo.com"
                  />
                  <EditableField
                    label="Teléfono"
                    value={guardia.telefono}
                    field="telefono"
                    type="tel"
                    placeholder="+56 9 1234 5678"
                  />
                  <EditableField
                    label="Tipo de Guardia"
                    value={guardia.tipo_guardia || ''}
                    field="tipo_guardia"
                    options={[
                      { value: 'contratado', label: 'Contratado' },
                      { value: 'esporadico', label: 'Esporádico' }
                    ]}
                  />
                  <EditableField
                    label="Vencimiento OS10"
                    value={guardia.fecha_os10 || ''}
                    field="fecha_os10"
                    type="date"
                    placeholder="Fecha de vencimiento"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sección 2: Información Física */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-4 w-4" />
                  Información Física
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField
                    label="Talla Camisa"
                    value={guardia.talla_camisa || ''}
                    field="talla_camisa"
                    placeholder="No configurado"
                    options={[
                      { value: 'XS', label: 'XS' },
                      { value: 'S', label: 'S' },
                      { value: 'M', label: 'M' },
                      { value: 'L', label: 'L' },
                      { value: 'XL', label: 'XL' },
                      { value: 'XXL', label: 'XXL' },
                      { value: 'XXXL', label: 'XXXL' }
                    ]}
                  />
                  <EditableField
                    label="Talla Pantalón"
                    value={guardia.talla_pantalon || ''}
                    field="talla_pantalon"
                    placeholder="No configurado"
                    options={[
                      { value: '38', label: '38' },
                      { value: '40', label: '40' },
                      { value: '42', label: '42' },
                      { value: '44', label: '44' },
                      { value: '46', label: '46' },
                      { value: '48', label: '48' },
                      { value: '50', label: '50' },
                      { value: '52', label: '52' },
                      { value: '54', label: '54' }
                    ]}
                  />
                  <EditableField
                    label="Talla Zapato"
                    value={guardia.talla_zapato?.toString() || ''}
                    field="talla_zapato"
                    placeholder="40"
                  />
                  <EditableField
                    label="Altura (cm)"
                    value={guardia.altura_cm?.toString() || ''}
                    field="altura_cm"
                    placeholder="170"
                  />
                  <EditableField
                    label="Peso (kg)"
                    value={guardia.peso_kg?.toString() || ''}
                    field="peso_kg"
                    placeholder="70.0"
                  />
                  <div className="col-span-full md:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      IMC
                    </label>
                    <div className="text-sm font-medium p-2 bg-muted/50 rounded border text-center">
                      {guardia.altura_cm && guardia.peso_kg 
                        ? ((guardia.peso_kg / Math.pow(guardia.altura_cm / 100, 2)) || 0).toFixed(1)
                        : 'No calculable'
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sección 3: Datos Bancarios */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-4 w-4" />
                  Datos Bancarios
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField
                    label="Banco"
                    value={datosBancarios?.banco || ''}
                    field="banco"
                    options={bancos.map(b => ({ value: b.id, label: b.nombre }))}
                  />
                  <EditableField
                    label="Tipo de Cuenta"
                    value={datosBancarios?.tipo_cuenta || ''}
                    field="tipo_cuenta"
                    options={TIPOS_CUENTA}
                  />
                  <EditableField
                    label="Número de Cuenta"
                    value={datosBancarios?.numero_cuenta || ''}
                    field="numero_cuenta"
                    type="text"
                    placeholder="Número de cuenta"
                  />
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
                    <EditableField
                      label="Dirección"
                      value={guardia.direccion}
                      field="direccion"
                      placeholder="Buscar dirección con Google Maps..."
                    />
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

        {/* Contenido de la pestaña Asignación */}
        {activeTab === 'asignacion' && (
          <div className="mt-6">
            <AsignacionGuardia guardiaId={guardiaId} />
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