"use client";

import React from "react";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Search, Filter, MapPin, Users, Shield, AlertTriangle, Plus } from "lucide-react";
import { Instalacion } from "../../lib/schemas/instalaciones";

interface InstalacionesTableProps {
  instalaciones: Instalacion[];
  onInstalacionClick: (instalacion: Instalacion) => void;
  onCrearInstalacion: () => void;
  comunas: { id: string; nombre: string }[];
  clientes: { id: string; nombre: string }[];
  filtros: {
    busqueda: string;
    comuna: string;
    cliente: string;
  };
  onFiltrosChange: (filtros: { busqueda: string; comuna: string; cliente: string }) => void;
}

export function InstalacionesTable({
  instalaciones,
  onInstalacionClick,
  onCrearInstalacion,
  comunas,
  clientes,
  filtros,
  onFiltrosChange,
}: InstalacionesTableProps) {
  // Filtrar instalaciones
  const instalacionesFiltradas = instalaciones.filter((instalacion) => {
    const cumpleBusqueda = instalacion.nombre
      .toLowerCase()
      .includes(filtros.busqueda.toLowerCase()) ||
      (instalacion.cliente_nombre || "")
        .toLowerCase()
        .includes(filtros.busqueda.toLowerCase());

    const cumpleComuna = !filtros.comuna || filtros.comuna === "todas" || instalacion.comuna === filtros.comuna;
    const cumpleCliente = !filtros.cliente || filtros.cliente === "todos" || instalacion.cliente_id === filtros.cliente;

    return cumpleBusqueda && cumpleComuna && cumpleCliente;
  });

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Instalaciones</p>
                <p className="text-2xl font-bold">{instalaciones.length}</p>
              </div>
              <MapPin className="h-8 w-8 opacity-80" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Activas</p>
                <p className="text-2xl font-bold">
                  {instalaciones.filter((i) => i.estado === "Activo").length}
                </p>
              </div>
              <Shield className="h-8 w-8 opacity-80" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Guardias</p>
                <p className="text-2xl font-bold">
                  {instalaciones.reduce((sum, i) => sum + (i.guardias_asignados || 0), 0)}
                </p>
              </div>
              <Users className="h-8 w-8 opacity-80" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">PPC Total</p>
                <p className="text-2xl font-bold">
                  {instalaciones.reduce((sum, i) => sum + (i.puestos_por_cubrir || 0), 0)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 opacity-80" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Controles de filtros fijos */}
      <div className="sticky top-20 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 pb-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Buscador */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar instalaciones..."
                value={filtros.busqueda}
                onChange={(e) =>
                  onFiltrosChange({ ...filtros, busqueda: e.target.value })
                }
                className="pl-10"
              />
            </div>

            {/* Filtro por comuna */}
            <Select
              value={filtros.comuna}
              onValueChange={(value) =>
                onFiltrosChange({ ...filtros, comuna: value })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todas las comunas" />
              </SelectTrigger>
                           <SelectContent>
               <SelectItem value="todas">Todas las comunas</SelectItem>
               {comunas.map((comuna) => (
                 <SelectItem key={comuna.id} value={comuna.id}>
                   {comuna.nombre}
                 </SelectItem>
               ))}
             </SelectContent>
            </Select>

            {/* Filtro por cliente */}
            <Select
              value={filtros.cliente}
              onValueChange={(value) =>
                onFiltrosChange({ ...filtros, cliente: value })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos los clientes" />
              </SelectTrigger>
                           <SelectContent>
               <SelectItem value="todos">Todos los clientes</SelectItem>
               {clientes.map((cliente) => (
                 <SelectItem key={cliente.id} value={cliente.id}>
                   {cliente.nombre}
                 </SelectItem>
               ))}
             </SelectContent>
            </Select>
          </div>

          {/* Botón crear */}
          <Button onClick={onCrearInstalacion} className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            Crear Instalación
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800">
              <TableHead className="font-semibold">Instalación</TableHead>
              <TableHead className="font-semibold">Cliente</TableHead>
              <TableHead className="font-semibold">Comuna</TableHead>
              <TableHead className="font-semibold text-center">Guardias</TableHead>
              <TableHead className="font-semibold text-center">Cubiertos</TableHead>
              <TableHead className="font-semibold text-center">PPC</TableHead>
              <TableHead className="font-semibold text-center">Estado</TableHead>
              <TableHead className="font-semibold text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {instalacionesFiltradas.map((instalacion) => (
              <TableRow
                key={instalacion.id}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => onInstalacionClick(instalacion)}
              >
                <TableCell>
                  <div>
                    <div className="font-medium">{instalacion.nombre}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {instalacion.direccion}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{instalacion.cliente_nombre}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{instalacion.comuna}</div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{instalacion.guardias_asignados || 0}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{instalacion.puestos_cubiertos || 0}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{instalacion.puestos_por_cubrir || 0}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={instalacion.estado === "Activo" ? "default" : "secondary"}
                  >
                    {instalacion.estado}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInstalacionClick(instalacion);
                      }}
                    >
                      Ver
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 