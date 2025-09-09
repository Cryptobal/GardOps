"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Plus, Calendar, FileText, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';

interface Finiquito {
  id: string;
  dia: string;
  tipo: string;
  observacion?: string;
  instalacion_nombre?: string;
  rol_servicio_nombre?: string;
}

interface FiniquitoGuardiaProps {
  guardiaId: string;
}

const motivosFiniquito = [
  { value: 'renuncia', label: 'Renuncia' },
  { value: 'termino_contrato', label: 'Término de contrato' },
  { value: 'despido', label: 'Despido' },
  { value: 'otro', label: 'Otro' },
];

export default function FiniquitoGuardia({ guardiaId }: FiniquitoGuardiaProps) {
  const [finiquitos, setFiniquitos] = useState<Finiquito[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fechaTermino: '',
    motivo: '',
    comentario: ''
  });

  useEffect(() => {
    cargarFiniquitos();
  }, [guardiaId]);

  const cargarFiniquitos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/guardias/permisos?guardiaId=${guardiaId}&tipo=finiquito`);
      if (!response.ok) throw new Error('Error al cargar finiquitos');
      const data = await response.json();
      setFiniquitos(Array.isArray(data) ? data : []);
    } catch (error) {
      logger.error('Error cargando finiquitos::', error);
      setFiniquitos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fechaTermino || !formData.motivo) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/guardias/permisos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardiaId,
          tipo: 'finiquito',
          fecha: formData.fechaTermino,
          observaciones: `Motivo: ${formData.motivo}${formData.comentario ? ` - ${formData.comentario}` : ''}`
        })
      });

      if (!response.ok) throw new Error('Error al registrar finiquito');

      logger.debug("Formulario de permisos y finiquito guardado con éxito");
      
      // Limpiar formulario
      setFormData({
        fechaTermino: '',
        motivo: '',
        comentario: ''
      });

      // Recargar finiquitos
      await cargarFiniquitos();
    } catch (error) {
      logger.error('Error registrando finiquito::', error);
      alert('Error al registrar el finiquito');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminarFiniquito = async (finiquitoId: string) => {
    try {
      const response = await fetch(`/api/guardias/permisos/${finiquitoId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Error al eliminar finiquito');

      await cargarFiniquitos();
    } catch (error) {
      logger.error('Error eliminando finiquito::', error);
      alert('Error al eliminar el finiquito');
    }
  };

  const getMotivoLabel = (motivo: string) => {
    const motivoObj = motivosFiniquito.find(m => m.value === motivo);
    return motivoObj ? motivoObj.label : motivo;
  };

  return (
    <div className="space-y-6">
      {/* Alerta informativa */}
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-800 dark:text-orange-200">Información importante</h4>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                Al registrar un finiquito, el sistema automáticamente eliminará los turnos asignados desde la fecha de término 
                y creará PPC (Pautas de Personal de Contingencia) a partir del día siguiente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulario de finiquito */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Registrar Finiquito
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fechaTermino">Fecha de Término de Contrato *</Label>
                <Input
                  id="fechaTermino"
                  type="date"
                  value={formData.fechaTermino}
                  onChange={(e) => setFormData({...formData, fechaTermino: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo *</Label>
                <Select value={formData.motivo} onValueChange={(value) => setFormData({...formData, motivo: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {motivosFiniquito.map((motivo) => (
                      <SelectItem key={motivo.value} value={motivo.value}>
                        {motivo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comentario">Comentario Adicional (opcional)</Label>
              <Textarea
                id="comentario"
                value={formData.comentario}
                onChange={(e) => setFormData({...formData, comentario: e.target.value})}
                placeholder="Agregar comentario adicional sobre el finiquito..."
                rows={3}
              />
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="submit" disabled={saving} className="w-full bg-red-600 hover:bg-red-700">
                  {saving ? 'Registrando...' : 'Registrar Finiquito'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Finiquito</AlertDialogTitle>
                  <AlertDialogDescription>
                    ¿Estás seguro de que quieres registrar el finiquito para el {dayjs(formData.fechaTermino).format('DD/MM/YYYY')}?
                    <br /><br />
                    <strong>Esta acción:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Eliminará todos los turnos asignados desde esa fecha</li>
                      <li>Creará PPC (Pautas de Personal de Contingencia) a partir del día siguiente</li>
                      <li>No se puede deshacer fácilmente</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleSubmit}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Confirmar Finiquito
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </form>
        </CardContent>
      </Card>

      {/* Listado de finiquitos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Finiquitos Registrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
              <span className="ml-2">Cargando finiquitos...</span>
            </div>
          ) : !finiquitos || finiquitos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay finiquitos registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {finiquitos.map((finiquito) => (
                <div key={finiquito.id} className="flex items-center justify-between p-4 border rounded-lg bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-red-800 dark:text-red-200">Finiquito</span>
                      <span className="text-sm text-red-600 dark:text-red-300">
                        {dayjs(finiquito.dia).format('DD/MM/YYYY')}
                      </span>
                    </div>
                    {finiquito.observacion && (
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">{finiquito.observacion}</p>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 border-red-300">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar Finiquito</AlertDialogTitle>
                        <AlertDialogDescription>
                          ¿Estás seguro de que quieres eliminar este finiquito? Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleEliminarFiniquito(finiquito.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 