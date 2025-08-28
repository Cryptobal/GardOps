'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, User, AlertTriangle, Trash2 } from 'lucide-react';

interface EstructuraUnificada {
  id: string;
  tipo: 'servicio' | 'guardia';
  instalacion_nombre?: string;
  guardia_nombre?: string;
  guardia_rut?: string;
  activo: boolean;
}

interface ModalEliminarEstructuraProps {
  estructura: EstructuraUnificada | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function ModalEliminarEstructura({ 
  estructura, 
  isOpen, 
  onClose, 
  onConfirm, 
  loading = false 
}: ModalEliminarEstructuraProps) {
  if (!estructura) return null;

  const tipoTexto = estructura.tipo === 'servicio' ? 'Servicio' : 'Guardia';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Eliminar Estructura
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>⚠️ ACCIÓN IRREVERSIBLE</strong>
              <br />
              ¿Estás seguro de que quieres eliminar permanentemente esta estructura de {tipoTexto.toLowerCase()}?
            </AlertDescription>
          </Alert>

          {/* Información de la estructura */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {estructura.tipo === 'servicio' ? (
                <Building2 className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
              <span className="font-medium">Estructura de {tipoTexto}</span>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {estructura.tipo === 'servicio' ? (
                <div>
                  <strong>Instalación:</strong> {estructura.instalacion_nombre || 'Sin instalación'}
                </div>
              ) : (
                <div>
                  <strong>Guardia:</strong> {estructura.guardia_nombre || 'Sin nombre'}
                  <br />
                  <strong>RUT:</strong> {estructura.guardia_rut || 'Sin RUT'}
                </div>
              )}
            </div>
          </div>

          {/* Advertencia de eliminación */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-800">
              <strong>🚨 CONSECUENCIAS DE LA ELIMINACIÓN:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Esta acción es <strong>PERMANENTE</strong> e irreversible</li>
                <li>Se eliminarán todos los datos asociados a esta estructura</li>
                <li>No se podrá recuperar la información eliminada</li>
                <li>Si hay cálculos de nómina que usen esta estructura, podrían verse afectados</li>
              </ul>
            </div>
          </div>

          {/* Confirmación adicional */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-sm text-yellow-800">
              <strong>💡 Recomendación:</strong>
              <br />
              En lugar de eliminar, considera inactivar la estructura para mantener el historial de datos.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={loading}
            variant="destructive"
          >
            {loading ? 'Eliminando...' : 'Eliminar Permanentemente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
