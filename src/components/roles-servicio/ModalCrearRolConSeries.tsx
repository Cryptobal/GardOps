'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Clock, 
  Calendar, 
  Save, 
  X, 
  Eye, 
  AlertCircle,
  CheckCircle,
  Info,
  Sun,
  Moon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SerieDia } from '@/lib/schemas/roles-servicio';
import { 
  validarSerieDias, 
  calcularNomenclaturaConSeries,
  obtenerEstadisticasSerie,
  generarSeriePorDefecto 
} from '@/lib/utils/roles-servicio-series';

interface ModalCrearRolConSeriesProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rolData: any) => Promise<void>;
  tenantId?: string;
}

interface DiaSerie {
  posicion_en_ciclo: number;
  es_dia_trabajo: boolean;
  hora_inicio: string;
  hora_termino: string;
  horas_turno: number;
  observaciones: string;
}

export default function ModalCrearRolConSeries({
  isOpen,
  onClose,
  onSave,
  tenantId
}: ModalCrearRolConSeriesProps) {
  const { toast } = useToast();
  
  // Estados del formulario
  const [diasTrabajo, setDiasTrabajo] = useState(4);
  const [diasDescanso, setDiasDescanso] = useState(4);
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaTermino, setHoraTermino] = useState('20:00');
  const [descripcion, setDescripcion] = useState('');
  const [tieneHorariosVariables, setTieneHorariosVariables] = useState(false);
  
  // Estados de la serie
  const [serieDias, setSerieDias] = useState<DiaSerie[]>([]);
  const [nomenclaturaCalculada, setNomenclaturaCalculada] = useState('');
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [erroresValidacion, setErroresValidacion] = useState<string[]>([]);
  
  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState(false);

  // Generar serie por defecto cuando cambian los parámetros básicos
  useEffect(() => {
    if (diasTrabajo > 0 && diasDescanso > 0) {
      const seriePorDefecto = generarSeriePorDefecto(
        diasTrabajo,
        diasDescanso,
        horaInicio,
        horaTermino
      );
      setSerieDias(seriePorDefecto);
    }
  }, [diasTrabajo, diasDescanso, horaInicio, horaTermino]);

  // Calcular nomenclatura y estadísticas cuando cambia la serie
  useEffect(() => {
    if (serieDias.length > 0) {
      try {
        const nomenclatura = calcularNomenclaturaConSeries(
          diasTrabajo,
          diasDescanso,
          serieDias
        );
        setNomenclaturaCalculada(nomenclatura);
        
        const stats = obtenerEstadisticasSerie(serieDias);
        setEstadisticas(stats);
        
        // Validar serie
        const validacion = validarSerieDias(serieDias, diasTrabajo, diasDescanso);
        setErroresValidacion(validacion.errores);
      } catch (error) {
        console.error('Error calculando nomenclatura:', error);
        setNomenclaturaCalculada('Error en cálculo');
        setErroresValidacion(['Error en el cálculo de la nomenclatura']);
      }
    }
  }, [serieDias, diasTrabajo, diasDescanso]);

  const handleDiaChange = (index: number, field: keyof DiaSerie, value: any) => {
    const nuevaSerie = [...serieDias];
    nuevaSerie[index] = { ...nuevaSerie[index], [field]: value };
    
    // Si cambia es_dia_trabajo, limpiar horarios si es necesario
    if (field === 'es_dia_trabajo' && !value) {
      nuevaSerie[index].hora_inicio = '';
      nuevaSerie[index].hora_termino = '';
      nuevaSerie[index].horas_turno = 0;
    }
    
    setSerieDias(nuevaSerie);
  };

  const calcularHorasTurno = (horaInicio: string, horaTermino: string): number => {
    if (!horaInicio || !horaTermino) return 0;
    
    const [horaInicioNum, minutoInicioNum] = horaInicio.split(':').map(Number);
    const [horaTerminoNum, minutoTerminoNum] = horaTermino.split(':').map(Number);
    
    let horasTurno = (horaTerminoNum - horaInicioNum) + (minutoTerminoNum - minutoInicioNum) / 60;
    
    if (horasTurno <= 0) {
      horasTurno += 24;
    }
    
    return Math.round(horasTurno * 100) / 100;
  };

  const handleHorarioChange = (index: number, tipo: 'inicio' | 'termino', value: string) => {
    const nuevaSerie = [...serieDias];
    const dia = nuevaSerie[index];
    
    if (tipo === 'inicio') {
      dia.hora_inicio = value;
    } else {
      dia.hora_termino = value;
    }
    
    // Recalcular horas de turno
    if (dia.hora_inicio && dia.hora_termino) {
      dia.horas_turno = calcularHorasTurno(dia.hora_inicio, dia.hora_termino);
    }
    
    setSerieDias(nuevaSerie);
  };

  const handleSave = async () => {
    if (erroresValidacion.length > 0) {
      toast({
        title: "Error de validación",
        description: "Por favor corrige los errores antes de guardar",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const rolData = {
        dias_trabajo: diasTrabajo,
        dias_descanso: diasDescanso,
        hora_inicio: horaInicio,
        hora_termino: horaTermino,
        descripcion: descripcion,
        estado: 'Activo',
        tenantId: tenantId,
        tiene_horarios_variables: tieneHorariosVariables,
        series_dias: tieneHorariosVariables ? serieDias : []
      };

      await onSave(rolData);
      
      toast({
        title: "Rol creado exitosamente",
        description: `Rol "${nomenclaturaCalculada}" creado correctamente`,
      });
      
      onClose();
    } catch (error) {
      console.error('Error guardando rol:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el rol de servicio",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDiasTrabajo(4);
    setDiasDescanso(4);
    setHoraInicio('08:00');
    setHoraTermino('20:00');
    setDescripcion('');
    setTieneHorariosVariables(false);
    setSerieDias([]);
    setErroresValidacion([]);
    setVistaPrevia(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Crear Nuevo Rol de Servicio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Configuración Básica */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuración Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="diasTrabajo">Días de Trabajo</Label>
                  <Input
                    id="diasTrabajo"
                    type="number"
                    min="1"
                    max="7"
                    value={diasTrabajo}
                    onChange={(e) => setDiasTrabajo(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label htmlFor="diasDescanso">Días de Descanso</Label>
                  <Input
                    id="diasDescanso"
                    type="number"
                    min="1"
                    max="7"
                    value={diasDescanso}
                    onChange={(e) => setDiasDescanso(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="horaInicio">Hora de Inicio (Horarios Fijos)</Label>
                  <Input
                    id="horaInicio"
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="horaTermino">Hora de Término (Horarios Fijos)</Label>
                  <Input
                    id="horaTermino"
                    type="time"
                    value={horaTermino}
                    onChange={(e) => setHoraTermino(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="horariosVariables"
                  checked={tieneHorariosVariables}
                  onCheckedChange={setTieneHorariosVariables}
                />
                <Label htmlFor="horariosVariables">
                  Usar horarios variables por día
                </Label>
              </div>

              <div>
                <Label htmlFor="descripcion">Descripción (Opcional)</Label>
                <Textarea
                  id="descripcion"
                  placeholder="Descripción del rol de servicio..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Serie de Días */}
          {tieneHorariosVariables && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Pintar Serie de Días
                  <Badge variant="outline">
                    {diasTrabajo + diasDescanso} días total
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {serieDias.map((dia, index) => (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg ${
                        dia.es_dia_trabajo 
                          ? 'border-blue-200 bg-blue-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={dia.es_dia_trabajo}
                            onCheckedChange={(checked) => 
                              handleDiaChange(index, 'es_dia_trabajo', checked)
                            }
                          />
                          <Label className="font-medium">
                            Día {dia.posicion_en_ciclo}
                          </Label>
                        </div>

                        {dia.es_dia_trabajo ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <Input
                                type="time"
                                value={dia.hora_inicio}
                                onChange={(e) => 
                                  handleHorarioChange(index, 'inicio', e.target.value)
                                }
                                className="w-24"
                              />
                              <span>-</span>
                              <Input
                                type="time"
                                value={dia.hora_termino}
                                onChange={(e) => 
                                  handleHorarioChange(index, 'termino', e.target.value)
                                }
                                className="w-24"
                              />
                              <Badge variant="secondary">
                                {dia.horas_turno}h
                              </Badge>
                            </div>
                          </>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100">
                            Día Libre
                          </Badge>
                        )}

                        <div className="flex-1">
                          <Input
                            placeholder="Observaciones (opcional)"
                            value={dia.observaciones}
                            onChange={(e) => 
                              handleDiaChange(index, 'observaciones', e.target.value)
                            }
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resumen y Validación */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5" />
                Resumen y Validación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nomenclatura Calculada</Label>
                  <div className="p-3 bg-gray-100 rounded-lg font-mono text-sm">
                    {nomenclaturaCalculada || 'Calculando...'}
                  </div>
                </div>
                
                {estadisticas && (
                  <div>
                    <Label>Estadísticas</Label>
                    <div className="p-3 bg-gray-100 rounded-lg text-sm space-y-1">
                      <div>Promedio: {estadisticas.horasPromedio}h/día</div>
                      <div>Rango: {estadisticas.horasMinimas}h - {estadisticas.horasMaximas}h</div>
                      <div>Variables: {estadisticas.tieneHorariosVariables ? 'Sí' : 'No'}</div>
                    </div>
                  </div>
                )}
              </div>

              {erroresValidacion.length > 0 && (
                <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                    <AlertCircle className="h-4 w-4" />
                    Errores de Validación
                  </div>
                  <ul className="text-sm text-red-600 space-y-1">
                    {erroresValidacion.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {erroresValidacion.length === 0 && serieDias.length > 0 && (
                <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 font-medium">
                    <CheckCircle className="h-4 w-4" />
                    Serie válida y lista para guardar
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setVistaPrevia(!vistaPrevia)}
              disabled={erroresValidacion.length > 0}
            >
              <Eye className="h-4 w-4 mr-2" />
              {vistaPrevia ? 'Ocultar' : 'Vista'} Previa
            </Button>
            
            <Button 
              onClick={handleSave}
              disabled={loading || erroresValidacion.length > 0}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Guardando...' : 'Guardar Rol'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
