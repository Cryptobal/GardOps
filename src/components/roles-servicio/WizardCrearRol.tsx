'use client';

import React, { useState, useEffect } from 'react';
// Removido import de obtenerTenantIdUsuario - se obtendrá en el backend
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Calendar, 
  Clock, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle,
  X,
  Moon,
  Sun
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WizardCrearRolProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rolData: any) => Promise<void>;
}

interface DiaConfig {
  posicion: number;
  nombre: string;
  esTrabajo: boolean;
  horaInicio: string;
  horaTermino: string;
  horas: number;
}

// Removido DIAS_SEMANA - solo usar números de día
const CICLOS_COMUNES = [4, 7, 8, 14];

export default function WizardCrearRol({
  isOpen,
  onClose,
  onSave
}: WizardCrearRolProps) {
  const { toast } = useToast();
  
  // Estados del wizard
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  const [mostrarPasoNocturno, setMostrarPasoNocturno] = useState(false);
  
  // Debug: Log cuando cambien los estados
  useEffect(() => {
    console.log('🔍 DEBUG - Estado del wizard:', { paso, mostrarPasoNocturno, loading });
  }, [paso, mostrarPasoNocturno, loading]);
  
  // Estados de configuración
  const [duracionCiclo, setDuracionCiclo] = useState(7);
  const [diasConfig, setDiasConfig] = useState<DiaConfig[]>([]);
  const [nomenclatura, setNomenclatura] = useState('');
  // Removido tenantIdUsuario - se obtendrá en el backend

  // Inicializar días cuando cambia la duración del ciclo
  useEffect(() => {
    const nuevaConfig: DiaConfig[] = [];
    for (let i = 0; i < duracionCiclo; i++) {
      nuevaConfig.push({
        posicion: i + 1,
        nombre: `DÍA ${i + 1}`,
        esTrabajo: false,
        horaInicio: '08:00',
        horaTermino: '20:00',
        horas: 12
      });
    }
    setDiasConfig(nuevaConfig);
  }, [duracionCiclo]);

  // Removido useEffect para obtener tenant_id - se obtendrá en el backend

  // Calcular nomenclatura cuando cambian los días
  useEffect(() => {
    const diasTrabajo = diasConfig.filter(d => d.esTrabajo).length;
    const diasDescanso = duracionCiclo - diasTrabajo;
    
    if (diasTrabajo === 0) {
      setNomenclatura('');
      return;
    }

    const diasTrabajoConfig = diasConfig.filter(d => d.esTrabajo);
    const promedioHoras = diasTrabajoConfig.length > 0 
      ? Math.round((diasTrabajoConfig.reduce((sum, d) => sum + d.horas, 0) / diasTrabajoConfig.length) * 10) / 10
      : 0;

    // Verificar si hay horarios variables
    const horariosUnicos = new Set(diasTrabajoConfig.map(d => `${d.horaInicio}-${d.horaTermino}`));
    const tieneVariables = horariosUnicos.size > 1;

    // Determinar si es día o noche
    const primerHora = parseInt(diasTrabajoConfig[0]?.horaInicio.split(':')[0] || '8');
    const tipoTurno = primerHora >= 6 && primerHora < 18 ? 'D' : 'N';

    // Crear rango de horarios
    const horarios = Array.from(horariosUnicos);
    let rangoHorarios = '';
    if (horarios.length === 1) {
      rangoHorarios = horarios[0].replace('-', ' ');
    } else {
      const inicios = diasTrabajoConfig.map(d => d.horaInicio).sort();
      const terminos = diasTrabajoConfig.map(d => d.horaTermino).sort();
      rangoHorarios = `${inicios[0]}-${terminos[terminos.length - 1]}`;
    }

    const sufijo = tieneVariables ? '*' : '';
    setNomenclatura(`${tipoTurno} ${diasTrabajo}x${diasDescanso}x${promedioHoras} ${rangoHorarios}${sufijo}`);
  }, [diasConfig, duracionCiclo]);

  const toggleDiaTrabajo = (index: number) => {
    const nuevaConfig = [...diasConfig];
    nuevaConfig[index].esTrabajo = !nuevaConfig[index].esTrabajo;
    setDiasConfig(nuevaConfig);
  };

  const actualizarHorario = (index: number, campo: 'horaInicio' | 'horaTermino', valor: string) => {
    const nuevaConfig = [...diasConfig];
    nuevaConfig[index][campo] = valor;
    
    // Recalcular horas
    const inicio = nuevaConfig[index].horaInicio.split(':').map(Number);
    const termino = nuevaConfig[index].horaTermino.split(':').map(Number);
    let horas = (termino[0] - inicio[0]) + (termino[1] - inicio[1]) / 60;
    if (horas <= 0) horas += 24;
    nuevaConfig[index].horas = Math.round(horas * 10) / 10;
    
    setDiasConfig(nuevaConfig);
  };

  const aplicarHorarioATodos = (horaInicio: string, horaTermino: string) => {
    const nuevaConfig = diasConfig.map(dia => {
      if (dia.esTrabajo) {
        const inicio = horaInicio.split(':').map(Number);
        const termino = horaTermino.split(':').map(Number);
        let horas = (termino[0] - inicio[0]) + (termino[1] - inicio[1]) / 60;
        if (horas <= 0) horas += 24;
        
        return {
          ...dia,
          horaInicio,
          horaTermino,
          horas: Math.round(horas * 10) / 10
        };
      }
      return dia;
    });
    setDiasConfig(nuevaConfig);
  };

  const handleSiguiente = () => {
    if (paso === 2) {
      const diasTrabajo = diasConfig.filter(d => d.esTrabajo).length;
      if (diasTrabajo === 0) {
        toast({
          title: "Selecciona días de trabajo",
          description: "Debes marcar al menos un día como día de trabajo",
          variant: "destructive"
        });
        return;
      }
    }
    setPaso(paso + 1);
  };

  const handleAnterior = () => {
    setPaso(paso - 1);
  };

  const validarDuplicado = async (nomenclaturaAValidar: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/roles-servicio');
      const data = await response.json();
      if (data.success && data.data) {
        return data.data.some((rol: any) => rol.nombre === nomenclaturaAValidar);
      }
      return false;
    } catch (error) {
      console.error('Error validando duplicados:', error);
      return false;
    }
  };

  const handleGuardar = async () => {
    try {
      setLoading(true);

      const diasTrabajo = diasConfig.filter(d => d.esTrabajo).length;
      const diasDescanso = duracionCiclo - diasTrabajo;

      // Validar si ya existe este patrón
      const yaExiste = await validarDuplicado(nomenclatura);
      if (yaExiste) {
        toast({
          title: "Rol ya existe",
          description: `Ya existe un rol con el patrón "${nomenclatura}"`,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      // Crear series para la API
      const series = diasConfig.map(dia => ({
        posicion_en_ciclo: dia.posicion,
        es_dia_trabajo: dia.esTrabajo,
        hora_inicio: dia.esTrabajo ? dia.horaInicio : undefined,
        hora_termino: dia.esTrabajo ? dia.horaTermino : undefined,
        horas_turno: dia.esTrabajo ? dia.horas : 0,
        observaciones: `${dia.nombre}${dia.esTrabajo ? '' : ' (libre)'}`
      }));

      const rolData = {
        dias_trabajo: diasTrabajo,
        dias_descanso: diasDescanso,
        hora_inicio: diasConfig.find(d => d.esTrabajo)?.horaInicio || '08:00',
        hora_termino: diasConfig.find(d => d.esTrabajo)?.horaTermino || '20:00',
        estado: 'Activo',
        // tenantId se obtendrá automáticamente en el backend
        tiene_horarios_variables: true,
        series_dias: series
      };

      console.log('🚀 Enviando datos del rol:', rolData);
      
      try {
        await onSave(rolData);
        console.log('✅ Rol guardado exitosamente');
        
        // Mostrar toast de éxito
        toast({
          title: "Rol creado exitosamente",
          description: `Rol "${nomenclatura}" creado correctamente`,
        });
        
        // NO cerrar el modal, ir al paso 4
        console.log('🔄 Cambiando a paso 4...');
        setPaso(4);
        setMostrarPasoNocturno(true);
        console.log('✅ Paso 4 activado - paso:', 4, 'mostrarPasoNocturno:', true);
        
      } catch (saveError) {
        console.error('❌ Error en onSave:', saveError);
        toast({
          title: "Error al crear rol",
          description: "Hubo un problema al guardar el rol. Inténtalo de nuevo.",
          variant: "destructive"
        });
        return; // Salir si hay error
      }
    } catch (error) {
      console.error('Error guardando rol:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearPatronOpuesto = async () => {
    try {
      setLoading(true);
      
      const diasTrabajo = diasConfig.filter(d => d.esTrabajo).length;
      const diasDescanso = duracionCiclo - diasTrabajo;
      
      // Determinar si el rol actual es diurno o nocturno
      const primerHora = parseInt(diasConfig.find(d => d.esTrabajo)?.horaInicio.split(':')[0] || '8');
      const esDiurno = primerHora >= 6 && primerHora < 18;
      
      // Crear horarios opuestos (simples: 20:00-08:00 para nocturno, 08:00-20:00 para diurno)
      const horaInicioOpuesto = esDiurno ? '20:00' : '08:00';
      const horaTerminoOpuesto = esDiurno ? '08:00' : '20:00';
      
      // Crear series opuestas
      const seriesOpuestas = diasConfig.map(dia => ({
        posicion_en_ciclo: dia.posicion,
        es_dia_trabajo: dia.esTrabajo,
        hora_inicio: dia.esTrabajo ? horaInicioOpuesto : undefined,
        hora_termino: dia.esTrabajo ? horaTerminoOpuesto : undefined,
        horas_turno: dia.esTrabajo ? 12 : 0,
        observaciones: `${dia.nombre}${dia.esTrabajo ? ` (${esDiurno ? 'nocturno' : 'diurno'})` : ' (libre)'}`
      }));

      const rolDataOpuesto = {
        dias_trabajo: diasTrabajo,
        dias_descanso: diasDescanso,
        hora_inicio: horaInicioOpuesto,
        hora_termino: horaTerminoOpuesto,
        estado: 'Activo',
        // tenantId se obtendrá automáticamente en el backend
        tiene_horarios_variables: false, // Usar horarios fijos para el patrón opuesto
        series_dias: []
      };

      await onSave(rolDataOpuesto);
      
      toast({
        title: "¡Patrón complementario creado!",
        description: `Se creó también el turno ${esDiurno ? 'nocturno' : 'diurno'} automáticamente`,
      });
      
      handleCerrar();
    } catch (error) {
      console.error('Error creando patrón opuesto:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el patrón complementario",
        variant: "destructive"
      });
      handleCerrar();
    } finally {
      setLoading(false);
    }
  };

  const handleCerrar = () => {
    setPaso(1);
    setDuracionCiclo(7);
    setDiasConfig([]);
    setNomenclatura('');
    setMostrarPasoNocturno(false);
    onClose();
  };

  const diasTrabajo = diasConfig.filter(d => d.esTrabajo).length;
  const diasDescanso = duracionCiclo - diasTrabajo;

  return (
    <Dialog open={isOpen} onOpenChange={handleCerrar}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          <button
            onClick={handleCerrar}
            className="absolute right-0 top-0 p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="h-4 w-4" />
          </button>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-6 w-6" />
            Crear Rol de Servicio
          </DialogTitle>
          
          {/* Indicador de pasos */}
          <div className="flex justify-center gap-2 mt-4">
            {/* DEBUG: Mostrar pasos disponibles */}
            <div className="text-xs text-gray-500 mb-2 w-full text-center">
              DEBUG: Pasos disponibles: {[1, 2, 3, ...(mostrarPasoNocturno ? [4] : [])].join(', ')} | Paso actual: {paso}
            </div>
            {[1, 2, 3, ...(mostrarPasoNocturno ? [4] : [])].map((num) => (
              <div
                key={num}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  num === paso
                    ? 'bg-blue-600 text-white'
                    : num < paso
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {num < paso ? <CheckCircle className="h-4 w-4" /> : num}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="py-6">
          {/* PASO 1: Duración del Ciclo */}
          {paso === 1 && (
            <div className="text-center space-y-6">
              <div>
                <h3 className="text-2xl font-semibold mb-2">🗓️ ¿De cuántos días es tu ciclo?</h3>
                <p className="text-gray-600">Un ciclo completo de trabajo + descanso</p>
              </div>

              <div className="flex justify-center">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-8">
                  <div className="text-6xl font-bold text-blue-600 mb-2">
                    {duracionCiclo}
                  </div>
                  <div className="text-xl text-blue-600 font-medium">
                    días
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-3">Ciclos comunes:</p>
                <div className="flex justify-center gap-2 mb-4">
                  {CICLOS_COMUNES.map((ciclo) => (
                    <Button
                      key={ciclo}
                      variant={duracionCiclo === ciclo ? "default" : "outline"}
                      onClick={() => setDuracionCiclo(ciclo)}
                      className="w-12 h-12 rounded-full"
                    >
                      {ciclo}
                    </Button>
                  ))}
                </div>
                
                <div className="flex justify-center items-center gap-2">
                  <span className="text-sm text-gray-600">Personalizar:</span>
                  <Input
                    type="number"
                    min="3"
                    max="30"
                    value={duracionCiclo}
                    onChange={(e) => setDuracionCiclo(parseInt(e.target.value) || 7)}
                    className="w-20 text-center"
                  />
                </div>
              </div>

              <Button onClick={handleSiguiente} size="lg" className="px-8">
                Siguiente <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* PASO 2: Marcar Días de Trabajo */}
          {paso === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-semibold mb-2">👆 Marca los días que se TRABAJAN</h3>
                <p className="text-gray-600">Toca para activar/desactivar cada día</p>
              </div>

              <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto">
                {diasConfig.map((dia, index) => (
                  <button
                    key={index}
                    onClick={() => toggleDiaTrabajo(index)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      dia.esTrabajo
                        ? 'bg-green-100 border-green-400 text-green-800'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`text-2xl mb-2 ${dia.esTrabajo ? '🟢' : '⚪'}`}>
                      {dia.esTrabajo ? '🟢' : '⚪'}
                    </div>
                    <div className="font-medium text-sm">DÍA {dia.posicion}</div>
                    <div className="text-xs">{dia.nombre}</div>
                  </button>
                ))}
              </div>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <div className="text-lg font-semibold text-blue-800">
                    📊 {diasTrabajo} días trabajo • {diasDescanso} días libre
                  </div>
                  {diasTrabajo > 0 && (
                    <div className="text-sm text-blue-600 mt-1">
                      Patrón: {diasTrabajo}x{diasDescanso}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleAnterior}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Atrás
                </Button>
                <Button onClick={handleSiguiente} disabled={diasTrabajo === 0}>
                  Siguiente <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* PASO 3: Configurar Horarios */}
          {paso === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-semibold mb-2">⏰ Configura horarios de trabajo</h3>
                <p className="text-gray-600">Solo para los días marcados como trabajo</p>
              </div>

              {/* Aplicar a todos */}
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-yellow-800 mb-3">
                    ⚡ Aplicar el mismo horario a todos los días:
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      defaultValue="08:00"
                      onChange={(e) => {
                        const termino = (e.target.parentNode?.parentNode?.querySelector('input[type="time"]:last-child') as HTMLInputElement)?.value || '20:00';
                        aplicarHorarioATodos(e.target.value, termino);
                      }}
                      className="w-24"
                    />
                    <span className="text-gray-500">hasta</span>
                    <Input
                      type="time"
                      defaultValue="20:00"
                      onChange={(e) => {
                        const inicio = (e.target.parentNode?.parentNode?.querySelector('input[type="time"]:first-child') as HTMLInputElement)?.value || '08:00';
                        aplicarHorarioATodos(inicio, e.target.value);
                      }}
                      className="w-24"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const inputs = document.querySelectorAll('input[type="time"]');
                        const inicio = (inputs[0] as HTMLInputElement).value;
                        const termino = (inputs[1] as HTMLInputElement).value;
                        aplicarHorarioATodos(inicio, termino);
                      }}
                    >
                      Aplicar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Horarios individuales */}
              <div className="space-y-3">
                {diasConfig.filter(dia => dia.esTrabajo).map((dia, index) => (
                  <Card key={dia.posicion} className="border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-lg">🟢</div>
                          <div>
                            <div className="font-medium">{dia.nombre.toUpperCase()}</div>
                            <div className="text-sm text-gray-500">Día {dia.posicion}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <Input
                              type="time"
                              value={dia.horaInicio}
                              onChange={(e) => actualizarHorario(diasConfig.indexOf(dia), 'horaInicio', e.target.value)}
                              className="w-20"
                            />
                            <span className="text-gray-400">-</span>
                            <Input
                              type="time"
                              value={dia.horaTermino}
                              onChange={(e) => actualizarHorario(diasConfig.indexOf(dia), 'horaTermino', e.target.value)}
                              className="w-20"
                            />
                          </div>
                          
                          <Badge variant="secondary" className="ml-2">
                            {dia.horas}h
                          </Badge>
                          
                          {dia.horas !== 12 && (
                            <span className="text-yellow-500">⭐</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Nomenclatura final */}
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-green-600 mb-1">📋 Tu rol se llamará:</div>
                  <div className="text-lg font-mono font-semibold text-green-800">
                    {nomenclatura || 'Configurando...'}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleAnterior}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Atrás
                </Button>
                <Button 
                  onClick={handleGuardar} 
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Creando...' : '✅ Crear Rol'}
                </Button>
              </div>
            </div>
          )}

          {/* PASO 4: Crear Patrón Nocturno/Diurno */}
          {paso === 4 && mostrarPasoNocturno && (
            <div className="space-y-6">
              {/* DEBUG: Mostrar que estamos en paso 4 */}
              <div className="bg-red-100 border border-red-300 rounded-lg p-4 text-center">
                <div className="text-red-800 font-bold">🎯 DEBUG: ESTAMOS EN PASO 4</div>
                <div className="text-red-600 text-sm">paso: {paso}, mostrarPasoNocturno: {mostrarPasoNocturno.toString()}</div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Moon className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">
                  {(() => {
                    const primerHora = parseInt(diasConfig.find(d => d.esTrabajo)?.horaInicio.split(':')[0] || '8');
                    const esDiurno = primerHora >= 6 && primerHora < 18;
                    return esDiurno ? '🌙 ¿Crear también el patrón nocturno?' : '☀️ ¿Crear también el patrón diurno?';
                  })()}
                </h3>
                <p className="text-gray-600 mb-6">
                  {(() => {
                    const primerHora = parseInt(diasConfig.find(d => d.esTrabajo)?.horaInicio.split(':')[0] || '8');
                    const esDiurno = primerHora >= 6 && primerHora < 18;
                    return esDiurno 
                      ? 'Acabas de crear un patrón diurno. ¿Quieres crear automáticamente el mismo patrón pero nocturno?'
                      : 'Acabas de crear un patrón nocturno. ¿Quieres crear automáticamente el mismo patrón pero diurno?';
                  })()}
                </p>
              </div>

              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-800 mb-2">
                      Se creará automáticamente:
                    </div>
                    <div className="text-sm text-purple-600 mb-4">
                      {(() => {
                        const primerHora = parseInt(diasConfig.find(d => d.esTrabajo)?.horaInicio.split(':')[0] || '8');
                        const esDiurno = primerHora >= 6 && primerHora < 18;
                        return esDiurno 
                          ? 'Mismo patrón de días, pero con horarios nocturnos (20:00 - 08:00)'
                          : 'Mismo patrón de días, pero con horarios diurnos (08:00 - 20:00)';
                      })()}
                    </div>
                    
                    {/* Vista previa del patrón opuesto */}
                    <div className="grid grid-cols-4 gap-2 max-w-md mx-auto mb-4">
                      {diasConfig.slice(0, Math.min(8, duracionCiclo)).map((dia, index) => {
                        const primerHora = parseInt(diasConfig.find(d => d.esTrabajo)?.horaInicio.split(':')[0] || '8');
                        const esDiurno = primerHora >= 6 && primerHora < 18;
                        const horarioOpuesto = esDiurno ? '20:00-08:00' : '08:00-20:00';
                        
                        return (
                          <div
                            key={index}
                            className={`p-2 rounded-lg text-xs ${
                              dia.esTrabajo
                                ? 'bg-purple-200 text-purple-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            <div className="font-medium">{dia.nombre}</div>
                            {dia.esTrabajo && (
                              <div className="text-xs mt-1">{horarioOpuesto}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="text-sm text-purple-600 font-mono">
                      {(() => {
                        const primerHora = parseInt(diasConfig.find(d => d.esTrabajo)?.horaInicio.split(':')[0] || '8');
                        const esDiurno = primerHora >= 6 && primerHora < 18;
                        return esDiurno 
                          ? `"N ${diasTrabajo}x${diasDescanso}x12 20:00 08:00"`
                          : `"D ${diasTrabajo}x${diasDescanso}x12 08:00 20:00"`;
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={handleCerrar}
                  className="px-6"
                >
                  {(() => {
                    const primerHora = parseInt(diasConfig.find(d => d.esTrabajo)?.horaInicio.split(':')[0] || '8');
                    const esDiurno = primerHora >= 6 && primerHora < 18;
                    return esDiurno ? 'No, solo el diurno' : 'No, solo el nocturno';
                  })()}
                </Button>
                <Button 
                  onClick={handleCrearPatronOpuesto}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 px-6"
                >
                  {(() => {
                    const primerHora = parseInt(diasConfig.find(d => d.esTrabajo)?.horaInicio.split(':')[0] || '8');
                    const esDiurno = primerHora >= 6 && primerHora < 18;
                    if (loading) return 'Creando...';
                    return esDiurno ? '🌙 Sí, crear nocturno' : '☀️ Sí, crear diurno';
                  })()}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
