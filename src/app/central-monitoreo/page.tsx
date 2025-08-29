'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Phone, MessageSquare, Clock, CheckCircle, XCircle, 
  AlertTriangle, Users, Building2, RefreshCw, Download,
  Calendar, ChevronLeft, ChevronRight, AlertCircle,
  PhoneOff, PhoneCall, Loader2, Search, Filter,
  TrendingUp, TrendingDown, Activity, Target, Bell, Settings, Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { rbacFetch } from '@/lib/rbacClient';

// Importar componentes locales
import { KPICards } from './components/KPICards';
import { DateSelector } from './components/DateSelector';
import { LlamadoCard } from './components/LlamadoCard';
import { RegistroModal } from './components/RegistroModal';

// Interfaces
interface Llamado {
  id: string;
  instalacion_id: string;
  instalacion_nombre: string;
  instalacion_telefono: string;
  guardia_id: string | null;
  guardia_nombre: string | null;
  guardia_telefono: string | null;
  programado_para: string;
  ejecutado_en: string | null;
  estado: 'pendiente' | 'exitoso' | 'no_contesta' | 'ocupado' | 'incidente' | 'cancelado';
  canal: string;
  contacto_tipo: string;
  contacto_telefono: string;
  observaciones: string | null;
  rol_nombre: string | null;
  nombre_puesto: string | null;
  minutos_atraso?: number;
}

