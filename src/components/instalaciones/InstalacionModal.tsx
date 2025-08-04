'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal, ModalHeader, ModalFooter } from '@/components/ui/modal';
import { EntityTabs } from '@/components/ui/entity-tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleStatus } from '@/components/ui/toggle-status';
import SimpleInputDireccion from './SimpleInputDireccion';
import { DocumentManager } from '@/components/shared/document-manager';

import { GoogleMap } from '@/components/ui/google-map';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  Save, 
  X,
  Loader2,
  FileText,
  History,
  User
} from 'lucide-react';

// Importar tipos y APIs
import { Instalacion, CrearInstalacionData, Cliente } from '@/lib/schemas/instalaciones';
import { crearInstalacion, actualizarInstalacion, obtenerClientes } from '@/lib/api/instalaciones';

interface InstalacionModalProps {
  instalacion: Instalacion | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (instalacion: any) => void;
}

interface FormData {
  nombre: string;
  cliente_id: string;
  direccion: string;
  ciudad: string;
  comuna: string;
  valor_turno_extra: number;
  estado: "Activo" | "Inactivo";
}

function InstalacionModal({ instalacion, isOpen, onClose, onSuccess }: InstalacionModalProps) {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [location, setLocation] = useState({
    latitud: null as number | null,
    longitud: null as number | null
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<FormData>({
    defaultValues: {
      nombre: '',
      cliente_id: '',
      direccion: '',
      ciudad: '',
      comuna: '',
      valor_turno_extra: 0,
      estado: 'Activo'
    }
  });

  // Cargar clientes al abrir el modal
  useEffect(() => {
    if (isOpen) {
      cargarClientes();
    }
  }, [isOpen]);

  // Resetear formulario cuando cambia la instalación o se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      if (instalacion) {
        // Modo edición: cargar datos de la instalación
        reset({
          nombre: instalacion.nombre || '',
          cliente_id: instalacion.cliente_id || '',
          direccion: instalacion.direccion || '',
          ciudad: instalacion.ciudad || '',
          comuna: instalacion.comuna || '',
          valor_turno_extra: instalacion.valor_turno_extra || 0,
          estado: instalacion.estado || 'Activo'
        });
        setLocation({
          latitud: instalacion.latitud || null,
          longitud: instalacion.longitud || null
        });
      } else {
        // Modo creación: formulario vacío
        reset({
          nombre: '',
          cliente_id: '',
          direccion: '',
          ciudad: '',
          comuna: '',
          valor_turno_extra: 0,
          estado: 'Activo'
        });
        setLocation({ latitud: null, longitud: null });
      }
    }
  }, [instalacion, isOpen, reset]);

  const cargarClientes = async () => {
    try {
      const clientesData = await obtenerClientes();
      setClientes(clientesData);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  };

  const onSubmit = async (data: FormData) => {
    // Validación básica
    if (!data.nombre || !data.cliente_id || !data.direccion) {
      alert('Los campos Nombre, Cliente y Dirección son obligatorios');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...data,
        latitud: location.latitud,
        longitud: location.longitud
      };

      const url = instalacion?.id 
        ? `/api/instalaciones/${instalacion.id}`
        : '/api/instalaciones';
      
      const method = instalacion?.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess?.(result.data);
        onClose();
      } else {
        alert(result.error || 'Error al guardar la instalación');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (addressData: any) => {
    console.log('📍 Seleccionando dirección:', addressData);
    setLocation({
      latitud: addressData.latitud,
      longitud: addressData.longitud
    });
    // Usar los componentes extraídos por Google Maps
    setValue('direccion', addressData.direccionCompleta);
    setValue('ciudad', addressData.componentes?.ciudad || '');
    setValue('comuna', addressData.componentes?.comuna || '');
  };



  // Sección de información básica
  const InstalacionFormSection = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Información de la Instalación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nombre *</label>
              <Input
                {...register('nombre', { required: 'El nombre es obligatorio' })}
                placeholder="Nombre de la instalación"
                className={errors.nombre ? 'border-red-500' : ''}
              />
              {errors.nombre && (
                <p className="text-sm text-red-500">{errors.nombre.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Cliente *</label>
              <Select
                value={watch('cliente_id')}
                onValueChange={(value) => setValue('cliente_id', value)}
              >
                <SelectTrigger className={errors.cliente_id ? 'border-red-500' : ''}>
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
              {errors.cliente_id && (
                <p className="text-sm text-red-500">{errors.cliente_id.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Valor Turno Extra</label>
              <Input
                {...register('valor_turno_extra', { 
                  valueAsNumber: true,
                  min: { value: 0, message: 'El valor debe ser mayor o igual a 0' }
                })}
                type="number"
                placeholder="0"
                className={errors.valor_turno_extra ? 'border-red-500' : ''}
              />
              {errors.valor_turno_extra && (
                <p className="text-sm text-red-500">{errors.valor_turno_extra.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Estado</label>
              <div className="mt-2">
                <ToggleStatus
                  checked={watch('estado') === 'Activo'}
                  onChange={(checked) => setValue('estado', checked ? 'Activo' : 'Inactivo')}
                  size="md"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Sección de ubicación
  const InstalacionLocationSection = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Ubicación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Dirección *</label>
            <SimpleInputDireccion
              value={watch('direccion')}
              onAddressSelect={handleLocationSelect}
              placeholder="Ingresa la dirección"
              className={errors.direccion ? 'border-red-500' : ''}
            />
            {errors.direccion && (
              <p className="text-sm text-red-500">{errors.direccion.message}</p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Ciudad</label>
              <Input
                {...register('ciudad')}
                placeholder="Ciudad"
                readOnly
                className={cn(
                  "bg-gray-50 cursor-not-allowed",
                  errors.ciudad ? 'border-red-500' : ''
                )}
              />
              {errors.ciudad && (
                <p className="text-sm text-red-500">{errors.ciudad.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Comuna</label>
              <Input
                {...register('comuna')}
                placeholder="Comuna"
                readOnly
                className={cn(
                  "bg-gray-50 cursor-not-allowed",
                  errors.comuna ? 'border-red-500' : ''
                )}
              />
              {errors.comuna && (
                <p className="text-sm text-red-500">{errors.comuna.message}</p>
              )}
            </div>
          </div>

          {/* Mapa */}
          {(location.latitud && location.longitud) && (
            <div className="mt-4">
              <label className="text-sm font-medium mb-2 block">Ubicación en el mapa</label>
              <div className="h-64 rounded-lg overflow-hidden border">
                <GoogleMap
                  center={{
                    lat: location.latitud,
                    lng: location.longitud
                  }}
                  zoom={15}
                  markers={[
                    {
                      position: {
                        lat: location.latitud,
                        lng: location.longitud
                      },
                      title: watch('direccion') || 'Ubicación de la instalación',
                      color: 'red'
                    }
                  ]}
                  height="256px"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Sección de documentos (solo para instalaciones existentes)
  const InstalacionDocumentsSection = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {instalacion?.id ? (
            <DocumentManager modulo="instalaciones" entidadId={instalacion.id} />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Guarda la instalación para gestionar documentos</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );



  // Componente wrapper para contenido seguro
  const SafeTabContent = ({ children }: { children: React.ReactNode }) => {
    return (
      <div className="space-y-6">
        {children}
      </div>
    );
  };

  // Configuración de tabs
  const tabs = [
    {
      key: 'informacion',
      label: 'Información',
      icon: Building2,
      color: 'blue' as const,
      content: <SafeTabContent><InstalacionFormSection /></SafeTabContent>
    },
    {
      key: 'ubicacion',
      label: 'Ubicación',
      icon: MapPin,
      color: 'emerald' as const,
      content: <SafeTabContent><InstalacionLocationSection /></SafeTabContent>
    },
    {
      key: 'documentos',
      label: 'Documentos',
      icon: FileText,
      color: 'amber' as const,
      content: <SafeTabContent><InstalacionDocumentsSection /></SafeTabContent>
    },

  ];

  console.log('🔍 InstalacionModal renderizando, isOpen:', isOpen);
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className="h-[80vh] flex flex-col">
        <ModalHeader 
          title={instalacion?.id ? 'Editar Instalación' : 'Nueva Instalación'}
          onClose={onClose}
        />

        <div className="flex-1 overflow-hidden">
          <EntityTabs
            tabs={tabs}
            defaultTab="informacion"
            className="h-full"
          />
        </div>

        <ModalFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={loading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}

export default InstalacionModal; 