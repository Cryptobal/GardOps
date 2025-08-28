'use client';

import { Authorize, GuardButton, can } from '@/lib/authz-ui';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SafeSelect } from '@/components/ui/safe-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { Trash2, X, UserPlus, UserMinus, Search, ChevronDown, Users, Clock, Calendar, Target, ChevronRight, Plus, Minus } from 'lucide-react';
import { 
  getTurnosInstalacion, 
  getRolesServicio, 
  getPPCsActivosInstalacion, 
  getGuardiasDisponibles,
  getTiposPuesto,
  crearTurnoInstalacion,
  eliminarTurnoInstalacion,
  asignarGuardiaAPuesto,
  desasignarGuardiaDePuesto,
  eliminarPuestoDeTurno,
  getPuestosDeTurno,
  agregarPuesto
} from '@/lib/api/instalaciones';
import { SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AsignacionActivaModal } from '@/components/ui/asignacion-activa-modal';
import { GuardiaSelectWithSearch } from '@/components/ui/guardia-select-with-search';

interface TurnosInstalacionProps {
  instalacionId: string;
  effectivePermissions?: Record<string, string[]>;
  turnosPrecargados?: any[];
  ppcsPrecargados?: any[];
  guardiasPrecargados?: any[];
  rolesPrecargados?: any[];
  onActualizarKPIs?: (tipo: string, accion: string, datos?: any) => void;
  onActualizarKPIsOptimista?: (tipo: string, accion: string, datos?: any) => void;
}

interface FormData {
  rol_id: string;
  cantidad_guardias: number;
  tipo_puesto_id: string;
}

interface Puesto {
  id: string;
  nombre_puesto: string;
  es_ppc: boolean;
  guardia_id: string | null;
  guardia_nombre: string | null;
  creado_en: string;
}

// Función helper para generar identificadores únicos de puestos
const generarIdCortoPuesto = (puestoId: string) => {
  // Tomar los últimos 4 caracteres del UUID y convertirlos a mayúsculas
  return `P-${puestoId.slice(-4).toUpperCase()}`;
};

// Función para generar identificador por turno y posición
const generarIdPuestoTurno = (turnoIndex: number, puestoIndex: number, tipoPuesto: string) => {
  // Identificación por turno (A, B, C, etc.) + posición correlativa (1, 2, 3, 4)
  const turnoLetra = String.fromCharCode(65 + turnoIndex); // A, B, C, etc.
  return `${turnoLetra}${puestoIndex + 1}`;
};

