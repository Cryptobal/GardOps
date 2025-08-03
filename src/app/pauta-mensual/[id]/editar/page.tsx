"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
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
  Clock
} from "lucide-react";
import { obtenerPautaMensual, guardarPautaMensual } from "../../../../lib/api/pauta-mensual";
import { useToast } from "../../../../hooks/use-toast";
import PautaTable from "../../components/PautaTable";

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
  id_guardia: string;
  nombre: string;
  rol_servicio: {
    patron_turno: string;
  };
  dias: string[];
  tipo?: 'asignado' | 'ppc';
}

interface DiaSemana {
  dia: number;
  diaSemana: string;
  esFeriado: boolean;
}

export default function EditarPautaMensualPage() {
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

  // Cargar datos iniciales solo una vez
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
            // Extraer los datos correctamente de la respuesta
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
              ppcs: instalacionInfo.ppcs.length,
              ppcsPendientes: instalacionInfo.ppcs.filter((p: any) => p.estado === 'Pendiente').length
            });
            
            setInstalacion(instalacionInfo);
          }
        }

        // Cargar pauta mensual
        const pautaResponse = await obtenerPautaMensual(instalacionId, anio, mes);
        
        // Transformar los datos de la pauta al formato esperado por PautaTable
        if (pautaResponse && instalacionInfo) {
          const diasDelMesArray = Array.from(
            { length: new Date(anio, mes, 0).getDate() }, 
            (_, i) => i + 1
          );
          setDiasDelMes(diasDelMesArray);

          // Función para obtener feriados de Chile (2024-2025)
          const getFeriadosChile = (year: number, month: number): number[] => {
            const feriados = {
              2024: {
                1: [1], // Año Nuevo
                2: [], // No hay feriados en febrero
                3: [29], // Viernes Santo
                4: [1], // Domingo de Resurrección
                5: [1], // Día del Trabajo
                6: [7], // Glorias Navales
                7: [16], // Virgen del Carmen
                8: [15], // Asunción de la Virgen
                9: [18, 19], // Fiestas Patrias
                10: [12], // Encuentro de Dos Mundos
                11: [1], // Día de Todos los Santos
                12: [8, 25] // Inmaculada Concepción, Navidad
              },
              2025: {
                1: [1], // Año Nuevo
                2: [], // No hay feriados en febrero
                3: [18, 19], // Viernes Santo, Domingo de Resurrección
                4: [], // No hay feriados en abril
                5: [1], // Día del Trabajo
                6: [7], // Glorias Navales
                7: [16], // Virgen del Carmen
                8: [15], // Asunción de la Virgen
                9: [18, 19], // Fiestas Patrias
                10: [12], // Encuentro de Dos Mundos
                11: [1], // Día de Todos los Santos
                12: [8, 25] // Inmaculada Concepción, Navidad
              }
            };
            
            return feriados[year as keyof typeof feriados]?.[month as keyof typeof feriados[2024]] || [];
          };

          // Crear array de días de la semana con información de feriados
          const feriadosChile = getFeriadosChile(anio, mes);
          const diasSemanaArray = diasDelMesArray.map(dia => {
            const fecha = new Date(anio, mes - 1, dia);
            const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            const diaSemana = diasSemana[fecha.getDay()];
            
            // Verificar si es feriado
            const esFeriado = feriadosChile.includes(dia);
            
            return {
              dia,
              diaSemana,
              esFeriado
            };
          });
          setDiasSemana(diasSemanaArray);

          // Transformar la pauta al formato esperado
          const pautaTransformada = pautaResponse.pauta.map((guardiaPauta: any) => {
            // Buscar el guardia correspondiente en instalacionInfo.guardias
            const guardiaInfo = instalacionInfo.guardias.find(g => g.id === guardiaPauta.id);
            
            return {
              id_guardia: guardiaPauta.id,
              nombre: guardiaPauta.nombre,
              rol_servicio: {
                patron_turno: guardiaPauta.patron_turno
              },
              dias: guardiaPauta.dias,
              tipo: guardiaInfo?.tipo
            };
          });
          
          setPautaData(pautaTransformada);
          console.log('✅ Datos iniciales cargados');
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
  }, [instalacionId, anio, mes]); // Removí toast de las dependencias

  // Función para verificar que los datos se guardaron correctamente
  const verificarGuardado = async (): Promise<boolean> => {
    try {
      console.log('🔍 Verificando guardado...');
      const response = await fetch(`/api/pauta-mensual?instalacion_id=${instalacionId}&mes=${mes}&anio=${anio}`);
      
      if (!response.ok) {
        console.error('❌ Error verificando guardado:', response.status);
        return false;
      }
      
      const datosGuardados = await response.json();
      
      console.log('🔍 Verificación post-guardado:', {
        datos_enviados: pautaData.length,
        datos_guardados: datosGuardados.pauta?.length || 0,
        coinciden: pautaData.length === (datosGuardados.pauta?.length || 0)
      });
      
      return pautaData.length === (datosGuardados.pauta?.length || 0);
    } catch (error) {
      console.error('❌ Error en verificación:', error);
      return false;
    }
  };

  const guardarPauta = async () => {
    if (!pautaData.length) return;

    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    setGuardando(true);
    try {
      console.log(`[${timestamp}] 🚀 Iniciando guardado de pauta`);
      
      // Transformar los datos al formato esperado por la API
      const pautaParaGuardar = pautaData.map(guardia => ({
        guardia_id: guardia.id_guardia,
        dias: guardia.dias.map(estado => {
          // Convertir estados del frontend a estados de la base de datos
          switch (estado) {
            case 'T':
              return 'T';
            case 'L':
              return 'L';
            case 'P':
              return 'P';
            case 'LIC':
              return 'LIC';
            default:
              return 'L';
          }
        })
      }));

      console.log(`[${timestamp}] 📤 Enviando pauta al servidor:`, {
        instalacion_id: instalacionId,
        anio: parseInt(anio.toString()),
        mes: parseInt(mes.toString()),
        total_guardias: pautaParaGuardar.length
      });

      const response = await fetch('/api/pauta-mensual/guardar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`[${timestamp}] ✅ Pauta guardada exitosamente:`, result);
      console.log(`[${timestamp}] ⏱️ Tiempo total de guardado: ${duration}ms`);

      // Verificar que se guardó correctamente
      const verificacionExitosa = await verificarGuardado();
      if (verificacionExitosa) {
        console.log(`[${timestamp}] ✅ Verificación post-guardado exitosa`);
        toast.success('Pauta guardada', 'Los cambios se han guardado exitosamente y verificado');
      } else {
        console.warn(`[${timestamp}] ⚠️ Verificación post-guardado falló`);
        toast.warning('Pauta guardada', 'Los cambios se guardaron pero la verificación falló. Revise los datos.');
      }

      setEditando(false);
      actualizarDiasGuardados(); // Actualizar indicadores visuales

    } catch (error: any) {
      const errorTime = new Date().toISOString();
      console.error(`[${errorTime}] ❌ Error guardando pauta:`, error);
      toast.error('Error', error.message || 'Error al guardar la pauta');
    } finally {
      setGuardando(false);
    }
  };

  const volver = () => {
    router.push(`/pauta-mensual?mes=${mes}&anio=${anio}`);
  };

  const actualizarPauta = (guardiaIndex: number, diaIndex: number, nuevoEstado: string) => {
    if (!editando) {
      return;
    }
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🔄 actualizarPauta:`, { guardiaIndex, diaIndex, nuevoEstado });
    
    const nuevaPautaData = [...pautaData];
    nuevaPautaData[guardiaIndex].dias[diaIndex] = nuevoEstado;
    setPautaData(nuevaPautaData);
    
    console.log(`[${timestamp}] ✅ Estado actualizado:`, nuevaPautaData[guardiaIndex].dias[diaIndex]);
  };

  const eliminarGuardia = (guardiaIndex: number) => {
    const nuevaPautaData = [...pautaData];
    // Limpiar todos los días asignados (TRABAJA/LIBRE) pero mantener al guardia
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
          <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
            <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Editar Pauta Mensual</h1>
            <p className="text-sm text-muted-foreground">
              {instalacion.nombre} - {mes}/{anio}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
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
        </div>
      </div>

      {/* Información de la instalación */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {instalacion?.nombre}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {instalacion?.direccion}
            </p>
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