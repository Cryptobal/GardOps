import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

interface HistorialEntry {
  fecha: string;
  accion: string;
  datos_anteriores: any;
  datos_nuevos: any;
}

interface HistorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  historial: HistorialEntry[];
  instalacionNombre: string;
  rolNombre: string;
}

export default function HistorialModal({
  isOpen,
  onClose,
  historial,
  instalacionNombre,
  rolNombre
}: HistorialModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Historial de Cambios - {instalacionNombre} - {rolNombre}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Datos Anteriores</TableHead>
                <TableHead>Datos Nuevos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historial && historial.length > 0 ? (
                historial.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {new Date(entry.fecha).toLocaleDateString('es-CL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.accion === 'inactivar' ? "destructive" : "default"}>
                        {entry.accion === 'inactivar' ? (
                          <>
                            <X className="h-3 w-3 mr-1" />
                            Inactivación
                          </>
                        ) : entry.accion === 'activar' ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Activación
                          </>
                        ) : (
                          entry.accion
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <pre className="text-xs whitespace-pre-wrap">
                        {JSON.stringify(entry.datos_anteriores, null, 2)}
                      </pre>
                    </TableCell>
                    <TableCell>
                      <pre className="text-xs whitespace-pre-wrap">
                        {JSON.stringify(entry.datos_nuevos, null, 2)}
                      </pre>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No hay registros de cambios
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}