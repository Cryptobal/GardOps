"use client";

import React, { useState, useEffect } from "react";
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
  Database,
  Clock
} from "lucide-react";
import { crearPautaMensualAutomatica } from "../../../../lib/api/pauta-mensual";
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

export default function CrearPautaMensualPage() {
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
  const [generando, setGenerando] = useState(false);
  const [pautaCreada, setPautaCreada] = useState(false);

  // Obtener información de la instalación
  useEffect(() => {
    const cargarInstalacion = async () => {
      try {
        console.log('🔍 Cargando instalación:', instalacionId);
        const response = await fetch(`/api/instalaciones/${instalacionId}/completa`);
        console.log('📋 Respuesta del servidor:', response.status, response.statusText);
        
        if (response.ok) {
          const result = await response.json();
          console.log('📋 Datos recibidos:', result);
          
          if (result.success && result.data) {
            // Transformar los datos para que coincidan con la interfaz esperada
            const instalacionData = {
              id: result.data.instalacion.id,
              nombre: result.data.instalacion.nombre,
              direccion: result.data.instalacion.direccion,
              cliente_nombre: result.data.instalacion.cliente_nombre,
              guardias: result.data.guardias || [],
              ppcs: result.data.ppcs || []
            };
            console.log('✅ Datos transformados:', instalacionData);
            console.log('📊 Guardias:', instalacionData.guardias?.length || 0);
            console.log('📊 PPCs:', instalacionData.ppcs?.length || 0);
            setInstalacion(instalacionData);
            
            // Generar días del mes
            const diasEnMes = new Date(anio, mes - 1, 0).getDate();
            const diasArray = Array.from({ length: diasEnMes }, (_, i) => i + 1);
            setDiasDelMes(diasArray);

            // Generar información de días de la semana
            const diasSemanaArray: DiaSemana[] = diasArray.map(dia => {
              const fecha = new Date(anio, mes - 1, dia);
              const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'short' });
              return {
                dia,
                diaSemana,
                esFeriado: false // TODO: Implementar verificación de feriados
              };
            });
            setDiasSemana(diasSemanaArray);

            // Crear pauta inicial con todos los días como "LIBRE"
            const pautaInicial: PautaGuardia[] = instalacionData.guardias.map((guardia: any) => {
              // Determinar el patrón de turno basado en los datos del rol de servicio
              const diasTrabajo = guardia.rol_servicio?.dias_trabajo || 4;
              const diasDescanso = guardia.rol_servicio?.dias_descanso || 4;
              const patronTurno = `${diasTrabajo}x${diasDescanso}`;
              
              // Determinar el nombre a mostrar
              const nombreMostrar = guardia.tipo === 'ppc' 
                ? `${guardia.nombre_completo} (PPC)` 
                : guardia.nombre_completo;
              
              return {
                id: guardia.id, // Assuming 'id' is the guardia's ID
                nombre: nombreMostrar,
                nombre_puesto: guardia.nombre_completo, // Assuming 'nombre_puesto' is the full name
                patron_turno: patronTurno,
                dias: Array.from({ length: diasEnMes }, () => 'LIBRE'),
                tipo: guardia.tipo, // 'asignado' o 'ppc'
                es_ppc: guardia.tipo === 'ppc',
                guardia_id: guardia.id,
                rol_nombre: guardia.nombre_completo
              };
            });
            setPautaData(pautaInicial);
            
          } else {
            console.error('❌ Error en la respuesta:', result);
            throw new Error('Error al cargar información de la instalación');
          }
        } else {
          console.error('❌ Error en la respuesta HTTP:', response.status);
          throw new Error('Error al cargar información de la instalación');
        }
      } catch (error) {
        console.error('❌ Error cargando instalación:', error);
        toast.error('Error', 'No se pudo cargar la información de la instalación');
      } finally {
        setLoading(false);
      }
    };

    if (instalacionId) {
      cargarInstalacion();
    }
  }, [instalacionId, mes, anio]);

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
        setPautaCreada(true);
        
        // Redirigir a la página de edición después de crear
        setTimeout(() => {
          router.push(`/pauta-mensual/${instalacionId}/editar?mes=${mes}&anio=${anio}`);
        }, 1500);
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

  const volver = () => {
    router.push(`/pauta-mensual?mes=${mes}&anio=${anio}`);
  };

  const actualizarPauta = (guardiaIndex: number, diaIndex: number, nuevoEstado: string) => {
    const nuevaPautaData = [...pautaData];
    nuevaPautaData[guardiaIndex].dias[diaIndex] = nuevoEstado;
    setPautaData(nuevaPautaData);
  };

  const eliminarGuardia = (guardiaIndex: number) => {
    const nuevaPautaData = [...pautaData];
    // Limpiar todos los días asignados (TRABAJA/LIBRE) pero mantener al guardia
    nuevaPautaData[guardiaIndex].dias = nuevaPautaData[guardiaIndex].dias.map(() => "");
    setPautaData(nuevaPautaData);
  };

  const estadisticasPauta = () => {
    const totalDias = diasDelMes.length;
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
              <span className="ml-2 text-sm">Cargando información de la instalación...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!instalacion) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Error</h3>
            <p className="text-sm text-muted-foreground">
              No se pudo cargar la información de la instalación.
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
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
            <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Crear Pauta Mensual</h1>
            <p className="text-sm text-muted-foreground">
              {instalacion.nombre} - {mes}/{anio}
            </p>
          </div>
        </div>
      </div>

      {/* Información de la instalación */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {instalacion.nombre}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {instalacion.direccion}
            </p>
            {instalacion.cliente_nombre && (
              <p className="text-xs text-muted-foreground">
                Cliente: {instalacion.cliente_nombre}
              </p>
            )}
          </CardHeader>
        </Card>

        {/* Información de guardias y PPCs */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Guardias Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm">
                  {instalacion.guardias.filter((g: Guardia) => g.tipo === 'asignado').length} guardias asignados
                  {instalacion.guardias.filter((g: Guardia) => g.tipo === 'ppc').length > 0 && (
                    <span className="text-orange-600 dark:text-orange-400">
                      {' '}+ {instalacion.guardias.filter((g: Guardia) => g.tipo === 'ppc').length} PPCs
                    </span>
                  )}
                </span>
              </div>
              {instalacion.guardias && instalacion.guardias.length > 0 && (
                <div className="space-y-1">
                  {instalacion.guardias.slice(0, 3).map((guardia) => (
                    <Badge 
                      key={guardia.id} 
                      variant="outline" 
                      className={`text-xs ${
                        guardia.tipo === 'ppc' 
                          ? 'border-orange-300 text-orange-600 dark:border-orange-600 dark:text-orange-400' 
                          : ''
                      }`}
                    >
                      {guardia.nombre_completo}
                    </Badge>
                  ))}
                  {instalacion.guardias.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{instalacion.guardias.length - 3} más
                    </Badge>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">{instalacion.ppcs?.length || 0} PPCs activos</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas de la pauta */}
      {stats && (
        <Card>
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

      {/* Tabla de pauta interactiva */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Pauta Mensual - Vista Previa
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configura la pauta antes de crearla. Usa clic derecho para autocompletar series.
              </p>
            </div>
            <div className="flex space-x-4">
              <Button variant="outline" onClick={volver}>
                Cancelar
              </Button>
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
                    <Save className="h-4 w-4 mr-2" />
                    Generar Pauta
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pautaData.length > 0 ? (
            <PautaTable
              pautaData={pautaData}
              diasDelMes={diasDelMes}
              diasSemana={diasSemana}
              onUpdatePauta={actualizarPauta}
              onDeleteGuardia={eliminarGuardia}
              modoEdicion={true}
              diasGuardados={new Set()}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay guardias disponibles para esta instalación</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 