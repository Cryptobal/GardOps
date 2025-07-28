"use client";

import { useState, useEffect } from "react";
import { Building, MapPin, ExternalLink, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface Instalacion {
  id: string;
  nombre: string;
  direccion: string;
  estado: string;
  tipo: string;
  created_at: string;
}

interface InstalacionesClienteProps {
  clienteId: string;
  refreshTrigger?: number;
}

export default function InstalacionesCliente({ 
  clienteId, 
  refreshTrigger 
}: InstalacionesClienteProps) {
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarInstalaciones = async () => {
    try {
      setCargando(true);
      const response = await fetch(`/api/instalaciones?cliente_id=${clienteId}`);
      const data = await response.json();
      
      if (data.success) {
        setInstalaciones(data.instalaciones || []);
      } else {
        console.error("Error cargando instalaciones:", data.error);
        setInstalaciones([]);
      }
    } catch (error) {
      console.error("Error cargando instalaciones:", error);
      setInstalaciones([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarInstalaciones();
  }, [clienteId, refreshTrigger]);

  const irAInstalacion = (instalacionId: string) => {
    window.open(`/instalaciones?id=${instalacionId}`, '_blank');
  };

  const agregarInstalacion = () => {
    window.open('/instalaciones?nuevo=true', '_blank');
  };

  if (cargando) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white">
            Instalaciones del Cliente
          </h4>
        </div>
        <div className="text-center text-muted-foreground py-8">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted/20 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-muted/20 rounded w-1/2 mx-auto"></div>
            <div className="h-4 bg-muted/20 rounded w-2/3 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white">
          Instalaciones del Cliente ({instalaciones.length})
        </h4>
        <Button
          size="sm"
          onClick={agregarInstalacion}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Instalación
        </Button>
      </div>

      {instalaciones.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <Building className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No hay instalaciones asociadas a este cliente</p>
          <p className="text-sm mt-1">Haz clic en &quot;Agregar Instalación&quot; para crear una nueva</p>
        </div>
      ) : (
        <div className="space-y-3">
          {instalaciones.map((instalacion) => (
            <div
              key={instalacion.id}
              className="flex items-center justify-between p-4 border border-border/30 rounded-lg hover:bg-muted/10 transition-colors group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Building className="h-5 w-5 text-white" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-medium truncate">
                      {instalacion.nombre}
                    </p>
                    <Badge variant={instalacion.estado === "Activo" ? "success" : "inactive"}>
                      {instalacion.estado}
                    </Badge>
                    {instalacion.tipo && (
                      <Badge variant="outline" className="text-xs">
                        {instalacion.tipo}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{instalacion.direccion}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => irAInstalacion(instalacion.id)}
                  className="h-8 w-8 p-0 hover:bg-blue-600/20"
                  title="Ver instalación"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 