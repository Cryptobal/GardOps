"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
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
  FileText,
  Download,
  FileSpreadsheet,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { obtenerPautaMensual, guardarPautaMensual, crearPautaMensualAutomatica, exportarPautaMensualPDF, exportarPautaMensualXLSX } from "../../../lib/api/pauta-mensual";
import { useToast } from "../../../hooks/use-toast";
import PautaTable from "../components/PautaTable";
import PautaTableMobile from "../components/PautaTableMobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";

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
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [exportandoXLSX, setExportandoXLSX] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [tab, setTab] = useState<'dia' | 'semana' | 'mes'>(typeof window !== 'undefined' && window.innerWidth >= 640 ? 'mes' : 'dia');
  const [instalacionesDisponibles, setInstalacionesDisponibles] = useState<Array<{id: string, nombre: string}>>([]);
  // Calcular inicio de semana (lunes) para el día actual o 1
  const calcularInicioSemana = (dia: number) => {
    const fecha = new Date(anio, mes - 1, dia);
    // getDay(): 0=Dom,1=Lun,...6=Sáb; queremos lunes como inicio
    const day = fecha.getDay();
    const offset = day === 0 ? 6 : day - 1; // Dom -> 6, Lun -> 0, ...
    return Math.max(1, dia - offset);
  };
  const [semanaInicio, setSemanaInicio] = useState<number>(calcularInicioSemana(new Date().getDate())); // 1-based

  // Detectar cambios locales vs baseline
  const hayCambios = useCallback(() => {
    if (pautaData.length !== pautaDataOriginal.length) return true;
    for (let i = 0; i < pautaData.length; i++) {
      const a = pautaData[i];
      const b = pautaDataOriginal[i];
      if (!b || a.id !== b.id || a.dias.length !== b.dias.length) return true;
      for (let d = 0; d < a.dias.length; d++) {
        if (a.dias[d] !== b.dias[d]) return true;
      }
    }
    return false;
  }, [pautaData, pautaDataOriginal]);

  // Seguimiento del estado de edición
  useEffect(() => {
    if (editando) {
      logger.debug('📝 Modo edición activado');
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

  // Función para cargar o actualizar datos
  const cargarDatos = async (mostrarToast = false) => {
    try {
      if (mostrarToast) {
        setActualizando(true);
      } else {
        setLoading(true);
      }
      
      logger.debug('🔄 Cargando datos...');
      
      // Cargar información de la instalación
      const instalacionResponse = await fetch(`/api/instalaciones/${instalacionId}/completa`);
      let instalacionInfo: InstalacionInfo | null = null;
      
      if (instalacionResponse.ok) {
        const responseData = await instalacionResponse.json();
        logger.debug('📥 Datos de instalación recibidos:', responseData);
        
        if (responseData.success && responseData.data) {
          instalacionInfo = {
            id: responseData.data.instalacion.id,
            nombre: responseData.data.instalacion.nombre,
            direccion: responseData.data.instalacion.direccion,
            cliente_nombre: responseData.data.instalacion.cliente_nombre,
            guardias: responseData.data.guardias || [],
            ppcs: responseData.data.ppcs || []
          };
          
          logger.debug('🏢 Información de instalación procesada:', {
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
          console.log('🔍 DEBUG - Pauta existe, estableciendo pautaExiste = true');
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
              // Determinar si es día o noche basándose en la hora de inicio
              const tipoTurno = hora_inicio && hora_inicio < '12:00' ? 'Día' : 'Noche';
              turnoCompleto = `${tipoTurno} ${dias_trabajo}x${dias_descanso}x${horas_turno} / ${hora_inicio} ${hora_termino}`;
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
          logger.debug('✅ Pauta existente cargada');
        }
            } catch (error) {
        logger.debug('ℹ️ No existe pauta, se creará una nueva');
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
          console.log('🔍 DEBUG - diasSemanaArray generado:', diasSemanaArray.slice(0, 7)); // Solo primeros 7 días
          setDiasSemana(diasSemanaArray);

          // Crear estructura inicial con días vacíos - se llenará automáticamente
          const pautaInicial: PautaGuardia[] = [];
          
          // Procesar todos los puestos (guardias y PPCs)
          instalacionInfo.guardias.forEach((puesto: any) => {
            // Generar el turno completo basado en el rol del puesto
            let turnoCompleto = puesto.nombre_completo; // fallback
            if (puesto.rol_servicio) {
              const { dias_trabajo, dias_descanso, horas_turno, hora_inicio, hora_termino } = puesto.rol_servicio;
              // Determinar si es día o noche basándose en la hora de inicio
              const tipoTurno = hora_inicio && hora_inicio < '12:00' ? 'Día' : 'Noche';
              turnoCompleto = `${tipoTurno} ${dias_trabajo}x${dias_descanso}x${horas_turno} / ${hora_inicio} ${hora_termino}`;
            }
              
            const nombreMostrar = puesto.tipo === 'ppc' 
              ? `PPC ${puesto.nombre_puesto}` 
              : (puesto.nombre_completo || 'Sin asignar');
            
            pautaInicial.push({
              id: puesto.id,
              nombre: nombreMostrar,
              nombre_puesto: puesto.nombre_puesto || puesto.nombre_completo,
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
        } else {
          // No hay pauta existente, establecer estado correcto
          console.log('🔍 DEBUG - No hay pauta existente, estableciendo pautaExiste = false');
          setPautaExiste(false);
        }
      }

    } catch (error) {
      logger.error('Error cargando datos::', error);
      toast.error('Error', 'No se pudo cargar la información de la pauta mensual');
    } finally {
      if (mostrarToast) {
        setActualizando(false);
        toast.success('Actualizado', 'Los datos se han actualizado correctamente');
      } else {
        setLoading(false);
      }
    }
  };

  // Función para cargar instalaciones disponibles
  const cargarInstalacionesDisponibles = async () => {
    try {
      const response = await fetch('/api/pauta-mensual/resumen?mes=' + mes + '&anio=' + anio);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.instalaciones_con_pauta) {
          setInstalacionesDisponibles(data.instalaciones_con_pauta);
        }
      }
    } catch (error) {
      logger.error('Error cargando instalaciones disponibles::', error);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    if (instalacionId) {
      cargarDatos(false);
      cargarInstalacionesDisponibles();
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
        console.log('🔍 DEBUG - Pauta generada exitosamente, estableciendo pautaExiste = true');
        setPautaExiste(true);
        
        // No recargar datos - la pauta ya está creada y el estado está correcto
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
      logger.debug(`[${timestamp}] 🚀 Iniciando guardado de pauta`);
      
      // Preparar datos: solo enviar cambios reales y estados de planificación
      // Evitar borrar TE u otros estados no manejados por la planificación mensual
      const actualizaciones: any[] = [];
      
      // Mapa para buscar el original por `id` (puesto_id)
      const originalById = new Map<string, any>(
        (pautaDataOriginal || []).map((g) => [g.id, g])
      );
      
      for (const guardia of pautaData) {
        const original = originalById.get(guardia.id);
        
        logger.debug(`🔍 Procesando guardia ${guardia.nombre}: ${guardia.dias.length} días`);
        
        for (let diaIndex = 0; diaIndex < guardia.dias.length; diaIndex++) {
          const estadoActual = guardia.dias[diaIndex];
          const estadoOriginal = original?.dias?.[diaIndex];
          
          // Log para debug del día 31
          if (diaIndex === 30) {
            logger.debug(`🔍 Debug día 31:`, {
              estadoActual,
              estadoOriginal,
              guardiaId: guardia.id,
              guardiaNombre: guardia.nombre,
              diasLength: guardia.dias.length
            });
          }
          
          // Política: siempre enviar planificación explícita (planificado/L)
          // y solo eliminar si antes era planificación
          let estadoDB: string | null | undefined;
          if (estadoActual === 'planificado') {
            estadoDB = 'planificado';
          } else if (estadoActual === 'L') {
            estadoDB = 'libre';
          } else if (estadoActual === '') {
            if (estadoOriginal === 'planificado' || estadoOriginal === 'L') {
              estadoDB = null; // limpiar solo si antes era planificación
            } else {
              continue; // no tocar estados de diaria
            }
          } else {
            continue; // ignorar A, I, R, P, V, M, etc.
          }
          
          // Log para debug del día 31
          if (diaIndex === 30) {
            logger.debug(`🔍 Debug día 31:`, {
              estadoActual,
              estadoOriginal,
              estadoDB,
              guardiaId: guardia.id,
              guardiaNombre: guardia.nombre
            });
          }
          
                      // Validar que el estado no esté incompleto
            if (estadoDB && typeof estadoDB === 'string' && estadoDB.trim() !== '') {
              // Validar que el estado sea válido
              if (['planificado', 'libre'].includes(estadoDB)) {
                actualizaciones.push({
                  puesto_id: guardia.id,
                  guardia_id: guardia.es_ppc ? null : (guardia.guardia_id || guardia.id),
                  anio: parseInt(anio.toString()),
                  mes: parseInt(mes.toString()),
                  dia: diaIndex + 1,
                  estado: estadoDB,
                });
              }
            } else if (estadoDB === null) {
              // Solo agregar si es null (para eliminar)
              actualizaciones.push({
                puesto_id: guardia.id,
                guardia_id: guardia.es_ppc ? null : (guardia.guardia_id || guardia.id),
                anio: parseInt(anio.toString()),
                mes: parseInt(mes.toString()),
                dia: diaIndex + 1,
                estado: estadoDB,
              });
            }
        }
      }

      if (actualizaciones.length === 0) {
        logger.debug(`[${timestamp}] ℹ️ No hay cambios para guardar`);
        toast.success('Sin cambios', 'No se detectaron cambios en la pauta');
        setEditando(false);
        setGuardando(false);
        return;
      }

      console.log(`[${timestamp}] 📤 Enviando actualizaciones:`, JSON.stringify(actualizaciones, null, 2));

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
      logger.debug(`[${timestamp}] ✅ Pauta guardada exitosamente:`, result);

      // Recargar desde backend para reflejar inmediatamente TE/reemplazos/diaria
      await cargarDatos(false);

      toast.success('Pauta guardada', 'Los cambios se han guardado exitosamente');
      setEditando(false);

      // Resumen final en consola
      logger.debug(`[${timestamp}] 📊 Resumen guardado:`, {
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
    logger.debug(`[${timestamp}] 🔄 actualizarPauta:`, { guardiaIndex, diaIndex, nuevoEstado });
    
    // Solo permitir estados planificado y L
    if (nuevoEstado !== 'planificado' && nuevoEstado !== 'L') {
      logger.debug('🚫 Estado no permitido:', nuevoEstado);
      return;
    }
    
    // Usar actualización funcional para evitar condiciones de carrera con estado stale
    setPautaData((prevData) => {
      const nueva = prevData.map((g, idx) => {
        if (idx !== guardiaIndex) return g;
        const dias = g.dias.slice();
        dias[diaIndex] = nuevoEstado;
        return { ...g, dias };
      });
      return nueva;
    });
  };

  const eliminarGuardia = (guardiaIndex: number) => {
    const nuevaPautaData = [...pautaData];
    // Solo limpiar planificación (planificado/L). Preservar estados de diaria (R/A/I/P/V/M/S)
    nuevaPautaData[guardiaIndex].dias = nuevaPautaData[guardiaIndex].dias.map((estado) => {
      if (estado === 'planificado' || estado === 'L') return '';
      return estado;
    });
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

  const exportarPDF = async () => {
    try {
      setExportandoPDF(true);
      await exportarPautaMensualPDF(instalacionId, anio, mes);
      toast.success("✅ PDF exportado", "La pauta mensual se ha exportado correctamente en formato PDF.");
    } catch (error) {
      logger.error('Error exportando PDF::', error);
      toast.error("❌ Error al exportar", "No se pudo exportar la pauta en formato PDF.");
    } finally {
      setExportandoPDF(false);
    }
  };

  const exportarXLSX = async () => {
    try {
      setExportandoXLSX(true);
      await exportarPautaMensualXLSX(instalacionId, anio, mes);
      toast.success("✅ XLSX exportado", "La pauta mensual se ha exportado correctamente en formato XLSX.");
    } catch (error) {
      logger.error('Error exportando XLSX::', error);
      toast.error("❌ Error al exportar", "No se pudo exportar la pauta en formato XLSX.");
    } finally {
      setExportandoXLSX(false);
    }
  };

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
              {pautaExiste ? "Editar Pauta Mensual" : "Crear Pauta Mensual"}
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
            
            {/* Navegación entre meses */}
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  let nuevoMes = mes - 1;
                  let nuevoAnio = anio;
                  if (nuevoMes === 0) {
                    nuevoMes = 12;
                    nuevoAnio = anio - 1;
                  }
                  router.push(`/pauta-mensual/${instalacionId}?mes=${nuevoMes}&anio=${nuevoAnio}`);
                }}
                className="h-8 px-2"
              >
                <ChevronLeft className="h-3 w-3" />
                <span className="hidden sm:inline ml-1">Mes anterior</span>
              </Button>
              
              <span className="text-xs text-muted-foreground px-2">
                {mes}/{anio}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  let nuevoMes = mes + 1;
                  let nuevoAnio = anio;
                  if (nuevoMes === 13) {
                    nuevoMes = 1;
                    nuevoAnio = anio + 1;
                  }
                  router.push(`/pauta-mensual/${instalacionId}?mes=${nuevoMes}&anio=${nuevoAnio}`);
                }}
                className="h-8 px-2"
              >
                <span className="hidden sm:inline mr-1">Mes siguiente</span>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
          {console.log('🔍 DEBUG - Renderizando botones, pautaExiste:', pautaExiste, 'editando:', editando)}
          {pautaExiste ? (
            <>
              {!editando ? (
                <>
                  <Button 
                    variant="outline"
                    onClick={() => cargarDatos(true)} 
                    disabled={actualizando}
                    className="w-full sm:w-auto"
                  >
                    {actualizando ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span className="hidden sm:inline">Actualizando...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Actualizar</span>
                        <span className="sm:hidden">Actualizar</span>
                      </>
                    )}
                  </Button>
                  
                  <Button onClick={() => setEditando(true)} className="w-full sm:w-auto">
                    <Edit className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Editar</span>
                    <span className="sm:hidden">Editar</span>
                  </Button>
                  
                  {/* Botones de exportación */}
                  <Button 
                    variant="outline" 
                    onClick={exportarPDF} 
                    disabled={exportandoPDF}
                    className="w-full sm:w-auto"
                  >
                    {exportandoPDF ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span className="hidden sm:inline">Exportando PDF...</span>
                        <span className="sm:hidden">PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Exportar PDF</span>
                        <span className="sm:hidden">PDF</span>
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={exportarXLSX} 
                    disabled={exportandoXLSX}
                    className="w-full sm:w-auto"
                  >
                    {exportandoXLSX ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span className="hidden sm:inline">Exportando XLSX...</span>
                        <span className="sm:hidden">XLSX...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Exportar XLSX</span>
                        <span className="sm:hidden">XLSX</span>
                      </>
                    )}
                  </Button>
                </>
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
            
            {/* Selector de instalaciones */}
            <div className="mt-3">
              <label className="text-xs text-muted-foreground mb-2 block">
                Cambiar a otra instalación:
              </label>
              <Select onValueChange={(value) => {
                if (value && value !== instalacionId) {
                  router.push(`/pauta-mensual/${value}?mes=${mes}&anio=${anio}`);
                }
              }}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Seleccionar instalación" />
                </SelectTrigger>
                <SelectContent>
                  {instalacionesDisponibles.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

      {/* Calendario de la pauta con tabs Día/Semana/Mes (móvil abre en Día) */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as any)}
        className="w-full"
      >
        <TabsList className="w-full justify-between">
          {/* En desktop ocultamos el tab Día; en móvil lo mostramos */}
          <TabsTrigger value="dia" className="flex-1 sm:hidden">Día</TabsTrigger>
          <TabsTrigger value="semana" className="flex-1">Semana</TabsTrigger>
          <TabsTrigger value="mes" className="flex-1">Mes</TabsTrigger>
        </TabsList>

        <TabsContent value="dia">
          <div className="sm:hidden">
            <PautaTableMobile
              pautaData={pautaData}
              diasDelMes={diasDelMes}
              diasSemana={diasSemana}
              onUpdatePauta={actualizarPauta}
              modoEdicion={editando}
              mes={mes}
              anio={anio}
            />
          </div>
          <div className="hidden sm:block">
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
        </TabsContent>

        <TabsContent value="semana">
          <div className="flex items-center justify-between py-2">
            <Button variant="outline" size="sm" onClick={() => setSemanaInicio((s) => Math.max(1, s - 7))}>◀ Semana</Button>
            <div className="text-sm text-muted-foreground">Días {semanaInicio}-{Math.min(semanaInicio + 6, diasDelMes.length)}</div>
            <Button variant="outline" size="sm" onClick={() => setSemanaInicio((s) => Math.min(Math.max(1, diasDelMes.length - 6), s + 7))}>Semana ▶</Button>
          </div>
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
            startDay={semanaInicio}
            endDay={Math.min(semanaInicio + 6, diasDelMes.length)}
          />
        </TabsContent>
        <TabsContent value="mes">
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
        </TabsContent>
      </Tabs>

      {/* Bottom action bar móvil */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 flex items-center justify-between gap-2 z-40">
        <Button variant="outline" size="sm" onClick={() => cargarDatos(true)} disabled={actualizando}>
          {actualizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push(`/pauta-diaria/${anio}-${String(mes).padStart(2,'0')}-${String(Math.max(semanaInicio,1)).padStart(2,'0')}`)}>
          Ver Diaria
        </Button>
        {editando ? (
          <Button size="sm" onClick={guardarPauta} disabled={guardando} className="flex-1">
            {guardando ? (<><Loader2 className="h-4 w-4 animate-spin mr-2"/>Guardando</>) : 'Guardar'}
          </Button>
        ) : (
          <Button size="sm" onClick={() => setEditando(true)} className="flex-1">
            Editar
          </Button>
        )}
        {hayCambios() && <span className="text-[11px] text-amber-600">Cambios sin guardar</span>}
      </div>
    </div>
  );
} 