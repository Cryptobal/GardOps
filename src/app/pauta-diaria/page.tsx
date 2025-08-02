'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';

interface PautaDiariaItem {
  id: string | null;
  instalacion_id: string;
  instalacion_nombre: string;
  guardia_id: string | null;
  guardia_nombre: string | null;
  turno_nombre: string;
  fecha: string;
  estado: 'asistio' | 'inasistencia' | 'reemplazado' | 'sin_cubrir' | 'licencia' | 'vacaciones' | 'permiso' | 'finiquito';
  motivo?: string;
  reemplazo_nombre?: string;
  es_ppc: boolean;
}

export default function PautaDiariaPage() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [pautaDiaria, setPautaDiaria] = useState<PautaDiariaItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar datos de la pauta diaria
  const cargarPautaDiaria = async (fecha: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pauta-diaria?fecha=${fecha}`);
      if (response.ok) {
        const data = await response.json();
        setPautaDiaria(data);
      } else {
        console.error('Error al cargar pauta diaria');
        setPautaDiaria([]);
      }
    } catch (error) {
      console.error('Error:', error);
      setPautaDiaria([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPautaDiaria(fechaSeleccionada);
  }, [fechaSeleccionada]);

  // Renderizar badge según estado
  const renderEstadoBadge = (estado: string, motivo?: string, reemplazo?: string) => {
    const config = {
      asistio: { label: 'Asistió', variant: 'default', icon: '✅' },
      inasistencia: { label: 'Inasistencia', variant: 'destructive', icon: '❌' },
      reemplazado: { label: 'Reemplazado', variant: 'secondary', icon: '🔁' },
      sin_cubrir: { label: 'Sin cubrir', variant: 'outline', icon: '🕳️' },
      licencia: { label: 'Licencia', variant: 'secondary', icon: '📄' },
      vacaciones: { label: 'Vacaciones', variant: 'secondary', icon: '🌴' },
      permiso: { label: 'Permiso', variant: 'secondary', icon: '💼' },
      finiquito: { label: 'Finiquito', variant: 'destructive', icon: '❌' }
    };

    const configItem = config[estado as keyof typeof config] || config.asistio;

    return (
      <div className="flex items-center gap-2">
        <Badge variant={configItem.variant as any}>
          <span className="mr-1">{configItem.icon}</span>
          {configItem.label}
        </Badge>
        {motivo && (
          <span className="text-xs text-muted-foreground">({motivo})</span>
        )}
        {reemplazo && (
          <span className="text-xs text-blue-600">→ {reemplazo}</span>
        )}
      </div>
    );
  };

  // Navegación de fechas
  const cambiarFecha = (dias: number) => {
    const fechaActual = new Date(fechaSeleccionada + 'T00:00:00');
    fechaActual.setDate(fechaActual.getDate() + dias);
    setFechaSeleccionada(format(fechaActual, 'yyyy-MM-dd'));
  };

  const irAHoy = () => {
    setFechaSeleccionada(format(new Date(), 'yyyy-MM-dd'));
  };

  // Acciones por celda (placeholders para futuras implementaciones)
  const renderAcciones = (item: PautaDiariaItem) => {
    return (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="h-6 px-2">
          ✓
        </Button>
        <Button size="sm" variant="outline" className="h-6 px-2">
          🔄
        </Button>
      </div>
    );
  };

  console.log("✅ Vista Pauta Diaria generada correctamente");

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-center mb-2">Pauta Diaria</h1>
          <p className="text-muted-foreground text-center">
            Control de asistencia y estados de guardias
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Reporte
          </Button>
        </div>
      </div>

      {/* Selector de fecha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Seleccionar Fecha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="fecha">Fecha:</Label>
              <DatePickerComponent
                value={fechaSeleccionada}
                onChange={setFechaSeleccionada}
                placeholder="Seleccionar fecha"
                className="w-48"
              />
            </div>
            
            {/* Botones de navegación */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => cambiarFecha(-1)}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={irAHoy}
                className="h-8 px-3"
              >
                Hoy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cambiarFecha(1)}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className={cn(
              "text-sm",
              fechaSeleccionada === format(new Date(), 'yyyy-MM-dd') 
                ? "text-green-500 font-medium" 
                : "text-muted-foreground"
            )}>
              {format(new Date(fechaSeleccionada), 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es })}
              {fechaSeleccionada === format(new Date(), 'yyyy-MM-dd') && (
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Hoy
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de pauta diaria */}
      <Card>
        <CardHeader>
          <CardTitle>Asignaciones del Día</CardTitle>
          <p className="text-sm text-muted-foreground">
            {pautaDiaria.length} instalaciones con asignaciones
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : pautaDiaria.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay asignaciones para la fecha seleccionada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instalación</TableHead>
                    <TableHead>Guardia Asignado</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pautaDiaria.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.instalacion_nombre}
                      </TableCell>
                      <TableCell>
                        {item.es_ppc ? (
                          <span className="text-muted-foreground italic">PPC - Sin asignar</span>
                        ) : (
                          item.guardia_nombre
                        )}
                      </TableCell>
                      <TableCell>{item.turno_nombre}</TableCell>
                      <TableCell>
                        {renderEstadoBadge(item.estado, item.motivo, item.reemplazo_nombre)}
                      </TableCell>
                      <TableCell>
                        {renderAcciones(item)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumen de estados */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Estados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {pautaDiaria.filter(item => item.estado === 'asistio').length}
              </div>
              <div className="text-sm text-muted-foreground">Asistieron</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {pautaDiaria.filter(item => item.estado === 'inasistencia').length}
              </div>
              <div className="text-sm text-muted-foreground">Inasistencias</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {pautaDiaria.filter(item => item.estado === 'reemplazado').length}
              </div>
              <div className="text-sm text-muted-foreground">Reemplazos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {pautaDiaria.filter(item => item.estado === 'sin_cubrir').length}
              </div>
              <div className="text-sm text-muted-foreground">Sin cubrir</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 