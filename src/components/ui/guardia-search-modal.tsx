"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Guardia {
  id: string;
  nombre_completo: string;
  rut: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  nombre?: string;
}

interface GuardiaSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGuardia: (guardiaId: string) => void;
  guardias: Guardia[];
  loading?: boolean;
  className?: string;
  title?: string;
}

const GuardiaSearchModal: React.FC<GuardiaSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectGuardia,
  guardias,
  loading = false,
  className,
  title = "Buscar Guardia"
}) => {
  const [searchTerm, setSearchTerm] = React.useState("");

  // Filtrar guardias
  const filteredGuardias = guardias.filter(guardia => {
    if (!searchTerm.trim()) return true;
    
    const filtro = searchTerm.toLowerCase().trim();
    const nombreCompleto = guardia.nombre_completo?.toLowerCase() || '';
    const rut = guardia.rut?.toLowerCase() || '';
    
    // Filtrar por nombre completo
    if (nombreCompleto.includes(filtro)) return true;
    
    // Filtrar por RUT
    if (rut.includes(filtro)) return true;
    
    // Filtrar por apellidos específicos
    const apellidoPaterno = guardia.apellido_paterno?.toLowerCase() || '';
    const apellidoMaterno = guardia.apellido_materno?.toLowerCase() || '';
    if (apellidoPaterno.includes(filtro) || apellidoMaterno.includes(filtro)) return true;
    
    // Filtrar por nombre específico
    const nombre = guardia.nombre?.toLowerCase() || '';
    if (nombre.includes(filtro)) return true;
    
    return false;
  });

  // Limpiar búsqueda al cerrar
  React.useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  // Manejar selección de guardia
  const handleSelectGuardia = (guardiaId: string) => {
    onSelectGuardia(guardiaId);
    setSearchTerm("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className={cn("w-full max-w-md mx-auto", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Campo de búsqueda */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por nombre o RUT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>

          {/* Lista de guardias */}
          <div className="max-h-64 overflow-y-auto border rounded-md">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-500">Cargando guardias...</span>
              </div>
            ) : filteredGuardias.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                {searchTerm ? 'No se encontraron guardias' : 'No hay guardias disponibles'}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredGuardias.map((guardia) => (
                  <div
                    key={guardia.id}
                    onClick={() => handleSelectGuardia(guardia.id)}
                    className="flex items-center gap-3 p-3 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <User className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{guardia.nombre_completo}</p>
                      <p className="text-xs text-gray-500">RUT: {guardia.rut}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { GuardiaSearchModal };