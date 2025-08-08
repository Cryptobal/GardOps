import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";

interface BonoGlobal {
  id: string;
  nombre: string;
  descripcion?: string;
  imponible: boolean;
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
  const [imponible, setImponible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bono) {
      setNombre(bono.nombre);
      setDescripcion(bono.descripcion || "");
      setImponible(bono.imponible);
    } else {
      setNombre("");
      setDescripcion("");
      setImponible(false);
    }
  }, [bono]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        nombre,
        descripcion: descripcion || undefined,
        imponible,
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
          <div className="flex items-center space-x-2">
            <Checkbox
              id="imponible"
              checked={imponible}
              onCheckedChange={(checked) => setImponible(checked as boolean)}
            />
            <Label htmlFor="imponible">Imponible</Label>
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