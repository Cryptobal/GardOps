'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  // Flags calculados por backend (vista)
  es_urgente?: boolean;
  es_actual?: boolean;
  es_proximo?: boolean;
}

export default function CentralMonitoreoPage() {
  // Estados principales
  const [loading, setLoading] = useState(true);
  const [fecha, setFecha] = useState(() => {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [llamados, setLlamados] = useState<Llamado[]>([]);
  const [kpis, setKpis] = useState({
    total: 0,
    actuales: 0,
    proximos: 0,
    no_realizados: 0,
    urgentes: 0,
    completados: 0
  });
  const [filtroEstado, setFiltroEstado] = useState<string>('actuales');
  const [busqueda, setBusqueda] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [modalRegistro, setModalRegistro] = useState(false);
  const [llamadoSeleccionado, setLlamadoSeleccionado] = useState<Llamado | null>(null);
  const [estadoRegistro, setEstadoRegistro] = useState('');
  const [observacionesRegistro, setObservacionesRegistro] = useState('');

  // Ref para evitar recargas innecesarias
  const fechaRef = useRef(fecha);
  fechaRef.current = fecha;

  // Función para cargar datos automáticamente (optimizada)
  const cargarDatos = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    }
    try {
      // Cargar agenda
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Santiago';
      const currentFecha = fechaRef.current;
      
      const responseAgenda = await rbacFetch(`/api/central-monitoring/agenda?fecha=${currentFecha}&tz=${encodeURIComponent(tz)}`);
      if (responseAgenda.ok) {
        const dataAgenda = await responseAgenda.json();
        setLlamados(dataAgenda.data || []);
      }

      // Cargar KPIs desde el backend
      const responseKPIs = await rbacFetch(`/api/central-monitoring/kpis?fecha=${currentFecha}&tz=${encodeURIComponent(tz)}`);
      if (responseKPIs.ok) {
        const dataKPIs = await responseKPIs.json();
        setKpis({
          total: dataKPIs.data.kpis.total || 0,
          actuales: dataKPIs.data.kpis.actuales || 0,
          proximos: dataKPIs.data.kpis.proximos || 0,
          no_realizados: dataKPIs.data.kpis.no_realizados || 0,
          urgentes: dataKPIs.data.kpis.urgentes || 0,
          completados: dataKPIs.data.kpis.exitosos || 0
        });
      }
      
      // Notificar a otras pestañas sobre la actualización
      if (typeof window !== 'undefined') {
        localStorage.setItem('central-monitoreo-update', JSON.stringify({
          fecha: currentFecha,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Error cargando datos automáticos:', error);
      if (!isSilent) {
        toast.error('Error al cargar los datos automáticos');
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, []); // Sin dependencias para evitar recreaciones

  // Efecto para cargar datos cuando cambia la fecha
  useEffect(() => {
    cargarDatos();
  }, [fecha, cargarDatos]);

  // Auto-refresh cada 30 segundos (silencioso) - optimizado
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      cargarDatos(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, cargarDatos]);

  // Escuchar cambios en otras pestañas - optimizado
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'central-monitoreo-update' && e.newValue) {
        try {
          const updateData = JSON.parse(e.newValue);
          if (updateData.fecha === fechaRef.current) {
            console.log('🔄 Actualización detectada desde otra pestaña - Recargando KPIs');
            cargarDatos(true);
          }
        } catch (error) {
          console.error('Error parsing storage update:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [cargarDatos]);



  // Filtrar llamados
  const llamadosFiltrados = useMemo(() => {
    let filtrados = [...llamados];
    
    // Filtros con lógica corregida usando fecha/hora local
    const ahora = new Date();
    const ahoraString = ahora.toISOString().slice(0, 19); // "2025-09-06T18:00:00"
    
    if (filtroEstado === 'urgentes') {
      filtrados = filtrados.filter(l => l.estado === 'pendiente' && l.es_urgente);
    } else if (filtroEstado === 'actuales') {
      // Actuales: hora actual del día actual
      const horaActual = ahora.getHours();
      filtrados = filtrados.filter(l => {
        const programadoPara = new Date(l.programado_para);
        const esHoy = programadoPara.toDateString() === ahora.toDateString();
        const esHoraActual = programadoPara.getHours() === horaActual;
        return esHoy && esHoraActual;
      });
    } else if (filtroEstado === 'proximos') {
      // Próximos: futuros del día seleccionado
      filtrados = filtrados.filter(l => {
        const programadoPara = new Date(l.programado_para);
        return programadoPara > ahora;
      });
    } else if (filtroEstado === 'no_realizados') {
      // No realizados: que ya pasaron y están pendientes
      filtrados = filtrados.filter(l => {
        const programadoPara = new Date(l.programado_para);
        return programadoPara < ahora && l.estado === 'pendiente';
      });
    } else if (filtroEstado === 'completados') {
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

  // Función para generar agenda (ELIMINADA - ahora es automática)
  // Los datos se calculan automáticamente desde la pauta mensual

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

      {/* Lista de llamados */}
      <div className="mt-6">
        {llamadosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">No hay llamados en esta categoría</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
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
      </div>

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