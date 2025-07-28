"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Edit, Trash2, Building2, Users } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Instalacion } from "../../lib/schemas/instalaciones";

interface InstalacionDetailsProps {
  instalacion: Instalacion | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (instalacion: Instalacion) => void;
  onDelete: (instalacion: Instalacion) => void;
}

export function InstalacionDetails({
  instalacion,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: InstalacionDetailsProps) {
  if (!instalacion) return null;

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
            transition={{ type: "spring", damping: 25, stiffness: 120 }}
            className="bg-background w-full max-w-2xl h-full overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      {instalacion.nombre}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {instalacion.tipo_instalacion}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={instalacion.activo ? "default" : "secondary"}
                    className={
                      instalacion.activo
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                    }
                  >
                    {instalacion.activo ? "Activo" : "Inactivo"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(instalacion)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(instalacion)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Información */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Información General
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Nombre
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {instalacion.nombre}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Tipo de Instalación
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {instalacion.tipo_instalacion}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Comuna
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {instalacion.comuna}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Región
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {instalacion.region}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Capacidad
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        <Users className="h-4 w-4 inline mr-1" />
                        {instalacion.capacidad} personas
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Estado
                      </label>
                      <Badge
                        variant={instalacion.activo ? "default" : "secondary"}
                        className={
                          instalacion.activo
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                        }
                      >
                        {instalacion.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Dirección
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {instalacion.direccion}
                    </p>
                  </div>
                  {instalacion.descripcion && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Descripción
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {instalacion.descripcion}
                      </p>
                    </div>
                  )}
                  {instalacion.cliente_nombre && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Cliente
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {instalacion.cliente_nombre} ({instalacion.cliente_rut})
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 