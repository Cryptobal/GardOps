"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { 
  Calendar, 
  Building2, 
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  Plus,
  Eye,
  FileText,
  AlertCircle,
  Loader2,
  Info,
  Shield,
  UserCheck,
  Trash2
} from "lucide-react";
import { obtenerResumenPautasMensuales, crearPautaMensualAutomatica, verificarRolesServicio, eliminarPautaMensual } from "../../lib/api/pauta-mensual";
import { useToast } from "../../components/ui/toast";
import { useRouter } from "next/navigation";
import ConfirmDeleteModal from "../../components/ui/confirm-delete-modal";
import InstalacionCard from "./components/InstalacionCard";

interface RolServicio {
  id: string;
  nombre: string;
  cantidad_guardias: number;
  patron_turno?: string;
}

interface InstalacionConPauta {
  id: string;
  nombre: string;
  direccion: string;
  cliente_nombre?: string;
  puestos_con_pauta: number;
}

interface InstalacionSinPauta {
  id: string;
  nombre: string;
  direccion: string;
  cliente_nombre?: string;
  roles: RolServicio[];
  cantidad_guardias: number;
  cantidad_ppcs: number;
  puestos_sin_asignar: number;
  total_puestos: number;
}

interface ResumenPautas {
  instalaciones_con_pauta: InstalacionConPauta[];
  instalaciones_sin_pauta: InstalacionSinPauta[];
  progreso: number;
  total_instalaciones: number;
  instalaciones_con_pauta_count: number;
  mes: number;
  anio: number;
}

