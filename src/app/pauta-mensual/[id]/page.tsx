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
              const guardiaInfo = instalacionInfo.guardias.find(g => g.id === guardiaPauta.id);
              
              return {
                id: guardiaPauta.id,
                nombre: guardiaPauta.nombre,
                nombre_puesto: guardiaPauta.nombre_puesto,
                patron_turno: guardiaPauta.patron_turno,
                dias: guardiaPauta.dias,
                tipo: guardiaInfo?.tipo,
                es_ppc: guardiaPauta.es_ppc,
                guardia_id: guardiaPauta.guardia_id,
                rol_nombre: guardiaInfo?.rol_servicio?.nombre
              };
            });
            
            setPautaData(pautaTransformada);
            console.log('✅ Pauta existente cargada');
          }
        } catch (error) {
          console.log('ℹ️ No existe pauta, se creará una nueva');
          setPautaExiste(false);
          
          // Crear pauta inicial con todos los días como "LIBRE"
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

            const pautaInicial: PautaGuardia[] = instalacionInfo.guardias.map((guardia: any) => {
              const diasTrabajo = guardia.rol_servicio?.dias_trabajo || 4;
              const diasDescanso = guardia.rol_servicio?.dias_descanso || 4;
              const patronTurno = `${diasTrabajo}x${diasDescanso}`;
              
              const nombreMostrar = guardia.tipo === 'ppc' 
                ? `${guardia.nombre_completo} (PPC)` 
                : guardia.nombre_completo;
              
              return {
                id: guardia.id,
                nombre: nombreMostrar,
                nombre_puesto: guardia.nombre_completo,
                patron_turno: patronTurno,
                dias: Array.from({ length: diasEnMes }, () => 'LIBRE'),
                tipo: guardia.tipo,
                es_ppc: guardia.tipo === 'ppc',
                guardia_id: guardia.id,
                rol_nombre: guardia.nombre_completo
              };
            });
            setPautaData(pautaInicial);
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
      
      const pautaParaGuardar = pautaData.map(guardia => ({
        guardia_id: guardia.id,
        dias: guardia.dias.map(estado => {
          switch (estado) {
            case 'T': return 'T';
            case 'L': return 'L';
            case 'P': return 'P';
            case 'LIC': return 'LIC';
            default: return 'L';
          }
        })
      }));

      const response = await fetch('/api/pauta-mensual/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instalacion_id: instalacionId,
          anio: parseInt(anio.toString()),
          mes: parseInt(mes.toString()),
          pauta: pautaParaGuardar
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

    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] ❌ Error guardando pauta:`, error);
      toast.error('Error', error.message || 'Error al guardar la pauta');
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
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={volver}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div className={`p-3 rounded-full ${
            pautaExiste 
              ? "bg-green-100 dark:bg-green-900/20" 
              : "bg-orange-100 dark:bg-orange-900/20"
          }`}>
            <Calendar className={`h-6 w-6 ${
              pautaExiste 
                ? "text-green-600 dark:text-green-400" 
                : "text-orange-600 dark:text-orange-400"
            }`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {pautaExiste ? "Ver Pauta Mensual" : "Crear Pauta Mensual"}
            </h1>
            <p className="text-sm text-muted-foreground">
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
        
        <div className="flex space-x-2">
          {pautaExiste ? (
            <>
              {!editando ? (
                <Button onClick={() => setEditando(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Pauta
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setEditando(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={guardarPauta} disabled={guardando}>
                    {guardando ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar
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
            >
              {generando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Generar Pauta
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Información de la instalación */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <Link 
                href={`/instalaciones/${instalacion.id}`}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline flex items-center gap-1"
              >
                {instalacion?.nombre}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {instalacion?.direccion}
            </p>
            {instalacion?.cliente_nombre && (
              <p className="text-xs text-muted-foreground">
                Cliente: {instalacion.cliente_nombre}
              </p>
            )}
          </CardHeader>
        </Card>

        {/* Estadísticas de la pauta */}
        {stats && (
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                Estadísticas de Pauta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span>{stats.totalGuardias} guardias</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <span>{stats.totalDias} días</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>{stats.diasConAsignaciones} días con asignaciones</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span>{stats.porcentajeCobertura}% cobertura</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Estado de la pauta */}
      {!pautaExiste && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-orange-600" />
              <div>
                <h3 className="font-semibold">Pauta no creada</h3>
                <p className="text-sm text-muted-foreground">
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
      />
    </div>
  );
} 