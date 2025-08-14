import { Authorize, GuardButton, can } from '@/lib/authz-ui'
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Filter, RotateCcw, Calendar, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface FiltrosAvanzadosProps {
  filtros: {
    fechaInicio: string;
    fechaFin: string;
    estado: string;
    pagado: string;
    instalacion: string;
    busqueda: string;
    mes?: string;
    montoMin?: string;
    montoMax?: string;
    rangoFecha?: string;
  };
  setFiltros: (filtros: any) => void;
  showFiltros?: boolean;
  setShowFiltros?: (show: boolean) => void;
  instalaciones: Array<{ id: string; nombre: string }>;
  embedded?: boolean; // Cuando es true, no renderiza Card/Accordion; solo el contenido
}

export default function FiltrosAvanzados({
  filtros,
  setFiltros,
  showFiltros = true,
  setShowFiltros,
  instalaciones,
  embedded = false,
}: FiltrosAvanzadosProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  
  // Generar opciones de meses (últimos 12 meses)
  const generarOpcionesMeses = () => {
    const opciones = [];
    const fechaActual = new Date();
    
    for (let i = 0; i < 12; i++) {
      const fecha = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - i, 1);
      const valor = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const texto = fecha.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long' 
      });
      
      opciones.push({ valor, texto });
    }
    
    return opciones;
  };

  // Rangos de fecha predefinidos
  const rangosFecha = [
    { valor: 'hoy', texto: 'Hoy', icon: Calendar },
    { valor: 'ayer', texto: 'Ayer', icon: Calendar },
    { valor: 'semana', texto: 'Esta semana', icon: Calendar },
    { valor: 'mes', texto: 'Este mes', icon: Calendar },
    { valor: 'trimestre', texto: 'Este trimestre', icon: Calendar },
    { valor: 'año', texto: 'Este año', icon: Calendar },
    { valor: 'personalizado', texto: 'Personalizado', icon: Calendar }
  ];

  const opcionesMeses = generarOpcionesMeses();
  
  const limpiarFiltros = () => {
    setFiltros({
      fechaInicio: '',
      fechaFin: '',
      estado: 'all',
      pagado: 'all',
      instalacion: 'all',
      busqueda: '',
      mes: '',
      montoMin: '',
      montoMax: '',
      rangoFecha: ''
    });
  };

  const filtrosActivos = Object.values(filtros).filter(valor => 
    valor !== '' && valor !== 'all'
  ).length;

  // Convertir strings de fecha a objetos Date para el DatePicker
  const fechaInicioDate = filtros.fechaInicio ? new Date(filtros.fechaInicio) : undefined;
  const fechaFinDate = filtros.fechaFin ? new Date(filtros.fechaFin) : undefined;

  const handleFechaInicioChange = (date: Date | undefined) => {
    const fechaString = date ? date.toISOString().split('T')[0] : '';
    setFiltros(prev => ({ ...prev, fechaInicio: fechaString }));
  };

  const handleFechaFinChange = (date: Date | undefined) => {
    const fechaString = date ? date.toISOString().split('T')[0] : '';
    setFiltros(prev => ({ ...prev, fechaFin: fechaString }));
  };

  const handleMesChange = (mesSeleccionado: string) => {
    if (mesSeleccionado === 'all') {
      setFiltros(prev => ({ 
        ...prev, 
        mes: '',
        fechaInicio: '',
        fechaFin: ''
      }));
      return;
    }

    const [año, mes] = mesSeleccionado.split('-');
    const fechaInicio = `${año}-${mes}-01`;
    const fechaFin = new Date(parseInt(año), parseInt(mes), 0).toISOString().split('T')[0];
    
    setFiltros(prev => ({ 
      ...prev, 
      mes: mesSeleccionado,
      fechaInicio,
      fechaFin
    }));
  };

  const handleRangoFechaChange = (rango: string) => {
    const hoy = new Date();
    let fechaInicio = '';
    let fechaFin = '';

    switch (rango) {
      case 'hoy':
        fechaInicio = fechaFin = hoy.toISOString().split('T')[0];
        break;
      case 'ayer':
        const ayer = new Date(hoy);
        ayer.setDate(hoy.getDate() - 1);
        fechaInicio = fechaFin = ayer.toISOString().split('T')[0];
        break;
      case 'semana':
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay());
        fechaInicio = inicioSemana.toISOString().split('T')[0];
        fechaFin = hoy.toISOString().split('T')[0];
        break;
      case 'mes':
        fechaInicio = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
        fechaFin = hoy.toISOString().split('T')[0];
        break;
      case 'trimestre':
        const trimestre = Math.floor(hoy.getMonth() / 3);
        const inicioTrimestre = new Date(hoy.getFullYear(), trimestre * 3, 1);
        fechaInicio = inicioTrimestre.toISOString().split('T')[0];
        fechaFin = hoy.toISOString().split('T')[0];
        break;
      case 'año':
        fechaInicio = `${hoy.getFullYear()}-01-01`;
        fechaFin = hoy.toISOString().split('T')[0];
        break;
      case 'personalizado':
        // Mantener las fechas actuales
        return;
    }

    setFiltros(prev => ({ 
      ...prev, 
      rangoFecha: rango,
      fechaInicio,
      fechaFin
    }));
  };

  const Content = (
    <>
      {/* Filtros de Fecha */}
      <div className="space-y-4 mb-6">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Filtros de Fecha
        </h3>
        <div className={`grid gap-4 ${
          isMobile 
            ? 'grid-cols-1'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        }`}>
          {/* Rango de Fecha Predefinido */}
          <div className="space-y-2">
            <Label htmlFor="rango-fecha">Rango de Fecha</Label>
            <Select 
              value={filtros.rangoFecha || 'personalizado'} 
              onValueChange={handleRangoFechaChange}
            >
              <SelectTrigger id="rango-fecha">
                <SelectValue placeholder="Seleccionar rango" />
              </SelectTrigger>
              <SelectContent>
                {rangosFecha.map((rango) => (
                  <SelectItem key={rango.valor} value={rango.valor}>
                    {rango.texto}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de Mes */}
          <div className="space-y-2">
            <Label htmlFor="mes" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {isMobile ? 'Mes' : 'Mes Específico'}
            </Label>
            <Select 
              value={filtros.mes || 'all'} 
              onValueChange={handleMesChange}
            >
              <SelectTrigger id="mes">
                <SelectValue placeholder="Seleccionar mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los meses</SelectItem>
                {opcionesMeses.map((opcion) => (
                  <SelectItem key={opcion.valor} value={opcion.valor}>
                    {opcion.texto}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha Inicio */}
          <div className="space-y-2">
            <Label htmlFor="fecha-inicio">{isMobile ? 'Desde' : 'Fecha Inicio'}</Label>
            <DatePicker
              date={fechaInicioDate}
              onDateChange={handleFechaInicioChange}
              placeholder="Fecha inicio"
            />
          </div>

          {/* Fecha Fin */}
          <div className="space-y-2">
            <Label htmlFor="fecha-fin">{isMobile ? 'Hasta' : 'Fecha Fin'}</Label>
            <DatePicker
              date={fechaFinDate}
              onDateChange={handleFechaFinChange}
              placeholder="Fecha fin"
            />
          </div>
        </div>
      </div>

      {/* Filtros de Estado y Monto */}
      <div className="space-y-4 mb-6">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Filtros de Estado y Monto
        </h3>
        <div className={`grid gap-4 ${
          isMobile 
            ? 'grid-cols-1'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        }`}>
          {/* Estado */}
          <div className="space-y-2">
            <Label htmlFor="estado">{isMobile ? 'Tipo' : 'Tipo de Turno'}</Label>
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

          {/* Estado de Pago */}
          <div className="space-y-2">
            <Label htmlFor="pagado">{isMobile ? 'Pago' : 'Estado de Pago'}</Label>
            <Select 
              value={filtros.pagado} 
              onValueChange={(value) => setFiltros(prev => ({ ...prev, pagado: value }))}
            >
              <SelectTrigger id="pagado">
                <SelectValue placeholder="Todos los pagos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="false">No pagados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="true">Pagados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Monto Mínimo */}
          <div className="space-y-2">
            <Label htmlFor="monto-min" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {isMobile ? 'Mínimo' : 'Monto Mínimo'}
            </Label>
            <Input
              id="monto-min"
              type="number"
              placeholder="0"
              value={filtros.montoMin || ''}
              onChange={(e) => setFiltros(prev => ({ ...prev, montoMin: e.target.value }))}
            />
          </div>

          {/* Monto Máximo */}
          <div className="space-y-2">
            <Label htmlFor="monto-max" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {isMobile ? 'Máximo' : 'Monto Máximo'}
            </Label>
            <Input
              id="monto-max"
              type="number"
              placeholder="Sin límite"
              value={filtros.montoMax || ''}
              onChange={(e) => setFiltros(prev => ({ ...prev, montoMax: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Filtros de Ubicación y Búsqueda */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Filtros de Ubicación y Búsqueda
        </h3>
        <div className={`grid gap-4 ${
          isMobile 
            ? 'grid-cols-1'
            : 'grid-cols-1 md:grid-cols-2'
        }`}>
          {/* Instalación */}
          <div className="space-y-2">
            <Label htmlFor="instalacion">{isMobile ? 'Instalación' : 'Instalación'}</Label>
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
              placeholder={isMobile ? "Nombre, RUT..." : "Nombre, RUT, instalación..."}
              value={filtros.busqueda}
              onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
            />
          </div>
        </div>
      </div>
    </>
  );

  if (embedded) {
    return <div>{Content}</div>;
  }

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setShowFiltros && setShowFiltros(!showFiltros)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Avanzados
            {filtrosActivos > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                {filtrosActivos} activo{filtrosActivos !== 1 ? 's' : ''}
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {filtrosActivos > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  limpiarFiltros();
                }}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                {!isMobile && "Limpiar"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {showFiltros && <CardContent>{Content}</CardContent>}
    </Card>
  );
} 