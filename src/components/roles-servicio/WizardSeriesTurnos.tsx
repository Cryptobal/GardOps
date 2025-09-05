'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Calendar,
  Clock,
  Moon,
  Sun,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WizardSeriesTurnosProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rolData: any) => Promise<void>;
}

interface DiaSimple {
  dia: number;
  nombre: string;
  trabaja: boolean;
  inicio: string;
  fin: string;
}

export default function WizardSeriesTurnos({
  isOpen,
  onClose,
  onSave
}: WizardSeriesTurnosProps) {
  const { toast } = useToast();
  
  // Estados súper simples
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  const [duracion, setDuracion] = useState(8);
  const [dias, setDias] = useState<DiaSimple[]>([]);
  
  // Refs para los selectores
  const inicioTodosRef = useRef<HTMLSelectElement>(null);
  const finTodosRef = useRef<HTMLSelectElement>(null);

  // Debug
  console.log('🔍 WIZARD SERIES - Estado:', { paso, duracion, dias: dias.length });

  // Inicializar días cuando cambia duración
  React.useEffect(() => {
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
  }, [duracion]);

  const toggleTrabajo = (dia: number) => {
    const diaActual = dias.find(d => d.dia === dia);
    
    if (!diaActual) return;
    
    // Si está marcando como trabajo, marcar secuencialmente desde el día 1
    if (!diaActual.trabaja) {
      setDias(prev => prev.map(d => ({
        ...d,
        trabaja: d.dia <= dia
      })));
    } else {
      // Si está desmarcando, desmarcar desde este día hacia adelante
      setDias(prev => prev.map(d => ({
        ...d,
        trabaja: d.dia < dia
      })));
    }
  };

  const actualizarHorario = (dia: number, campo: 'inicio' | 'fin', valor: string) => {
    setDias(prev => prev.map(d => 
      d.dia === dia ? { ...d, [campo]: valor } : d
    ));
  };

  const calcularNomenclatura = () => {
    const diasTrabajo = dias.filter(d => d.trabaja).length;
    const diasDescanso = duracion - diasTrabajo;
    
    if (diasTrabajo === 0) return '';
    
    // Determinar si es diurno o nocturno
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
  };

  const handleCrearRol = async () => {
    try {
      setLoading(true);
      console.log('🚀 CREANDO ROL SERIE...');
      
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
      
      // Datos súper simples
      const rolData = {
        nombre: nomenclatura,
        descripcion: `Rol de series ${nomenclatura}`,
        activo: true,
        // Datos para el backend
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
      
      // Cerrar wizard después de crear
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
  };

  // Función para aplicar horario a todos los días de trabajo
  const aplicarATodos = () => {
    try {
      console.log('🔧 APLICANDO A TODOS...');
      
      const inicio = inicioTodosRef.current?.value || '08:00';
      const fin = finTodosRef.current?.value || '20:00';
      
      console.log('📅 Valores:', { inicio, fin });
      
      setDias(prev => prev.map(d => 
        d.trabaja ? { ...d, inicio, fin } : d
      ));
      
      toast({
        title: "Horarios aplicados",
        description: `Horario ${inicio}-${fin} aplicado a todos los días de trabajo`,
      });
      
      console.log('✅ APLICADO EXITOSAMENTE');
    } catch (error) {
      console.error('❌ ERROR en aplicarATodos:', error);
      toast({
        title: "Error",
        description: "Error al aplicar horarios",
        variant: "destructive"
      });
    }
  };

  const handleCerrar = () => {
    setPaso(1);
    setDuracion(7);
    setDias([]);
    onClose();
  };

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
          
          {/* Indicador simple */}
          <div className="flex justify-center gap-2 mt-4">
            <div className="text-xs text-blue-600 mb-2 w-full text-center">
              🔍 Paso {paso} de 3 | Días trabajo: {diasTrabajo}
            </div>
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

        <div className="space-y-6">
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
                  onChange={(e) => setDuracion(parseInt(e.target.value) || 8)}
                  className="w-20 text-center"
                />
              </div>
              
              <Button onClick={() => setPaso(2)} className="px-8">
                Siguiente
              </Button>
            </div>
          )}

          {/* PASO 2: Seleccionar días */}
          {paso === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-semibold">¿Cuántos días se trabaja?</h3>
                <p className="text-gray-600">Haz clic en el último día de trabajo. Se marcarán automáticamente desde el día 1.</p>
                <p className="text-sm text-blue-600">Ejemplo: Si haces clic en DÍA 4, se marcarán días 1, 2, 3 y 4 como trabajo</p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mx-auto">
                {dias.map((dia) => (
                  <div
                    key={dia.dia}
                    onClick={() => toggleTrabajo(dia.dia)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      dia.trabaja
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-medium">{dia.nombre}</div>
                      <div className="text-xs mt-1">
                        {dia.trabaja ? '✓ Trabajo' : '○ Descanso'}
                      </div>
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

              {/* Botón para aplicar a todos - Dark Mode Optimized */}
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
                          ref={inicioTodosRef}
                          defaultValue="08:00"
                          className="flex-1 sm:w-20 px-2 py-2 bg-gray-800 border border-gray-600 rounded-md text-sm text-white"
                        >
                          {Array.from({length: 24}, (_, i) => {
                            const hora = i.toString().padStart(2, '0') + ':00';
                            return <option key={hora} value={hora}>{hora}</option>;
                          })}
                        </select>
                        <span className="text-sm text-gray-300">a:</span>
                        <select 
                          ref={finTodosRef}
                          defaultValue="20:00"
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
                        onClick={aplicarATodos}
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
