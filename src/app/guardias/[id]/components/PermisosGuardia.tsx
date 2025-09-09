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
import { Trash2, Plus, Calendar, FileText } from 'lucide-react';
import dayjs from 'dayjs';

interface Permiso {
  id: string;
  guardia_id: string;
  fecha: string;
  tipo: string;
  observacion?: string;
}

interface PermisosGuardiaProps {
  guardiaId: string;
}

const tiposPermiso = [
  { value: 'licencia', label: 'Licencia' },
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'permiso_con_goce', label: 'Permiso con goce' },
  { value: 'permiso_sin_goce', label: 'Permiso sin goce' },
];

export default function PermisosGuardia({ guardiaId }: PermisosGuardiaProps) {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    tipo: '',
    fechaInicio: '',
    fechaFin: '',
    observaciones: ''
  });

  useEffect(() => {
    if (guardiaId) {
      cargarPermisos();
    }
  }, [guardiaId]);

  const cargarPermisos = async () => {
    if (!guardiaId) {
      logger.warn('No se proporcionó guardiaId para cargar permisos');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/guardias/permisos?guardiaId=${guardiaId}`);
      if (!response.ok) throw new Error('Error al cargar permisos');
      const result = await response.json();
      setPermisos(result.data || []);
    } catch (error) {
      logger.error('Error cargando permisos::', error);
      setPermisos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guardiaId) {
      alert('Error: No se proporcionó ID de guardia');
      return;
    }
    
    if (!formData.tipo || !formData.fechaInicio || !formData.fechaFin) {
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
          tipo: formData.tipo,
          desde: formData.fechaInicio,
          hasta: formData.fechaFin,
          observaciones: formData.observaciones
        })
      });

      if (!response.ok) throw new Error('Error al guardar permiso');

      logger.debug("Formulario de permisos y finiquito guardado con éxito");
      
      // Limpiar formulario
      setFormData({
        tipo: '',
        fechaInicio: '',
        fechaFin: '',
        observaciones: ''
      });

      // Recargar permisos
      await cargarPermisos();
    } catch (error) {
      logger.error('Error guardando permiso::', error);
      alert('Error al guardar el permiso');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminarPermiso = async (permisoId: string) => {
    try {
      const response = await fetch(`/api/guardias/permisos/${permisoId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar permiso');
      }

      await cargarPermisos();
    } catch (error) {
      logger.error('Error eliminando permiso::', error);
      alert('Error al eliminar el permiso');
    }
  };

  const getTipoLabel = (tipo: string) => {
    const tipoObj = tiposPermiso.find(t => t.value === tipo);
    return tipoObj ? tipoObj.label : tipo;
  };

  return (
    <div className="space-y-6">
      {/* Formulario de nuevo permiso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nuevo Permiso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Permiso *</Label>
                <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposPermiso.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fechaInicio">Fecha Inicio *</Label>
                <Input
                  id="fechaInicio"
                  type="date"
                  value={formData.fechaInicio}
                  onChange={(e) => setFormData({...formData, fechaInicio: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaFin">Fecha Término *</Label>
                <Input
                  id="fechaFin"
                  type="date"
                  value={formData.fechaFin}
                  onChange={(e) => setFormData({...formData, fechaFin: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Comentario (opcional)</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                placeholder="Agregar comentario adicional..."
                rows={3}
              />
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Guardando...' : 'Guardar Permiso'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Listado de permisos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Permisos Registrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
              <span className="ml-2">Cargando permisos...</span>
            </div>
          ) : !Array.isArray(permisos) || permisos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay permisos registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {permisos.map((permiso) => {
                if (!permiso || !permiso.id) return null;
                return (
                  <div key={permiso.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{getTipoLabel(permiso.tipo || '')}</span>
                        <span className="text-sm text-gray-500">
                          {permiso.fecha ? dayjs(permiso.fecha).format('DD/MM/YYYY') : 'Fecha no disponible'}
                        </span>
                      </div>
                      {permiso.observacion && (
                        <p className="text-sm text-gray-600 mt-1">{permiso.observacion}</p>
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminar Permiso</AlertDialogTitle>
                          <AlertDialogDescription>
                            ¿Estás seguro de que quieres eliminar este permiso? Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleEliminarPermiso(permiso.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 