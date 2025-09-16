"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Save, Trash2 } from 'lucide-react';

interface ComentarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  turnoId: string;
  fecha: string;
  comentarioActual?: string;
  puestoNombre?: string;
  guardiaNombre?: string;
  onComentarioSaved?: (comentario: string | null) => void;
}

export function ComentarioModal({
  isOpen,
  onClose,
  turnoId,
  fecha,
  comentarioActual = '',
  puestoNombre = '',
  guardiaNombre = '',
  onComentarioSaved
}: ComentarioModalProps) {
  const [comentario, setComentario] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  // Cargar comentario actual cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setComentario(comentarioActual || '');
    }
  }, [isOpen, comentarioActual]);

  const handleSave = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/turnos/comentarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          turno_id: turnoId,
          fecha: fecha,
          comentario: comentario.trim()
        }),
      });

      const result = await response.json();

      if (result.success) {
        addToast({
          title: "Comentario guardado",
          description: "El comentario se ha guardado correctamente.",
          type: "success"
        });
        
        onComentarioSaved?.(comentario.trim() || null);
        onClose();
      } else {
        throw new Error(result.error || 'Error al guardar comentario');
      }
    } catch (error) {
      console.error('Error guardando comentario:', error);
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar el comentario",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/turnos/comentarios?turno_id=${turnoId}&fecha=${fecha}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        addToast({
          title: "Comentario eliminado",
          description: "El comentario se ha eliminado correctamente.",
          type: "success"
        });
        
        onComentarioSaved?.(null);
        setComentario('');
        onClose();
      } else {
        throw new Error(result.error || 'Error al eliminar comentario');
      }
    } catch (error) {
      console.error('Error eliminando comentario:', error);
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar el comentario",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const titulo = `Comentario${puestoNombre ? ` - ${puestoNombre}` : ''}${guardiaNombre ? ` (${guardiaNombre})` : ''}`;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {titulo}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Comentario:</label>
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Escribe un comentario sobre este turno..."
              rows={4}
              className="resize-none"
              disabled={isLoading}
            />
          </div>
          
          <div className="flex justify-between">
            <div className="flex gap-2">
              {comentarioActual && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="min-w-[100px]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Guardando...
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