export default function TurnosInstalacion({ 
  instalacionId, 
  effectivePermissions,
  turnosPrecargados = [],
  ppcsPrecargados = [],
  guardiasPrecargados = [],
  rolesPrecargados = [],
  onActualizarKPIs,
  onActualizarKPIsOptimista
}: TurnosInstalacionProps) {
  const { toast } = useToast();
  const router = useRouter();
  
  // Verificar que effectivePermissions esté definido
  const permissions = effectivePermissions || {};
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [turnos, setTurnos] = useState<any[]>([]);
  const [rolesServicio, setRolesServicio] = useState<any[]>([]);
  const [ppcs, setPpcs] = useState<any[]>([]);
  const [guardiasDisponibles, setGuardiasDisponibles] = useState<any[]>([]);
  const [tiposPuesto, setTiposPuesto] = useState<any[]>([]);
  const [puestosPorTurno, setPuestosPorTurno] = useState<Record<string, Puesto[]>>({});
  const [formData, setFormData] = useState<FormData>({
    rol_id: '',
    cantidad_guardias: 1,
    tipo_puesto_id: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para el modal de asignación activa
  const [showAsignacionModal, setShowAsignacionModal] = useState(false);
  const [asignacionActiva, setAsignacionActiva] = useState<any>(null);
  const [guardiaSeleccionado, setGuardiaSeleccionado] = useState<string>('');
  
  // Estado para controlar qué turnos están expandidos
  const [expandedTurnos, setExpandedTurnos] = useState<Set<string>>(new Set());
  

  
  // Función para alternar el estado expandido de un turno
  const toggleTurnoExpanded = (turnoId: string) => {
    setExpandedTurnos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(turnoId)) {
        newSet.delete(turnoId);
      } else {
        newSet.add(turnoId);
      }
      return newSet;
    });
  };

  const cerrarModalAsignacion = () => {
    setShowAsignacionModal(false);
    // Limpiar selección para que el selector no muestre el último valor
    setGuardiaSeleccionado('');
  };



  // Cargar datos
  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      
      // Siempre cargar datos frescos desde la API para evitar inconsistencias
      console.log('🔍 Cargando datos frescos desde la API...');
      
      // Cargar datos directamente desde el endpoint /completa con headers anti-caché
      const response = await fetch(`/api/instalaciones/${instalacionId}/completa`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Error al cargar datos completos');
      }
      
      const data = await response.json();
      const { turnos: turnosData, ppcs: ppcsData, guardias: guardiasData, roles: rolesData } = data.data;
      
      // Actualizar estados con datos frescos
      console.log('🔍 Actualizando estados con datos frescos:', {
        turnosData: turnosData.length,
        rolesData: rolesData.length,
        ppcsData: ppcsData.length,
        guardiasData: guardiasData.length
      });
      
      // Actualizar todos los estados de una vez
      setTurnos(turnosData);
      setRolesServicio(rolesData);
      setPpcs(ppcsData);
      setGuardiasDisponibles(guardiasData);
      
      // Cargar tipos de puesto
      const tiposData = await getTiposPuesto();
      setTiposPuesto(tiposData);
      
      // Usar directamente los puestos que vienen en los datos frescos
      const puestosData: Record<string, Puesto[]> = {};
      
      // Si no hay turnos, limpiar completamente los puestos
      if (!turnosData || turnosData.length === 0) {
        console.log('🔍 No hay turnos, limpiando todos los puestos...');
        setPuestosPorTurno({});
      } else {
        for (const turno of turnosData) {
          if (turno.puestos && Array.isArray(turno.puestos)) {
            puestosData[turno.id] = turno.puestos.map((puesto: any) => ({
              id: puesto.id,
              nombre_puesto: puesto.nombre_puesto,
              es_ppc: puesto.es_ppc,
              guardia_id: puesto.guardia_asignado_id,
              guardia_nombre: puesto.guardia_nombre,
              creado_en: new Date().toISOString()
            }));
          } else {
            puestosData[turno.id] = [];
          }
        }
        
        console.log('🔍 Puestos procesados:', Object.keys(puestosData).map(key => `${key}: ${puestosData[key].length} puestos`));
        setPuestosPorTurno(puestosData);
      }
      
      console.log('🔍 Datos frescos cargados:', {
        turnos: turnosData.length,
        roles: rolesData.length,
        ppcs: ppcsData.length,
        guardias: guardiasData.length
      });
      
      setError('');
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error("Error cargando datos de la instalación");
    } finally {
      setLoading(false);
    }
  }, [instalacionId, toast]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Crear nuevo turno
  const handleCrearTurno = async () => {
    if (!formData.rol_id || !formData.tipo_puesto_id) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    try {
      setSubmitting(true);
      await crearTurnoInstalacion({
        instalacion_id: instalacionId,
        rol_servicio_id: formData.rol_id,
        cantidad_guardias: formData.cantidad_guardias,
        tipo_puesto_id: formData.tipo_puesto_id
      });
      toast.success("Turno creado correctamente");

      // Limpiar formulario
      setFormData({
        rol_id: '',
        cantidad_guardias: 1,
        tipo_puesto_id: ''
      });
      
      // Recargar datos frescos inmediatamente
      await cargarDatos();
      
      // Actualizar KPIs de forma optimizada
      await actualizarKPIsOptimizado();
    } catch (error) {
      console.error('Error creando turno:', error);
      toast.error("No se pudo crear el turno");
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar turno
  const handleEliminarTurno = async (turnoId: string) => {
    try {
      await eliminarTurnoInstalacion(instalacionId, turnoId);
      toast.success("Turno eliminado correctamente");
      
      // Recargar datos frescos inmediatamente
      await cargarDatos();
      
      // Actualizar KPIs de forma optimizada
      await actualizarKPIsOptimizado();
    } catch (error) {
      console.error('Error eliminando turno:', error);
      toast.error("No se pudo eliminar el turno");
    }
  };

  // Eliminar todos los turnos
  const handleEliminarTodosTurnos = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar TODOS los turnos? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      // Eliminar todos los turnos uno por uno
      for (const turno of turnosFiltrados) {
        try {
          await eliminarTurnoInstalacion(instalacionId, turno.id);
          console.log(`✅ Turno ${turno.id} eliminado`);
        } catch (error) {
          console.error(`❌ Error eliminando turno ${turno.id}:`, error);
        }
      }
      
      toast.success("Todos los turnos eliminados correctamente");
      
      // Limpiar estados locales inmediatamente antes de recargar
      setTurnos([]);
      setPuestosPorTurno({});
      setPpcs([]);
      
      // Esperar un poco y luego recargar datos frescos
      setTimeout(async () => {
        await cargarDatos();
        // Actualizar KPIs de forma optimizada
        await actualizarKPIsOptimizado();
      }, 500);
    } catch (error) {
      console.error('Error eliminando turnos:', error);
      toast.error("No se pudieron eliminar todos los turnos");
    }
  };

  // Función para actualizar KPIs de forma optimizada
  const actualizarKPIsOptimizado = async () => {
    console.log('🔄 [KPIs] Actualizando KPIs de forma optimizada...');
    
    try {
      // Obtener datos frescos del endpoint
      const response = await fetch(`/api/instalaciones/${instalacionId}/completa`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const datos = await response.json();
        
        // Actualizar KPIs localmente sin recargar página
        if (onActualizarKPIs) {
          onActualizarKPIs('turnos', 'actualizar', datos.data);
        }
        
        console.log('✅ [KPIs] KPIs actualizados sin recargar página');
      }
    } catch (error) {
      console.error('❌ [KPIs] Error actualizando KPIs:', error);
    }
  };

  // Asignar guardia a un puesto específico
  const handleAsignarGuardia = async (turnoId: string, puestoId: string, guardiaId: string) => {
    try {
      // Actualización optimista inmediata
      if (onActualizarKPIsOptimista) {
        onActualizarKPIsOptimista('guardia', 'asignar');
      }
      
      await asignarGuardiaAPuesto(instalacionId, turnoId, puestoId, guardiaId);
      toast.success("Guardia asignado correctamente");
      
      // Recargar datos frescos inmediatamente
      await cargarDatos();
      
      // Actualizar KPIs de forma optimizada
      await actualizarKPIsOptimizado();
    } catch (error: any) {
      console.error('Error asignando guardia:', error);
      
      // Si el error es por asignación activa, mostrar modal con detalles
      if (error.message?.includes('asignación activa') && error.asignacion_activa) {
        setAsignacionActiva(error.asignacion_activa);
        setGuardiaSeleccionado(guardiasDisponibles.find(g => g.id === guardiaId)?.nombre || '');
        setShowAsignacionModal(true);
      } else {
        toast.error("No se pudo asignar el guardia");
      }
    }
  };

  // Desasignar guardia de un puesto específico
  const handleDesasignarGuardia = async (turnoId: string, puestoId: string) => {
    try {
      // Actualización optimista inmediata
      if (onActualizarKPIsOptimista) {
        onActualizarKPIsOptimista('guardia', 'desasignar');
      }
      
      await desasignarGuardiaDePuesto(instalacionId, turnoId, puestoId);
      toast.success("Guardia desasignado y puestos reordenados correctamente");
      
      // Recargar datos frescos inmediatamente
      await cargarDatos();
      
      // Actualizar KPIs de forma optimizada
      await actualizarKPIsOptimizado();
    } catch (error: any) {
      console.error('Error desasignando guardia:', error);
      toast.error("No se pudo desasignar el guardia");
    }
  };

  const handleAgregarPuesto = async (turnoId: string) => {
    try {
      // Actualización optimista inmediata
      if (onActualizarKPIsOptimista) {
        onActualizarKPIsOptimista('puesto', 'agregar');
      }
      
      // Usar el primer tipo de puesto disponible como default
      const tipoPuestoId = tiposPuesto.length > 0 ? tiposPuesto[0].id : null;
      
      if (!tipoPuestoId) {
        toast.error("No hay tipos de puesto disponibles");
        return;
      }

      await agregarPuesto(instalacionId, turnoId, tipoPuestoId);
      toast.success("Puesto agregado correctamente");
      
      // Recargar datos frescos inmediatamente
      await cargarDatos();
      
      // Actualizar KPIs de forma optimizada
      await actualizarKPIsOptimizado();
    } catch (error: any) {
      console.error('Error agregando puesto:', error);
      toast.error("No se pudo agregar el puesto");
    }
  };

  // Eliminar puesto de un turno
  const handleEliminarPuesto = async (turnoId: string, puestoId: string) => {
    try {
      // Actualización optimista inmediata
      if (onActualizarKPIsOptimista) {
        onActualizarKPIsOptimista('puesto', 'eliminar');
      }
      
      // Extraer solo el rol_id del turnoId compuesto (formato: rol_id_tipo_puesto_id)
      const rolId = turnoId.split('_')[0];
      console.log('🔍 Eliminando puesto:', { turnoId, rolId, puestoId });
      
      await eliminarPuestoDeTurno(instalacionId, rolId, puestoId);
      toast.success("Puesto eliminado correctamente");
      
      // Recargar datos frescos inmediatamente
      await cargarDatos();
      
      // Actualizar KPIs de forma optimizada
      await actualizarKPIsOptimizado();
    } catch (error) {
      console.error('Error eliminando puesto:', error);
      toast.error("No se pudo eliminar el puesto");
    }
  };

  // Obtener tipo de puesto por ID
  const getTipoPuestoById = (tipoId: string) => {
    return tiposPuesto.find(tipo => tipo.id === tipoId);
  };

  // Filtrar y ordenar turnos
  const turnosFiltrados = turnos
    .filter(turno => {
      const searchLower = searchTerm.toLowerCase();
      
      // Filtrar por estado si el switch está desactivado
      if (turno.estado !== 'Activo') {
        return false;
      }
      
      // Buscar en múltiples campos posibles
      const nombreMatch = turno.nombre?.toLowerCase().includes(searchLower);
      const rolNombreMatch = turno.rol_nombre?.toLowerCase().includes(searchLower);
      const rolServicioNombreMatch = turno.rol_servicio_nombre?.toLowerCase().includes(searchLower);
      const rolIdMatch = turno.rol_id?.toLowerCase().includes(searchLower);
      const cantidadMatch = turno.cantidad_guardias?.toString().includes(searchLower);
      const tipoPuestoMatch = turno.tipo_puesto_nombre?.toLowerCase().includes(searchLower);
      
      // Si no hay término de búsqueda, mostrar todos los que pasen el filtro de estado
      if (!searchTerm.trim()) {
        return true;
      }
      
      return nombreMatch || rolNombreMatch || rolServicioNombreMatch || rolIdMatch || cantidadMatch || tipoPuestoMatch;
    })
    .sort((a, b) => {
      // Ordenar primero por tipo de puesto (Portería Principal, Portería Secundaria, CCTV)
      const tipoA = a.tipo_puesto_nombre || '';
      const tipoB = b.tipo_puesto_nombre || '';
      
             if (tipoA !== tipoB) {
         // Orden específico: Portería Principal, Portería Secundaria, CCTV, otros
         const orden: Record<string, number> = {
           'Portería Principal': 1,
           'Portería Secundaria': 2,
           'CCTV': 3
         };
         const ordenA = orden[tipoA] || 999;
         const ordenB = orden[tipoB] || 999;
         return ordenA - ordenB;
       }
      
      // Si tienen el mismo tipo, ordenar por fecha de creación (más reciente primero)
      const fechaA = new Date(a.created_at || 0).getTime();
      const fechaB = new Date(b.created_at || 0).getTime();
      return fechaB - fechaA;
    });

  // Calcular estadísticas usando datos reales de puestos
  const turnosActivos = turnos.filter(t => t.estado === 'Activo');
  const totalTurnos = turnos.length;
  
  // Calcular estadísticas reales basadas en los puestos
  let totalGuardias = 0;
  let totalPuestos = 0;
  let totalPPCs = 0;
  
  for (const turno of turnosActivos) {
    const puestosDelTurno = puestosPorTurno[turno.id] || [];
    totalPuestos += puestosDelTurno.length;
    
    for (const puesto of puestosDelTurno) {
      if (puesto.guardia_id) {
        totalGuardias++;
      } else if (puesto.es_ppc) {
        totalPPCs++;
      }
    }
  }
  
  console.log('🔍 Estadísticas calculadas:', {
    totalTurnos,
    totalPuestos,
    totalGuardias,
    totalPPCs,
    puestosPorTurno: Object.keys(puestosPorTurno).map(key => `${key}: ${puestosPorTurno[key].length} puestos`)
  });

  // Debug: ver qué datos se van a renderizar
  console.log('🔍 Estado actual:', {
    turnos: turnos.length,
    puestosVacantes: totalPPCs,
    puestosPorTurno: Object.keys(puestosPorTurno).map(key => `${key}: ${puestosPorTurno[key].length} puestos`)
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formulario para crear nuevo turno */}
      <Authorize resource="instalaciones" action="create" eff={effectivePermissions || {}}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Crear Nuevo Turno
            </CardTitle>
          </CardHeader>
          <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label className="text-sm font-medium mb-2 block">Turno</label>
              <SafeSelect
                  value={formData.rol_id}
                  onValueChange={(value: string) => setFormData(prev => ({ ...prev, rol_id: value }))}
                placeholder="Seleccionar turno"
              >
                  {rolesServicio.map((rol) => (
                      <SelectItem key={rol.id} value={rol.id}>
                        {rol.nombre}
                    </SelectItem>
                  ))}
              </SafeSelect>
            </div>

            <div>
                <label className="text-sm font-medium mb-2 block">Cantidad de Guardias</label>
              <SafeSelect
                value={formData.cantidad_guardias.toString()}
                  onValueChange={(value: string) => setFormData(prev => ({ ...prev, cantidad_guardias: parseInt(value) || 1 }))}
                placeholder="Seleccionar cantidad"
              >
                  {[...Array(20)].map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {i + 1}
                    </SelectItem>
                  ))}
                </SafeSelect>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Tipo de Puesto</label>
                <SafeSelect
                  value={formData.tipo_puesto_id}
                  onValueChange={(value: string) => setFormData(prev => ({ ...prev, tipo_puesto_id: value }))}
                  placeholder="Seleccionar tipo"
                >
                  {tiposPuesto.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.emoji} {tipo.nombre}
                    </SelectItem>
                  ))}
              </SafeSelect>
              </div>
            </div>

            <div className="mt-4">
              <Button 
                  onClick={handleCrearTurno}
                disabled={submitting || !formData.rol_id || !formData.tipo_puesto_id}
                  className="w-full"
                >
                {submitting ? 'Creando...' : 'Crear Turno'}
              </Button>
          </div>
        </CardContent>
      </Card>
      </Authorize>

      {/* Lista de turnos existentes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Turnos Existentes
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar turnos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              {/* Botón para eliminar todos los turnos - ELIMINADO */}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {turnosFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay turnos creados</p>
          </div>
        ) : (
            <div className="space-y-4">
              {turnosFiltrados.map((turno) => {
                const puestos = puestosPorTurno[turno.id] || [];
                const puestosVacantes = puestos.filter(p => p.es_ppc).length;
                const puestosAsignados = puestos.filter(p => !p.es_ppc && p.guardia_id).length;
                

            
            return (
                  <Card key={turno.id} className={`border-l-4 ${turno.estado === 'Activo' ? 'border-l-blue-500' : 'border-l-gray-400'}`}>
                    <CardContent className="p-3 sm:p-4">
                      {/* Header del turno - siempre visible */}
                      <div className="flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleTurnoExpanded(turno.id)}
                              className="p-1 h-auto hover:bg-gray-100"
                            >
                              {expandedTurnos.has(turno.id) ? (
                                <ChevronDown className="h-4 w-4 text-blue-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                              )}
                            </Button>
                            <h3 className="text-base font-semibold truncate cursor-pointer" onClick={() => toggleTurnoExpanded(turno.id)}>
                              {turno.rol_servicio?.nombre || turno.rol_nombre || turno.rol_servicio_nombre}
                            </h3>
                            {turno.estado !== 'Activo' && (
                              <Badge variant="secondary" className="text-xs ml-2">
                                Inactivo
                              </Badge>
                            )}
                          </div>
                          
                          {/* Información compacta del turno */}
                          <div className="text-sm text-gray-600 space-y-0.5">
                            {/* Tipo de puesto */}
                            {turno.tipo_puesto_nombre && (
                              <p className="flex items-center gap-1">
                                <span>{turno.tipo_puesto_emoji || '📍'}</span>
                                <span className="truncate">{turno.tipo_puesto_nombre}</span>
                              </p>
                            )}
                            
                            {/* Horario compacto */}
                            {turno.rol_servicio && (
                              <p className="text-xs text-blue-600">
                                {turno.rol_servicio.dias_trabajo}x{turno.rol_servicio.dias_descanso}x{turno.rol_servicio.horas_turno} • 
                                {turno.rol_servicio.hora_inicio}–{turno.rol_servicio.hora_termino}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Información lateral */}
                        <div className="flex items-center gap-2 ml-4">
                          {/* Indicador de puestos */}
                          <div className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {puestosAsignados}/{puestos.length}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">puestos</p>
                          </div>
                          
                          {/* Botón eliminar turno completo - ELIMINADO */}
                          
                          {/* Fecha de creación */}
                          {turno.created_at && (
                            <div className="text-right hidden sm:block">
                              <p className="text-xs text-gray-500">Fecha de creación</p>
                              <p className="text-xs text-gray-600">
                                {new Date(turno.created_at).toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Lista de puestos - solo visible cuando expandido */}
                      {expandedTurnos.has(turno.id) && (
                        <div className="space-y-3 mt-4 pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-sm">Puestos del Turno</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAgregarPuesto(turno.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Agregar Puesto
                              </Button>
                            </div>
                          </div>

                        {puestos.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">No hay puestos creados</p>
                        ) : (
                          <div className="grid gap-3">
                            {puestos.map((puesto, puestoIndex) => (
                              <div key={puesto.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200">
                                        {generarIdPuestoTurno(turnosFiltrados.findIndex(t => t.id === turno.id), puestoIndex, turno.tipo_puesto_nombre || '')}
                                      </Badge>
                                      <p className="font-medium text-sm">
                                        {turno.tipo_puesto_nombre || 'Puesto'}
                                      </p>
                                    </div>
                                    {puesto.guardia_nombre ? (
                                      <p className="text-sm text-green-600">
                                        👤 {puesto.guardia_nombre}
                                      </p>
                                    ) : (
                                      <p className="text-sm text-orange-600">
                                        ⚠️ Puesto vacante
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {puesto.es_ppc ? (
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                                      <GuardiaSelectWithSearch
                                        instalacionId={instalacionId}
                                        excludeIds={puestos.filter(p=>!p.es_ppc && p.guardia_id).map(p=>p.guardia_id!).filter(Boolean)}
                                        onSelect={(guardiaId: string) => {
                                          if (guardiaId) {
                                            handleAsignarGuardia(turno.id, puesto.id, guardiaId);
                                          }
                                        }}
                                        placeholder="Asignar guardia"
                                        className="w-full sm:min-w-[300px] sm:max-w-md"
                                      />
                                    </div>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDesasignarGuardia(turno.id, puesto.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <UserMinus className="h-3 w-3 mr-1" />
                                      Desasignar
                                    </Button>
                                  )}

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEliminarPuesto(turno.id, puesto.id)}
                                    className="text-red-600 hover:text-red-700"
                                    disabled={!puesto.es_ppc && puesto.guardia_id !== null}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
                  </div>
                )}
        </CardContent>
              </Card>

      {/* Modal de asignación activa */}
      {showAsignacionModal && asignacionActiva && (
        <AsignacionActivaModal
          isOpen={showAsignacionModal}
          onClose={cerrarModalAsignacion}
          asignacion={asignacionActiva}
          guardiaNombre={guardiaSeleccionado}
        />
      )}
    </div>
  );
} 