export default function CentralMonitoreoPage() {
  // Estados principales
  const [loading, setLoading] = useState(true);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [llamados, setLlamados] = useState<Llamado[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [modalRegistro, setModalRegistro] = useState(false);
  const [llamadoSeleccionado, setLlamadoSeleccionado] = useState<Llamado | null>(null);
  const [estadoRegistro, setEstadoRegistro] = useState('');
  const [observacionesRegistro, setObservacionesRegistro] = useState('');

  // Función para cargar datos
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const response = await rbacFetch(`/api/central-monitoring/agenda?fecha=${fecha}`);
      if (response.ok) {
        const data = await response.json();
        setLlamados(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Efecto para cargar datos
  useEffect(() => {
    cargarDatos();
  }, [fecha]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(cargarDatos, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fecha]);

  // Calcular KPIs
  const kpis = useMemo(() => {
    const ahora = new Date();
    const horaActual = ahora.getHours();
    
    const urgentes = llamados.filter(l => {
      const hora = new Date(l.programado_para);
      const minutosDiff = (ahora.getTime() - hora.getTime()) / 60000;
      return l.estado === 'pendiente' && minutosDiff > 15;
    });
    
    const actuales = llamados.filter(l => {
      const hora = new Date(l.programado_para).getHours();
      return hora === horaActual;
    });
    
    const proximos = llamados.filter(l => {
      const hora = new Date(l.programado_para).getHours();
      return hora > horaActual && l.estado === 'pendiente';
    });
    
    // Completados incluye todos los estados que no son 'pendiente'
    const completados = llamados.filter(l => l.estado !== 'pendiente');
    
    return {
      urgentes: urgentes.length,
      actuales: actuales.length,
      proximos: proximos.length,
      completados: completados.length,
      total: llamados.length
    };
  }, [llamados]);

  // Filtrar llamados
  const llamadosFiltrados = useMemo(() => {
    let filtrados = [...llamados];
    
    // Filtro por estado/tiempo
    if (filtroEstado === 'urgentes') {
      const ahora = new Date();
      filtrados = filtrados.filter(l => {
        const hora = new Date(l.programado_para);
        const minutosDiff = (ahora.getTime() - hora.getTime()) / 60000;
        return l.estado === 'pendiente' && minutosDiff > 15;
      });
    } else if (filtroEstado === 'actuales') {
      const horaActual = new Date().getHours();
      filtrados = filtrados.filter(l => {
        const hora = new Date(l.programado_para).getHours();
        return hora === horaActual;
      });
    } else if (filtroEstado === 'proximos') {
      const horaActual = new Date().getHours();
      filtrados = filtrados.filter(l => {
        const hora = new Date(l.programado_para).getHours();
        return hora > horaActual && l.estado === 'pendiente';
      });
    } else if (filtroEstado === 'completados') {
      // Completados incluye todos los estados que no son 'pendiente'
      filtrados = filtrados.filter(l => l.estado !== 'pendiente');
    }
    
    // Filtro por búsqueda
    if (busqueda) {
      filtrados = filtrados.filter(l =>
        l.instalacion_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        l.guardia_nombre?.toLowerCase().includes(busqueda.toLowerCase())
      );
    }
    
    return filtrados;
  }, [llamados, filtroEstado, busqueda]);

  // Handlers
  const handleWhatsApp = (telefono: string, mensaje: string) => {
    const url = `https://wa.me/${telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const handleRegistrar = (llamado: Llamado) => {
    setLlamadoSeleccionado(llamado);
    setModalRegistro(true);
  };

  const handleGuardarRegistro = async (estado: string, observaciones: string) => {
    if (!llamadoSeleccionado) return;
    
    try {
      const response = await rbacFetch(`/api/central-monitoring/llamado/${llamadoSeleccionado.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          estado,
          observaciones,
          canal: 'telefono'
        })
      });
      
      if (response.ok) {
        toast.success('Llamado registrado exitosamente');
        cargarDatos();
      } else {
        toast.error('Error al registrar el llamado');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al registrar el llamado');
    }
  };

  // Handler para filtrar por KPI
  const handleKPIClick = (tipo: string) => {
    setFiltroEstado(tipo);
  };

  const handleObservacionesUpdate = async (llamadoId: string, observaciones: string) => {
    try {
      const response = await rbacFetch(`/api/central-monitoring/llamado/${llamadoId}/observaciones`, {
        method: 'PATCH',
        body: JSON.stringify({
          observaciones
        })
      });
      
      if (response.ok) {
        toast.success('Observaciones actualizadas exitosamente');
        cargarDatos();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Error al actualizar observaciones');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar observaciones');
    }
  };

  const handleGenerarAgenda = async () => {
    try {
      const response = await rbacFetch('/api/central-monitoring/agenda/generar', {
        method: 'POST',
        body: JSON.stringify({ fecha })
      });
      
      if (response.ok) {
        toast.success('Agenda generada exitosamente');
        cargarDatos();
      } else {
        toast.error('Error al generar la agenda');
      }
    } catch (error) {
      toast.error('Error al generar la agenda');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">📞 Central de Monitoreo</h1>
            <p className="text-gray-600">Monitoreo de guardias en tiempo real</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleGenerarAgenda} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Generar Agenda
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
        
        {/* Selector de fecha */}
        <DateSelector
          fecha={fecha}
          onFechaChange={setFecha}
          onRefresh={cargarDatos}
          autoRefresh={autoRefresh}
          onAutoRefreshToggle={() => setAutoRefresh(!autoRefresh)}
        />
      </div>

              {/* KPIs */}
        <KPICards 
          {...kpis} 
          filtroActivo={filtroEstado}
          onKPIClick={handleKPIClick}
        />

      {/* Búsqueda */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por instalación o guardia..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs de filtros */}
      <Tabs value={filtroEstado} onValueChange={setFiltroEstado}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="todos">Todos ({llamados.length})</TabsTrigger>
          <TabsTrigger value="urgentes">🔴 Urgentes ({kpis.urgentes})</TabsTrigger>
          <TabsTrigger value="actuales">🟡 Actuales ({kpis.actuales})</TabsTrigger>
          <TabsTrigger value="proximos">🔵 Próximos ({kpis.proximos})</TabsTrigger>
          <TabsTrigger value="completados">🟢 Completados ({kpis.completados})</TabsTrigger>
        </TabsList>

        <TabsContent value={filtroEstado} className="mt-6">
          {llamadosFiltrados.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No hay llamados en esta categoría</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                             {llamadosFiltrados.map(llamado => (
                 <LlamadoCard
                   key={llamado.id}
                   llamado={llamado}
                   onRegistrar={handleRegistrar}
                   onWhatsApp={handleWhatsApp}
                   onObservacionesUpdate={handleObservacionesUpdate}
                 />
               ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de registro */}
      <RegistroModal
        isOpen={modalRegistro}
        onClose={() => setModalRegistro(false)}
        llamado={llamadoSeleccionado}
        onRegistrar={handleGuardarRegistro}
      />
    </div>
  );
}