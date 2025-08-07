'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, X } from 'lucide-react';

interface BonoGlobal {
  id: string;
  nombre: string;
  descripcion?: string;
  imponible: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

interface BonoModalProps {
  isOpen: boolean;
  onClose: () => void;
  bono?: BonoGlobal | null;
  onSave: (bono: Partial<BonoGlobal>) => Promise<void>;
}

export default function BonoModal({ isOpen, onClose, bono, onSave }: BonoModalProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    imponible: true,
    activo: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!bono;

  useEffect(() => {
    if (bono) {
      setFormData({
        nombre: bono.nombre,
        descripcion: bono.descripcion || '',
        imponible: bono.imponible,
        activo: bono.activo
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        imponible: true,
        activo: true
      });
    }
    setError('');
  }, [bono, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      setError('El nombre del bono es requerido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al guardar el bono');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="bono-modal-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Badge variant="outline">Editar</Badge>
                Bono: {bono?.nombre}
              </>
            ) : (
              <>
                <Badge variant="outline">Nuevo</Badge>
                Crear Bono Global
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Descripción oculta para accesibilidad */}
        <p id="bono-modal-desc" className="sr-only">
          Formulario para crear o editar un bono global. Complete el nombre, descripción, si es imponible y el estado.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre del Bono *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Colación, Movilización, Responsabilidad"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Descripción opcional del bono"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Label htmlFor="imponible">Tipo de Bono</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="imponible"
                  checked={formData.imponible}
                  onCheckedChange={(checked) => setFormData({ ...formData, imponible: checked })}
                  disabled={loading}
                />
                <Label htmlFor="imponible" className="text-sm">
                  {formData.imponible ? 'Imponible' : 'No Imponible'}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.imponible 
                  ? 'Se incluye en el cálculo de cotizaciones previsionales'
                  : 'No se incluye en el cálculo de cotizaciones previsionales'
                }
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activo">Estado</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                  disabled={loading}
                />
                <Label htmlFor="activo" className="text-sm">
                  {formData.activo ? 'Activo' : 'Inactivo'}
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Actualizar' : 'Crear'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
