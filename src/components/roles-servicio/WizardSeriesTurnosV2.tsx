'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DiaSimple {
  dia: number;
  nombre: string;
  trabaja: boolean;
  inicio: string;
  fin: string;
}

interface WizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export default function WizardSeriesTurnosV2({ isOpen, onClose, onSave }: WizardProps) {
  const { toast } = useToast();
  
  // Estados simples
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  const [duracion, setDuracion] = useState(8);
  const [dias, setDias] = useState<DiaSimple[]>([]);

  // Inicializar días cuando cambia duración O cuando se abre el modal
  React.useEffect(() => {
    if (isOpen) {
      console.log('🔄 Modal abierto - inicializando días para duración:', duracion);
      const nuevosDias: DiaSimple[] = [];
      for (let i = 1; i <= duracion; i++) {
        nuevosDias.push({
          dia: i,
          nombre: `DÍA ${i}`,
          trabaja: false,
          inicio: '08:00',
          fin: '20:00'
        });
      }
      setDias(nuevosDias);
      console.log('🔍 Días inicializados:', nuevosDias.length);
    }
  }, [duracion, isOpen]);

  // Reset completo cuando se abre el modal
  React.useEffect(() => {
    if (isOpen) {
      console.log('🔄 Modal abierto - reset completo');
      setPaso(1);
      setLoading(false);
      setHoraInicioTodos('08:00');
      setHoraFinTodos('20:00');
    }
  }, [isOpen]);

  // Toggle trabajo secuencial
  const toggleTrabajo = useCallback((dia: number) => {
    setDias(prev => prev.map(d => ({
      ...d,
      trabaja: d.dia <= dia
    })));
  }, []);

  // Actualizar horario
  const actualizarHorario = useCallback((dia: number, campo: 'inicio' | 'fin', valor: string) => {
    setDias(prev => prev.map(d => 
      d.dia === dia ? { ...d, [campo]: valor } : d
    ));
  }, []);

  // Estados para aplicar a todos
  const [horaInicioTodos, setHoraInicioTodos] = useState('08:00');
  const [horaFinTodos, setHoraFinTodos] = useState('20:00');

  // Función eliminada - ahora está inline en el botón

  // Calcular nomenclatura
  const calcularNomenclatura = useCallback(() => {
    const diasTrabajo = dias.filter(d => d.trabaja).length;
    const diasDescanso = duracion - diasTrabajo;
    
    if (diasTrabajo === 0) return '';
    
    const primerDiaTrabajo = dias.find(d => d.trabaja);
    const hora = primerDiaTrabajo ? parseInt(primerDiaTrabajo.inicio.split(':')[0]) : 8;
    const tipo = (hora >= 6 && hora < 18) ? 'D' : 'N';
    
    // Calcular horas promedio
    const totalHoras = dias.filter(d => d.trabaja).reduce((sum, d) => {
      const inicio = new Date(`2000-01-01 ${d.inicio}`);
      const fin = new Date(`2000-01-01 ${d.fin}`);
      if (fin <= inicio) fin.setDate(fin.getDate() + 1);
      return sum + Math.round((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60));
    }, 0);
    const promedioHoras = Math.round(totalHoras / diasTrabajo);
    
    // Verificar si hay horarios variables
    const horariosVariables = dias.filter(d => d.trabaja).some(d => 
      d.inicio !== primerDiaTrabajo?.inicio || d.fin !== primerDiaTrabajo?.fin
    );
    
    const horarios = horariosVariables ? 'VAR' : `${primerDiaTrabajo?.inicio} ${primerDiaTrabajo?.fin}`;
    const sufijo = horariosVariables ? '*' : '';
    
    return `${tipo} ${diasTrabajo}x${diasDescanso}x${promedioHoras} ${horarios}${sufijo}`;
  }, [dias, duracion]);

