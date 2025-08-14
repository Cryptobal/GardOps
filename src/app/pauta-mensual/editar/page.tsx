import { Authorize, GuardButton, can } from '@/lib/authz-ui'
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { 
  ArrowLeft, 
  Save, 
  Calendar, 
  Building2, 
  Users,
  Loader2,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import PautaTable from "../components/PautaTable";

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

export default function EditarPautaMensualPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const instalacionId = searchParams.get('instalacion_id');
  const mes = searchParams.get('mes');
  const anio = searchParams.get('anio');

  const [pautaData, setPautaData] = useState<PautaGuardia[]>([]);
  const [diasDelMes, setDiasDelMes] = useState<number[]>([]);
  const [diasSemana, setDiasSemana] = useState<DiaSemana[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [instalacionInfo, setInstalacionInfo] = useState<any>(null);

  // Validar parámetros requeridos
  useEffect(() => {
    if (!instalacionId || !mes || !anio) {
      setMensaje("❌ Faltan parámetros requeridos para cargar la pauta");
      setLoading(false);
      return;
    }

    cargarPautaMensual();
    cargarInfoInstalacion();
  }, [instalacionId, mes, anio]);

  const cargarInfoInstalacion = async () => {
    try {
      const response = await fetch(`/api/instalaciones/${instalacionId}`);
      if (response.ok) {
        const data = await response.json();
        setInstalacionInfo(data);
      }
    } catch (error) {
      console.error('Error cargando información de instalación:', error);
    }
  };

  const cargarPautaMensual = async () => {
    try {
      setLoading(true);
      setMensaje(null);

      // Generar días del mes
      const diasEnMes = new Date(parseInt(anio!), parseInt(mes!) - 1, 0).getDate();
      const diasArray = Array.from({ length: diasEnMes }, (_, i) => i + 1);
      setDiasDelMes(diasArray);

      // Generar información de días de la semana
      const diasSemanaArray: DiaSemana[] = diasArray.map(dia => {
        const fecha = new Date(parseInt(anio!), parseInt(mes!) - 1, dia);
        const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'short' });
        return {
          dia,
          diaSemana,
          esFeriado: false // TODO: Implementar verificación de feriados
        };
      });
      setDiasSemana(diasSemanaArray);

      // Cargar datos de la pauta desde la API
      const response = await fetch(`/api/pauta-mensual?instalacion_id=${instalacionId}&mes=${mes}&anio=${anio}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar la pauta mensual');
      }

      const data = await response.json();
      
      if (data.success && data.pauta) {
        // Convertir datos de la API al formato esperado por PautaTable
        const pautaFormateada: PautaGuardia[] = data.pauta.map((guardia: any) => ({
          id: guardia.id || '',
          nombre: guardia.nombre,
          nombre_puesto: guardia.nombre_puesto || '',
          patron_turno: guardia.patron_turno || '4x4',
          dias: guardia.dias.map((dia: string) => {
            switch (dia) {
              case 'planificado': return 'TRABAJA';
              case 'L': return 'LIBRE';
              case 'P': return 'PERMISO';
              case 'LIC': return 'LICENCIA';
              default: return '';
            }
          }),
          tipo: guardia.tipo || 'asignado',
          es_ppc: guardia.es_ppc,
          guardia_id: guardia.guardia_id,
          rol_nombre: guardia.rol_nombre
        }));
        
        setPautaData(pautaFormateada);
      } else {
        throw new Error(data.error || 'Error al cargar la pauta');
      }

    } catch (error) {
      console.error('Error cargando pauta mensual:', error);
      setMensaje(`❌ Error al cargar la pauta: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const actualizarPauta = (guardiaIndex: number, diaIndex: number, nuevoEstado: string) => {
    setPautaData(prevData => {
      const newData = [...prevData];
      
      // Verificar si es un PPC y bloquear la edición
      if (newData[guardiaIndex].es_ppc) {
        console.log('🚫 Intento de editar PPC bloqueado en actualizarPauta');
        return prevData; // No hacer cambios
      }
      
      newData[guardiaIndex].dias[diaIndex] = nuevoEstado;
      return newData;
    });
  };

  const eliminarGuardia = (guardiaIndex: number) => {
    setPautaData(prevData => {
      // Verificar si es un PPC y bloquear la eliminación
      if (prevData[guardiaIndex].es_ppc) {
        console.log('🚫 Intento de eliminar PPC bloqueado');
        return prevData; // No hacer cambios
      }
      
      return prevData.filter((_, index) => index !== guardiaIndex);
    });
  };

  const guardarPauta = async () => {
    try {
      setSaving(true);
      setMensaje(null);

      // Convertir datos al formato esperado por la API
      const pautaParaGuardar = pautaData.map(guardia => ({
        guardia_id: guardia.es_ppc ? guardia.id : (guardia.guardia_id || guardia.id), // Para PPCs usar el ID del puesto, para guardias usar guardia_id
        dias: guardia.dias.map(dia => {
          switch (dia) {
            case 'TRABAJA': return 'planificado';
            case 'LIBRE': return 'L';
            case 'PERMISO': return 'P';
            case 'LICENCIA': return 'LIC';
            default: return '';
          }
        })
      }));

      const response = await fetch('/api/pauta-mensual/guardar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instalacion_id: instalacionId,
          mes: parseInt(mes!),
          anio: parseInt(anio!),
          pauta: pautaParaGuardar
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar la pauta');
      }

      setMensaje('✅ Pauta mensual guardada exitosamente');
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setMensaje(null);
      }, 3000);

    } catch (error) {
      console.error('Error guardando pauta:', error);
      setMensaje(`❌ Error al guardar la pauta: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      
      // Limpiar mensaje de error después de 5 segundos
      setTimeout(() => {
        setMensaje(null);
      }, 5000);
    } finally {
      setSaving(false);
    }
  };

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const nombreMes = meses[parseInt(mes!) - 1];

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Editar Pauta Mensual</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{instalacionInfo?.nombre || 'Cargando...'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{nombreMes} {anio}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{pautaData.length} guardias</span>
              </div>
            </div>
          </div>
        </div>

        <Button 
          onClick={guardarPauta} 
          disabled={saving || loading}
          className="flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? 'Guardando...' : 'Guardar Pauta'}
        </Button>
      </div>

      {/* Mensaje de estado */}
      {mensaje && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border-l-4 ${
            mensaje.includes('✅') 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-400' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-400'
          }`}
        >
          <div className="flex items-start gap-2">
            {mensaje.includes('✅') ? (
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            )}
            <span className={`text-sm ${
              mensaje.includes('✅') 
                ? 'text-green-800 dark:text-green-200' 
                : 'text-red-800 dark:text-red-200'
            }`}>
              {mensaje}
            </span>
          </div>
        </motion.div>
      )}

      {/* Contenido principal */}
      {loading ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-sm">Cargando pauta mensual...</span>
            </div>
          </CardContent>
        </Card>
      ) : pautaData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Pauta Mensual - {nombreMes} {anio}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PautaTable
              pautaData={pautaData}
              diasDelMes={diasDelMes}
              diasSemana={diasSemana}
              onUpdatePauta={actualizarPauta}
              onDeleteGuardia={eliminarGuardia}
              modoEdicion={true}
              mes={parseInt(mes || '1')}
              anio={parseInt(anio || new Date().getFullYear().toString())}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay datos de pauta</h3>
            <p className="text-sm text-muted-foreground mb-4">
              No se encontraron datos de pauta para esta instalación en el período seleccionado.
            </p>
            <Button onClick={() => router.back()}>
              Volver al resumen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 