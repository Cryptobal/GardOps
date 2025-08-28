'use client';

import { Authorize, GuardButton, can } from '@/lib/authz-ui'
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building2, MapPin, Phone, Mail, Calendar, FileText, Settings, Edit, RefreshCw, Users, Clock, Shield, DollarSign, Satellite } from 'lucide-react';
import Link from 'next/link';
import { GoogleMap } from '@/components/ui/google-map';
import { geocodificarDireccion, cargarGoogleMaps, type GeocodingResult } from '@/lib/geocoding';
import { GoogleMapsAutocomplete } from '@/components/ui/google-maps-autocomplete';
import { getInstalacion, actualizarInstalacion, obtenerClientes, obtenerComunas, obtenerDatosCompletosInstalacion } from '@/lib/api/instalaciones';
import { Instalacion, Cliente, Comuna } from '@/lib/schemas/instalaciones';
import TurnosInstalacion from './components/TurnosInstalacion';
import EstructuraServicio from './components/EstructuraServicio';
import MonitoreoInstalacion from './components/MonitoreoInstalacion';
import { DocumentManager } from '@/components/shared/document-manager';


export default function InstalacionDetallePage() {
  const params = useParams();
  const router = useRouter();
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
  const [effectivePermissions, setEffectivePermissions] = useState<Record<string, string[]>>({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  // Estados para datos precargados
  const [turnosPrecargados, setTurnosPrecargados] = useState<any[]>([]);
  const [ppcsPrecargados, setPpcsPrecargados] = useState<any[]>([]);
  const [guardiasPrecargados, setGuardiasPrecargados] = useState<any[]>([]);
  const [rolesPrecargados, setRolesPrecargados] = useState<any[]>([]);
  const [pautaMensualPrecargada, setPautaMensualPrecargada] = useState<any[]>([]);

  // Función para actualizar KPIs localmente sin recargar página
  const actualizarKPIsLocalmente = (tipo: string, accion: string, datos?: any) => {
    console.log('🔄 [KPIs] Actualizando localmente:', tipo, accion, datos);
    
    // Actualizar turnos precargados con los nuevos datos
    if (datos && datos.turnos) {
      setTurnosPrecargados(datos.turnos);
    }
    
    // Actualizar PPCs si están disponibles
    if (datos && datos.ppcs) {
      setPpcsPrecargados(datos.ppcs);
    }
    
    // Actualizar guardias si están disponibles
    if (datos && datos.guardias) {
      setGuardiasPrecargados(datos.guardias);
    }
  };

  // Función para actualización optimista de KPIs
  const actualizarKPIsOptimista = (tipo: string, accion: string, datos?: any) => {
    console.log('⚡ [KPIs] Actualización optimista:', tipo, accion, datos);
    
    // Actualización inmediata basada en la acción
    if (tipo === 'guardia' && accion === 'asignar') {
      // Incrementar guardias asignados inmediatamente
      setTurnosPrecargados(prev => [...prev]); // Forzar re-render
    } else if (tipo === 'guardia' && accion === 'desasignar') {
      // Decrementar guardias asignados inmediatamente
      setTurnosPrecargados(prev => [...prev]); // Forzar re-render
    } else if (tipo === 'puesto' && accion === 'agregar') {
      // Incrementar puestos inmediatamente
      setTurnosPrecargados(prev => [...prev]); // Forzar re-render
    } else if (tipo === 'puesto' && accion === 'eliminar') {
      // Decrementar puestos inmediatamente
      setTurnosPrecargados(prev => [...prev]); // Forzar re-render
    }
  };

  useEffect(() => {
    cargarInstalacion();
    cargarPermisos();
    cargarClientes();
  }, [instalacionId]);

  const cargarPermisos = async () => {
    try {
      const response = await fetch('/api/me/effective-permissions');
      if (response.ok) {
        const data = await response.json();
        setEffectivePermissions(data.effective || {});
      }
    } catch (error) {
      console.error('Error cargando permisos:', error);
    } finally {
      setPermissionsLoaded(true);
    }
  };

  const cargarClientes = async () => {
    try {
      const clientesData = await obtenerClientes();
      setClientes(clientesData);
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

  const handleEditarInstalacion = () => {
    // Redirigir a la página de edición o abrir modal
    router.push(`/instalaciones/${instalacionId}/editar`);
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

  const handleEditField = (field: string) => {
    if (!instalacion) return;
    
    let currentValue = '';
    switch (field) {
      case 'nombre':
        currentValue = instalacion.nombre;
        break;
      case 'telefono':
        currentValue = instalacion.telefono || '';
        break;
      case 'valor_turno_extra':
        currentValue = Number(instalacion.valor_turno_extra || 0).toLocaleString('es-CL');
        break;
      case 'direccion':
        currentValue = instalacion.direccion || '';
        break;
      case 'cliente':
        currentValue = instalacion.cliente_id || '';
        break;
      default:
        currentValue = '';
    }
    setEditValue(currentValue);
    setShowEditModal(field);
  };

  const saveEdit = async () => {
    if (!editValue.trim() || !showEditModal) return;

    setSavingEdit(true);
    try {
      const updateData: any = {};
      
      switch (showEditModal) {
        case 'nombre':
          updateData.nombre = editValue;
          break;
        case 'telefono':
          // Validar formato de teléfono chileno (9 dígitos)
          const telefonoRegex = /^[0-9]{9}$/;
          if (!telefonoRegex.test(editValue)) {
            alert('El teléfono debe tener exactamente 9 dígitos');
            return;
          }
          updateData.telefono = editValue;
          break;
        case 'valor_turno_extra':
          const valor = parseFloat(editValue.replace(/[^\d]/g, ''));
          if (isNaN(valor) || valor < 0) {
            alert('El valor debe ser un número positivo');
            return;
          }
          updateData.valor_turno_extra = valor;
          break;
        case 'direccion':
          updateData.direccion = editValue;
          // Nota: Para una implementación completa, aquí se debería
          // llamar a la API de geocodificación para obtener lat/lng
          break;
        case 'cliente':
          updateData.cliente_id = editValue;
          break;
      }

      const response = await fetch(`/api/instalaciones/${instalacionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const result = await response.json();
        setInstalacion(prev => prev ? { ...prev, ...result.data } : null);
        setShowEditModal(null);
        setEditValue('');
      } else {
        console.error('Error actualizando instalación');
      }
    } catch (error) {
      console.error('Error actualizando instalación:', error);
    } finally {
      setSavingEdit(false);
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
          <Button 
            onClick={handleEditarInstalacion}
            variant="outline" 
            size="sm"
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Editar</span>
            <span className="sm:hidden">Editar</span>
          </Button>
        </div>
      </div>

      {/* Cuadro de Resumen optimizado para móviles */}
      <div className="mb-3 sm:mb-6">
        <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Puestos */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Puestos</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    {(() => {
                      // Calcular puestos reales basándose en los datos del endpoint /completa
                      const puestosReales = turnosPrecargados.reduce((total, turno) => {
                        return total + (turno.puestos?.length || 0);
                      }, 0);
                      console.log('🔍 Puestos reales calculados:', puestosReales, 'de', turnosPrecargados.length, 'turnos');
                      return puestosReales;
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
                      // Calcular guardias asignados reales basándose en los puestos con guardia asignado
                      const guardiasAsignados = turnosPrecargados.reduce((total, turno) => {
                        const puestosConGuardia = turno.puestos?.filter((puesto: any) => 
                          puesto.guardia_nombre && puesto.guardia_nombre !== 'Sin guardia'
                        ) || [];
                        return total + puestosConGuardia.length;
                      }, 0);
                      console.log('🔍 Guardias asignados reales calculados:', guardiasAsignados);
                      return guardiasAsignados;
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(() => {
                      const guardiasActivos = turnosPrecargados.reduce((total, turno) => {
                        const puestosConGuardiaActivo = turno.puestos?.filter((puesto: any) => 
                          puesto.guardia_nombre && 
                          puesto.guardia_nombre !== 'Sin guardia' && 
                          puesto.activo
                        ) || [];
                        return total + puestosConGuardiaActivo.length;
                      }, 0);
                      return `${guardiasActivos} activos`;
                    })()}
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

              {/* Turnos */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Turnos</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    {(() => {
                      const activos = turnosPrecargados.filter((t: any) => t.estado === 'Activo').length;
                      console.log('🔍 Turnos activos calculados:', activos, 'de', turnosPrecargados.length, 'total');
                      return activos;
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {turnosPrecargados.filter((t: any) => t.estado === 'Activo').length} activos
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
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-600">Nombre de la Instalación</label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm sm:text-lg font-semibold">{instalacion.nombre}</p>
                                            {permissionsLoaded && can('instalaciones', 'update', effectivePermissions) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditField('nombre')}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-600">Cliente</label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm sm:text-lg">{instalacion.cliente_nombre}</p>
                      {permissionsLoaded && can('instalaciones', 'update', effectivePermissions) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditField('cliente')}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                      Dirección
                    </label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm sm:text-lg">{instalacion.direccion}</p>
                      {permissionsLoaded && can('instalaciones', 'update', effectivePermissions) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditField('direccion')}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-3 sm:space-y-4">
                                     <div>
                     <label className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1">
                       <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                       Teléfono de Contacto
                     </label>
                     <div className="flex items-center gap-2">
                       <p className="text-sm sm:text-lg">
                         {instalacion.telefono || 'No configurado'}
                       </p>
                       {permissionsLoaded && can('instalaciones', 'update', effectivePermissions) && (
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleEditField('telefono')}
                           className="h-6 w-6 p-0"
                         >
                           <Edit className="h-3 w-3" />
                         </Button>
                       )}
                     </div>
                   </div>
                                     <div>
                     <label className="text-xs sm:text-sm font-medium text-gray-600">Valor Turno Extra</label>
                     <div className="flex items-center gap-2">
                       <p className="text-sm sm:text-lg">
                         ${Number(instalacion.valor_turno_extra || 0).toLocaleString('es-CL')}
                       </p>
                       {permissionsLoaded && can('instalaciones', 'update', effectivePermissions) && (
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleEditField('valor_turno_extra')}
                           className="h-6 w-6 p-0"
                         >
                           <Edit className="h-3 w-3" />
                         </Button>
                       )}
                     </div>
                   </div>
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
              {geocodingData && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {geocodingData.comuna && (
                      <div>
                        <label className="text-xs sm:text-sm font-medium text-gray-600">Comuna</label>
                        <p className="text-sm sm:text-lg">{geocodingData.comuna}</p>
                      </div>
                    )}
                    {geocodingData.ciudad && (
                      <div>
                        <label className="text-xs sm:text-sm font-medium text-gray-600">Ciudad</label>
                        <p className="text-sm sm:text-lg">{geocodingData.ciudad}</p>
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
            effectivePermissions={effectivePermissions}
            turnosPrecargados={turnosPrecargados}
            ppcsPrecargados={ppcsPrecargados}
            guardiasPrecargados={guardiasPrecargados}
            rolesPrecargados={rolesPrecargados}
            onActualizarKPIs={actualizarKPIsLocalmente}
            onActualizarKPIsOptimista={actualizarKPIsOptimista}
          />
        </TabsContent>

        {/* Contenido de la pestaña Monitoreo */}
        <TabsContent value="monitoreo" className="mt-4 sm:mt-6">
          <MonitoreoInstalacion 
            instalacionId={instalacionId}
            instalacionNombre={instalacion.nombre}
            effectivePermissions={effectivePermissions}
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

      {/* Modal de edición individual */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  Editar {showEditModal === 'nombre' ? 'Nombre' : 
                          showEditModal === 'telefono' ? 'Teléfono' : 
                          showEditModal === 'valor_turno_extra' ? 'Valor Turno Extra' :
                          showEditModal === 'direccion' ? 'Dirección' :
                          showEditModal === 'cliente' ? 'Cliente' : 'Campo'}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {showEditModal === 'telefono' ? 'Ingresa el número de teléfono celular (9 dígitos)' :
                   showEditModal === 'valor_turno_extra' ? 'Ingresa el valor del turno extra' :
                   showEditModal === 'direccion' ? 'Ingresa la dirección de la instalación' :
                   showEditModal === 'cliente' ? 'Selecciona el cliente de la instalación' :
                   'Ingresa el nuevo valor'}
                </p>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {showEditModal === 'nombre' ? 'Nombre' : 
                   showEditModal === 'telefono' ? 'Teléfono' : 
                   showEditModal === 'valor_turno_extra' ? 'Valor' :
                   showEditModal === 'direccion' ? 'Dirección' :
                   showEditModal === 'cliente' ? 'Cliente' : 'Valor'}
                </label>
                {showEditModal === 'direccion' ? (
                  <GoogleMapsAutocomplete
                    value={editValue}
                    onChange={setEditValue}
                    placeholder="Av. La Dehesa 222"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    disabled={false}
                  />
                ) : showEditModal === 'cliente' ? (
                  <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Selecciona un cliente</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombre}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={showEditModal === 'telefono' ? 'tel' : 
                          showEditModal === 'valor_turno_extra' ? 'text' : 'text'}
                    value={editValue}
                    onChange={(e) => {
                      if (showEditModal === 'telefono') {
                        setEditValue(e.target.value.replace(/\D/g, '').slice(0, 9));
                      } else if (showEditModal === 'valor_turno_extra') {
                        // Solo permitir números y formatear con separadores de miles
                        const numericValue = e.target.value.replace(/[^\d]/g, '');
                        if (numericValue) {
                          const formattedValue = Number(numericValue).toLocaleString('es-CL');
                          setEditValue(formattedValue);
                        } else {
                          setEditValue('');
                        }
                      } else {
                        setEditValue(e.target.value);
                      }
                    }}
                    placeholder={showEditModal === 'telefono' ? '912345678' : 
                                showEditModal === 'valor_turno_extra' ? '35.000' : 'Nuevo valor'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    maxLength={showEditModal === 'telefono' ? 9 : undefined}
                    autoComplete="off"
                  />
                )}
                {showEditModal === 'telefono' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Solo números, máximo 9 dígitos
                  </p>
                )}
                {showEditModal === 'valor_turno_extra' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Solo números, se formateará automáticamente con separadores de miles
                  </p>
                )}
              </div>

              <div className="flex gap-2 sm:gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(null);
                    setEditValue('');
                  }}
                  className="px-3 sm:px-4 text-xs sm:text-sm"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={saveEdit}
                  disabled={savingEdit || !editValue.trim() || 
                           (showEditModal === 'telefono' && editValue.length !== 9) ||
                           (showEditModal === 'valor_turno_extra' && !editValue.trim())}
                  className="px-3 sm:px-4 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700"
                >
                  {savingEdit ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 