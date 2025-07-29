"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { ModalFooter } from "./ui/modal";
import { InputDireccion, type AddressData } from "./ui/input-direccion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { DocumentManager } from "./ui/document-manager";
import { 
  Building2, 
  Users, 
  Target, 
  FileText, 
  AlertCircle,
  MapPin,
  DollarSign,
  User,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Upload,
  Clock
} from "lucide-react";
import { 
  Instalacion, 
  GuardiaAsignado, 
  PuestoOperativo,
  DocumentoInstalacion,
  LogInstalacion,
  Comuna,
  Cliente
} from "../lib/schemas/instalaciones";
import {
  obtenerGuardiasAsignados,
  obtenerPuestosOperativos,
  obtenerDocumentosInstalacion,
  obtenerLogsInstalacion
} from "../lib/api/instalaciones";

interface InstalacionTabsProps {
  instalacionId: string;
  selectedInstalacion: Instalacion | null;
  formData: any;
  isEditingDetails: boolean;
  setIsEditingDetails: (editing: boolean) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleAddressSelect: (addressData: AddressData) => void;
  handleAddressChange: (query: string) => void;
  formErrors: Record<string, string>;
  guardarInstalacion: () => void;
  cambiarEstadoInstalacion: (instalacion: Instalacion, nuevoEstado: boolean) => void;
  clientes: Cliente[];
  comunas: Comuna[];
  showActionButtons?: boolean;
  onCancel?: () => void;
  isReadOnly?: boolean; // Para controlar si los campos están en modo lectura
  onEnableEdit?: () => void; // Callback para activar modo edición
}

// Configuración de tabs con códigos cromáticos
const tabsConfig = [
  { 
    key: 'datos', 
    label: 'Datos', 
    icon: Building2, 
    color: 'blue',
    className: 'data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-300 data-[state=active]:border-blue-500/30'
  },
  { 
    key: 'guardias', 
    label: 'Guardias', 
    icon: Users, 
    color: 'emerald',
    className: 'data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-500/30'
  },
  { 
    key: 'asignaciones', 
    label: 'Asignaciones', 
    icon: Target, 
    color: 'amber',
    className: 'data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-300 data-[state=active]:border-amber-500/30'
  },
  { 
    key: 'docs', 
    label: 'Docs', 
    icon: FileText, 
    color: 'violet',
    className: 'data-[state=active]:bg-violet-600/20 data-[state=active]:text-violet-300 data-[state=active]:border-violet-500/30'
  },
  { 
    key: 'logs', 
    label: 'Logs', 
    icon: AlertCircle, 
    color: 'red',
    className: 'data-[state=active]:bg-red-600/20 data-[state=active]:text-red-300 data-[state=active]:border-red-500/30'
  }
];

