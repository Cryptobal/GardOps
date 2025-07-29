"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
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
  ClipboardList, 
  FileText, 
  History,
  MapPin,
  DollarSign,
  User,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle
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
  onCancel
}: InstalacionTabsProps) {
  const [activeTab, setActiveTab] = useState(0);
  
  const [guardiasAsignados, setGuardiasAsignados] = useState<GuardiaAsignado[]>([]);
  const [puestosOperativos, setPuestosOperativos] = useState<PuestoOperativo[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoInstalacion[]>([]);
  const [logs, setLogs] = useState<LogInstalacion[]>([]);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 0, name: "Datos generales", icon: Building2, color: "bg-blue-500" },
    { id: 1, name: "Guardias asignados", icon: Users, color: "bg-green-500" },
    { id: 2, name: "Asignaciones operativas", icon: ClipboardList, color: "bg-orange-500" },
    { id: 3, name: "Documentos", icon: FileText, color: "bg-purple-500" },
    { id: 4, name: "Logs", icon: History, color: "bg-red-500" },
  ];

  const cargarDatosTab = async () => {
    if (!instalacionId) return;
    
    setLoading(true);
    try {
      switch (activeTab) {
        case 1:
          const guardias = await obtenerGuardiasAsignados(instalacionId);
          setGuardiasAsignados(guardias);
          break;
        case 2:
          const puestos = await obtenerPuestosOperativos(instalacionId);
          setPuestosOperativos(puestos);
          break;
        case 3:
          const docs = await obtenerDocumentosInstalacion(instalacionId);
          setDocumentos(docs);
          break;
        case 4:
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
      case 0:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nombre */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200">Nombre de la instalación</label>
                <Input
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Ingrese el nombre de la instalación"
                  className={formErrors.nombre ? "border-red-500" : ""}
                />
                {formErrors.nombre && (
                  <p className="text-sm text-red-400">{formErrors.nombre}</p>
                )}
              </div>

              {/* Cliente */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200">Cliente</label>
                <select
                  name="cliente_id"
                  value={formData.cliente_id}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.cliente_id ? "border-red-500" : ""
                  }`}
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
                {formErrors.cliente_id && (
                  <p className="text-sm text-red-400">{formErrors.cliente_id}</p>
                )}
                <p className="text-xs text-gray-400">
                  {clientes ? `${clientes.length} clientes disponibles` : 'Cargando clientes...'}
                </p>
              </div>

              {/* Dirección */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-200">Dirección</label>
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
                  className={formErrors.direccion ? "border-red-500" : ""}
                />
                {formErrors.direccion && (
                  <p className="text-sm text-red-400">{formErrors.direccion}</p>
                )}
              </div>

              {/* Ciudad */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200">Ciudad</label>
                <Input
                  type="text"
                  value={formData.ciudad || ''}
                  readOnly
                  className="w-full bg-gray-700 border-gray-600 text-gray-300 cursor-not-allowed"
                  placeholder="Se llenará automáticamente"
                />
              </div>

              {/* Comuna */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200">Comuna</label>
                <Input
                  type="text"
                  value={formData.comuna || ''}
                  readOnly
                  className="w-full bg-gray-700 border-gray-600 text-gray-300 cursor-not-allowed"
                  placeholder="Se llenará automáticamente"
                />
              </div>

              {/* Valor turno extra */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200">Valor turno extra</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400">$</span>
                  <Input
                    name="valor_turno_extra"
                    type="number"
                    value={formData.valor_turno_extra}
                    onChange={handleInputChange}
                    placeholder="0"
                    className={`pl-8 ${formErrors.valor_turno_extra ? "border-red-500" : ""}`}
                  />
                </div>
                {formErrors.valor_turno_extra && (
                  <p className="text-sm text-red-400">{formErrors.valor_turno_extra}</p>
                )}
              </div>

              {/* Estado */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-200">Estado</label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.estado === "Activo"}
                      onCheckedChange={(checked) => {
                        handleInputChange({
                          target: { name: "estado", value: checked ? "Activo" : "Inactivo" }
                        } as React.ChangeEvent<HTMLInputElement>);
                      }}
                    />
                    <span className="text-sm text-gray-300">
                      {formData.estado === "Activo" ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
              </div>
            </div>


          </motion.div>
        );

      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-200">Guardias asignados</h3>
              <Badge variant="outline" className="text-sm">
                Total: {guardiasAsignados.length}
              </Badge>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : guardiasAsignados.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No hay guardias asignados a esta instalación</p>
                </CardContent>
              </Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Nombre</TableHead>
                    <TableHead className="text-gray-300">Email</TableHead>
                    <TableHead className="text-gray-300">Teléfono</TableHead>
                    <TableHead className="text-gray-300">Estado</TableHead>
                    <TableHead className="text-gray-300">Asignado desde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guardiasAsignados.map((guardia) => (
                    <TableRow key={guardia.id} className="border-gray-700 hover:bg-gray-800">
                      <TableCell className="text-gray-200">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{guardia.nombre} {guardia.apellido}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <div className="flex items-center space-x-1">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span>{guardia.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3 text-gray-400" />
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
                      <TableCell className="text-gray-300">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
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

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-200">Asignaciones operativas</h3>
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : puestosOperativos.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6 text-center">
                  <ClipboardList className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No hay puestos operativos configurados</p>
                </CardContent>
              </Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Puesto</TableHead>
                    <TableHead className="text-gray-300">Descripción</TableHead>
                    <TableHead className="text-gray-300">Requeridos</TableHead>
                    <TableHead className="text-gray-300">Asignados</TableHead>
                    <TableHead className="text-gray-300">PPC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {puestosOperativos.map((puesto) => (
                    <TableRow key={puesto.id} className="border-gray-700 hover:bg-gray-800">
                      <TableCell className="text-gray-200 font-medium">
                        {puesto.nombre}
                      </TableCell>
                      <TableCell className="text-gray-300 text-sm">
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

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-200">Documentos de la instalación</h3>
              <Badge variant="outline" className="text-sm">
                Total: {documentos.length}
              </Badge>
            </div>

            <DocumentManager
              modulo="instalaciones"
              entidad_id={instalacionId}
              onDocumentUploaded={() => cargarDatosTab()}
            />
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-200">Historial de cambios</h3>
              <Badge variant="outline" className="text-sm">
                Total: {logs.length}
              </Badge>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : logs.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6 text-center">
                  <History className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No hay registros de cambios</p>
                </CardContent>
              </Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Fecha</TableHead>
                    <TableHead className="text-gray-300">Usuario</TableHead>
                    <TableHead className="text-gray-300">Acción</TableHead>
                    <TableHead className="text-gray-300">Detalles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="border-gray-700 hover:bg-gray-800">
                      <TableCell className="text-gray-300">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span>{new Date(log.fecha).toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-200">
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3 text-gray-400" />
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
                      <TableCell className="text-gray-300 text-sm max-w-xs truncate">
                        {log.detalles}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Pestañas */}
      <div className="flex flex-wrap gap-2 border-b border-gray-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? `${tab.color} text-white shadow-lg`
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>

      {/* Botones de acción */}
      {showActionButtons && (
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Cancelar
          </Button>
          <Button
            onClick={guardarInstalacion}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {selectedInstalacion ? "Actualizar" : "Crear"} instalación
          </Button>
        </div>
      )}
    </div>
  );
} 