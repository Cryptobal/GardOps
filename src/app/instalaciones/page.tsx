"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { 
  Building2, 
  Plus,
  Users,
  AlertTriangle
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function InstalacionesPage() {
  const router = useRouter();
  const [instalaciones, setInstalaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Función para cargar datos de instalaciones con estadísticas
  const fetchInstalaciones = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/instalaciones?simple=true');
      const data = await response.json();
      
      if (data.success) {
        console.log('🔍 Datos de instalaciones recibidos:', data.data);
        setInstalaciones(data.data || []);
      } else {
        console.error("Error cargando instalaciones:", data.error);
        setInstalaciones([]);
      }
    } catch (error) {
      console.error("Error cargando instalaciones:", error);
      setInstalaciones([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos de instalaciones
  useEffect(() => {
    fetchInstalaciones();
  }, []);

  // Filtrar instalaciones
  const filteredInstalaciones = instalaciones.filter((instalacion: any) => {
    const matchesSearch = 
      instalacion.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instalacion.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instalacion.comuna?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instalacion.ciudad?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleRowClick = (instalacion: any) => {
    router.push(`/instalaciones/${instalacion.id}`);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3 md:space-x-4 mb-4 md:mb-6">
        <div className="p-2 md:p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
          <Building2 className="h-5 w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Instalaciones</h1>
          <p className="text-sm md:text-base text-muted-foreground">Gestiona las instalaciones y su estado operacional</p>
        </div>
      </div>

      {/* Filtros y Acciones */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
            <Input
              placeholder="Buscar instalaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64"
            />
          </div>
          
          <Button className="flex items-center space-x-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            <span>Nueva Instalación</span>
          </Button>
        </div>
      </div>

      {/* Tabla simplificada */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredInstalaciones.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-foreground mb-2">
                No se encontraron instalaciones
              </h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4">Instalación</th>
                    <th className="text-left p-4">Cliente</th>
                    <th className="text-left p-4">Comuna</th>
                    <th className="text-left p-4">Puestos / PPC</th>
                    <th className="text-left p-4">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInstalaciones.map((instalacion: any) => (
                    <tr 
                      key={instalacion.id}
                      className="border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleRowClick(instalacion)}
                    >
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium">{instalacion.nombre}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-muted-foreground">{instalacion.cliente_nombre}</p>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          {instalacion.comuna && (
                            <p className="font-medium">{instalacion.comuna}</p>
                          )}
                          {instalacion.ciudad && instalacion.ciudad !== instalacion.comuna && (
                            <p className="text-xs text-muted-foreground">{instalacion.ciudad}</p>
                          )}
                          {!instalacion.comuna && !instalacion.ciudad && (
                            <p className="text-muted-foreground">Sin ubicación</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            {(() => {
                              const ppcPendientes = parseInt(instalacion.ppc_pendientes);
                              const puestosCreados = parseInt(instalacion.puestos_creados);
                              const shouldBeGreen = ppcPendientes === 0 && puestosCreados > 0;
                              
                              console.log(`🔍 ${instalacion.nombre}:`, {
                                ppcPendientes,
                                puestosCreados,
                                shouldBeGreen,
                                color: shouldBeGreen ? 'green' : 'blue'
                              });
                              
                              return (
                                <Users className={`h-4 w-4 ${
                                  shouldBeGreen ? 'text-green-500' : 'text-blue-500'
                                }`} />
                              );
                            })()}
                            <span className={`text-sm font-medium ${
                              (parseInt(instalacion.ppc_pendientes) === 0 && parseInt(instalacion.puestos_creados) > 0)
                                ? 'text-green-600 dark:text-green-400' 
                                : ''
                            }`}>
                              {instalacion.puestos_creados || 0}
                            </span>
                          </div>
                          {parseInt(instalacion.ppc_pendientes) > 0 && (
                            <div className="flex items-center space-x-1">
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                              <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                                {instalacion.ppc_pendientes}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          instalacion.estado === 'Activo' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                        }`}>
                          {instalacion.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 