// Componente para formulario de datos generales
function GeneralForm({ 
  formData, 
  handleInputChange, 
  handleAddressSelect, 
  handleAddressChange, 
  formErrors, 
  clientes,
  isReadOnly = false
}: {
  formData: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleAddressSelect: (addressData: AddressData) => void;
  handleAddressChange: (query: string) => void;
  formErrors: Record<string, string>;
  clientes: Cliente[];
  isReadOnly?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-2 gap-6">
        {/* Nombre */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Nombre de la instalación</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
            <Input
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              placeholder="Ingrese el nombre de la instalación"
              className={`pl-10 ${formErrors.nombre ? "border-red-500" : ""} ${isReadOnly ? "bg-muted/50 cursor-not-allowed" : ""}`}
              readOnly={isReadOnly}
            />
          </div>
          {formErrors.nombre && (
            <p className="text-sm text-red-400">{formErrors.nombre}</p>
          )}
        </div>

        {/* Cliente */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Cliente</label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50 z-10" />
            <select
              name="cliente_id"
              value={formData.cliente_id}
              onChange={handleInputChange}
              disabled={isReadOnly}
              className={`w-full pl-10 pr-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.cliente_id ? "border-red-500" : ""
              } ${isReadOnly ? "bg-muted/50 cursor-not-allowed" : ""}`}
            >
              <option value="">Seleccione un cliente</option>
              {clientes && clientes.length > 0 ? (
                clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))
              ) : (
                <option value="" disabled>No hay clientes disponibles</option>
              )}
            </select>
          </div>
          {formErrors.cliente_id && (
            <p className="text-sm text-red-400">{formErrors.cliente_id}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {clientes ? `${clientes.length} clientes disponibles` : 'Cargando clientes...'}
          </p>
        </div>

        {/* Dirección */}
        <div className="space-y-2 col-span-2">
          <label className="text-sm font-medium text-slate-300">Dirección</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50 z-10" />
            <InputDireccion
              value={formData.direccion}
              onAddressChange={handleAddressChange}
              onAddressSelect={handleAddressSelect}
              initialLatitude={formData.latitud}
              initialLongitude={formData.longitud}
              initialCiudad={formData.ciudad}
              initialComuna={formData.comuna}
              placeholder="Buscar dirección..."
              name="direccion"
              className={`pl-10 ${formErrors.direccion ? "border-red-500" : ""} ${isReadOnly ? "bg-muted/50 cursor-not-allowed" : ""}`}
              readOnly={isReadOnly}
            />
          </div>
          {formErrors.direccion && (
            <p className="text-sm text-red-400">{formErrors.direccion}</p>
          )}
        </div>

        {/* Ciudad */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Ciudad</label>
          <Input
            type="text"
            value={formData.ciudad || ''}
            readOnly
            className="w-full bg-muted/50 border-border text-muted-foreground cursor-not-allowed"
            placeholder="Se llenará automáticamente"
          />
        </div>

        {/* Comuna */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Comuna</label>
          <Input
            type="text"
            value={formData.comuna || ''}
            readOnly
            className="w-full bg-muted/50 border-border text-muted-foreground cursor-not-allowed"
            placeholder="Se llenará automáticamente"
          />
        </div>

        {/* Valor turno extra */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Valor turno extra</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
            <Input
              name="valor_turno_extra"
              type="number"
              value={formData.valor_turno_extra}
              onChange={handleInputChange}
              placeholder="0"
              className={`pl-10 ${formErrors.valor_turno_extra ? "border-red-500" : ""} ${isReadOnly ? "bg-muted/50 cursor-not-allowed" : ""}`}
              readOnly={isReadOnly}
            />
          </div>
          {formErrors.valor_turno_extra && (
            <p className="text-sm text-red-400">{formErrors.valor_turno_extra}</p>
          )}
        </div>

        {/* Estado */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Estado</label>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.estado === "Activo"}
                onCheckedChange={(checked) => {
                  handleInputChange({
                    target: { name: "estado", value: checked ? "Activo" : "Inactivo" }
                  } as React.ChangeEvent<HTMLInputElement>);
                }}
                disabled={isReadOnly}
              />
              <span className="text-sm text-muted-foreground">
                {formData.estado === "Activo" ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Componente para panel de guardias
function GuardiasPanel({ 
  guardiasAsignados, 
  loading 
}: { 
  guardiasAsignados: GuardiaAsignado[]; 
  loading: boolean; 
}) {
  return (
    <motion.div
      key="guardias"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Guardias asignados</h3>
        <Badge variant="outline" className="text-sm">
          Total: {guardiasAsignados.length}
        </Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : guardiasAsignados.length === 0 ? (
        <Card className="border-muted/40">
          <CardContent className="p-8 text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay guardias asignados a esta instalación</p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-muted/40">
              <TableHead className="text-muted-foreground">Nombre</TableHead>
              <TableHead className="text-muted-foreground">Email</TableHead>
              <TableHead className="text-muted-foreground">Teléfono</TableHead>
              <TableHead className="text-muted-foreground">Estado</TableHead>
              <TableHead className="text-muted-foreground">Asignado desde</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guardiasAsignados.map((guardia) => (
              <TableRow key={guardia.id} className="border-muted/40 hover:bg-muted/10">
                <TableCell className="text-foreground">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{guardia.nombre} {guardia.apellido}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span>{guardia.email}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span>{guardia.telefono}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={guardia.estado === "Activo" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {guardia.estado}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>{new Date(guardia.asignado_desde).toLocaleDateString()}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </motion.div>
  );
}

// Componente para panel de asignaciones
function AsignacionesPanel({ 
  puestosOperativos, 
  loading 
}: { 
  puestosOperativos: PuestoOperativo[]; 
  loading: boolean; 
}) {
  return (
    <motion.div
      key="asignaciones"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Asignaciones operativas</h3>
        <div className="flex space-x-2">
          <Badge variant="outline" className="text-sm">
            Puestos: {puestosOperativos.length}
          </Badge>
          <Badge variant="destructive" className="text-sm">
            PPC: {puestosOperativos.reduce((total, puesto) => total + puesto.ppc, 0)}
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      ) : puestosOperativos.length === 0 ? (
        <Card className="border-muted/40">
          <CardContent className="p-8 text-center">
            <Target className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay puestos operativos configurados</p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-muted/40">
              <TableHead className="text-muted-foreground">Puesto</TableHead>
              <TableHead className="text-muted-foreground">Descripción</TableHead>
              <TableHead className="text-muted-foreground">Requeridos</TableHead>
              <TableHead className="text-muted-foreground">Asignados</TableHead>
              <TableHead className="text-muted-foreground">PPC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {puestosOperativos.map((puesto) => (
              <TableRow key={puesto.id} className="border-muted/40 hover:bg-muted/10">
                <TableCell className="text-foreground font-medium">
                  {puesto.nombre}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {puesto.descripcion}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {puesto.guardias_requeridos}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {puesto.guardias_asignados}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={puesto.ppc > 0 ? "destructive" : "default"}
                    className="text-xs flex items-center gap-1"
                  >
                    {puesto.ppc > 0 ? (
                      <>
                        <AlertTriangle className="h-3 w-3" />
                        {puesto.ppc}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        {puesto.ppc}
                      </>
                    )}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </motion.div>
  );
}

// Componente para panel de documentos
function DocumentosPanel({ 
  instalacionId, 
  documentos, 
  cargarDatos 
}: { 
  instalacionId: string; 
  documentos: DocumentoInstalacion[]; 
  cargarDatos: () => void; 
}) {
  return (
    <motion.div
      key="documentos"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Documentos</h3>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            PPC: 0
          </Badge>
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
            <Upload className="h-4 w-4 mr-2" />
            Subir
          </Button>
        </div>
      </div>

      <DocumentManager
        modulo="instalaciones"
        entidad_id={instalacionId}
        onDocumentUploaded={cargarDatos}
      />
    </motion.div>
  );
}

// Componente para panel de logs
function LogsPanel({ 
  logs, 
  loading 
}: { 
  logs: LogInstalacion[]; 
  loading: boolean; 
}) {
  return (
    <motion.div
      key="logs"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Historial de cambios</h3>
        <Badge variant="outline" className="text-sm">
          Total: {logs.length}
        </Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
        </div>
      ) : logs.length === 0 ? (
        <Card className="border-muted/40">
          <CardContent className="p-8 text-center">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay registros de cambios</p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-muted/40">
              <TableHead className="text-muted-foreground">Fecha</TableHead>
              <TableHead className="text-muted-foreground">Usuario</TableHead>
              <TableHead className="text-muted-foreground">Acción</TableHead>
              <TableHead className="text-muted-foreground">Detalles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} className="border-muted/40 hover:bg-muted/10">
                <TableCell className="text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>{new Date(log.fecha).toLocaleString()}</span>
                  </div>
                </TableCell>
                <TableCell className="text-foreground">
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span>{log.usuario}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      log.accion === "CREAR" ? "default" :
                      log.accion === "EDITAR" ? "secondary" :
                      log.accion === "CAMBIAR_ESTADO" ? "outline" : "destructive"
                    }
                    className="text-xs"
                  >
                    {log.accion}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                  {log.detalles}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </motion.div>
  );
}

export default function InstalacionTabs({
  instalacionId,
  selectedInstalacion,
  formData,
  isEditingDetails,
  setIsEditingDetails,
  handleInputChange,
  handleAddressSelect,
  handleAddressChange,
  formErrors,
  guardarInstalacion,
  cambiarEstadoInstalacion,
  clientes,
  comunas,
  showActionButtons = false,
  onCancel,
  isReadOnly = false,
  onEnableEdit
}: InstalacionTabsProps) {
  const [activeTab, setActiveTab] = useState('datos');
  
  // Debug para verificar estado
  console.log('🔍 InstalacionTabs - isReadOnly:', isReadOnly);
  
  const [guardiasAsignados, setGuardiasAsignados] = useState<GuardiaAsignado[]>([]);
  const [puestosOperativos, setPuestosOperativos] = useState<PuestoOperativo[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoInstalacion[]>([]);
  const [logs, setLogs] = useState<LogInstalacion[]>([]);
  const [loading, setLoading] = useState(false);

  const cargarDatosTab = async () => {
    if (!instalacionId) return;
    
    setLoading(true);
    try {
      switch (activeTab) {
        case 'guardias':
          const guardias = await obtenerGuardiasAsignados(instalacionId);
          setGuardiasAsignados(guardias);
          break;
        case 'asignaciones':
          const puestos = await obtenerPuestosOperativos(instalacionId);
          setPuestosOperativos(puestos);
          break;
        case 'docs':
          const docs = await obtenerDocumentosInstalacion(instalacionId);
          setDocumentos(docs);
          break;
        case 'logs':
          const logsData = await obtenerLogsInstalacion(instalacionId);
          setLogs(logsData);
          break;
      }
    } catch (error) {
      console.error("Error cargando datos del tab:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosTab();
  }, [activeTab, instalacionId]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'datos':
        return (
          <GeneralForm
            formData={formData}
            handleInputChange={handleInputChange}
            handleAddressSelect={handleAddressSelect}
            handleAddressChange={handleAddressChange}
            formErrors={formErrors}
            clientes={clientes}
            isReadOnly={isReadOnly}
          />
        );
      case 'guardias':
        return (
          <GuardiasPanel
            guardiasAsignados={guardiasAsignados}
            loading={loading}
          />
        );
      case 'asignaciones':
        return (
          <AsignacionesPanel
            puestosOperativos={puestosOperativos}
            loading={loading}
          />
        );
      case 'docs':
        return (
          <DocumentosPanel
            instalacionId={instalacionId}
            documentos={documentos}
            cargarDatos={cargarDatosTab}
          />
        );
      case 'logs':
        return (
          <LogsPanel
            logs={logs}
            loading={loading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Pestañas con estilo pill */}
      <div className="flex flex-wrap gap-2 p-1 bg-muted/30 rounded-lg">
        {tabsConfig.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 border border-transparent ${
                isActive
                  ? tab.className
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>

      {/* Footer sticky con botones de acción */}
      {showActionButtons && (
        <ModalFooter>
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancelar
          </Button>
          {isReadOnly ? (
            <Button
              onClick={() => {
                console.log('🔵 Botón Actualizar clickeado, activando edición...');
                onEnableEdit?.();
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Actualizar
            </Button>
          ) : (
            <Button
              onClick={() => {
                console.log('🟢 Botón Guardar clickeado, guardando cambios...');
                guardarInstalacion();
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Guardar cambios
            </Button>
          )}
        </ModalFooter>
      )}
    </div>
  );
} 