"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, X, User, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Guardia {
  id: string;
  nombre_completo: string;
  rut: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  nombre?: string;
  instalacion_actual_id?: string;
  instalacion_actual_nombre?: string;
  puesto_actual_nombre?: string;
}

interface GuardiaSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGuardia: (guardiaId: string) => void;
  guardias: Guardia[];
  loading?: boolean;
  className?: string;
  title?: string;
  instalacionId?: string;
  instalacionNombre?: string;
  // Props específicas para Pauta Diaria
  mode?: 'instalaciones' | 'pauta-diaria';
  fecha?: string;
  rolNombre?: string;
  instalacionNombrePauta?: string;
}

const GuardiaSearchModal: React.FC<GuardiaSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectGuardia,
  guardias,
  loading = false,
  className,
  title = "Buscar Guardia",
  instalacionId,
  instalacionNombre,
  // Props específicas para Pauta Diaria
  mode = 'instalaciones',
  fecha,
  rolNombre,
  instalacionNombrePauta
}) => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [showWarning, setShowWarning] = React.useState(false);
  const [guardiaConAdvertencia, setGuardiaConAdvertencia] = React.useState<Guardia | null>(null);

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
      setShowWarning(false);
      setGuardiaConAdvertencia(null);
    }
  }, [isOpen]);

  // Manejar selección de guardia
  const handleSelectGuardia = (guardia: Guardia) => {
    if (mode === 'pauta-diaria') {
      // En Pauta Diaria, no validamos instalaciones, solo seleccionamos
      onSelectGuardia(guardia.id);
      setSearchTerm("");
      onClose();
    } else {
      // En instalaciones, validamos si ya está asignado a otra instalación
      if (guardia.instalacion_actual_id && guardia.instalacion_actual_id !== instalacionId) {
        // Guardia ya asignado a otra instalación
        setGuardiaConAdvertencia(guardia);
        setShowWarning(true);
      } else {
        // Guardia disponible o ya asignado a esta instalación
        onSelectGuardia(guardia.id);
        setSearchTerm("");
        onClose();
      }
    }
  };

  // Confirmar asignación con advertencia
  const handleConfirmarAsignacion = () => {
    if (guardiaConAdvertencia) {
      onSelectGuardia(guardiaConAdvertencia.id);
      setSearchTerm("");
      setShowWarning(false);
      setGuardiaConAdvertencia(null);
      onClose();
    }
  };

  // Cancelar asignación con advertencia
  const handleCancelarAsignacion = () => {
    setShowWarning(false);
    setGuardiaConAdvertencia(null);
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
          {/* Información contextual para Pauta Diaria */}
          {mode === 'pauta-diaria' && (
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p><strong>Instalación:</strong> {instalacionNombrePauta}</p>
                {rolNombre && <p><strong>Rol:</strong> {rolNombre}</p>}
                {fecha && <p><strong>Fecha:</strong> {fecha}</p>}
              </div>
            </div>
          )}

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

          {/* Advertencia cuando se selecciona un guardia ya asignado */}
          {showWarning && guardiaConAdvertencia && (
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <strong>Advertencia:</strong> Este guardia ya está asignado a{' '}
                <strong>{guardiaConAdvertencia.instalacion_actual_nombre}</strong>.
                Al asignarlo a esta instalación, se cambiará su asignación actual.
              </AlertDescription>
            </Alert>
          )}

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
                {filteredGuardias.map((guardia) => {
                  const estaAsignado = mode === 'instalaciones' && guardia.instalacion_actual_id && guardia.instalacion_actual_id !== instalacionId;
                  
                  return (
                    <div
                      key={guardia.id}
                      onClick={() => handleSelectGuardia(guardia)}
                      className="flex items-center gap-3 p-3 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      {estaAsignado ? (
                        <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      ) : (
                        <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {guardia.nombre_completo}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          RUT: {guardia.rut}
                          {estaAsignado && (
                            <span className="text-orange-600 ml-2">
                              • Asignado a {guardia.instalacion_actual_nombre}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-2">
            {showWarning ? (
              <>
                <Button variant="outline" onClick={handleCancelarAsignacion}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirmarAsignacion} className="bg-orange-600 hover:bg-orange-700">
                  Confirmar Asignación
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { GuardiaSearchModal };