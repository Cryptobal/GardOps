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
  CheckCircle, 
  Calendar,
  Clock,
  Moon,
  Sun
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WizardFinalProps {
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

export default function WizardFinal({
  isOpen,
  onClose,
  onSave
}: WizardFinalProps) {
  const { toast } = useToast();
  
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  const [mostrarPaso4, setMostrarPaso4] = useState(false);
  
  const [duracionCiclo, setDuracionCiclo] = useState(7);
  const [diasConfig, setDiasConfig] = useState<DiaConfig[]>([]);
  const [nomenclatura, setNomenclatura] = useState('');
  const [rolOriginal, setRolOriginal] = useState<any>(null);

  // Debug
  useEffect(() => {
    console.log('🔍 WIZARD FINAL - Estado:', { paso, mostrarPaso4, loading, duracionCiclo });
  }, [paso, mostrarPaso4, loading, duracionCiclo]);

  // Inicializar días
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

  // Calcular nomenclatura
  useEffect(() => {
    const diasTrabajo = diasConfig.filter(d => d.esTrabajo).length;
    const diasDescanso = duracionCiclo - diasTrabajo;

    if (diasTrabajo === 0) {
      setNomenclatura('');
      return;
    }

    const primerDiaTrabajo = diasConfig.find(d => d.esTrabajo);
    const horaInicio = primerDiaTrabajo ? parseInt(primerDiaTrabajo.horaInicio.split(':')[0]) : 8;
    const tipoTurno = (horaInicio >= 6 && horaInicio < 18) ? 'D' : 'N';

    // Verificar horarios variables
    const horariosVariables = diasConfig
      .filter(d => d.esTrabajo)
      .some(d => d.horaInicio !== primerDiaTrabajo?.horaInicio || d.horaTermino !== primerDiaTrabajo?.horaTermino);

    const promedioHoras = Math.round(
      diasConfig.filter(d => d.esTrabajo).reduce((sum, d) => sum + d.horas, 0) / diasTrabajo
    );

    const rangoHorarios = horariosVariables ? 'VAR' : 
      `${primerDiaTrabajo?.horaInicio || '08:00'} ${primerDiaTrabajo?.horaTermino || '20:00'}`;
    const sufijo = horariosVariables ? '*' : '';
    
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
    
    // Calcular horas
    const inicio = new Date(`2000-01-01 ${nuevaConfig[index].horaInicio}`);
    const fin = new Date(`2000-01-01 ${nuevaConfig[index].horaTermino}`);
    
    if (fin <= inicio) {
      fin.setDate(fin.getDate() + 1);
    }
    
    const diferencia = fin.getTime() - inicio.getTime();
    nuevaConfig[index].horas = Math.round(diferencia / (1000 * 60 * 60));
    
    setDiasConfig(nuevaConfig);
  };

  const handleSiguiente = () => {
    if (paso < 3) {
      setPaso(paso + 1);
    }
  };

  const handleAnterior = () => {
    setPaso(paso - 1);
  };

  const handleGuardar = async () => {
    try {
      setLoading(true);
      console.log('🚀 CREANDO ROL...');

      const diasTrabajo = diasConfig.filter(d => d.esTrabajo);
      if (diasTrabajo.length === 0) {
        toast({
          title: "Error",
          description: "Debe seleccionar al menos un día de trabajo",
          variant: "destructive"
        });
        return;
      }

      // Crear datos súper simples - SIN VALIDACIONES COMPLEJAS
      const rolData = {
        nombre: nomenclatura,
        descripcion: `Rol ${nomenclatura}`,
        activo: true,
        tiene_horarios_variables: true,
        duracion_ciclo_dias: duracionCiclo,
        series_dias: diasConfig.map(dia => ({
          posicion_en_ciclo: dia.posicion,
          es_dia_trabajo: dia.esTrabajo,
          hora_inicio: dia.esTrabajo ? dia.horaInicio : null,
          hora_termino: dia.esTrabajo ? dia.horaTermino : null,
          horas_turno: dia.esTrabajo ? dia.horas : 0
        }))
      };

      console.log('🚀 Datos a enviar:', rolData);
      
      await onSave(rolData);
      console.log('✅ ROL CREADO!');
      
      setRolOriginal(rolData);
      
      toast({
        title: "¡Éxito!",
        description: `Rol "${nomenclatura}" creado`,
      });
      
      // IR AL PASO 4
      console.log('🔄 YENDO AL PASO 4...');
      setPaso(4);
      setMostrarPaso4(true);
      console.log('✅ PASO 4 ACTIVADO');
      
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

  const handleCrearComplementario = async () => {
    try {
      setLoading(true);
      console.log('🌙 CREANDO COMPLEMENTARIO...');

      const primerDiaTrabajo = diasConfig.find(d => d.esTrabajo);
      const horaInicio = primerDiaTrabajo ? parseInt(primerDiaTrabajo.horaInicio.split(':')[0]) : 8;
      const esDiurno = horaInicio >= 6 && horaInicio < 18;

      const diasTrabajo = diasConfig.filter(d => d.esTrabajo).length;
      const diasDescanso = duracionCiclo - diasTrabajo;
      const tipoComplementario = esDiurno ? 'N' : 'D';
      const horarioComplementario = esDiurno ? '20:00 08:00' : '08:00 20:00';
      
      const nomenclaturaComplementaria = `${tipoComplementario} ${diasTrabajo}x${diasDescanso}x12 ${horarioComplementario}`;

      const rolComplementario = {
        nombre: nomenclaturaComplementaria,
        descripcion: `Rol ${nomenclaturaComplementaria}`,
        activo: true,
        tiene_horarios_variables: true,
        duracion_ciclo_dias: duracionCiclo,
        series_dias: diasConfig.map(dia => ({
          posicion_en_ciclo: dia.posicion,
          es_dia_trabajo: dia.esTrabajo,
          hora_inicio: dia.esTrabajo ? (esDiurno ? '20:00' : '08:00') : null,
          hora_termino: dia.esTrabajo ? (esDiurno ? '08:00' : '20:00') : null,
          horas_turno: dia.esTrabajo ? 12 : 0
        }))
      };

      console.log('🚀 Rol complementario:', rolComplementario);
      await onSave(rolComplementario);

      toast({
        title: "¡Complementario creado!",
        description: `Rol "${nomenclaturaComplementaria}" creado`,
      });

      handleCerrar();
      
    } catch (error) {
      console.error('❌ ERROR COMPLEMENTARIO:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el rol complementario",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCerrar = () => {
    setPaso(1);
    setDuracionCiclo(7);
    setDiasConfig([]);
    setNomenclatura('');
    setMostrarPaso4(false);
    setRolOriginal(null);
    onClose();
  };

  if (!isOpen) return null;

  const diasTrabajo = diasConfig.filter(d => d.esTrabajo).length;
  const diasDescanso = duracionCiclo - diasTrabajo;

  return (
    <Dialog open={isOpen} onOpenChange={handleCerrar}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-6 w-6" />
            Crear Rol de Servicio - WIZARD FINAL
          </DialogTitle>
          
          {/* Indicador de pasos */}
          <div className="flex justify-center gap-2 mt-4">
            <div className="text-xs text-gray-500 mb-2 w-full text-center">
              🔍 DEBUG: Pasos: {[1, 2, 3, ...(mostrarPaso4 ? [4] : [])].join(', ')} | Actual: {paso} | Paso4: {mostrarPaso4.toString()}
            </div>
            {[1, 2, 3, ...(mostrarPaso4 ? [4] : [])].map((num) => (
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
          {/* PASO 1 */}
          {paso === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-semibold mb-2">Duración del Ciclo</h3>
                <p className="text-gray-600">¿De cuántos días es la serie?</p>
              </div>

              <div className="flex flex-wrap gap-3 justify-center">
                {[4, 7, 8, 14].map(ciclo => (
                  <Button
                    key={ciclo}
                    variant={duracionCiclo === ciclo ? "default" : "outline"}
                    onClick={() => setDuracionCiclo(ciclo)}
                    className="px-6 py-3 text-lg"
                  >
                    {ciclo} días
                  </Button>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2">
                <span>Personalizar:</span>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={duracionCiclo}
                  onChange={(e) => setDuracionCiclo(parseInt(e.target.value) || 7)}
                  className="w-20 text-center"
                />
                <span>días</span>
              </div>

              <div className="flex justify-center">
                <Button onClick={handleSiguiente} className="px-8 py-2">
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {/* PASO 2 */}
          {paso === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-semibold mb-2">Días de Trabajo</h3>
                <p className="text-gray-600">Selecciona qué días se trabaja</p>
              </div>

              <div className="grid grid-cols-4 md:grid-cols-7 gap-3 max-w-4xl mx-auto">
                {diasConfig.map((dia, index) => (
                  <div
                    key={index}
                    onClick={() => toggleDiaTrabajo(index)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      dia.esTrabajo
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-medium text-sm">{dia.nombre}</div>
                      <div className="text-xs mt-1">
                        {dia.esTrabajo ? '✓ Trabajo' : '○ Descanso'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <div className="inline-flex gap-4 text-sm">
                  <Badge variant="default">{diasTrabajo} trabajo</Badge>
                  <Badge variant="secondary">{diasDescanso} descanso</Badge>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={handleAnterior}>
                  Anterior
                </Button>
                <Button 
                  onClick={handleSiguiente} 
                  disabled={diasTrabajo === 0}
                  className="px-8"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {/* PASO 3 */}
          {paso === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-semibold mb-2">Horarios</h3>
                <p className="text-gray-600">Define los horarios para cada día</p>
              </div>

              <div className="space-y-4 max-w-2xl mx-auto">
                {diasConfig
                  .filter(dia => dia.esTrabajo)
                  .map((dia) => (
                    <Card key={dia.posicion} className="p-4">
                      <CardContent className="p-0">
                        <div className="flex items-center gap-4">
                          <div className="w-20 text-center font-medium">
                            {dia.nombre}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={dia.horaInicio}
                              onChange={(e) => actualizarHorario(diasConfig.indexOf(dia), 'horaInicio', e.target.value)}
                              className="w-32"
                            />
                            <span>a</span>
                            <Input
                              type="time"
                              value={dia.horaTermino}
                              onChange={(e) => actualizarHorario(diasConfig.indexOf(dia), 'horaTermino', e.target.value)}
                              className="w-32"
                            />
                            <Badge variant="secondary" className="ml-2">
                              {dia.horas}h
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>

              <div className="text-center">
                <div className="bg-blue-50 rounded-lg p-4 max-w-md mx-auto">
                  <h4 className="font-medium text-blue-800 mb-2">Nomenclatura:</h4>
                  <div className="text-lg font-mono text-blue-600">
                    "{nomenclatura}"
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={handleAnterior}>
                  Anterior
                </Button>
                <Button 
                  onClick={handleGuardar} 
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 px-8"
                >
                  {loading ? 'Creando...' : 'Crear Rol'}
                </Button>
              </div>
            </div>
          )}

          {/* PASO 4 - ¡AQUÍ ESTÁ! */}
          {paso === 4 && mostrarPaso4 && (
            <div className="space-y-6">
              {/* DEBUG VISUAL */}
              <div className="bg-green-100 border border-green-300 rounded-lg p-4 text-center">
                <div className="text-green-800 font-bold">🎯 ¡ESTAMOS EN EL PASO 4!</div>
                <div className="text-green-600 text-sm">paso: {paso}, mostrarPaso4: {mostrarPaso4.toString()}</div>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {(() => {
                    const primerDiaTrabajo = diasConfig.find(d => d.esTrabajo);
                    const horaInicio = primerDiaTrabajo ? parseInt(primerDiaTrabajo.horaInicio.split(':')[0]) : 8;
                    const esDiurno = horaInicio >= 6 && horaInicio < 18;
                    return esDiurno ? <Moon className="h-8 w-8 text-purple-600" /> : <Sun className="h-8 w-8 text-purple-600" />;
                  })()}
                </div>
                <h3 className="text-2xl font-semibold mb-2">¡Rol Creado!</h3>
                <p className="text-gray-600 mb-4">
                  {(() => {
                    const primerDiaTrabajo = diasConfig.find(d => d.esTrabajo);
                    const horaInicio = primerDiaTrabajo ? parseInt(primerDiaTrabajo.horaInicio.split(':')[0]) : 8;
                    const esDiurno = horaInicio >= 6 && horaInicio < 18;
                    return esDiurno 
                      ? '¿Quieres crear también el patrón nocturno?'
                      : '¿Quieres crear también el patrón diurno?';
                  })()}
                </p>
              </div>

              <Card className="max-w-md mx-auto">
                <CardContent className="p-6 text-center">
                  <h4 className="font-medium text-purple-800 mb-4">Patrón Complementario:</h4>
                  <div className="text-sm text-purple-600 font-mono">
                    {(() => {
                      const primerDiaTrabajo = diasConfig.find(d => d.esTrabajo);
                      const horaInicio = primerDiaTrabajo ? parseInt(primerDiaTrabajo.horaInicio.split(':')[0]) : 8;
                      const esDiurno = horaInicio >= 6 && horaInicio < 18;
                      return esDiurno 
                        ? `"N ${diasTrabajo}x${diasDescanso}x12 20:00 08:00"`
                        : `"D ${diasTrabajo}x${diasDescanso}x12 08:00 20:00"`;
                    })()}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={handleCerrar}
                >
                  No, gracias
                </Button>
                <Button 
                  onClick={handleCrearComplementario}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 px-6"
                >
                  {(() => {
                    const primerDiaTrabajo = diasConfig.find(d => d.esTrabajo);
                    const horaInicio = primerDiaTrabajo ? parseInt(primerDiaTrabajo.horaInicio.split(':')[0]) : 8;
                    const esDiurno = horaInicio >= 6 && horaInicio < 18;
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
