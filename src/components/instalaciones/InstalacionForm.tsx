"use client";

import React from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { InputDireccion, type AddressData } from "../ui/input-direccion";
import { Building, MapPin } from "lucide-react";
import { Instalacion, CrearInstalacion } from "../../lib/schemas/instalaciones";

interface InstalacionFormProps {
  instalacion?: Instalacion | null;
  formData: CrearInstalacion;
  isEditing: boolean;
  formErrors: Record<string, string>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleAddressSelect: (addressData: AddressData) => void;
  handleAddressChange: (query: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function InstalacionForm({
  instalacion,
  formData,
  isEditing,
  formErrors,
  handleInputChange,
  handleAddressSelect,
  handleAddressChange,
  onSave,
  onCancel,
}: InstalacionFormProps) {
  return (
    <div className="space-y-6">
      {/* Información básica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Información General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Nombre de la Instalación *
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="Ingrese el nombre de la instalación"
              />
              {formErrors.nombre && (
                <p className="text-red-500 text-xs mt-1">{formErrors.nombre}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Tipo de Instalación *
              </label>
              <select
                name="tipo_instalacion"
                value={formData.tipo_instalacion || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Seleccionar tipo</option>
                <option value="Residencial">Residencial</option>
                <option value="Comercial">Comercial</option>
                <option value="Industrial">Industrial</option>
                <option value="Educacional">Educacional</option>
                <option value="Hospitalario">Hospitalario</option>
                <option value="Otro">Otro</option>
              </select>
              {formErrors.tipo_instalacion && (
                <p className="text-red-500 text-xs mt-1">{formErrors.tipo_instalacion}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Capacidad (personas) *
              </label>
              <input
                type="number"
                name="capacidad"
                min="1"
                value={formData.capacidad || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="Número de personas"
              />
              {formErrors.capacidad && (
                <p className="text-red-500 text-xs mt-1">{formErrors.capacidad}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Cliente ID *
              </label>
              <input
                type="number"
                name="cliente_id"
                min="1"
                value={formData.cliente_id || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="ID del cliente"
              />
              {formErrors.cliente_id && (
                <p className="text-red-500 text-xs mt-1">{formErrors.cliente_id}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Descripción
            </label>
            <textarea
              name="descripcion"
              value={formData.descripcion || ""}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              placeholder="Descripción opcional de la instalación"
            />
            {formErrors.descripcion && (
              <p className="text-red-500 text-xs mt-1">{formErrors.descripcion}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dirección */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Ubicación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Dirección *
            </label>
                         <InputDireccion
               value={formData.direccion || ""}
               onAddressChange={handleAddressChange}
               onAddressSelect={handleAddressSelect}
               placeholder="Ingrese la dirección de la instalación"
             />
            {formErrors.direccion && (
              <p className="text-red-500 text-xs mt-1">{formErrors.direccion}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Comuna *
              </label>
              <input
                type="text"
                name="comuna"
                value={formData.comuna || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="Comuna"
              />
              {formErrors.comuna && (
                <p className="text-red-500 text-xs mt-1">{formErrors.comuna}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Región *
              </label>
              <input
                type="text"
                name="region"
                value={formData.region || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="Región"
              />
              {formErrors.region && (
                <p className="text-red-500 text-xs mt-1">{formErrors.region}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          className="min-w-[100px]"
        >
          Cancelar
        </Button>
        <Button
          onClick={onSave}
          className="min-w-[100px] bg-blue-600 hover:bg-blue-700"
        >
          {isEditing ? "Actualizar" : "Crear"} Instalación
        </Button>
      </div>
    </div>
  );
} 