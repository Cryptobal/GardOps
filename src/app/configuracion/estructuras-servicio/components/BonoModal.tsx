import { Authorize, GuardButton, can } from '@/lib/authz-ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";

interface BonoGlobal {
  id: string;
  codigo: string;
  nombre: string;
  clase: 'HABER' | 'DESCUENTO';
  naturaleza: 'IMPONIBLE' | 'NO_IMPONIBLE';
  descripcion?: string;
  formula_json?: any;
  tope_modo: 'NONE' | 'MONTO' | 'PORCENTAJE';
  tope_valor?: number;
  activo: boolean;
}

interface BonoModalProps {
  isOpen: boolean;
  onClose: () => void;
  bono: BonoGlobal | null;
  onSave: (data: Partial<BonoGlobal>) => Promise<void>;
}

export default function BonoModal({
  isOpen,
  onClose,
  bono,
  onSave,
}: BonoModalProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [naturaleza, setNaturaleza] = useState<'IMPONIBLE' | 'NO_IMPONIBLE'>('IMPONIBLE');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bono) {
      setNombre(bono.nombre);
      setDescripcion(bono.descripcion || "");
      setNaturaleza(bono.naturaleza);
    } else {
      setNombre("");
      setDescripcion("");
      setNaturaleza('IMPONIBLE');
    }
  }, [bono]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        nombre,
        descripcion: descripcion || undefined,
        naturaleza,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {bono ? "Editar Bono" : "Nuevo Bono"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del bono"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción del bono (opcional)"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="naturaleza">Naturaleza</Label>
            <select
              id="naturaleza"
              value={naturaleza}
              onChange={(e) => setNaturaleza(e.target.value as 'IMPONIBLE' | 'NO_IMPONIBLE')}
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="IMPONIBLE">Imponible</option>
              <option value="NO_IMPONIBLE">No Imponible</option>
            </select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}