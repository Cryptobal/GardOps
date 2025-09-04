'use client';

import React, { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WizardCrearRolProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rolData: any) => Promise<void>;
  tenantId?: string;
}

interface DiaConfig {
  posicion: number;
  nombre: string;
  esTrabajo: boolean;
  horaInicio: string;
  horaTermino: string;
  horas: number;
}

const DIAS_SEMANA = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const CICLOS_COMUNES = [4, 7, 8, 14];

export default function WizardCrearRol({
  isOpen,
  onClose,
  onSave,
  tenantId
}: WizardCrearRolProps) {
  const { toast } = useToast();
  
  // Estados del wizard
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Estados de configuración
  const [duracionCiclo, setDuracionCiclo] = useState(7);
  const [diasConfig, setDiasConfig] = useState<DiaConfig[]>([]);
  const [nomenclatura, setNomenclatura] = useState('');

  // Inicializar días cuando cambia la duración del ciclo
  useEffect(() => {
    const nuevaConfig: DiaConfig[] = [];
    for (let i = 0; i < duracionCiclo; i++) {
      nuevaConfig.push({
        posicion: i + 1,
        nombre: i < 7 ? DIAS_SEMANA[i] : `DÍA ${i + 1}`,
        esTrabajo: false,
        horaInicio: '08:00',
        horaTermino: '20:00',
        horas: 12
      });
    }
    setDiasConfig(nuevaConfig);
  }, [duracionCiclo]);

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

  const handleGuardar = async () => {
    try {
      setLoading(true);

      const diasTrabajo = diasConfig.filter(d => d.esTrabajo).length;
      const diasDescanso = duracionCiclo - diasTrabajo;
      
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
        tenantId: tenantId || '1',
        tiene_horarios_variables: true,
        series_dias: series
      };

      await onSave(rolData);
      handleCerrar();
    } catch (error) {
      console.error('Error guardando rol:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCerrar = () => {
    setPaso(1);
    setDuracionCiclo(7);
    setDiasConfig([]);
    setNomenclatura('');
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
            {[1, 2, 3].map((num) => (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