  // Crear rol
  const handleCrearRol = useCallback(async () => {
    try {
      setLoading(true);
      
      const diasTrabajo = dias.filter(d => d.trabaja);
      if (diasTrabajo.length === 0) {
        toast({
          title: "Error",
          description: "Selecciona al menos un día de trabajo",
          variant: "destructive"
        });
        return;
      }
      
      const nomenclatura = calcularNomenclatura();
      
      const rolData = {
        nombre: nomenclatura,
        descripcion: `Rol de series ${nomenclatura}`,
        activo: true,
        tipo: 'series',
        duracion_ciclo: duracion,
        dias_serie: dias.map(d => ({
          posicion: d.dia,
          trabaja: d.trabaja,
          hora_inicio: d.trabaja ? d.inicio : null,
          hora_termino: d.trabaja ? d.fin : null
        }))
      };
      
      console.log('🚀 Enviando datos:', rolData);
      
      await onSave(rolData);
      
      toast({
        title: "¡Rol creado exitosamente!",
        description: `"${nomenclatura}" creado correctamente`,
      });
      
      handleCerrar();
      
    } catch (error) {
      console.error('❌ ERROR:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el rol",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [dias, duracion, calcularNomenclatura, onSave, toast]);

  // Cerrar wizard
  const handleCerrar = useCallback(() => {
    console.log('🔄 Cerrando wizard - reseteando estados');
    setPaso(1);
    setDuracion(8);
    setDias([]);
    setHoraInicioTodos('08:00');
    setHoraFinTodos('20:00');
    setLoading(false);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const diasTrabajo = dias.filter(d => d.trabaja).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleCerrar}>
      <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-6 w-6" />
            Crear Serie de Turnos
          </DialogTitle>
          
          {/* Indicadores de paso */}
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3].map(p => (
              <div
                key={p}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  p === paso ? 'bg-blue-600 text-white' : 
                  p < paso ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {p < paso ? '✓' : p}
              </div>
            ))}
          </div>
          
          <div className="text-center text-sm text-gray-600">
            Paso {paso} de 3 | Días trabajo: {diasTrabajo}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* PASO 1: Duración */}
          {paso === 1 && (
            <div className="space-y-6 text-center">
              <h3 className="text-2xl font-semibold">¿De cuántos días es la serie?</h3>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {[7, 8, 14].map(d => (
                  <Button
                    key={d}
                    variant={duracion === d ? "default" : "outline"}
                    onClick={() => setDuracion(d)}
                    className="w-full sm:w-auto px-6 py-3"
                  >
                    {d} días
                  </Button>
                ))}
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <span>Personalizar:</span>
                <Input
                  type="number"
                  min="3"
                  max="30"
                  value={duracion}
                  onChange={(e) => setDuracion(parseInt(e.target.value) || 7)}
                  className="w-20 text-center"
                />
                <span>días</span>
              </div>
              
              <div className="flex justify-center">
                <Button onClick={() => setPaso(2)}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {/* PASO 2: Días de trabajo */}
          {paso === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-semibold">¿Cuántos días se trabaja?</h3>
                <p className="text-gray-400">Haz clic en el último día de trabajo. Se marcarán automáticamente desde el día 1.</p>
                <p className="text-sm text-blue-600">Ejemplo: Si haces clic en DÍA 4, se marcarán días 1, 2, 3 y 4 como trabajo</p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mx-auto">
                {dias.map((dia) => (
                  <div
                    key={dia.dia}
                    onClick={() => toggleTrabajo(dia.dia)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      dia.trabaja 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-bold">{dia.dia}</div>
                      <div className="text-xs">{dia.trabaja ? 'Trabajo' : 'Descanso'}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-center text-sm text-blue-600">
                {diasTrabajo} días de trabajo, {duracion - diasTrabajo} de descanso
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setPaso(1)}
                  className="w-full sm:w-auto"
                >
                  Anterior
                </Button>
                <Button 
                  onClick={() => setPaso(3)} 
                  disabled={diasTrabajo === 0}
                  className="w-full sm:w-auto"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {/* PASO 3: Horarios */}
          {paso === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-semibold">¿Qué horario cada día?</h3>
                <p className="text-gray-400">Configura los horarios de trabajo</p>
              </div>

              {/* Aplicar a todos - SIMPLE */}
              <Card className="bg-blue-900/20 border-blue-700/30 mx-auto">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-blue-300 text-center">
                      ⚡ Aplicar el mismo horario a todos los días
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-sm text-gray-300">De:</span>
                        <select 
                          value={horaInicioTodos}
                          onChange={(e) => setHoraInicioTodos(e.target.value)}
                          className="flex-1 sm:w-20 px-2 py-2 bg-gray-800 border border-gray-600 rounded-md text-sm text-white"
                        >
                          {Array.from({length: 24}, (_, i) => {
                            const hora = i.toString().padStart(2, '0') + ':00';
                            return <option key={hora} value={hora}>{hora}</option>;
                          })}
                        </select>
                        <span className="text-sm text-gray-300">a:</span>
                        <select 
                          value={horaFinTodos}
                          onChange={(e) => setHoraFinTodos(e.target.value)}
                          className="flex-1 sm:w-20 px-2 py-2 bg-gray-800 border border-gray-600 rounded-md text-sm text-white"
                        >
                          {Array.from({length: 24}, (_, i) => {
                            const hora = i.toString().padStart(2, '0') + ':00';
                            return <option key={hora} value={hora}>{hora}</option>;
                          })}
                        </select>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('🔧 Click botón aplicar - inicio');
                          try {
                            setDias(prevDias => {
                              console.log('🔧 setDias ejecutándose');
                              return prevDias.map(d => 
                                d.trabaja ? { ...d, inicio: horaInicioTodos, fin: horaFinTodos } : d
                              );
                            });
                            console.log('🔧 setDias completado');
                          } catch (error) {
                            console.error('❌ Error en setDias:', error);
                          }
                        }}
                        className="w-full sm:w-auto border-blue-500 text-blue-300 hover:bg-blue-800/20"
                      >
                        ⚡ Aplicar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="space-y-3 mx-auto">
                {dias.filter(d => d.trabaja).map((dia) => (
                  <Card key={dia.dia} className="p-3">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="w-full sm:w-16 text-center sm:text-left font-medium text-blue-400">
                          {dia.nombre}
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <span className="text-sm text-gray-300">De:</span>
                          <select
                            value={dia.inicio}
                            onChange={(e) => actualizarHorario(dia.dia, 'inicio', e.target.value)}
                            className="flex-1 sm:w-20 px-2 py-2 bg-gray-800 border border-gray-600 rounded-md text-sm text-white"
                          >
                            {Array.from({length: 24}, (_, i) => {
                              const hora = i.toString().padStart(2, '0') + ':00';
                              return <option key={hora} value={hora}>{hora}</option>;
                            })}
                          </select>
                          <span className="text-sm text-gray-300">a:</span>
                          <select
                            value={dia.fin}
                            onChange={(e) => actualizarHorario(dia.dia, 'fin', e.target.value)}
                            className="flex-1 sm:w-20 px-2 py-2 bg-gray-800 border border-gray-600 rounded-md text-sm text-white"
                          >
                            {Array.from({length: 24}, (_, i) => {
                              const hora = i.toString().padStart(2, '0') + ':00';
                              return <option key={hora} value={hora}>{hora}</option>;
                            })}
                          </select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="text-center">
                <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 max-w-md mx-auto">
                  <h4 className="font-medium text-blue-300 mb-2">Nomenclatura:</h4>
                  <div className="text-lg font-mono text-blue-400">
                    "{calcularNomenclatura()}"
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setPaso(2)}
                  className="w-full sm:w-auto"
                >
                  Anterior
                </Button>
                <Button 
                  onClick={handleCrearRol} 
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                >
                  {loading ? 'Creando...' : 'Crear Rol'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
