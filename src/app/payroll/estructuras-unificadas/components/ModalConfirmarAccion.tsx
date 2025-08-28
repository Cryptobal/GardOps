'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, User, AlertTriangle, CheckCircle } from 'lucide-react';

interface EstructuraUnificada {
  id: string;
  tipo: 'servicio' | 'guardia';
  instalacion_nombre?: string;
  guardia_nombre?: string;
  guardia_rut?: string;
  activo: boolean;
}

interface ModalConfirmarAccionProps {
  estructura: EstructuraUnificada | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function ModalConfirmarAccion({ 
  estructura, 
  isOpen, 
  onClose, 
  onConfirm, 
  loading = false 
}: ModalConfirmarAccionProps) {
  if (!estructura) return null;

  const isActivar = !estructura.activo;
  const tipoTexto = estructura.tipo === 'servicio' ? 'Servicio' : 'Guardia';
  const accionTexto = isActivar ? 'activar' : 'inactivar';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isActivar ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            )}
            {isActivar ? 'Activar' : 'Inactivar'} Estructura
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ¿Estás seguro de que quieres {accionTexto} la estructura de {tipoTexto.toLowerCase()}?
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

          {/* Información adicional para inactivación */}
          {!isActivar && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-sm text-orange-800">
                <strong>⚠️ Importante:</strong> Al inactivar esta estructura:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Se registrará la fecha de inactivación como hoy</li>
                  <li>La estructura ya no estará disponible para nuevos cálculos</li>
                  <li>Los datos históricos se mantendrán intactos</li>
                </ul>
              </div>
            </div>
          )}

          {/* Información adicional para activación */}
          {isActivar && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">
                <strong>✅ Información:</strong> Al activar esta estructura:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>La estructura estará disponible para nuevos cálculos</li>
                  <li>Se mantendrán todos los datos y configuraciones</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={loading}
            variant={isActivar ? "default" : "destructive"}
          >
            {loading ? 'Procesando...' : (isActivar ? 'Activar' : 'Inactivar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
