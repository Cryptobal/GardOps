'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Eye, EyeOff, RotateCcw } from 'lucide-react';

interface FiltrosAvanzadosProps {
  filtros: {
    fechaInicio: string;
    fechaFin: string;
    estado: string;
    pagado: string;
    instalacion: string;
    busqueda: string;
  };
  setFiltros: (filtros: any) => void;
  showFiltros: boolean;
  setShowFiltros: (show: boolean) => void;
  instalaciones: Array<{ id: string; nombre: string }>;
}

export default function FiltrosAvanzados({
  filtros,
  setFiltros,
  showFiltros,
  setShowFiltros,
  instalaciones
}: FiltrosAvanzadosProps) {
  
  const limpiarFiltros = () => {
    setFiltros({
      fechaInicio: '',
      fechaFin: '',
      estado: 'all',
      pagado: 'all',
      instalacion: 'all',
      busqueda: ''
    });
  };

  const filtrosActivos = Object.values(filtros).filter(valor => 
    valor !== '' && valor !== 'all'
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
            {filtrosActivos > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                {filtrosActivos} activo{filtrosActivos !== 1 ? 's' : ''}
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFiltros(!showFiltros)}
            >
              {showFiltros ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            {filtrosActivos > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={limpiarFiltros}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      {showFiltros && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Fecha Inicio */}
            <div className="space-y-2">
              <Label htmlFor="fecha-inicio">Fecha Inicio</Label>
              <Input
                id="fecha-inicio"
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) => setFiltros(prev => ({ ...prev, fechaInicio: e.target.value }))}
              />
            </div>

            {/* Fecha Fin */}
            <div className="space-y-2">
              <Label htmlFor="fecha-fin">Fecha Fin</Label>
              <Input
                id="fecha-fin"
                type="date"
                value={filtros.fechaFin}
                onChange={(e) => setFiltros(prev => ({ ...prev, fechaFin: e.target.value }))}
              />
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select 
                value={filtros.estado} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}
              >
                <SelectTrigger id="estado">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="reemplazo">Reemplazo</SelectItem>
                  <SelectItem value="ppc">PPC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pagado */}
            <div className="space-y-2">
              <Label htmlFor="pagado">Estado de Pago</Label>
              <Select 
                value={filtros.pagado} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, pagado: value }))}
              >
                <SelectTrigger id="pagado">
                  <SelectValue placeholder="Todos los pagos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="false">Pendientes</SelectItem>
                  <SelectItem value="true">Pagados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Instalación */}
            <div className="space-y-2">
              <Label htmlFor="instalacion">Instalación</Label>
              <Select 
                value={filtros.instalacion} 
                onValueChange={(value) => setFiltros(prev => ({ ...prev, instalacion: value }))}
              >
                <SelectTrigger id="instalacion">
                  <SelectValue placeholder="Todas las instalaciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {instalaciones.map((instalacion) => (
                    <SelectItem key={instalacion.id} value={instalacion.id}>
                      {instalacion.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Búsqueda */}
            <div className="space-y-2">
              <Label htmlFor="busqueda">Buscar</Label>
              <Input
                id="busqueda"
                placeholder="Nombre, RUT, instalación..."
                value={filtros.busqueda}
                onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
} 