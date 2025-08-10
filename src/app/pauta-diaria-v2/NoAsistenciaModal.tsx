'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { marcarAsistencia } from '@/lib/api/turnos';

interface Guardia {
  id: string;
  nombre: string;
}

export default function NoAsistenciaModal({
  open, onClose, pautaId, onDone
}: { open: boolean; onClose: () => void; pautaId: number; onDone: () => void; }) {
  const { addToast } = useToast();
  const [motivo, setMotivo] = useState<'con_aviso' | 'sin_aviso' | 'licencia' | 'permiso' | 'vacaciones' | 'finiquito'>('sin_aviso');
  const [asignarCobertura, setAsignarCobertura] = useState(false);
  const [guardias, setGuardias] = useState<Guardia[]>([]);
  const [guardiaReemplazo, setGuardiaReemplazo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { 
    if (open) {
      fetch('/api/guardias')
        .then(r => r.json())
        .then(d => setGuardias(d.data ?? []))
        .catch(err => {
          console.error('Error cargando guardias:', err);
          addToast({
            title: "Error",
            description: "No se pudieron cargar los guardias",
            type: "error"
          });
        });
    }
  }, [open, addToast]);

  const submit = async () => {
    if (!motivo) {
      addToast({
        title: "Error",
        description: "Debes seleccionar un motivo",
        type: "error"
      });
      return;
    }

    if (asignarCobertura && !guardiaReemplazo) {
      addToast({
        title: "Error",
        description: "Debes seleccionar un guardia de reemplazo",
        type: "error"
      });
      return;
    }

    setLoading(true);
    try {
      let response;
      
      if (asignarCobertura && guardiaReemplazo) {
        // Con reemplazo
        response = await marcarAsistencia({
          pautaId,
          estado: 'reemplazo',
          motivo,
          reemplazo_guardia_id: parseInt(guardiaReemplazo)
        });
      } else {
        // Sin reemplazo - primero marcar inasistencia
        response = await marcarAsistencia({
          pautaId,
          estado: 'inasistencia',
          motivo
        });
        
        if (response.ok) {
          // Luego marcar sin cobertura
          response = await marcarAsistencia({
            pautaId,
            estado: 'sin_cobertura'
          });
        }
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }
      
      addToast({
        title: "Éxito",
        description: "Estado actualizado correctamente",
        type: "success"
      });
      
      onClose(); 
      onDone();
    } catch (error) {
      console.error('Error enviando datos:', error);
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar los datos",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  
  return (
    <div className="fixed inset-0 grid place-items-center z-50 bg-black/60 dark:bg-black/70 backdrop-blur-[1px]">
      <div className="w-[min(96vw,520px)] rounded-xl border bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 shadow-xl">
        <CardHeader>
          <CardTitle>No asistió</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Select value={motivo} onValueChange={(value: any) => setMotivo(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="con_aviso">Con aviso</SelectItem>
                <SelectItem value="sin_aviso">Sin aviso</SelectItem>
                <SelectItem value="licencia">Licencia</SelectItem>
                <SelectItem value="permiso">Permiso</SelectItem>
                <SelectItem value="vacaciones">Vacaciones</SelectItem>
                <SelectItem value="finiquito">Finiquito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch 
              id="asignarCobertura" 
              checked={asignarCobertura} 
              onCheckedChange={setAsignarCobertura}
            />
            <Label htmlFor="asignarCobertura">Asignar cobertura ahora</Label>
          </div>

          {asignarCobertura && (
            <div className="space-y-2">
              <Label htmlFor="guardia">Guardia de reemplazo</Label>
              <Select value={guardiaReemplazo} onValueChange={setGuardiaReemplazo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona guardia" />
                </SelectTrigger>
                <SelectContent>
                  {guardias.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              onClick={submit}
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Confirmar'}
            </Button>
          </div>
        </CardContent>
      </div>
    </div>
  );
}
