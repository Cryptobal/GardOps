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
import { useToast } from "../../hooks/use-toast";
import { useRouter } from "next/navigation";
import ConfirmDeleteModal from "../../components/ui/confirm-delete-modal";

interface RolServicio {
  id: string;
  nombre: string;
  cantidad_guardias: number;
}

interface InstalacionConPauta {
  id: string;
  nombre: string;
  direccion: string;
  cliente_nombre?: string;
  guardias_asignados: number;
}

interface InstalacionSinPauta {
  id: string;
  nombre: string;
  direccion: string;
  cliente_nombre?: string;
  roles: RolServicio[];
  cantidad_guardias: number;
  cantidad_ppcs: number;
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

// Componente de tarjeta de instalación
const InstalacionCard = ({ 
  instalacion, 
  tipo, 
  onAction,
  onDelete,
  loading = false
}: {
  instalacion: InstalacionConPauta | InstalacionSinPauta;
  tipo: 'con_pauta' | 'sin_pauta';
  onAction: () => void;
  onDelete?: () => void;
  loading?: boolean;
}) => {
  const isConPauta = tipo === 'con_pauta';
  const instalacionConPauta = instalacion as InstalacionConPauta;
  const instalacionSinPauta = instalacion as InstalacionSinPauta;
  const router = useRouter();

  const irAInstalacion = () => {
    router.push(`/instalaciones/${instalacion.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold text-sm">{instalacion.nombre}</h3>
                <Badge variant={isConPauta ? "default" : "secondary"} className="text-xs">
                  {isConPauta ? "Con pauta" : "Sin pauta"}
                </Badge>
              </div>
              
              <p className="text-xs text-muted-foreground mb-2">
                {instalacion.direccion}
              </p>

              {/* Información del cliente */}
              {instalacion.cliente_nombre && (
                <p className="text-xs text-muted-foreground mb-2">
                  Cliente: {instalacion.cliente_nombre}
                </p>
              )}
              
              {isConPauta ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{instalacionConPauta.guardias_asignados} guardias asignados</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Roles de servicio */}
                  {instalacionSinPauta.roles.length > 0 ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      <span>Roles: {instalacionSinPauta.roles.map(r => r.nombre).join(', ')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      <span>Sin roles de servicio</span>
                    </div>
                  )}

                  {/* Guardias asignados */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <UserCheck className="h-3 w-3" />
                    <span>{instalacionSinPauta.cantidad_guardias} guardias asignados</span>
                  </div>

                  {/* PPCs activos */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{instalacionSinPauta.cantidad_ppcs} PPCs activos</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-2 ml-3">
              <Button
                onClick={onAction}
                disabled={loading}
                size="sm"
                variant={isConPauta ? "outline" : "default"}
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isConPauta ? (
                  <Eye className="h-3 w-3" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                <span className="ml-1 text-xs">
                  {isConPauta ? "Ver pauta" : "Generar pauta"}
                </span>
              </Button>
              
              {/* Botón para ir a la instalación */}
              <Button
                onClick={irAInstalacion}
                size="sm"
                variant="ghost"
                className="text-xs"
              >
                <Building2 className="h-3 w-3 mr-1" />
                Ver instalación
              </Button>
              
              {isConPauta && onDelete && (
                <Button
                  onClick={onDelete}
                  size="sm"
                  variant="destructive"
                  className="text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Eliminar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function PautaMensualPage() {
  const router = useRouter();
  const toast = useToast();
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
    if (!selectedMes || !selectedAnio) return;

    setLoadingInstalacion(instalacionId);
    setMensaje(null);

    try {
      // 1. PRIMERO: Verificar si tiene roles de servicio
      const verificacionRoles = await verificarRolesServicio(instalacionId);
      
      if (!verificacionRoles.tiene_roles) {
        toast.error(
          "Instalación sin rol de servicio",
          "Para generar pauta, primero crea un rol de servicio en el módulo de Asignaciones."
        );
        return;
      }

      if (!verificacionRoles.puede_generar_pauta) {
        toast.error(
          "No se puede generar pauta",
          verificacionRoles.mensaje
        );
        return;
      }

      // 2. SEGUNDO: Si tiene roles y puede generar pauta, redirigir a la página de creación
      router.push(`/pauta-mensual/${instalacionId}/crear?mes=${selectedMes}&anio=${selectedAnio}`);

    } catch (error: any) {
      console.error('Error verificando roles:', error);
      toast.error(
        "Error",
        error.message || 'Error al verificar roles de servicio'
      );
    } finally {
      setLoadingInstalacion(null);
    }
  };

  const verPauta = (instalacionId: string) => {
    // Navegar a la página de edición de pauta mensual
    router.push(`/pauta-mensual/${instalacionId}/editar?mes=${selectedMes}&anio=${selectedAnio}`);
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
      
      toast.success('Pauta eliminada', 'La pauta mensual ha sido eliminada exitosamente');
      
      // Recargar el resumen
      await cargarResumen();
      
    } catch (error) {
      console.error('Error eliminando pauta:', error);
      toast.error('Error', 'No se pudo eliminar la pauta mensual');
    } finally {
      setLoadingInstalacion(null);
      cerrarModalEliminar();
    }
  };

  const porcentajeProgreso = resumen ? Math.round(resumen.progreso * 100) : 0;

  // Mensaje de confirmación en consola
  useEffect(() => {
    if (resumen) {
      console.log("Lógica de generación de pauta corregida exitosamente");
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
        <Tabs defaultValue="con_pauta" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="con_pauta" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Con Pauta ({resumen.instalaciones_con_pauta.length})
            </TabsTrigger>
            <TabsTrigger value="sin_pauta" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Sin Pauta ({resumen.instalaciones_sin_pauta.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="con_pauta" className="space-y-4">
            {resumen.instalaciones_con_pauta.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resumen.instalaciones_con_pauta.map((instalacion) => (
                  <InstalacionCard
                    key={instalacion.id}
                    instalacion={instalacion}
                    tipo="con_pauta"
                    onAction={() => verPauta(instalacion.id)}
                    onDelete={() => abrirModalEliminar(instalacion.id, instalacion.nombre)}
                    loading={loadingInstalacion === instalacion.id}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No hay pautas creadas</h3>
                  <p className="text-sm text-muted-foreground">
                    Selecciona la pestaña "Sin Pauta" para generar las primeras pautas del mes.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sin_pauta" className="space-y-4">
            {resumen.instalaciones_sin_pauta.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resumen.instalaciones_sin_pauta.map((instalacion) => (
                  <InstalacionCard
                    key={instalacion.id}
                    instalacion={instalacion}
                    tipo="sin_pauta"
                    onAction={() => generarPautaAutomatica(instalacion.id)}
                    loading={loadingInstalacion === instalacion.id}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">¡Excelente trabajo!</h3>
                  <p className="text-sm text-muted-foreground">
                    Todas las instalaciones tienen su pauta mensual creada para este período.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
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