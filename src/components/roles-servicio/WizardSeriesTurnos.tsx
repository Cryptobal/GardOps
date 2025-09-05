'use client';

import React, { useState } from 'react';
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
  const [duracion, setDuracion] = useState(7);
  const [dias, setDias] = useState<DiaSimple[]>([]);
  const [rolCreado, setRolCreado] = useState<any>(null);

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
    setDias(prev => prev.map(d => 
      d.dia === dia ? { ...d, trabaja: !d.trabaja } : d
    ));
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
      
      setRolCreado(rolData);
      
      toast({
        title: "¡Rol creado!",
        description: `"${nomenclatura}" creado exitosamente`,
      });
      
      // IR AL PASO 4
      console.log('🔄 YENDO AL PASO 4...');
      setPaso(4);
      
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
      
      if (!rolCreado) return;
      
      const diasTrabajo = dias.filter(d => d.trabaja);
      const diasDescanso = duracion - diasTrabajo.length;
      
      // Determinar tipo opuesto
      const primerDia = diasTrabajo[0];
      const hora = parseInt(primerDia.inicio.split(':')[0]);
      const esDiurno = hora >= 6 && hora < 18;
      
      const tipoOpuesto = esDiurno ? 'N' : 'D';
      const inicioOpuesto = esDiurno ? '20:00' : '08:00';
      const finOpuesto = esDiurno ? '08:00' : '20:00';
      
      const nomenclaturaOpuesta = `${tipoOpuesto} ${diasTrabajo.length}x${diasDescanso}x12 ${inicioOpuesto} ${finOpuesto}`;
      
      const rolOpuesto = {
        nombre: nomenclaturaOpuesta,
        descripcion: `Rol complementario ${nomenclaturaOpuesta}`,
        activo: true,
        tipo: 'series',
        duracion_ciclo: duracion,
        dias_serie: dias.map(d => ({
          posicion: d.dia,
          trabaja: d.trabaja,
          hora_inicio: d.trabaja ? inicioOpuesto : null,
          hora_termino: d.trabaja ? finOpuesto : null
        }))
      };
      
      console.log('🚀 Creando opuesto:', rolOpuesto);
      
      await onSave(rolOpuesto);
      
      toast({
        title: "¡Complementario creado!",
        description: `"${nomenclaturaOpuesta}" creado exitosamente`,
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
    setDuracion(7);
    setDias([]);
    setRolCreado(null);
    onClose();
  };

  if (!isOpen) return null;

  const diasTrabajo = dias.filter(d => d.trabaja).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleCerrar}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-6 w-6" />
            Crear Serie de Turnos
          </DialogTitle>
          
          {/* Indicador simple */}
          <div className="flex justify-center gap-2 mt-4">
            <div className="text-xs text-blue-600 mb-2 w-full text-center">
              🔍 DEBUG: Paso {paso} de 4 | Días trabajo: {diasTrabajo}
            </div>
            {[1, 2, 3, 4].map((num) => (
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
              
              <div className="flex gap-3 justify-center">
                {[4, 7, 8, 14].map(d => (
                  <Button
                    key={d}
                    variant={duracion === d ? "default" : "outline"}
                    onClick={() => setDuracion(d)}
                    className="px-6 py-3"
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
                <h3 className="text-2xl font-semibold">¿Qué días se trabaja?</h3>
                <p className="text-gray-600">Serie de {duracion} días</p>
              </div>
              
              <div className="grid grid-cols-4 md:grid-cols-7 gap-3 max-w-4xl mx-auto">
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
              
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => setPaso(1)}>
                  Anterior
                </Button>
                <Button 
                  onClick={() => setPaso(3)} 
                  disabled={diasTrabajo === 0}
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
              </div>
              
              <div className="space-y-3 max-w-2xl mx-auto">
                {dias.filter(d => d.trabaja).map((dia) => (
                  <Card key={dia.dia} className="p-4">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-4">
                        <div className="w-16 text-center font-medium">
                          {dia.nombre}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={dia.inicio}
                            onChange={(e) => actualizarHorario(dia.dia, 'inicio', e.target.value)}
                            className="w-32"
                          />
                          <span>a</span>
                          <Input
                            type="time"
                            value={dia.fin}
                            onChange={(e) => actualizarHorario(dia.dia, 'fin', e.target.value)}
                            className="w-32"
                          />
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
                    "{calcularNomenclatura()}"
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => setPaso(2)}>
                  Anterior
                </Button>
                <Button 
                  onClick={handleCrearRol} 
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Creando...' : 'Crear Rol'}
                </Button>
              </div>
            </div>
          )}

          {/* PASO 4: ¡EL PASO QUE QUERÍAS! */}
          {paso === 4 && (
            <div className="space-y-6">
              {/* Banner de confirmación */}
              <div className="bg-green-100 border border-green-300 rounded-lg p-4 text-center">
                <div className="text-green-800 font-bold text-xl">🎉 ¡ROL CREADO EXITOSAMENTE!</div>
                <div className="text-green-600">Paso 4 de 4 - ¿Crear rol complementario?</div>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {(() => {
                    const primerDia = dias.find(d => d.trabaja);
                    const hora = primerDia ? parseInt(primerDia.inicio.split(':')[0]) : 8;
                    const esDiurno = hora >= 6 && hora < 18;
                    return esDiurno ? <Moon className="h-8 w-8 text-purple-600" /> : <Sun className="h-8 w-8 text-purple-600" />;
                  })()}
                </div>
                
                <h3 className="text-2xl font-semibold mb-2">¿Crear rol complementario?</h3>
                <p className="text-gray-600 mb-4">
                  {(() => {
                    const primerDia = dias.find(d => d.trabaja);
                    const hora = primerDia ? parseInt(primerDia.inicio.split(':')[0]) : 8;
                    const esDiurno = hora >= 6 && hora < 18;
                    return esDiurno 
                      ? '¿Quieres crear también el turno nocturno (20:00-08:00)?'
                      : '¿Quieres crear también el turno diurno (08:00-20:00)?';
                  })()}
                </p>
              </div>

              <Card className="max-w-md mx-auto">
                <CardContent className="p-6 text-center">
                  <h4 className="font-medium text-purple-800 mb-4">Vista previa:</h4>
                  <div className="text-sm text-purple-600 font-mono">
                    {(() => {
                      const primerDia = dias.find(d => d.trabaja);
                      const hora = primerDia ? parseInt(primerDia.inicio.split(':')[0]) : 8;
                      const esDiurno = hora >= 6 && hora < 18;
                      const diasTrabajo = dias.filter(d => d.trabaja).length;
                      const diasDescanso = duracion - diasTrabajo;
                      const tipo = esDiurno ? 'N' : 'D';
                      const horarios = esDiurno ? '20:00 08:00' : '08:00 20:00';
                      return `"${tipo} ${diasTrabajo}x${diasDescanso}x12 ${horarios}"`;
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
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {(() => {
                    const primerDia = dias.find(d => d.trabaja);
                    const hora = primerDia ? parseInt(primerDia.inicio.split(':')[0]) : 8;
                    const esDiurno = hora >= 6 && hora < 18;
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
