'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, MapPin, FileText, Users, Activity, Save, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { EntityTabs } from '@/components/ui/entity-tabs';
import { LocationTab } from '@/components/ui/location-tab';
import { DocumentManager } from '@/components/shared/document-manager';
import { LogViewer } from '@/components/shared/log-viewer';
import { getInstalacion, actualizarInstalacion, obtenerClientes, obtenerComunas, obtenerDatosCompletosInstalacion } from '@/lib/api/instalaciones';
import { Instalacion, Cliente, Comuna } from '@/lib/schemas/instalaciones';
import TurnosInstalacion from './components/TurnosInstalacion';

export default function InstalacionPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const instalacionId = params.id as string;
  
  const [instalacion, setInstalacion] = useState<Instalacion | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Estados para datos precargados
  const [turnosPrecargados, setTurnosPrecargados] = useState<any[]>([]);
  const [ppcsPrecargados, setPpcsPrecargados] = useState<any[]>([]);
  const [guardiasPrecargados, setGuardiasPrecargados] = useState<any[]>([]);
  const [rolesPrecargados, setRolesPrecargados] = useState<any[]>([]);

  // Estados para edición
  const [editData, setEditData] = useState({
    nombre: '',
    cliente_id: '',
    comuna: '',
    ciudad: '',
    direccion: '',
    latitud: null as number | null,
    longitud: null as number | null,
    valor_turno_extra: 0,
    estado: 'Activo' as 'Activo' | 'Inactivo'
  });

  useEffect(() => {
    if (instalacionId) {
      cargarDatos();
    }
  }, [instalacionId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Usar la nueva función optimizada que obtiene todo en una sola llamada
      const datosCompletos = await obtenerDatosCompletosInstalacion(instalacionId);
      
      setInstalacion(datosCompletos.instalacion);
      setClientes([{ id: datosCompletos.instalacion.cliente_id, nombre: datosCompletos.instalacion.cliente_nombre || 'Cliente no encontrado', rut: '', estado: 'Activo' }]);
      setComunas([]); // Las comunas no se usan en esta página
      
      // Guardar datos precargados
      setTurnosPrecargados(datosCompletos.turnos);
      setPpcsPrecargados(datosCompletos.ppcs);
      setGuardiasPrecargados(datosCompletos.guardias);
      setRolesPrecargados(datosCompletos.roles);
      
      // Inicializar datos de edición
      setEditData({
        nombre: datosCompletos.instalacion.nombre,
        cliente_id: datosCompletos.instalacion.cliente_id || '',
        comuna: datosCompletos.instalacion.comuna || '',
        ciudad: datosCompletos.instalacion.ciudad || '',
        direccion: datosCompletos.instalacion.direccion || '',
        latitud: datosCompletos.instalacion.latitud,
        longitud: datosCompletos.instalacion.longitud,
        valor_turno_extra: datosCompletos.instalacion.valor_turno_extra || 0,
        estado: datosCompletos.instalacion.estado || 'Activo'
      });
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('No se pudo cargar la información de la instalación', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!instalacion) return;

    try {
      setSaving(true);
      
      // Crear objeto con solo los campos que cambiaron
      const cambios: any = { id: instalacionId };
      
      if (editData.nombre !== instalacion.nombre) {
        cambios.nombre = editData.nombre;
      }
      if (editData.cliente_id !== instalacion.cliente_id) {
        cambios.cliente_id = editData.cliente_id;
      }
      if (editData.direccion !== instalacion.direccion) {
        cambios.direccion = editData.direccion;
      }
      if (editData.latitud !== instalacion.latitud) {
        cambios.latitud = editData.latitud;
      }
      if (editData.longitud !== instalacion.longitud) {
        cambios.longitud = editData.longitud;
      }
      if (editData.ciudad !== instalacion.ciudad) {
        cambios.ciudad = editData.ciudad;
      }
      if (editData.comuna !== instalacion.comuna) {
        cambios.comuna = editData.comuna;
      }
      if (editData.valor_turno_extra !== instalacion.valor_turno_extra) {
        cambios.valor_turno_extra = editData.valor_turno_extra;
      }
      if (editData.estado !== instalacion.estado) {
        cambios.estado = editData.estado;
      }
      
      console.log('🔍 Campos que cambiaron:', Object.keys(cambios).filter(key => key !== 'id'));
      
      await actualizarInstalacion(instalacionId, cambios);
      
      // Recargar datos
      await cargarDatos();
      setIsEditing(false);
      setRefreshTrigger(prev => prev + 1);
      
      toast.success('Instalación actualizada correctamente', 'Éxito');
    } catch (error) {
      console.error('Error guardando instalación:', error);
      toast.error('No se pudo actualizar la instalación', 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (instalacion) {
      setEditData({
        nombre: instalacion.nombre,
        cliente_id: instalacion.cliente_id || '',
        comuna: instalacion.comuna || '',
        ciudad: instalacion.ciudad || '',
        direccion: instalacion.direccion || '',
        latitud: instalacion.latitud,
        longitud: instalacion.longitud,
        valor_turno_extra: instalacion.valor_turno_extra || 0,
        estado: instalacion.estado || 'Activo'
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      </div>
    );
  }

  if (!instalacion) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-4">Instalación no encontrada</h1>
          <Button onClick={() => router.push('/instalaciones')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Instalaciones
          </Button>
        </div>
      </div>
    );
  }

  // Configuración de tabs
  const tabs = [
    {
      key: 'informacion',
      label: 'Información',
      icon: Building2,
      color: 'blue' as const,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nombre de la Instalación</label>
                <Input
                  value={editData.nombre}
                  onChange={(e) => setEditData(prev => ({ ...prev, nombre: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="Nombre de la instalación"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Cliente</label>
                <Select
                  value={editData.cliente_id}
                  onValueChange={(value) => setEditData(prev => ({ ...prev, cliente_id: value }))}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
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
              </div>


            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Valor Turno Extra</label>
                <Input
                  type="number"
                  value={editData.valor_turno_extra}
                  onChange={(e) => setEditData(prev => ({ ...prev, valor_turno_extra: parseInt(e.target.value) || 0 }))}
                  disabled={!isEditing}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select
                  value={editData.estado}
                  onValueChange={(value) => setEditData(prev => ({ ...prev, estado: value as 'Activo' | 'Inactivo' }))}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>


            </div>
          </div>
        </div>
      )
    },
    {
      key: 'ubicacion',
      label: 'Ubicación',
      icon: MapPin,
      color: 'emerald' as const,
      content: (
        <LocationTab
          direccion={editData.direccion}
          latitud={editData.latitud}
          longitud={editData.longitud}
          ciudad={editData.ciudad}
          comuna={editData.comuna}
          onAddressSelect={(address) => {
            setEditData(prev => ({
              ...prev,
              direccion: address.direccionCompleta,
              latitud: address.latitud,
              longitud: address.longitud,
              ciudad: address.componentes.ciudad,
              comuna: address.componentes.comuna
            }));
          }}
          onAddressChange={(query) => {
            setEditData(prev => ({ ...prev, direccion: query }));
          }}
          onCiudadChange={(ciudad) => {
            setEditData(prev => ({ ...prev, ciudad }));
          }}
          onComunaChange={(comuna) => {
            setEditData(prev => ({ ...prev, comuna }));
          }}
          onCoordinatesChange={(lat, lng) => {
            setEditData(prev => ({ ...prev, latitud: lat, longitud: lng }));
          }}
          disabled={!isEditing}
          isReadOnly={!isEditing}
          showMap={true}
          showCoordinates={true}
          showLocationButtons={true}
        />
      )
    },
    {
      key: 'documentos',
      label: 'Documentos',
      icon: FileText,
      color: 'violet' as const,
      content: (
        <DocumentManager
          modulo="instalaciones"
          entidadId={instalacionId}
          refreshTrigger={refreshTrigger}
          onUploadSuccess={() => setRefreshTrigger(prev => prev + 1)}
        />
      )
    },
    {
      key: 'turnos',
      label: 'Turnos',
      icon: Users,
      color: 'amber' as const,
      content: (
        <TurnosInstalacion 
          instalacionId={instalacionId} 
          turnosPrecargados={turnosPrecargados} 
          ppcsPrecargados={ppcsPrecargados} 
          guardiasPrecargados={guardiasPrecargados} 
          rolesPrecargados={rolesPrecargados} 
        />
      )
    },
    {
      key: 'actividad',
      label: 'Actividad',
      icon: Activity,
      color: 'red' as const,
      content: (
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
      )
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/instalaciones')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="w-8 h-8" />
              {instalacion.nombre}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Indicador de estado con círculo */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              instalacion.estado === 'Activo' 
                ? 'bg-green-500 shadow-lg shadow-green-500/50' 
                : 'bg-red-500 shadow-lg shadow-red-500/50'
            }`} />
            <span className="text-sm font-medium text-muted-foreground">
              {instalacion.estado}
            </span>
          </div>

          {/* Botón de editar más pequeño */}
          {isEditing ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => setIsEditing(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <EntityTabs
        tabs={tabs}
        defaultTab="informacion"
        showActionButtons={false}
        className="min-h-[600px]"
      />
    </div>
  );
} 