'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon, Download, DollarSign, RefreshCw, CheckCircle, XCircle, AlertTriangle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import NavigationTabs from './components/NavigationTabs';
import StatsCards from './components/StatsCards';
import FiltrosAvanzados from './components/FiltrosAvanzados';
import DashboardStats from './components/DashboardStats';

interface TurnoExtra {
  id: string;
  guardia_id: string;
  guardia_nombre: string;
  guardia_apellido_paterno: string;
  guardia_apellido_materno: string;
  guardia_rut: string;
  instalacion_id: string;
  instalacion_nombre: string;
  puesto_id: string;
  nombre_puesto: string;
  fecha: string;
  estado: 'reemplazo' | 'ppc';
  valor: number;
  pagado: boolean;
  fecha_pago: string | null;
  observaciones_pago: string | null;
  usuario_pago: string | null;
  created_at: string;
}

export default function TurnosExtrasPage() {
  const [turnosExtras, setTurnosExtras] = useState<TurnoExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTurnos, setSelectedTurnos] = useState<string[]>([]);
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    estado: 'all',
    pagado: 'all',
    instalacion: 'all',
    busqueda: ''
  });
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    pendientes: 0,
    pagados: 0,
    montoTotal: 0,
    montoPendiente: 0,
    montoPagado: 0,
    promedioPorTurno: 0,
    turnosEsteMes: 0,
    montoEsteMes: 0
  });
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [observacionesPago, setObservacionesPago] = useState('');
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [showFiltros, setShowFiltros] = useState(false);
  const [instalaciones, setInstalaciones] = useState<Array<{ id: string; nombre: string }>>([]);
  const [showDashboard, setShowDashboard] = useState(false);

  const { toast } = useToast();

  // Cargar turnos extras
  const cargarTurnosExtras = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fecha_inicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fecha_fin', filtros.fechaFin);
      if (filtros.estado !== 'all') params.append('estado', filtros.estado);
      if (filtros.pagado !== 'all') params.append('pagado', filtros.pagado);
      if (filtros.instalacion !== 'all') params.append('instalacion_id', filtros.instalacion);
      if (filtros.busqueda) params.append('busqueda', filtros.busqueda);

      const response = await fetch(`/api/pauta-diaria/turno-extra?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setTurnosExtras(data.turnos_extras || []);
        calcularEstadisticas(data.turnos_extras || []);
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al cargar turnos extras",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Calcular estadísticas
  const calcularEstadisticas = (turnos: TurnoExtra[]) => {
    const total = turnos.length;
    const pendientes = turnos.filter(t => !t.pagado).length;
    const pagados = turnos.filter(t => t.pagado).length;
    const montoTotal = turnos.reduce((sum, t) => sum + Number(t.valor), 0);
    const montoPendiente = turnos.filter(t => !t.pagado).reduce((sum, t) => sum + Number(t.valor), 0);
    const montoPagado = turnos.filter(t => t.pagado).reduce((sum, t) => sum + Number(t.valor), 0);
    const promedioPorTurno = total > 0 ? montoTotal / total : 0;

    // Calcular estadísticas del mes actual
    const mesActual = new Date().getMonth() + 1;
    const añoActual = new Date().getFullYear();
    const turnosEsteMes = turnos.filter(t => {
      const fecha = new Date(t.fecha);
      return fecha.getMonth() + 1 === mesActual && fecha.getFullYear() === añoActual;
    }).length;
    const montoEsteMes = turnos.filter(t => {
      const fecha = new Date(t.fecha);
      return fecha.getMonth() + 1 === mesActual && fecha.getFullYear() === añoActual;
    }).reduce((sum, t) => sum + Number(t.valor), 0);

    setEstadisticas({
      total,
      pendientes,
      pagados,
      montoTotal,
      montoPendiente,
      montoPagado,
      promedioPorTurno,
      turnosEsteMes,
      montoEsteMes
    });
  };

  // Marcar como pagado
  const marcarComoPagado = async (turnoIds: string[], observaciones?: string) => {
    setProcesandoPago(true);
    try {
      const response = await fetch('/api/pauta-diaria/turno-extra/marcar-pagado', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          turno_ids: turnoIds,
          observaciones: observaciones || ''
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "✅ Pago procesado",
          description: data.mensaje || `${turnoIds.length} turno(s) marcado(s) como pagado(s)`,
        });
        setSelectedTurnos([]);
        setShowPagoModal(false);
        setObservacionesPago('');
        cargarTurnosExtras();
      } else {
        toast({
          title: "❌ Error",
          description: data.error || "Error al marcar como pagado",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "❌ Error",
        description: "Error de conexión",
        variant: "destructive"
      });
    } finally {
      setProcesandoPago(false);
    }
  };

  // Exportar CSV
  const exportarCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fecha_inicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fecha_fin', filtros.fechaFin);
      if (filtros.estado !== 'all') params.append('estado', filtros.estado);
      if (filtros.pagado !== 'all') params.append('pagado', filtros.pagado);
      if (filtros.instalacion !== 'all') params.append('instalacion_id', filtros.instalacion);

      const response = await fetch(`/api/pauta-diaria/turno-extra/exportar?${params.toString()}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `turnos_extras_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "📊 CSV exportado",
          description: "Archivo descargado exitosamente",
        });
      } else {
        toast({
          title: "❌ Error",
          description: "Error al exportar CSV",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "❌ Error",
        description: "Error de conexión",
        variant: "destructive"
      });
    }
  };

  // Seleccionar/deseleccionar todos
  const toggleSelectAll = () => {
    if (selectedTurnos.length === turnosExtras.length) {
      setSelectedTurnos([]);
    } else {
      setSelectedTurnos(turnosExtras.map(t => t.id));
    }
  };

  // Seleccionar turno individual
  const toggleSelectTurno = (turnoId: string) => {
    setSelectedTurnos(prev => 
      prev.includes(turnoId) 
        ? prev.filter(id => id !== turnoId)
        : [...prev, turnoId]
    );
  };

  // Abrir modal de pago
  const abrirModalPago = () => {
    if (selectedTurnos.length === 0) {
      toast({
        title: "⚠️ Selección requerida",
        description: "Debes seleccionar al menos un turno para pagar",
        variant: "destructive"
      });
      return;
    }
    setShowPagoModal(true);
  };

  // Confirmar pago
  const confirmarPago = () => {
    marcarComoPagado(selectedTurnos, observacionesPago);
  };

  // Cargar instalaciones para filtros
  const cargarInstalaciones = async () => {
    try {
      const response = await fetch('/api/instalaciones?simple=true');
      const data = await response.json();
      if (response.ok) {
        setInstalaciones(data.instalaciones || []);
      }
    } catch (error) {
      console.error('Error cargando instalaciones:', error);
    }
  };

  useEffect(() => {
    cargarTurnosExtras();
    cargarInstalaciones();
  }, [filtros]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation Tabs */}
      <NavigationTabs />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Turnos Extras</h1>
          <p className="text-muted-foreground">
            Administra y controla los pagos de turnos extras
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={cargarTurnosExtras} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Actualizar
          </Button>
          <Button 
            onClick={() => setShowDashboard(!showDashboard)} 
            variant={showDashboard ? "default" : "outline"} 
            size="sm"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {showDashboard ? 'Ocultar Dashboard' : 'Ver Dashboard'}
          </Button>
          <Button onClick={exportarCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button 
            onClick={() => window.location.href = '/pauta-diaria/turnos-extras/historial'} 
            variant="outline" 
            size="sm"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Ver Historial
          </Button>
        </div>
      </div>

      {/* Dashboard de Estadísticas */}
      {showDashboard && (
        <DashboardStats filtros={filtros} />
      )}

      {/* Estadísticas */}
      <StatsCards estadisticas={estadisticas} />

      {/* Filtros */}
      <FiltrosAvanzados
        filtros={filtros}
        setFiltros={setFiltros}
        showFiltros={showFiltros}
        setShowFiltros={setShowFiltros}
        instalaciones={instalaciones}
      />

      {/* Acciones Masivas */}
      {selectedTurnos.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-orange-600" />
                <span className="font-medium">
                  {selectedTurnos.length} turno(s) seleccionado(s)
                </span>
                <Badge variant="outline" className="ml-2">
                  ${selectedTurnos
                    .map(id => turnosExtras.find(t => t.id === id)?.valor || 0)
                    .reduce((sum, valor) => sum + valor, 0)
                    .toLocaleString()}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={abrirModalPago}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Marcar como Pagado
                </Button>
                <Button
                  onClick={() => setSelectedTurnos([])}
                  variant="outline"
                  size="sm"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de Turnos Extras */}
      <Card>
        <CardHeader>
          <CardTitle>Turnos Extras</CardTitle>
          <CardDescription>
            Lista de turnos extras registrados ({turnosExtras.length} registros)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : turnosExtras.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No hay turnos extras para mostrar</p>
              <p className="text-sm">Ajusta los filtros o crea nuevos turnos extras</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">
                      <Checkbox
                        checked={selectedTurnos.length === turnosExtras.length && turnosExtras.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="text-left p-2">Guardia</th>
                    <th className="text-left p-2">Instalación</th>
                    <th className="text-left p-2">Puesto</th>
                    <th className="text-left p-2">Fecha</th>
                    <th className="text-left p-2">Tipo</th>
                    <th className="text-left p-2">Valor</th>
                    <th className="text-left p-2">Estado</th>
                    <th className="text-left p-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {turnosExtras.map((turno) => (
                    <tr key={turno.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <Checkbox
                          checked={selectedTurnos.includes(turno.id)}
                          onCheckedChange={() => toggleSelectTurno(turno.id)}
                        />
                      </td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium">
                            {turno.guardia_nombre} {turno.guardia_apellido_paterno}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {turno.guardia_rut}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">{turno.instalacion_nombre}</td>
                      <td className="p-2">{turno.nombre_puesto}</td>
                      <td className="p-2">{format(new Date(turno.fecha), 'dd/MM/yyyy')}</td>
                      <td className="p-2">
                        <Badge variant={turno.estado === 'reemplazo' ? 'default' : 'secondary'}>
                          {turno.estado.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-2 font-medium">${turno.valor.toLocaleString()}</td>
                      <td className="p-2">
                        <Badge variant={turno.pagado ? 'default' : 'destructive'}>
                          {turno.pagado ? 'Pagado' : 'Pendiente'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        {!turno.pagado && (
                          <Button
                            onClick={() => {
                              setSelectedTurnos([turno.id]);
                              setShowPagoModal(true);
                            }}
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Pagar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Confirmación de Pago */}
      <Dialog open={showPagoModal} onOpenChange={setShowPagoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pago de Turnos Extras</DialogTitle>
            <DialogDescription>
              Estás a punto de marcar {selectedTurnos.length} turno(s) como pagado(s).
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-medium text-orange-800 mb-2">Resumen del pago:</h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Turnos seleccionados: {selectedTurnos.length}</li>
                <li>• Monto total: ${selectedTurnos
                  .map(id => turnosExtras.find(t => t.id === id)?.valor || 0)
                  .reduce((sum, valor) => sum + valor, 0)
                  .toLocaleString()}</li>
                <li>• Fecha de pago: {new Date().toLocaleDateString('es-ES')}</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones"
                placeholder="Agregar comentarios sobre el pago..."
                value={observacionesPago}
                onChange={(e) => setObservacionesPago(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPagoModal(false)}
              disabled={procesandoPago}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarPago}
              disabled={procesandoPago}
              className="bg-green-600 hover:bg-green-700"
            >
              {procesandoPago ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Confirmar Pago
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 