// Componente KPI Box
const KPIBox = ({ 
  title, 
  value, 
  icon: Icon, 
  color = "blue",
  subtitle = ""
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color?: string;
  subtitle?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <Card className="h-full">
      <CardContent className="p-4 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/20 flex-shrink-0 ml-3`}>
            <Icon className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`} />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function PautaMensualPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedMes, setSelectedMes] = useState<string>("");
  const [selectedAnio, setSelectedAnio] = useState<string>("");
  const [resumen, setResumen] = useState<ResumenPautas | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingInstalacion, setLoadingInstalacion] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    instalacionId: string | null;
    instalacionNombre: string | null;
  }>({
    isOpen: false,
    instalacionId: null,
    instalacionNombre: null
  });

  // Obtener año actual
  const anioActual = new Date().getFullYear();
  const anios = [anioActual - 1, anioActual, anioActual + 1];

  // Meses del año
  const meses = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" }
  ];

  // Cargar resumen cuando cambia mes/año
  useEffect(() => {
    if (selectedMes && selectedAnio) {
      cargarResumen();
    }
  }, [selectedMes, selectedAnio]);

  // Establecer valores por defecto
  useEffect(() => {
    if (!selectedMes) {
      setSelectedMes((new Date().getMonth() + 1).toString());
    }
    if (!selectedAnio) {
      setSelectedAnio(anioActual.toString());
    }
  }, [selectedMes, selectedAnio, anioActual]);

  const cargarResumen = async () => {
    if (!selectedMes || !selectedAnio) return;

    setLoading(true);
    setMensaje(null);

    try {
      const resultado = await obtenerResumenPautasMensuales(
        parseInt(selectedMes), 
        parseInt(selectedAnio)
      );
      setResumen(resultado);
    } catch (error) {
      console.error('Error cargando resumen:', error);
      setMensaje(`❌ Error al cargar el resumen: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const generarPautaAutomatica = async (instalacionId: string) => {
    if (!selectedMes || !selectedAnio) {
      toast.error('Por favor selecciona un mes y año', 'Error');
      return;
    }

    setLoadingInstalacion(instalacionId);
    setMensaje(null);

    try {
      // 1. PRIMERO: Verificar si tiene roles de servicio
      const verificacionRoles = await verificarRolesServicio(instalacionId);
      
      if (!verificacionRoles.tiene_roles) {
        toast.error(
          "¿Deseas ir a la instalación para crear un rol de servicio?",
          "Instalación sin rol de servicio"
        );
        
        // Mostrar confirmación con botón
        if (confirm("¿Deseas ir a la instalación para crear un rol de servicio?")) {
          router.push(`/instalaciones/${instalacionId}`);
        }
        return;
      }

      if (!verificacionRoles.puede_generar_pauta) {
        toast.error(
          verificacionRoles.mensaje,
          "No se puede generar pauta"
        );
        return;
      }

      // 2. SEGUNDO: Si tiene roles y puede generar pauta, redirigir a la página unificada
      router.push(`/pauta-mensual/${instalacionId}?mes=${selectedMes}&anio=${selectedAnio}`);

    } catch (error: any) {
      console.error('Error verificando roles:', error);
      toast.error(
        error.message || 'Error al verificar roles de servicio',
        "Error"
      );
    } finally {
      setLoadingInstalacion(null);
    }
  };

  const verPauta = (instalacionId: string) => {
    // Navegar a la página unificada de pauta mensual
    router.push(`/pauta-mensual/${instalacionId}?mes=${selectedMes}&anio=${selectedAnio}`);
  };

  const abrirModalEliminar = (instalacionId: string, instalacionNombre: string) => {
    setDeleteModal({
      isOpen: true,
      instalacionId,
      instalacionNombre
    });
  };

  const cerrarModalEliminar = () => {
    setDeleteModal({
      isOpen: false,
      instalacionId: null,
      instalacionNombre: null
    });
  };

  const eliminarPauta = async () => {
    if (!deleteModal.instalacionId || !selectedMes || !selectedAnio) return;

    setLoadingInstalacion(deleteModal.instalacionId);
    
    try {
      await eliminarPautaMensual({
        instalacion_id: deleteModal.instalacionId,
        anio: parseInt(selectedAnio),
        mes: parseInt(selectedMes)
      });
      
      toast.success('La pauta mensual ha sido eliminada exitosamente', 'Pauta eliminada');
      
      // Recargar el resumen
      await cargarResumen();
      
    } catch (error) {
      console.error('Error eliminando pauta:', error);
      toast.error('No se pudo eliminar la pauta mensual', 'Error');
    } finally {
      setLoadingInstalacion(null);
      cerrarModalEliminar();
    }
  };

  const porcentajeProgreso = resumen ? Math.round(resumen.progreso * 100) : 0;

  // Mensaje de confirmación en consola
  useEffect(() => {
    if (resumen) {
      console.log("✅ Pauta Mensual refactorizada y unificada con éxito");
    }
  }, [resumen]);

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/20">
          <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Pauta Mensual</h1>
          <p className="text-sm text-muted-foreground">Gestión y planificación mensual de turnos</p>
        </div>
      </div>

      {/* Selector de Mes y Año */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Seleccionar Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mes</label>
              <Select value={selectedMes} onValueChange={setSelectedMes}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Año</label>
              <Select value={selectedAnio} onValueChange={setSelectedAnio}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {anios.map((anio) => (
                    <SelectItem key={anio} value={anio.toString()}>
                      {anio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      {resumen && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPIBox
            title="Total Instalaciones"
            value={resumen.total_instalaciones}
            icon={Building2}
            color="blue"
          />
          <KPIBox
            title="Con Pauta"
            value={resumen.instalaciones_con_pauta_count}
            icon={CheckCircle}
            color="green"
            subtitle={`${porcentajeProgreso}% completado`}
          />
          <KPIBox
            title="Sin Pauta"
            value={resumen.instalaciones_sin_pauta.length}
            icon={Clock}
            color="orange"
          />
          <KPIBox
            title="Progreso"
            value={`${porcentajeProgreso}%`}
            icon={TrendingUp}
            color="purple"
          />
        </div>
      )}

      {/* Barra de Progreso */}
      {resumen && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progreso del mes</span>
              <span className="text-sm text-muted-foreground">
                {resumen.instalaciones_con_pauta_count} de {resumen.total_instalaciones} instalaciones
              </span>
            </div>
            <Progress value={porcentajeProgreso} className="h-3" />
            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Con pauta creada</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span>Pendiente de crear</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensaje de estado */}
      {mensaje && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border-l-4 ${
            mensaje.includes('✅') 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-400' 
              : mensaje.includes('⚠️')
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400'
              : mensaje.includes('ℹ️')
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400'
              : 'bg-red-50 dark:bg-red-900/20 border-red-400'
          }`}
        >
          <div className="flex items-start gap-2">
            {mensaje.includes('✅') ? (
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
            ) : mensaje.includes('⚠️') ? (
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
            ) : mensaje.includes('ℹ️') ? (
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            )}
            <span className={`text-sm ${
              mensaje.includes('✅') 
                ? 'text-green-800 dark:text-green-200' 
                : mensaje.includes('⚠️')
                ? 'text-yellow-800 dark:text-yellow-200'
                : mensaje.includes('ℹ️')
                ? 'text-blue-800 dark:text-blue-200'
                : 'text-red-800 dark:text-red-200'
            }`}>
              {mensaje}
            </span>
          </div>
        </motion.div>
      )}

      {/* Contenido principal */}
      {loading ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-sm">Cargando resumen...</span>
            </div>
          </CardContent>
        </Card>
      ) : resumen ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Mostrar todas las instalaciones, con o sin pauta */}
            {[
              ...resumen.instalaciones_con_pauta.map(inst => ({ ...inst, tipo: 'con_pauta' })),
              ...resumen.instalaciones_sin_pauta.map(inst => ({ ...inst, tipo: 'sin_pauta' }))
            ].map((instalacion: any) => (
              <InstalacionCard
                key={instalacion.id}
                instalacion={instalacion}
                tipo={instalacion.tipo}
                onAction={() =>
                  instalacion.tipo === 'con_pauta'
                    ? verPauta(instalacion.id)
                    : generarPautaAutomatica(instalacion.id)
                }
                onEdit={instalacion.tipo === 'con_pauta' ? () => verPauta(instalacion.id) : undefined}
                onDelete={instalacion.tipo === 'con_pauta' ? () => abrirModalEliminar(instalacion.id, instalacion.nombre) : undefined}
                loading={loadingInstalacion === instalacion.id}
                mes={parseInt(selectedMes)}
                anio={parseInt(selectedAnio)}
                hideDireccion={true}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Selecciona un período</h3>
            <p className="text-sm text-muted-foreground">
              Elige un mes y año para ver el resumen de pautas mensuales.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de confirmación para eliminar pauta */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={cerrarModalEliminar}
        onConfirm={eliminarPauta}
        title="Eliminar Pauta Mensual"
        message={`¿Estás seguro de que quieres eliminar completamente la pauta mensual de ${deleteModal.instalacionNombre}? Esta acción no se puede deshacer y eliminará todos los datos de la pauta para ${selectedMes}/${selectedAnio}.`}
      />
    </div>
  );
} 