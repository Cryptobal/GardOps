"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Users, Shield, FileText, AlertTriangle, Clock, Edit, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { DocumentManager } from "../ui/document-manager";
import { GoogleMap } from "../ui/google-map";
import { Instalacion } from "../../lib/schemas/instalaciones";

// Tipos locales para datos adicionales
interface PuestoOperativo {
  id: string;
  instalacion_id: string;
  nombre: string;
  tipo_turno: string;
  estado: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

interface GuardiaAsignado {
  id: string;
  instalacion_id: string;
  guardia_id: string;
  guardia_nombre: string;
  guardia_rut: string;
  puesto_id: string;
  puesto_nombre: string;
  estado: string;
  fecha_asignacion: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

interface InstalacionDetailsProps {
  instalacion: Instalacion | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (instalacion: Instalacion) => void;
  onDelete: (instalacion: Instalacion) => void;
}

type TabType = "informacion" | "puestos" | "guardias" | "documentos" | "alertas" | "logs";

export function InstalacionDetails({
  instalacion,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: InstalacionDetailsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("informacion");
  const [puestosOperativos, setPuestosOperativos] = useState<PuestoOperativo[]>([]);
  const [guardiasAsignados, setGuardiasAsignados] = useState<GuardiaAsignado[]>([]);

  useEffect(() => {
    if (instalacion && isOpen) {
      // Cargar datos adicionales de la instalación
      cargarDatosAdicionales(instalacion.id);
    }
  }, [instalacion, isOpen]);

  const cargarDatosAdicionales = async (instalacionId: number) => {
    try {
      // Aquí se cargarían los datos desde la API
      // Por ahora usamos datos de ejemplo
      setPuestosOperativos([
        {
          id: "1",
          instalacion_id: instalacionId.toString(),
          nombre: "Puesto Principal",
          tipo_turno: "8x8",
          estado: "Activo",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tenant_id: "tenant-1"
        }
      ]);

      setGuardiasAsignados([
        {
          id: "1",
          instalacion_id: instalacionId.toString(),
          guardia_id: "guardia-1",
          guardia_nombre: "Juan Pérez",
          guardia_rut: "12345678-9",
          puesto_id: "1",
          puesto_nombre: "Puesto Principal",
          estado: "Activo",
          fecha_asignacion: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tenant_id: "tenant-1"
        }
      ]);
    } catch (error) {
      console.error("Error cargando datos adicionales:", error);
    }
  };

  if (!instalacion) return null;

  const tabs = [
    { id: "informacion" as TabType, label: "Información", icon: MapPin },
    { id: "puestos" as TabType, label: "Puestos Operativos", icon: Shield },
    { id: "guardias" as TabType, label: "Guardias Asignados", icon: Users },
    { id: "documentos" as TabType, label: "Documentos", icon: FileText },
    { id: "alertas" as TabType, label: "Alertas", icon: AlertTriangle },
    { id: "logs" as TabType, label: "Logs", icon: Clock },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {instalacion.nombre}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {instalacion.cliente_nombre}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={instalacion.estado === "Activo" ? "default" : "secondary"}
                  className={
                    instalacion.estado === "Activo"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                  }
                >
                  {instalacion.estado}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(instalacion)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(instalacion)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? "border-blue-500 text-blue-600 dark:text-blue-400"
                          : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="h-[calc(100vh-200px)] overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === "informacion" && (
                    <div className="space-y-6">
                      {/* Información General */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Información General</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Nombre
                              </label>
                              <p className="text-gray-900 dark:text-white">{instalacion.nombre}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Cliente
                              </label>
                              <p className="text-gray-900 dark:text-white">{instalacion.cliente_nombre}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Comuna
                              </label>
                              <p className="text-gray-900 dark:text-white">
                                {instalacion.comuna_nombre || "Sin comuna"}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Estado
                              </label>
                              <Badge
                                variant={instalacion.estado === "Activo" ? "default" : "secondary"}
                                className={
                                  instalacion.estado === "Activo"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                }
                              >
                                {instalacion.estado}
                              </Badge>
                            </div>
                          </div>
                          {instalacion.direccion && (
                            <div>
                              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Dirección
                              </label>
                              <p className="text-gray-900 dark:text-white">{instalacion.direccion}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Geolocalización */}
                      {instalacion.latitud && instalacion.longitud && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Ubicación</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="h-64 rounded-lg overflow-hidden">
                              <GoogleMap
                                center={{ lat: instalacion.latitud || 0, lng: instalacion.longitud || 0 }}
                                zoom={15}
                                markers={[
                                  {
                                    position: { lat: instalacion.latitud || 0, lng: instalacion.longitud || 0 },
                                    title: instalacion.nombre
                                  }
                                ]}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Estadísticas */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Estadísticas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {instalacion.guardias_asignados || 0}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Guardias</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {instalacion.puestos_cubiertos || 0}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Cubiertos</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                {instalacion.ppc || 0}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">PPC</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {activeTab === "puestos" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Puestos Operativos
                        </h3>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Agregar Puesto
                        </Button>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-gray-700">
                              <TableHead>Puesto</TableHead>
                              <TableHead>Tipo Turno</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {puestosOperativos.map((puesto) => (
                              <TableRow key={puesto.id}>
                                <TableCell className="font-medium">
                                  {puesto.nombre}
                                </TableCell>
                                <TableCell>{puesto.tipo_turno}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={puesto.estado === "Activo" ? "default" : "secondary"}
                                    className={
                                      puesto.estado === "Activo"
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                        : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                    }
                                  >
                                    {puesto.estado}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {activeTab === "guardias" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Guardias Asignados
                        </h3>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Asignar Guardia
                        </Button>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-gray-700">
                              <TableHead>Guardia</TableHead>
                              <TableHead>RUT</TableHead>
                              <TableHead>Puesto</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {guardiasAsignados.map((guardia) => (
                              <TableRow key={guardia.id}>
                                <TableCell className="font-medium">
                                  {guardia.guardia_nombre}
                                </TableCell>
                                <TableCell>{guardia.guardia_rut}</TableCell>
                                <TableCell>{guardia.puesto_nombre}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={guardia.estado === "Activo" ? "default" : "secondary"}
                                    className={
                                      guardia.estado === "Activo"
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                        : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                    }
                                  >
                                    {guardia.estado}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {activeTab === "documentos" && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Documentos
                      </h3>
                      <DocumentManager
                        modulo="instalaciones"
                        entidad_id={instalacion.id}
                      />
                    </div>
                  )}

                  {activeTab === "alertas" && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Alertas Operativas
                      </h3>
                      <div className="text-center py-12">
                        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No hay alertas activas
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Las alertas operativas aparecerán aquí cuando sea necesario.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === "logs" && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Logs de Actividad
                      </h3>
                      <div className="text-center py-12">
                        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No hay logs disponibles
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Los logs de actividad aparecerán aquí.
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 