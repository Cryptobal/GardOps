'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal, ModalHeader, ModalFooter } from '@/components/ui/modal';
import { EntityTabs } from '@/components/ui/entity-tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleStatus } from '@/components/ui/toggle-status';
import { InputDireccion } from '@/components/ui/input-direccion';
import { DocumentManager } from '@/components/shared/document-manager';

import { GoogleMap } from '@/components/ui/google-map';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Building, 
  Save, 
  X,
  Loader2,
  FileText,
  History
} from 'lucide-react';

// Importar tipos
import { Guardia } from '@/lib/schemas/guardias';

interface GuardiaModalProps {
  guardia: Guardia | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (guardia: any) => void;
}

interface FormData {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  rut: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  comuna: string;
  estado: "Activo" | "Inactivo";
  instalacion_id?: string;
  fecha_os10?: string;
}

function GuardiaModal({ guardia, isOpen, onClose, onSuccess }: GuardiaModalProps) {
  const [loading, setLoading] = useState(false);
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
      apellido_paterno: '',
      apellido_materno: '',
      rut: '',
      email: '',
      telefono: '',
      direccion: '',
      ciudad: '',
      comuna: '',
      estado: 'Activo',
      instalacion_id: '',
      fecha_os10: ''
    }
  });

  // Resetear formulario cuando cambia el guardia o se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      if (guardia) {
        // Modo edición: cargar datos del guardia
        reset({
          nombre: guardia.nombre || '',
          apellido_paterno: guardia.apellido_paterno || '',
          apellido_materno: guardia.apellido_materno || '',
          rut: guardia.rut || '',
          email: guardia.email || '',
          telefono: guardia.telefono || '',
          direccion: guardia.direccion || '',
          ciudad: guardia.ciudad || '',
          comuna: guardia.comuna || '',
          estado: guardia.estado || 'Activo',
          instalacion_id: guardia.instalacion_id || '',
          fecha_os10: guardia.fecha_os10 || ''
        });
        setLocation({
          latitud: guardia.latitud || null,
          longitud: guardia.longitud || null
        });
      } else {
        // Modo creación: formulario vacío
        reset({
          nombre: '',
          apellido_paterno: '',
          apellido_materno: '',
          rut: '',
          email: '',
          telefono: '',
          direccion: '',
          ciudad: '',
          comuna: '',
          estado: 'Activo',
          instalacion_id: '',
          fecha_os10: ''
        });
        setLocation({ latitud: null, longitud: null });
      }
    }
  }, [guardia, isOpen, reset]);

  const onSubmit = async (data: FormData) => {
    // Validación básica
    if (!data.nombre || !data.apellido_paterno || !data.rut) {
      alert('Los campos Nombre, Apellido Paterno y RUT son obligatorios');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...data,
        latitud: location.latitud,
        longitud: location.longitud
      };

      const url = guardia?.id 
        ? `/api/guardias/${guardia.id}`
        : '/api/guardias';
      
      const method = guardia?.id ? 'PUT' : 'POST';

      console.log('🔍 Enviando datos:', { method, url, payload });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('❌ Error del servidor:', result);
        throw new Error(result.error || 'Error al guardar el guardia');
      }

      console.log(guardia?.id ? '✅ Guardia actualizado' : '✅ Guardia creado');
      console.log('Datos guardados:', result);

      onSuccess?.(result.guardia || result);
      onClose();
      
    } catch (error) {
      console.error('Error al guardar guardia:', error);
      alert(error instanceof Error ? error.message : 'Error desconocido al guardar el guardia');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (addressData: any) => {
    setLocation({ 
      latitud: addressData.latitud, 
      longitud: addressData.longitud 
    });
    // Extraer ciudad y comuna del address si es posible
    const parts = addressData.direccionCompleta.split(',').map((part: string) => part.trim());
    if (parts.length >= 2) {
      setValue('ciudad', parts[parts.length - 2] || '');
      setValue('comuna', parts[parts.length - 1] || '');
    }
    setValue('direccion', addressData.direccionCompleta);
  };

  // Sección de información personal
  const GuardFormSection = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información Personal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nombre *</label>
              <Input
                {...register('nombre', { required: 'El nombre es obligatorio' })}
                placeholder="Nombre"
                className={errors.nombre ? 'border-red-500' : ''}
              />
              {errors.nombre && (
                <p className="text-sm text-red-500">{errors.nombre.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Apellido Paterno *</label>
              <Input
                {...register('apellido_paterno', { required: 'El apellido paterno es obligatorio' })}
                placeholder="Apellido Paterno"
                className={errors.apellido_paterno ? 'border-red-500' : ''}
              />
              {errors.apellido_paterno && (
                <p className="text-sm text-red-500">{errors.apellido_paterno.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Apellido Materno</label>
              <Input
                {...register('apellido_materno')}
                placeholder="Apellido Materno"
                className={errors.apellido_materno ? 'border-red-500' : ''}
              />
              {errors.apellido_materno && (
                <p className="text-sm text-red-500">{errors.apellido_materno.message}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">RUT *</label>
              <Input
                {...register('rut', { required: 'El RUT es obligatorio' })}
                placeholder="12345678-9"
                className={errors.rut ? 'border-red-500' : ''}
              />
              {errors.rut && (
                <p className="text-sm text-red-500">{errors.rut.message}</p>
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
            <div>
              <label className="text-sm font-medium">Fecha Vencimiento OS10</label>
              <DatePickerComponent
                value={watch('fecha_os10') || ''}
                onChange={(date) => setValue('fecha_os10', date)}
                placeholder="Seleccionar fecha"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Información de Contacto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                {...register('email')}
                type="email"
                placeholder="guardia@ejemplo.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                {...register('telefono')}
                placeholder="+56 9 1234 5678"
                className={errors.telefono ? 'border-red-500' : ''}
              />
              {errors.telefono && (
                <p className="text-sm text-red-500">{errors.telefono.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Sección de ubicación
  const GuardLocationSection = () => (
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
            <label className="text-sm font-medium">Dirección</label>
            <InputDireccion
              value={watch('direccion')}
              onAddressSelect={handleLocationChange}
              placeholder="Ingresa la dirección"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Ciudad</label>
              <Input
                {...register('ciudad')}
                placeholder="Ciudad"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Comuna</label>
              <Input
                {...register('comuna')}
                placeholder="Comuna"
              />
            </div>
          </div>

          {location.latitud && location.longitud && (
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                <strong>Coordenadas:</strong> {Number(location.latitud).toFixed(6)}, {Number(location.longitud).toFixed(6)}
              </p>
            </div>
          )}

          {/* Mapa de Google Maps */}
          {location.latitud && location.longitud && (
            <div className="mt-4">
              <label className="text-sm font-medium mb-2 block">Ubicación en el mapa</label>
              <div className="border rounded-lg overflow-hidden">
                <GoogleMap
                  center={{
                    lat: Number(location.latitud),
                    lng: Number(location.longitud)
                  }}
                  zoom={15}
                  markers={[
                    {
                      position: {
                        lat: Number(location.latitud),
                        lng: Number(location.longitud)
                      },
                      title: watch('direccion') || 'Ubicación del guardia',
                      color: 'blue'
                    }
                  ]}
                  height="300px"
                  onMapClick={(position: { lat: number; lng: number }) => {
                    setLocation({
                      latitud: position.lat,
                      longitud: position.lng
                    });
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Sección de asignación operativa
  const GuardOperationalSection = ({ guardia }: { guardia?: Guardia | null }) => (
    <div className="space-y-6">
      {/* Rol Actual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Rol Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {guardia?.rol_actual ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Rol</label>
                  <p className="text-lg font-semibold">{guardia.rol_actual_detalle?.nombre || guardia.rol_actual}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Turno</label>
                  <p className="text-lg">{guardia.rol_actual_detalle?.turno || 'No especificado'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Horario</label>
                  <p className="text-lg">
                    {guardia.rol_actual_detalle?.horario_inicio && guardia.rol_actual_detalle?.horario_fin 
                      ? `${guardia.rol_actual_detalle.horario_inicio} - ${guardia.rol_actual_detalle.horario_fin}`
                      : 'No especificado'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Días de Trabajo</label>
                  <p className="text-lg">{guardia.rol_actual_detalle?.dias_trabajo || 'No especificado'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Sin rol asignado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial de Asignaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Asignaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {guardia?.id ? (
            <div className="space-y-4">
              <div className="text-center py-8">
                <p className="text-gray-500">Historial de asignaciones del guardia</p>
                <p className="text-sm text-gray-400 mt-2">
                  Se implementará la vista de asignaciones históricas
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Guarda el guardia para ver sus asignaciones</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Componente wrapper para manejar errores en las pestañas
  const SafeTabContent = ({ children }: { children: React.ReactNode }) => {
    return (
      <div className="min-h-[400px] p-4">
        <React.Suspense fallback={
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Cargando...</span>
          </div>
        }>
          {children}
        </React.Suspense>
      </div>
    );
  };

  const tabs = [
    {
      key: 'informacion',
      label: 'Información',
      icon: User,
      color: 'blue' as const,
      content: <SafeTabContent><GuardFormSection /></SafeTabContent>
    },
    {
      key: 'ubicacion',
      label: 'Ubicación',
      icon: MapPin,
      color: 'emerald' as const,
      content: <SafeTabContent><GuardLocationSection /></SafeTabContent>
    },
    {
      key: 'documentos',
      label: 'Documentos',
      icon: FileText,
      color: 'amber' as const,
      content: guardia?.id ? (
        <SafeTabContent>
          <DocumentManager modulo="guardias" entidadId={guardia.id} />
        </SafeTabContent>
      ) : (
        <SafeTabContent>
          <div className="text-center py-8">
            <p className="text-gray-500">Guarda el guardia para gestionar documentos</p>
          </div>
        </SafeTabContent>
      )
    },
    {
      key: 'asignaciones',
      label: 'Asignación Operativa',
      icon: History,
      color: 'violet' as const,
      content: <SafeTabContent><GuardOperationalSection guardia={guardia} /></SafeTabContent>
    },

  ];

  console.log('🔍 GuardiaModal - Tabs configuradas:', tabs.map(t => t.key));
  console.log('🔍 GuardiaModal - Guardia ID:', guardia?.id);
  console.log('🔍 GuardiaModal - IsOpen:', isOpen);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className="h-[80vh] flex flex-col">
        <ModalHeader 
          title={guardia?.id ? 'Editar Guardia' : 'Nuevo Guardia'}
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

export default GuardiaModal;
