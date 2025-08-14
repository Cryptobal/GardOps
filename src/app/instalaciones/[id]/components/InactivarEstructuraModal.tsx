'use client';

import { Authorize, GuardButton, can } from '@/lib/authz-ui.tsx'
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';

interface InactivarEstructuraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (crearNueva: boolean, motivo: string) => Promise<void>;
  rolNombre: string;
}

export default function InactivarEstructuraModal({
  isOpen,
  onClose,
  onConfirm,
  rolNombre,
}: InactivarEstructuraModalProps) {
  const { error: notifyError } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [crearNueva, setCrearNueva] = useState(true);


  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm(crearNueva, '');
      onClose();
    } catch (error) {
      console.error('Error en confirmación:', error);
      notifyError("Error al inactivar estructura", error instanceof Error ? error.message : "No se pudo completar la operación");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-lg border border-border/10 bg-card">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">
                Confirmar Inactivación Estructura Actual
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                disabled={isLoading}
                className="h-8 w-8 rounded-full hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Estás por inactivar la estructura de sueldo actual del rol <span className="font-semibold">"{rolNombre}"</span>
              </p>
              <p className="text-xs text-muted-foreground">
                La estructura se inactivará con fecha de hoy. Podrás crear una nueva estructura manualmente después si lo deseas.
              </p>
              <p className="text-xs text-destructive mt-1">
                Esta acción solo afecta a la estructura de sueldo, el rol seguirá activo
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="crear-nueva"
                  checked={crearNueva}
                  onCheckedChange={(checked) => setCrearNueva(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="crear-nueva"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Crear nueva estructura automáticamente con los valores actuales
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Se creará una nueva estructura con los mismos bonos y montos, vigente desde hoy
                  </p>
                </div>
              </div>
              

            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 border-muted-foreground/20"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isLoading}
                variant="destructive"
                className="flex-1"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin"></div>
                    <span>Inactivando...</span>
                  </div>
                ) : (
                  'Inactivar'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
