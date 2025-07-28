"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Building, Save, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useToast } from "../ui/toast";
import { CrearInstalacion } from "../../lib/schemas/instalaciones";

interface CrearInstalacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CrearInstalacionModal({ isOpen, onClose, onSuccess }: CrearInstalacionModalProps) {
  const [formData, setFormData] = useState<Partial<CrearInstalacion>>({
    nombre: "",
    direccion: "",
    comuna: "",
    region: "",
    tipo_instalacion: "",
    capacidad: 0,
    descripcion: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre?.trim()) {
      toast.error("El nombre de la instalación es requerido");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/instalaciones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Instalación creada correctamente");
        onSuccess();
        onClose();
        setFormData({ nombre: "", direccion: "", comuna: "", region: "", tipo_instalacion: "", capacidad: 0, descripcion: "" });
      } else {
        toast.error(result.error || "Error al crear instalación");
      }
    } catch (error) {
      console.error("Error creando instalación:", error);
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CrearInstalacion, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md mx-4"
          >
            <Card className="bg-background border-border shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Nueva Instalación
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Nombre */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Nombre de la Instalación *
                    </label>
                    <Input
                      placeholder="Ej: Edificio Corporativo"
                      value={formData.nombre || ""}
                      onChange={(e) => handleInputChange("nombre", e.target.value)}
                      required
                    />
                  </div>

                  {/* Dirección */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Dirección
                    </label>
                    <Input
                      placeholder="Ej: Av. Providencia 1234, Santiago"
                      value={formData.direccion || ""}
                      onChange={(e) => handleInputChange("direccion", e.target.value)}
                    />
                  </div>



                  {/* Botones */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      className="flex-1"
                      disabled={loading}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Crear Instalación
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
} 