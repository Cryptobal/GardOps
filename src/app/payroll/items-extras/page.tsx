"use client";

import { logger, devLogger, apiLogger } from '@/lib/utils/logger';

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import { 
  DollarSign, 
  Plus, 
  Users, 
  Building2,
  Calendar,
  Search,
  Filter,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown
} from "lucide-react";

// Importar componentes genéricos
import { DataTable, Column } from "../../../components/ui/data-table";

// Importar hooks
import { useEntityModal } from "../../../hooks/useEntityModal";
import { useCrudOperations } from "../../../hooks/useCrudOperations";

// Importar tipos y esquemas
import { PayrollItemExtra } from "../../../lib/schemas/payroll";

// Importar APIs
import { payrollItemsExtrasApi, instalacionesApi } from "../../../lib/api/payroll";
import dynamic from "next/dynamic";

// ✅ OPTIMIZACIÓN: Lazy load del modal (carga solo cuando se abre)
const ItemExtraModal = dynamic(
  () => import("../../../components/payroll/ItemExtraModal"),
  { 
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>,
    ssr: false
  }
);

// Componente KPI Box
const KPIBox = ({ 
  title, 
  value, 
  icon: Icon, 
  color = "blue",
  trend = null,
  subtitle = ""
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color?: string;
  trend?: { value: number; isPositive: boolean } | null;
  subtitle?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <Card className="h-full">
      <CardContent className="p-3 md:p-6 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs md:text-sm font-medium text-muted-foreground min-h-[1.5rem] flex items-center">{title}</p>
            <p className="text-lg md:text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p className={`text-xs md:text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </p>
            )}
          </div>
          <div className={`p-2 md:p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/20 flex-shrink-0 ml-3`}>
            <Icon className={`h-4 w-4 md:h-6 md:w-6 text-${color}-600 dark:text-${color}-400`} />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

interface Instalacion {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  comuna: string;
}

