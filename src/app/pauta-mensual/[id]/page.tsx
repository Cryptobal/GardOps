"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { 
  Calendar, 
  Building2, 
  Users,
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Edit,
  Eye,
  Database,
  Clock,
  ExternalLink,
  Plus,
  FileText
} from "lucide-react";
import { obtenerPautaMensual, guardarPautaMensual, crearPautaMensualAutomatica } from "../../../lib/api/pauta-mensual";
import { useToast } from "../../../hooks/use-toast";
import PautaTable from "../components/PautaTable";

interface Guardia {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  nombre_completo: string;
  tipo?: 'asignado' | 'ppc';
  rol_servicio?: {
    nombre: string;
    dias_trabajo: number;
    dias_descanso: number;
    horas_turno: number;
    hora_inicio: string;
    hora_termino: string;
  };
}

interface PPC {
  id: string;
  nombre: string;
  estado: string;
  cantidad_faltante?: number;
  rol_servicio?: {
    nombre: string;
    dias_trabajo: number;
    dias_descanso: number;
    horas_turno: number;
    hora_inicio: string;
    hora_termino: string;
  };
}

interface InstalacionInfo {
  id: string;
  nombre: string;
  direccion: string;
  cliente_nombre?: string;
  guardias: Guardia[];
  ppcs: PPC[];
}

interface PautaGuardia {
  id: string;
  nombre: string;
  nombre_puesto: string;
  patron_turno: string;
  dias: string[];
  tipo?: 'asignado' | 'ppc' | 'sin_asignar';
  es_ppc?: boolean;
  guardia_id?: string;
  rol_nombre?: string;
}

interface DiaSemana {
  dia: number;
  diaSemana: string;
  esFeriado: boolean;
}

