"use client";

import React from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { InputDireccion, type AddressData } from "../ui/input-direccion";
import { GoogleMap } from "../ui/google-map";
import { Building, MapPin, User, Mail, Phone, FileText, ClockIcon } from "lucide-react";
import { Instalacion, CrearInstalacionData } from "../../lib/schemas/instalaciones";

interface InstalacionFormProps {
  instalacion?: Instalacion | null;
  formData: CrearInstalacionData;
  isEditing: boolean;
  formErrors: Record<string, string>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAddressSelect: (addressData: AddressData) => void;
  handleAddressChange: (query: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onChangeEstado?: (nuevoEstado: boolean) => void;
}

export default function InstalacionForm({
  instalacion,
  formData,
  isEditing,
  formErrors,
  handleInputChange,
  handleAddressSelect,
  handleAddressChange,
  onSave,
  onCancel,
  onChangeEstado
}: InstalacionFormProps) {
  const isNewInstalacion = !instalacion;

  return (
    <div className="space-y-6">
      {/* Header con estado */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {isNewInstalacion ? "Nueva Instalación" : instalacion?.nombre}
          </h3>
          {instalacion && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={instalacion.estado === "Activa" ? "default" : "secondary"}>
                {instalacion.estado}
              </Badge>
              {onChangeEstado && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={instalacion.estado === "Activa"}
                    onCheckedChange={onChangeEstado}
                  />
                  <span className="text-sm text-muted-foreground">
                    {instalacion.estado === "Activa" ? "Activa" : "Inactiva"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Información General */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Building className="h-4 w-4" />
          Información General
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Nombre de la Instalación *
            </label>
            <Input
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              placeholder="Nombre de la instalación"
              className={formErrors.nombre ? "border-red-500" : ""}
            />
            {formErrors.nombre && (
              <p className="text-sm text-red-500">{formErrors.nombre}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Estado
            </label>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.estado === "Activa"}
                onCheckedChange={(checked) => {
                  const event = {
                    target: { name: "estado", value: checked ? "Activa" : "Inactiva" }
                  } as React.ChangeEvent<HTMLInputElement>;
                  handleInputChange(event);
                }}
              />
              <span className="text-sm text-muted-foreground">
                {formData.estado === "Activa" ? "Activa" : "Inactiva"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dirección y Ubicación */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MapPin className="h-4 w-4" />
          Dirección y Ubicación
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Dirección
            </label>
            <InputDireccion
              value={formData.direccion || ""}
              onAddressSelect={handleAddressSelect}
              onAddressChange={handleAddressChange}
              placeholder="Buscar dirección..."
            />
          </div>

          {formData.lat && formData.lng && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Ubicación en el Mapa
              </label>
              <div className="h-48 rounded-lg overflow-hidden border border-border">
                <GoogleMap
                  center={{ lat: formData.lat, lng: formData.lng }}
                  markers={[
                    {
                      position: { lat: formData.lat, lng: formData.lng },
                      title: formData.nombre || "Ubicación"
                    }
                  ]}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
        <Button
          variant="outline"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          onClick={onSave}
          disabled={!isEditing && isNewInstalacion}
        >
          {isNewInstalacion ? "Crear Instalación" : "Guardar Cambios"}
        </Button>
      </div>
    </div>
  );
} 