export default function PayrollItemsExtrasPage() {
  const [items, setItems] = useState<PayrollItemExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([]);
  const [loadingInstalaciones, setLoadingInstalaciones] = useState(false);

  // Estados para filtros
  const [selectedInstalacion, setSelectedInstalacion] = useState<string>("");
  const [selectedMes, setSelectedMes] = useState<number>(new Date().getMonth() + 1);
  const [selectedAnio, setSelectedAnio] = useState<number>(new Date().getFullYear());

  // Hooks para modales y operaciones CRUD
  const { 
    isCreateOpen, 
    selectedEntity, 
    openCreate, 
    openDetail, 
    closeAll 
  } = useEntityModal<PayrollItemExtra>();

  // Cargar instalaciones al montar el componente
  useEffect(() => {
    loadInstalaciones();
  }, []);

  // Cargar ítems cuando cambian los filtros
  useEffect(() => {
    if (selectedInstalacion && selectedMes && selectedAnio) {
      loadItems();
    }
  }, [selectedInstalacion, selectedMes, selectedAnio]);

  const loadInstalaciones = async () => {
    try {
      setLoadingInstalaciones(true);
      const response = await instalacionesApi.getInstalaciones();
      setInstalaciones(response.data);
      
      // Seleccionar la primera instalación por defecto
      if (response.data.length > 0) {
        setSelectedInstalacion(response.data[0].id);
      }
    } catch (error) {
      logger.error('Error al cargar instalaciones::', error);
    } finally {
      setLoadingInstalaciones(false);
    }
  };

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await payrollItemsExtrasApi.getItems({
        instalacion_id: selectedInstalacion,
        mes: selectedMes,
        anio: selectedAnio,
        q: searchTerm || undefined,
      });
      setItems(response.data);
    } catch (error) {
      logger.error('Error al cargar ítems::', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar ítems cuando cambia el término de búsqueda
  useEffect(() => {
    if (selectedInstalacion && selectedMes && selectedAnio) {
      const timeoutId = setTimeout(() => {
        loadItems();
      }, 300); // Debounce de 300ms

      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm]);

  const handleCreateSuccess = (newItem: PayrollItemExtra) => {
    setItems(prev => [...prev, newItem]);
  };

  const handleUpdateSuccess = (updatedItem: PayrollItemExtra) => {
    setItems(prev => prev.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ));
  };

  const handleDeleteSuccess = (deletedId: string) => {
    setItems(prev => prev.filter(item => item.id !== deletedId));
  };

  // Calcular estadísticas
  const stats = useMemo(() => {
    const total = items.length;
    
    // Contar por tipo
    const haberesImponibles = items.filter(item => item.tipo === 'haber_imponible').length;
    const haberesNoImponibles = items.filter(item => item.tipo === 'haber_no_imponible').length;
    const descuentos = items.filter(item => item.tipo === 'descuento').length;
    
    // Calcular montos
    const totalHaberes = items
      .filter(item => item.tipo !== 'descuento')
      .reduce((sum, item) => sum + Math.abs(item.monto || 0), 0);
    
    const totalDescuentos = items
      .filter(item => item.tipo === 'descuento')
      .reduce((sum, item) => sum + Math.abs(item.monto || 0), 0);

    const neto = totalHaberes - totalDescuentos;

    return {
      total,
      haberesImponibles,
      haberesNoImponibles,
      descuentos,
      totalHaberes,
      totalDescuentos,
      neto
    };
  }, [items]);

  // Configuración de columnas para DataTable
  const columns: Column<PayrollItemExtra>[] = [
    {
      key: "guardia",
      label: "Guardia",
      render: (item) => (
        <div>
          <div className="font-bold text-foreground">{item.guardia_nombre_completo}</div>
          <div className="text-xs text-muted-foreground">{item.guardia_rut}</div>
        </div>
      )
    },
    {
      key: "item",
      label: "Ítem",
      render: (item) => (
        <div>
          <div className="font-medium">{item.nombre}</div>
          {item.item_nombre && item.item_nombre !== item.nombre && (
            <div className="text-xs text-muted-foreground">Catálogo: {item.item_nombre}</div>
          )}
          {item.glosa && (
            <div className="text-xs text-muted-foreground mt-1">{item.glosa}</div>
          )}
        </div>
      )
    },
    {
      key: "tipo",
      label: "Clase/Naturaleza",
      render: (item) => {
        const tipoConfig = {
          haber_imponible: { label: 'Haber Imponible', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
          haber_no_imponible: { label: 'Haber No Imponible', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
          descuento: { label: 'Descuento', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
        };
        
        const config = tipoConfig[item.tipo as keyof typeof tipoConfig];
        
        return (
          <Badge className={config.color}>
            {config.label}
          </Badge>
        );
      }
    },
    {
      key: "monto",
      label: "Monto",
      render: (item) => (
        <div className={`font-bold ${item.tipo === 'descuento' ? 'text-red-600' : 'text-green-600'}`}>
          ${Math.abs(item.monto || 0).toLocaleString('es-CL')}
        </div>
      )
    },
    {
      key: "acciones",
      label: "Acciones",
      render: (item) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openDetail(item);
            }}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(item.id!);
            }}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )
    }
  ];

  // Card para móvil
  const mobileCard = (item: PayrollItemExtra) => (
    <Card className="hover:shadow-lg transition-all duration-200 bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{item.guardia_nombre_completo}</h3>
              <p className="text-xs text-muted-foreground">{item.guardia_rut}</p>
            </div>
            <Badge className={
              item.tipo === 'haber_imponible' ? 'bg-green-100 text-green-800' :
              item.tipo === 'haber_no_imponible' ? 'bg-blue-100 text-blue-800' :
              'bg-red-100 text-red-800'
            }>
              {item.tipo === 'haber_imponible' ? 'Haber Imponible' :
               item.tipo === 'haber_no_imponible' ? 'Haber No Imponible' : 'Descuento'}
            </Badge>
          </div>
          
          <div>
            <h4 className="font-medium text-sm">{item.nombre}</h4>
            {item.item_nombre && item.item_nombre !== item.nombre && (
              <p className="text-xs text-muted-foreground">Catálogo: {item.item_nombre}</p>
            )}
            {item.glosa && (
              <p className="text-xs text-muted-foreground mt-1">{item.glosa}</p>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <span className={`font-bold ${item.tipo === 'descuento' ? 'text-red-600' : 'text-green-600'}`}>
              ${Math.abs(item.monto || 0).toLocaleString('es-CL')}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openDetail(item)}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(item.id!)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este ítem?')) {
      return;
    }

    try {
      await payrollItemsExtrasApi.deleteItem(id);
      handleDeleteSuccess(id);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full space-y-6 p-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ítems Extras de Payroll</h1>
          <p className="text-muted-foreground">
            Administra bonos, descuentos y otros haberes por guardia
          </p>
        </div>
        <Button onClick={openCreate} disabled={!selectedInstalacion}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Ítem Extra
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIBox
          title="Total Ítems"
          value={stats.total}
          icon={Users}
          color="blue"
        />
        <KPIBox
          title="Haberes Imponibles"
          value={stats.haberesImponibles}
          icon={CheckCircle}
          color="green"
        />
        <KPIBox
          title="Haberes No Imponibles"
          value={stats.haberesNoImponibles}
          icon={CheckCircle}
          color="blue"
        />
        <KPIBox
          title="Descuentos"
          value={stats.descuentos}
          icon={XCircle}
          color="red"
        />
      </div>

      {/* Resumen financiero */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Resumen Financiero
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Haberes</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalHaberes)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Descuentos</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalDescuentos)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Neto</p>
              <p className={`text-2xl font-bold ${stats.neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.neto)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Instalación */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Instalación</label>
              <select
                value={selectedInstalacion}
                onChange={(e) => setSelectedInstalacion(e.target.value)}
                className="w-full p-2 border border-border rounded-md bg-background"
                disabled={loadingInstalaciones}
              >
                <option value="">Seleccionar instalación...</option>
                {instalaciones.map((instalacion) => (
                  <option key={instalacion.id} value={instalacion.id}>
                    {instalacion.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Mes */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Mes</label>
              <select
                value={selectedMes}
                onChange={(e) => setSelectedMes(parseInt(e.target.value))}
                className="w-full p-2 border border-border rounded-md bg-background"
              >
                <option value={1}>Enero</option>
                <option value={2}>Febrero</option>
                <option value={3}>Marzo</option>
                <option value={4}>Abril</option>
                <option value={5}>Mayo</option>
                <option value={6}>Junio</option>
                <option value={7}>Julio</option>
                <option value={8}>Agosto</option>
                <option value={9}>Septiembre</option>
                <option value={10}>Octubre</option>
                <option value={11}>Noviembre</option>
                <option value={12}>Diciembre</option>
              </select>
            </div>

            {/* Año */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Año</label>
              <select
                value={selectedAnio}
                onChange={(e) => setSelectedAnio(parseInt(e.target.value))}
                className="w-full p-2 border border-border rounded-md bg-background"
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Búsqueda */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por guardia, nombre del ítem o glosa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de ítems */}
      <div className="flex-1 min-h-0">
        <DataTable
          data={items}
          columns={columns}
          loading={loading}
          emptyMessage="No hay ítems extras registrados para este período"
          emptyIcon={DollarSign}
          mobileCard={mobileCard}
          className="h-full"
        />
      </div>

      {/* Modal para crear/editar ítem */}
      <ItemExtraModal
        item={selectedEntity}
        isOpen={isCreateOpen || !!selectedEntity}
        onClose={closeAll}
        onSuccess={selectedEntity ? handleUpdateSuccess : handleCreateSuccess}
        instalacionId={selectedInstalacion}
        mes={selectedMes}
        anio={selectedAnio}
      />
    </motion.div>
  );
}