export default function PautaMensualUnificadaPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  
  const instalacionId = params.id as string;
  const mes = parseInt(searchParams.get('mes') || '1');
  const anio = parseInt(searchParams.get('anio') || new Date().getFullYear().toString());

  const [instalacion, setInstalacion] = useState<InstalacionInfo | null>(null);
  const [pautaData, setPautaData] = useState<PautaGuardia[]>([]);
  const [pautaDataOriginal, setPautaDataOriginal] = useState<PautaGuardia[]>([]);
  const [diasDelMes, setDiasDelMes] = useState<number[]>([]);
  const [diasSemana, setDiasSemana] = useState<DiaSemana[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [diasGuardados, setDiasGuardados] = useState<Set<string>>(new Set());
  const [pautaExiste, setPautaExiste] = useState(false);
  const [generando, setGenerando] = useState(false);

  // Seguimiento del estado de edición
  useEffect(() => {
    if (editando) {
      console.log('📝 Modo edición activado');
    }
  }, [editando]);

  // Función para verificar qué días están guardados en la BD
  const actualizarDiasGuardados = useCallback(() => {
    const diasConDatos = new Set<string>();
    pautaData.forEach(guardia => {
      guardia.dias.forEach((estado, diaIndex) => {
        if (estado && estado !== 'L' && estado !== '') {
          diasConDatos.add(`${guardia.nombre}-${diaIndex + 1}`);
        }
      });
    });
    setDiasGuardados(diasConDatos);
    console.log('🔍 Días guardados actualizados:', Array.from(diasConDatos));
  }, [pautaData]);

  // Actualizar días guardados cuando cambia la pauta
  useEffect(() => {
    actualizarDiasGuardados();
  }, [pautaData, actualizarDiasGuardados]);

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        console.log('🔄 Cargando datos iniciales...');
        
        // Cargar información de la instalación
        const instalacionResponse = await fetch(`/api/instalaciones/${instalacionId}/completa`);
        let instalacionInfo: InstalacionInfo | null = null;
        
        if (instalacionResponse.ok) {
          const responseData = await instalacionResponse.json();
          console.log('📥 Datos de instalación recibidos:', responseData);
          
          if (responseData.success && responseData.data) {
            instalacionInfo = {
              id: responseData.data.instalacion.id,
              nombre: responseData.data.instalacion.nombre,
              direccion: responseData.data.instalacion.direccion,
              cliente_nombre: responseData.data.instalacion.cliente_nombre,
              guardias: responseData.data.guardias || [],
              ppcs: responseData.data.ppcs || []
            };
            
            console.log('🏢 Información de instalación procesada:', {
              nombre: instalacionInfo.nombre,
              guardias: instalacionInfo.guardias.length,
              ppcs: instalacionInfo.ppcs.length
            });
            
            setInstalacion(instalacionInfo);
          }
        }

        // Intentar cargar pauta existente
        try {
          const pautaResponse = await obtenerPautaMensual(instalacionId, anio, mes);
          
          if (pautaResponse && instalacionInfo) {
            setPautaExiste(true);
            
            const diasDelMesArray = Array.from(
              { length: new Date(anio, mes, 0).getDate() }, 
              (_, i) => i + 1
            );
            setDiasDelMes(diasDelMesArray);

            // Función para obtener feriados de Chile
            const getFeriadosChile = (year: number, month: number): number[] => {
              const feriados = {
                2024: {
                  1: [1], 2: [], 3: [29], 4: [1], 5: [1], 6: [7],
                  7: [16], 8: [15], 9: [18, 19], 10: [12], 11: [1], 12: [8, 25]
                },
                2025: {
                  1: [1], 2: [], 3: [18, 19], 4: [], 5: [1], 6: [7],
                  7: [16], 8: [15], 9: [18, 19], 10: [12], 11: [1], 12: [8, 25]
                }
              };
              
              return feriados[year as keyof typeof feriados]?.[month as keyof typeof feriados[2024]] || [];
            };

            const feriadosChile = getFeriadosChile(anio, mes);
            const diasSemanaArray = diasDelMesArray.map(dia => {
              const fecha = new Date(anio, mes - 1, dia);
              const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
              const diaSemana = diasSemana[fecha.getDay()];
              const esFeriado = feriadosChile.includes(dia);
              
              return { dia, diaSemana, esFeriado };
            });
            setDiasSemana(diasSemanaArray);

            // Transformar la pauta al formato esperado
            const pautaTransformada = pautaResponse.pauta.map((guardiaPauta: any) => {
              // Buscar el puesto operativo correspondiente
              const puestoOperativo = instalacionInfo.guardias.find(g => g.id === guardiaPauta.id);
              
              // Generar el turno completo basado en el rol del puesto
              let turnoCompleto = guardiaPauta.nombre_puesto; // fallback
              if (puestoOperativo?.rol_servicio) {
                const { dias_trabajo, dias_descanso, horas_turno, hora_inicio, hora_termino } = puestoOperativo.rol_servicio;
                turnoCompleto = `Día ${dias_trabajo}x${dias_descanso}x${horas_turno} / ${hora_inicio} ${hora_termino}`;
              }
              
              return {
                id: guardiaPauta.id,
                nombre: guardiaPauta.nombre,
                nombre_puesto: guardiaPauta.nombre_puesto,
                patron_turno: guardiaPauta.patron_turno,
                dias: guardiaPauta.dias,
                tipo: puestoOperativo?.tipo,
                es_ppc: guardiaPauta.es_ppc,
                guardia_id: guardiaPauta.guardia_id,
                rol_nombre: turnoCompleto
              };
            });
            
            setPautaData(pautaTransformada);
            setPautaDataOriginal(JSON.parse(JSON.stringify(pautaTransformada)));
            console.log('✅ Pauta existente cargada');
          }
        } catch (error) {
          console.log('ℹ️ No existe pauta, se creará una nueva');
          setPautaExiste(false);
          
          // Crear estructura inicial sin pauta - se creará automáticamente al guardar
          if (instalacionInfo) {
            const diasEnMes = new Date(anio, mes - 1, 0).getDate();
            const diasArray = Array.from({ length: diasEnMes }, (_, i) => i + 1);
            setDiasDelMes(diasArray);

            const diasSemanaArray: DiaSemana[] = diasArray.map(dia => {
              const fecha = new Date(anio, mes - 1, dia);
              const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'short' });
              return { dia, diaSemana, esFeriado: false };
            });
            setDiasSemana(diasSemanaArray);

            // Crear estructura inicial con días vacíos - se llenará automáticamente
            const pautaInicial: PautaGuardia[] = [];
            
            // Procesar todos los puestos (guardias y PPCs)
            instalacionInfo.guardias.forEach((puesto: any) => {
              // Generar el turno completo basado en el rol del puesto
              let turnoCompleto = puesto.nombre_completo; // fallback
              if (puesto.rol_servicio) {
                const { dias_trabajo, dias_descanso, horas_turno, hora_inicio, hora_termino } = puesto.rol_servicio;
                turnoCompleto = `Día ${dias_trabajo}x${dias_descanso}x${horas_turno} / ${hora_inicio} ${hora_termino}`;
              }
              
              const nombreMostrar = puesto.tipo === 'ppc' 
                ? `${puesto.nombre_completo} (PPC)` 
                : puesto.nombre_completo;
              
              pautaInicial.push({
                id: puesto.id,
                nombre: nombreMostrar,
                nombre_puesto: puesto.nombre_completo,
                patron_turno: puesto.rol_servicio ? `${puesto.rol_servicio.dias_trabajo}x${puesto.rol_servicio.dias_descanso}` : '4x4',
                dias: Array.from({ length: diasEnMes }, () => ''), // Días vacíos por defecto
                tipo: puesto.tipo,
                es_ppc: puesto.tipo === 'ppc',
                guardia_id: puesto.id,
                rol_nombre: turnoCompleto
              });
            });
            
            setPautaData(pautaInicial);
            setPautaDataOriginal(JSON.parse(JSON.stringify(pautaInicial)));
          }
        }

      } catch (error) {
        console.error('Error cargando datos:', error);
        toast.error('Error', 'No se pudo cargar la información de la pauta mensual');
      } finally {
        setLoading(false);
      }
    };

    if (instalacionId) {
      cargarDatosIniciales();
    }
  }, [instalacionId, anio, mes]);

  const generarPauta = async () => {
    if (!instalacion) return;

    setGenerando(true);
    try {
      const response = await crearPautaMensualAutomatica({
        instalacion_id: instalacionId,
        anio,
        mes
      });
      
      if (response.success) {
        toast.success('Pauta creada', 'La pauta mensual se ha creado exitosamente');
        setPautaExiste(true);
        
        // Recargar la página para mostrar la pauta creada
        window.location.reload();
      } else {
        toast.error('Error', response.error || 'Error al crear la pauta mensual');
      }
    } catch (error: any) {
      console.error('❌ Error generando pauta:', error);
      toast.error('Error', error.message || 'Error al generar la pauta mensual');
    } finally {
      setGenerando(false);
    }
  };

  const guardarPauta = async () => {
    if (!pautaData.length) return;

    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    setGuardando(true);
    try {
      console.log(`[${timestamp}] 🚀 Iniciando guardado de pauta`);
      
      // Preparar datos para el nuevo formato de guardado
      const actualizaciones = [];
      
      for (const guardia of pautaData) {
        for (let diaIndex = 0; diaIndex < guardia.dias.length; diaIndex++) {
          const estado = guardia.dias[diaIndex];
          
          // CAMBIO: Enviar todos los días, incluso los vacíos para limpiarlos
          let estadoDB = null; // null significa eliminar el registro
          if (estado === 'T') {
            estadoDB = 'T'; // CORREGIDO: Guardar como 'T' para que aparezca en pauta diaria
          } else if (estado === 'L') {
            estadoDB = 'libre';
          }
          // Para días vacíos, estadoDB se mantiene como null
          
          actualizaciones.push({
            puesto_id: guardia.id, // Para PPCs y guardias, usar el ID del puesto
            guardia_id: guardia.es_ppc ? null : (guardia.guardia_id || guardia.id), // null para PPCs
            anio: parseInt(anio.toString()),
            mes: parseInt(mes.toString()),
            dia: diaIndex + 1,
            estado: estadoDB // Puede ser 'trabajado', 'libre', o null (para eliminar)
          });
        }
      }

      const response = await fetch('/api/pauta-mensual/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instalacion_id: instalacionId,
          anio: parseInt(anio.toString()),
          mes: parseInt(mes.toString()),
          actualizaciones: actualizaciones
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar la pauta');
      }

      const result = await response.json();
      console.log(`[${timestamp}] ✅ Pauta guardada exitosamente:`, result);

      toast.success('Pauta guardada', 'Los cambios se han guardado exitosamente');
      setEditando(false);
      actualizarDiasGuardados();

      // Resumen final en consola
      console.log(`[${timestamp}] 📊 Resumen guardado:`, {
        total_enviados: actualizaciones.length,
        total_guardados: result.total_guardados || 0,
        total_eliminados: result.total_eliminados || 0,
        errores: result.errores?.length || 0
      });

    } catch (error) {
      console.error('❌ Error guardando pauta:', error);
      toast.error('Error al guardar', error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setGuardando(false);
    }
  };

  const volver = () => {
    router.push(`/pauta-mensual?mes=${mes}&anio=${anio}`);
  };

  const actualizarPauta = (guardiaIndex: number, diaIndex: number, nuevoEstado: string) => {
    if (!editando) return;
    
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🔄 actualizarPauta:`, { guardiaIndex, diaIndex, nuevoEstado });
    
    // Solo permitir estados T y L
    if (nuevoEstado !== 'T' && nuevoEstado !== 'L') {
      console.log('🚫 Estado no permitido:', nuevoEstado);
      return;
    }
    
    const nuevaPautaData = [...pautaData];
    nuevaPautaData[guardiaIndex].dias[diaIndex] = nuevoEstado;
    setPautaData(nuevaPautaData);
  };

  const eliminarGuardia = (guardiaIndex: number) => {
    const nuevaPautaData = [...pautaData];
    nuevaPautaData[guardiaIndex].dias = nuevaPautaData[guardiaIndex].dias.map(() => "");
    setPautaData(nuevaPautaData);
  };

  // Calcular estadísticas de la pauta
  const estadisticasPauta = () => {
    if (!pautaData.length) return null;
    
    const totalDias = pautaData[0]?.dias?.length || 0;
    const totalGuardias = pautaData.length;
    const diasConAsignaciones = new Set<string>();
    let totalAsignaciones = 0;
    
    pautaData.forEach(guardia => {
      guardia.dias.forEach((estado, diaIndex) => {
        if (estado && estado !== 'L' && estado !== '') {
          diasConAsignaciones.add(`${diaIndex + 1}`);
          totalAsignaciones++;
        }
      });
    });
    
    return {
      totalDias,
      totalGuardias,
      diasConAsignaciones: diasConAsignaciones.size,
      totalAsignaciones,
      porcentajeCobertura: totalDias > 0 ? Math.round((diasConAsignaciones.size / totalDias) * 100) : 0
    };
  };

  const stats = estadisticasPauta();

  if (loading) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-sm">Cargando pauta mensual...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!instalacion || !pautaData.length) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Error</h3>
            <p className="text-sm text-muted-foreground">
              No se pudo cargar la información de la pauta mensual.
            </p>
            <Button onClick={volver} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Button variant="outline" size="sm" onClick={volver} className="flex-shrink-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Volver</span>
          </Button>
          <div className={`p-2 sm:p-3 rounded-full ${
            pautaExiste 
              ? "bg-green-100 dark:bg-green-900/20" 
              : "bg-orange-100 dark:bg-orange-900/20"
          }`}>
            <Calendar className={`h-5 w-5 sm:h-6 sm:w-6 ${
              pautaExiste 
                ? "text-green-600 dark:text-green-400" 
                : "text-orange-600 dark:text-orange-400"
            }`} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold truncate">
              {pautaExiste ? "Ver Pauta Mensual" : "Crear Pauta Mensual"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              <Link 
                href={`/instalaciones/${instalacion.id}`}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline flex items-center gap-1"
              >
                {instalacion.nombre}
                <ExternalLink className="h-3 w-3" />
              </Link>
              {" - "}{mes}/{anio}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
          {pautaExiste ? (
            <>
              {!editando ? (
                <Button onClick={() => setEditando(true)} className="w-full sm:w-auto">
                  <Edit className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Editar Pauta</span>
                  <span className="sm:hidden">Editar</span>
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => {
                    setEditando(false);
                    setPautaData(JSON.parse(JSON.stringify(pautaDataOriginal)));
                  }} className="w-full sm:w-auto">
                    Cancelar
                  </Button>
                  <Button onClick={guardarPauta} disabled={guardando} className="w-full sm:w-auto">
                    {guardando ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span className="hidden sm:inline">Guardando...</span>
                        <span className="sm:hidden">Guardando</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Guardar</span>
                        <span className="sm:hidden">Guardar</span>
                      </>
                    )}
                  </Button>
                </>
              )}
            </>
          ) : (
            <Button 
              onClick={generarPauta} 
              disabled={generando || pautaData.length === 0}
              className="w-full sm:w-auto"
            >
              {generando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span className="hidden sm:inline">Generando...</span>
                  <span className="sm:hidden">Generando</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Generar Pauta</span>
                  <span className="sm:hidden">Generar</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Información de la instalación */}
      <div className="flex flex-col lg:flex-row gap-4 mb-4 sm:mb-6">
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
              <Link 
                href={`/instalaciones/${instalacion.id}`}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline flex items-center gap-1 truncate"
              >
                {instalacion?.nombre}
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </Link>
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {instalacion?.direccion}
            </p>
            {instalacion?.cliente_nombre && (
              <p className="text-xs text-muted-foreground truncate">
                Cliente: {instalacion.cliente_nombre}
              </p>
            )}
          </CardHeader>
        </Card>

        {/* Estadísticas de la pauta */}
        {stats && (
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Database className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Estadísticas de Pauta</span>
                <span className="sm:hidden">Estadísticas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
                  <span className="truncate">{stats.totalGuardias} guardias</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                  <span className="truncate">{stats.totalDias} días</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500 flex-shrink-0" />
                  <span className="truncate">{stats.diasConAsignaciones} asignados</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500 flex-shrink-0" />
                  <span className="truncate">{stats.porcentajeCobertura}% cobertura</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Estado de la pauta */}
      {!pautaExiste && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm sm:text-base">Pauta no creada</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Esta instalación aún no tiene una pauta mensual para {mes}/{anio}. 
                  Haz clic en "Generar Pauta" para crear la primera pauta.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendario de la pauta */}
      <PautaTable
        pautaData={pautaData}
        diasDelMes={diasDelMes}
        diasSemana={diasSemana}
        onUpdatePauta={actualizarPauta}
        onDeleteGuardia={eliminarGuardia}
        modoEdicion={editando}
        diasGuardados={diasGuardados}
        mes={mes}
        anio={anio}
      />
    </div>
  );
} 