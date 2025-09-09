"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal, ModalHeader, ModalFooter } from '@/components/ui/modal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EntityTabs } from '@/components/ui/entity-tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  tipo_guardia: "contratado" | "esporadico";
  instalacion_id?: string;
  fecha_os10?: string;
  banco_id?: string;
  numero_cuenta?: string;
  tipo_cuenta?: 'Cuenta Corriente' | 'Cuenta Vista' | 'Cuenta de Ahorro' | 'RUT';
}

function GuardiaModal({ guardia, isOpen, onClose, onSuccess }: GuardiaModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; title: string; description: string }>({ open: false, title: '', description: '' });
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
      tipo_guardia: 'contratado',
      instalacion_id: '',
      fecha_os10: ''
    }
  });

  const [bancos, setBancos] = useState<Array<{ id: string; nombre: string }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/bancos');
        if (resp.ok) {
          const data = await resp.json();
          const rows = Array.isArray(data.bancos) ? data.bancos : [];
          setBancos(rows.map((b: any) => ({ id: b.id, nombre: b.nombre })));
        }
      } catch {}
    })();
  }, []);

  // Nota: se eliminó la validación en vivo del RUT para no interferir al escribir

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
          tipo_guardia: guardia.tipo_guardia || 'contratado',
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
          tipo_guardia: 'contratado',
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

    // Email y teléfono obligatorios
    if (!data.email) {
      alert('El Email es obligatorio');
      return;
    }
    if (!data.telefono) {
      alert('El Teléfono es obligatorio');
      return;
    }
    // Datos bancarios opcionales - comentados para hacerlos opcionales
    // if (!data.banco_id) {
    //   alert('Seleccione un banco');
    //   return;
    // }
    // if (!data.tipo_cuenta) {
    //   alert('Seleccione el tipo de cuenta');
    //   return;
    // }
    // if (!data.numero_cuenta) {
    //   alert('Ingrese el número de cuenta');
    //   return;
    // }
    // Ubicación obligatoria
    if (!location.latitud || !location.longitud) {
      alert('La Ubicación es obligatoria. Seleccione una dirección válida.');
      return;
    }

    // Normalizar RUT (sin puntos y sin espacios). La validación completa la realiza el backend.
    const rutIngresado = (data.rut || '').toString().trim();
    const rutNormalizado = rutIngresado.replace(/\./g, '').replace(/\s+/g, '');

    setLoading(true);
    try {
      const payload = {
        ...data,
        rut: rutNormalizado,
        latitud: location.latitud,
        longitud: location.longitud
      };

      const url = guardia?.id 
        ? `/api/guardias/${guardia.id}`
        : '/api/guardias';
      
      const method = guardia?.id ? 'PUT' : 'POST';

      devLogger.search(' Enviando datos:', { method, url, payload });

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
        // Mostrar modal bonito según el tipo de error
        if (response.status === 409) {
          setErrorDialog({
            open: true,
            title: 'RUT ya registrado',
            description: 'Ya existe un guardia con ese RUT en el sistema. Verifica el RUT ingresado o edita el guardia existente.'
          });
          return;
        }
        if (response.status === 400) {
          setErrorDialog({
            open: true,
            title: 'Datos inválidos',
            description: result.error || 'Revisa el formato del RUT (ej: 12345678-9) y completa los campos obligatorios.'
          });
          return;
        }
        setErrorDialog({
          open: true,
          title: 'Error al guardar',
          description: result.error || 'Ocurrió un error inesperado. Intenta nuevamente.'
        });
        return;
      }

      logger.debug(guardia?.id ? '✅ Guardia actualizado' : '✅ Guardia creado');
      logger.debug('Datos guardados:', result);

      onSuccess?.(result.guardia || result);
      onClose();
      
    } catch (error) {
      logger.error('Error al guardar guardia::', error);
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
    
    // Usar los componentes extraídos correctamente por Google Maps
    if (addressData.componentes) {
      setValue('ciudad', addressData.componentes.ciudad || '');
      setValue('comuna', addressData.componentes.comuna || '');
    } else {
      // Fallback: extraer ciudad y comuna del address si es posible
      const parts = addressData.direccionCompleta.split(',').map((part: string) => part.trim());
      if (parts.length >= 2) {
        setValue('ciudad', parts[parts.length - 2] || '');
        setValue('comuna', parts[parts.length - 1] || '');
      }
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">RUT *</label>
              <Input
                {...register('rut', { required: 'El RUT es obligatorio' })}
                placeholder="Ej: 12345678-9 (sin puntos)"
                className={errors.rut ? 'border-red-500' : ''}
              />
              {errors.rut && (
                <p className="text-sm text-red-500">{errors.rut.message}</p>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium">Tipo de Guardia *</label>
              <Select value={watch('tipo_guardia') || 'contratado'} onValueChange={(v) => setValue('tipo_guardia', v as 'contratado' | 'esporadico')}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contratado">Contratado</SelectItem>
                  <SelectItem value="esporadico">Esporádico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Fecha Vencimiento OS10</label>
              <DatePickerComponent
                value={watch('fecha_os10') || ''}
                onChange={(dateStr) => setValue('fecha_os10', dateStr)}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input
                {...register('email', { required: 'El email es obligatorio' })}
                type="email"
                placeholder="guardia@ejemplo.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono *</label>
              <Input
                {...register('telefono', { 
                  required: 'El teléfono es obligatorio',
                  pattern: { value: /^\d{9}$/, message: 'Debe tener 9 dígitos (sin +56)' }
                })}
                placeholder="912345678"
                className={errors.telefono ? 'border-red-500' : ''}
              />
              {errors.telefono && (
                <p className="text-sm text-red-500">{errors.telefono.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Banco *</label>
              <Select value={watch('banco_id') || ''} onValueChange={(v) => setValue('banco_id', v)}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Seleccione banco" />
                </SelectTrigger>
                <SelectContent>
                  {bancos.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Tipo de Cuenta *</label>
              <Select value={watch('tipo_cuenta') || ''} onValueChange={(v) => setValue('tipo_cuenta', v as any)}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Seleccione tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cuenta Corriente">Cuenta Corriente</SelectItem>
                  <SelectItem value="Cuenta Vista">Cuenta Vista</SelectItem>
                  <SelectItem value="Cuenta de Ahorro">Cuenta de Ahorro</SelectItem>
                  <SelectItem value="RUT">RUT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Número de Cuenta *</label>
              <Input
                {...register('numero_cuenta', { required: true })}
                placeholder="00012345678"
                className={errors.numero_cuenta ? 'border-red-500' : ''}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Sección de ubicación
  const GuardLocationSection = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Ubicación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium">Dirección *</label>
            <InputDireccion
              value={watch('direccion')}
              onAddressSelect={handleLocationChange}
              placeholder="Ingresa la dirección"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Ciudad</label>
              <Input
                {...register('ciudad')}
                placeholder="Ciudad"
                readOnly
                disabled
              />
            </div>
            <div>
              <label className="text-sm font-medium">Comuna</label>
              <Input
                {...register('comuna')}
                placeholder="Comuna"
                readOnly
                disabled
              />
            </div>
          </div>

          {location.latitud && location.longitud && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600">
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
      <div className="h-full overflow-auto p-4">
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

  const tabs = guardia?.id ? [
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
      content: <SafeTabContent>
        <DocumentManager modulo="guardias" entidadId={guardia.id} />
      </SafeTabContent>
    },
    {
      key: 'asignaciones',
      label: 'Asignación Operativa',
      icon: History,
      color: 'violet' as const,
      content: <SafeTabContent><GuardOperationalSection guardia={guardia} /></SafeTabContent>
    },
  ] : [
    {
      key: 'informacion',
      label: 'Información',
      icon: User,
      color: 'blue' as const,
      content: <SafeTabContent><div className="space-y-6"><GuardFormSection /><GuardLocationSection /></div></SafeTabContent>
    },
  ];

  console.log('🔍 GuardiaModal - Tabs configuradas:', tabs.map(t => t.key));
  devLogger.search(' GuardiaModal - Guardia ID:', guardia?.id);
  devLogger.search(' GuardiaModal - IsOpen:', isOpen);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <div className="h-[80vh] flex flex-col">
          <ModalHeader 
            title={guardia?.id ? 'Editar Guardia' : 'Nuevo Guardia'}
            onClose={onClose}
          />

          <div className="flex-1 overflow-auto">
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
      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{errorDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {errorDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialog({ open: false, title: '', description: '' })}>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default GuardiaModal;
